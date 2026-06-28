const axios = require('axios');
const crypto = require('crypto');
const env = require('../../config/env');
const logger = require('../../config/logger');

class TokopayService {
  constructor() {
    this.baseURL = env.TOKOPAY_BASE_URL || 'https://api.tokopay.id';
    this.merchantId = env.TOKOPAY_MERCHANT_ID;
    this.secretKey = env.TOKOPAY_SECRET_KEY;
  }

  /**
   * Generate HMAC-MD5 signature for Tokopay API request.
   * Formula: MD5(merchant_id + ":" + secret_key + ":" + ref_id)
   * @param {string} refId - Reference/order ID
   * @returns {string} MD5 hex string
   */
  generateSignature(refId) {
    const raw = `${this.merchantId}:${this.secretKey}:${refId}`;
    return crypto.createHash('md5').update(raw).digest('hex');
  }

  /**
   * Create an Advanced Order (QRIS / multi-channel) via Tokopay API.
   * Docs: https://docs.tokopay.id/order/create-order
   *
   * @param {object} opts
   * @param {string} opts.ref_id          - Unique merchant reference ID
   * @param {string} opts.kode_channel    - Payment channel code, e.g. "QRIS"
   * @param {number} opts.amount          - Amount in IDR (integer)
   * @param {string} opts.customer_name   - Customer full name
   * @param {string} opts.customer_email  - Customer email
   * @param {string} [opts.customer_phone] - Customer phone (default: "08123456789")
   * @param {string} [opts.redirect_url]  - Success redirect URL
   * @param {number} [opts.expired_ts]    - UNIX timestamp expiry (0 = gateway default ~24h)
   * @param {Array}  [opts.items]         - Order item list
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async createOrder(opts) {
    const {
      ref_id,
      kode_channel = 'QRIS',
      amount,
      customer_name,
      customer_email,
      customer_phone = '08123456789',
      redirect_url = '',
      expired_ts = 0,
      items = [],
    } = opts;

    if (!this.merchantId || !this.secretKey) {
      logger.error('TokopayService', 'TOKOPAY_MERCHANT_ID or TOKOPAY_SECRET_KEY is not configured');
      return { success: false, error: 'Payment gateway not configured' };
    }

    const signature = this.generateSignature(ref_id);

    const defaultItem = {
      product_code: 'VALINC-PLAN',
      name: opts.plan_label || 'VALINC SYNDICATE Plan',
      price: amount,
      product_url: `${env.frontendUrl || 'http://localhost:3000'}/portal/plans`,
      image_url: '',
    };

    const payload = {
      merchant_id: this.merchantId,
      kode_channel,
      reff_id: ref_id,
      amount,
      customer_name,
      customer_email,
      customer_phone,
      redirect_url,
      expired_ts,
      signature,
      items: items.length > 0 ? items : [defaultItem],
    };

    logger.info('TokopayService', `Creating order ref_id=${ref_id} channel=${kode_channel} amount=${amount}`);

    try {
      const response = await axios.post(
        `${this.baseURL}/v1/order`,
        payload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000,
        }
      );

      const body = response.data;

      if (body && body.status === 'Success') {
        const d = body.data || {};
        // Log raw response for debugging (termasuk deep link e-wallet)
        logger.info('TokopayService', `Order success ref_id=${ref_id}, pay_url=${d.pay_url}, panduan=${JSON.stringify(d.panduan_pembayaran || '').slice(0, 200)}`);
        return {
          success: true,
          data: {
            trx_id: d.trx_id || null,
            pay_url: d.pay_url || null,         // URL pembayaran (untuk emoney = deeplink langsung ke app)
            qr_link: d.qr_link || null,         // URL gambar QR (untuk QRIS)
            qr_string: d.qr_string || null,     // Raw QRIS string
            nomor_va: d.nomor_va || null,        // Virtual account number (non-QRIS)
            total_bayar: d.total_bayar || amount,
            total_diterima: d.total_diterima || amount,
            panduan_pembayaran: d.panduan_pembayaran || '',
            ref_id,
            expired_at: expired_ts > 0 ? expired_ts : null,
          },
        };
      }

      logger.warn('TokopayService', `Order creation failed: ${body?.message}`, { ref_id, status: body?.status });
      return {
        success: false,
        error: body?.message || 'Tokopay returned non-success status',
        raw: body,
      };
    } catch (err) {
      const detail = err.response?.data?.message || err.message;
      logger.error('TokopayService', `createOrder exception: ${detail}`, { ref_id });
      return {
        success: false,
        error: detail,
      };
    }
  }

  /**
   * Check order payment status from Tokopay.
   * Docs: https://docs.tokopay.id/order/cek-status-order
   *
   * @param {string} refId - Merchant reference ID
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async checkOrderStatus(refId) {
    if (!this.merchantId || !this.secretKey) {
      return { success: false, error: 'Payment gateway not configured' };
    }

    const signature = this.generateSignature(refId);

    try {
      const response = await axios.get(
        `${this.baseURL}/v1/order`,
        {
          params: {
            merchant_id: this.merchantId,
            reff_id: refId,
            signature,
          },
          timeout: 10000,
        }
      );

      const body = response.data;
      if (body) {
        const d = body.data || {};
        return {
          success: true,
          data: {
            // Tokopay returns: Pending | Success | Failed | Expired
            status: d.status || body.status,
            trx_id: d.trx_id || null,
            amount: d.total_bayar || null,
            paid_at: d.pay_at || null,
            customer_name: d.customer_name || null,
          },
        };
      }

      return { success: false, error: 'Empty response from Tokopay' };
    } catch (err) {
      const detail = err.response?.data?.message || err.message;
      logger.error('TokopayService', `checkOrderStatus exception: ${detail}`, { refId });
      return { success: false, error: detail };
    }
  }

  /**
   * Verify incoming callback/webhook signature from Tokopay.
   * @param {object} payload - Webhook body
   * @returns {boolean}
   */
  verifyCallbackSignature(payload) {
    try {
      const { reff_id, signature: received } = payload;
      if (!reff_id || !received) return false;
      const expected = this.generateSignature(reff_id);
      return received === expected;
    } catch (err) {
      logger.error('TokopayService', `verifyCallbackSignature error: ${err.message}`);
      return false;
    }
  }
}

module.exports = new TokopayService();
