const axios = require('axios');
const crypto = require('crypto');
const env = require('../../config/env');
const logger = require('../../config/logger');

const { getRedis } = require('../../config/redis');

class NowPaymentsService {
  constructor() {
    this.baseURL = env.NOWPAYMENTS_BASE_URL || 'https://api.nowpayments.io';
    this.apiKey = env.NOWPAYMENTS_API_KEY;
    this.ipnSecret = env.NOWPAYMENTS_IPN_SECRET;
  }

  /**
   * Create an invoice via NOWPayments API.
   * Docs: https://documenter.getpostman.com/view/7907941/2s93JusNJt#0316fd95-ad58-4d36-82c0-d94455d019ac
   *
   * @param {object} opts
   * @param {number} opts.price_amount      - Amount in USD
   * @param {string} opts.price_currency    - Price currency (e.g. "usd")
   * @param {string} opts.order_id          - Unique merchant reference ID (ref_id)
   * @param {string} opts.order_description - Description of order
   * @param {string} opts.ipn_callback_url  - Webhook callback url
   * @param {string} opts.success_url       - Success redirect url
   * @param {string} opts.cancel_url        - Cancel redirect url
   * @returns {Promise<{success: boolean, data?: object, error?: string}>}
   */
  async createInvoice(opts) {
    if (!this.apiKey) {
      logger.error('NowPaymentsService', 'NOWPAYMENTS_API_KEY is not configured');
      return { success: false, error: 'Payment gateway not configured' };
    }

    try {
      logger.info('NowPaymentsService', `Creating invoice: order_id=${opts.order_id} amount=${opts.price_amount} ${opts.price_currency}`);

      const response = await axios.post(
        `${this.baseURL}/v1/invoice`,
        {
          price_amount: opts.price_amount,
          price_currency: opts.price_currency || 'usd',
          order_id: opts.order_id,
          order_description: opts.order_description,
          ipn_callback_url: opts.ipn_callback_url,
          success_url: opts.success_url,
          cancel_url: opts.cancel_url,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
          },
          timeout: 15000,
        }
      );

      const body = response.data;
      if (body && body.id) {
        logger.info('NowPaymentsService', `Invoice created successfully: invoice_id=${body.id} url=${body.invoice_url}`);
        return {
          success: true,
          data: {
            invoice_id: body.id,
            invoice_url: body.invoice_url,
            status: body.status,
            order_id: body.order_id,
          },
        };
      }

      logger.warn('NowPaymentsService', `Invoice creation returned invalid body: ${JSON.stringify(body)}`);
      return { success: false, error: 'Invalid response from payment gateway' };
    } catch (err) {
      const detail = err.response?.data?.message || err.message;
      logger.error('NowPaymentsService', `createInvoice exception: ${detail}`, { order_id: opts.order_id });
      return { success: false, error: detail };
    }
  }

  /**
   * Verify callback signature using IPN Secret.
   * @param {object} payload - Parsed callback body
   * @param {string} signature - x-nowpayments-sig header value
   * @returns {boolean}
   */
  verifyCallbackSignature(payload, signature) {
    if (!this.ipnSecret) {
      logger.error('NowPaymentsService', 'NOWPAYMENTS_IPN_SECRET is not configured. Cannot verify webhook signature.');
      return false;
    }
    if (!payload || !signature) return false;

    try {
      // Sort keys alphabetically and stringify
      const sortedString = JSON.stringify(payload, Object.keys(payload).sort());

      // Calculate HMAC-SHA512
      const hmac = crypto.createHmac('sha512', this.ipnSecret);
      hmac.update(sortedString);
      const expected = hmac.digest('hex');

      // Timing-safe comparison to prevent timing attacks
      const expectedBuf = Buffer.from(expected, 'utf8');
      const providedBuf = Buffer.from(String(signature), 'utf8');
      if (expectedBuf.length !== providedBuf.length) return false;
      return crypto.timingSafeEqual(expectedBuf, providedBuf);
    } catch (err) {
      logger.error('NowPaymentsService', `verifyCallbackSignature exception: ${err.message}`);
      return false;
    }
  }

  /**
   * Fetch enabled merchant coins from NOWPayments.
   * Falls back to a default list if configuration is missing or API errors.
   */
  async getMerchantCoins() {
    if (!this.apiKey) {
      logger.warn('NowPaymentsService', 'NOWPAYMENTS_API_KEY is not configured, returning fallback coins');
      return { success: true, currencies: ['usdttrc20', 'trx', 'ltc', 'btc', 'eth'] };
    }

    try {
      logger.info('NowPaymentsService', 'Fetching merchant coins');
      const response = await axios.get(
        `${this.baseURL}/v1/merchant/coins`,
        {
          headers: {
            'x-api-key': this.apiKey,
          },
          timeout: 10000,
        }
      );

      const body = response.data;
      const currencies = body.selectedCurrencies || body.currencies || [];
      return { success: true, currencies };
    } catch (err) {
      const detail = err.response?.data?.message || err.message;
      logger.error('NowPaymentsService', `getMerchantCoins exception: ${detail}. Using fallback coins list.`);
      // Fallback list of popular coins
      return { success: true, currencies: ['usdttrc20', 'trx', 'ltc', 'btc', 'eth'] };
    }
  }

  /**
   * Create invoice-payment (inline payment) details for a specific coin.
   */
  async createInvoicePayment(invoiceId, coin) {
    if (!this.apiKey) {
      logger.error('NowPaymentsService', 'NOWPAYMENTS_API_KEY is not configured');
      return { success: false, error: 'Payment gateway not configured' };
    }

    try {
      logger.info('NowPaymentsService', `Creating invoice payment: invoice_id=${invoiceId} coin=${coin}`);
      const response = await axios.post(
        `${this.baseURL}/v1/invoice-payment`,
        {
          iid: invoiceId,
          pay_currency: coin,
          is_fee_paid_by_user: true,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
          },
          timeout: 15000,
        }
      );

      const body = response.data;
      if (body) {
        return {
          success: true,
          data: {
            payment_id: body.payment_id,
            payment_status: body.payment_status,
            pay_address: body.pay_address,
            pay_amount: body.pay_amount,
            payin_extra_id: body.payin_extra_id || null,
          },
        };
      }

      return { success: false, error: 'Invalid response from payment gateway' };
    } catch (err) {
      const detail = err.response?.data?.message || err.message;
      logger.error('NowPaymentsService', `createInvoicePayment exception: ${detail}`, { invoice_id: invoiceId, coin });
      return { success: false, error: detail };
    }
  }

  /**
   * Fetch minimum amount for a currency pair with Redis Caching.
   * @param {string} from - Source currency ticker (e.g. 'usd' or 'btc')
   * @param {string} to - Destination crypto ticker (e.g. 'ltc')
   * @param {string} [fiatEquivalent] - Fiat currency ticker to convert minimum amount to (e.g. 'usd')
   * @returns {Promise<{success: boolean, min_amount?: number, fiat_equivalent?: number, error?: string}>}
   */
  async getMinAmount(from, to, fiatEquivalent = null) {
    if (!this.apiKey) {
      return { success: false, error: 'NOWPAYMENTS_API_KEY is not configured' };
    }

    const redis = getRedis();
    const cacheKey = `np_min:${from}:${to}`;

    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          return typeof cached === 'string' ? JSON.parse(cached) : cached;
        }
      } catch (cErr) {
        // fail open
      }
    }

    try {
      const queryParams = {
        currency_from: from,
        currency_to: to,
        is_fixed_rate: 'false',
        is_fee_paid_by_user: 'true',
      };
      if (fiatEquivalent) {
        queryParams.fiat_equivalent = fiatEquivalent;
      }

      const response = await axios.get(
        `${this.baseURL}/v1/min-amount`,
        {
          params: queryParams,
          headers: {
            'x-api-key': this.apiKey,
          },
          timeout: 5000,
        }
      );

      const body = response.data;
      if (body && typeof body.min_amount !== 'undefined') {
        const resObj = {
          success: true,
          min_amount: Number(body.min_amount),
          fiat_equivalent: body.fiat_equivalent ? Number(body.fiat_equivalent) : null,
        };
        if (redis) {
          try { await redis.set(cacheKey, JSON.stringify(resObj), { ex: 300 }); } catch {} // 5 minutes TTL
        }
        return resObj;
      }

      const failObj = { success: false, error: 'Invalid response from payment gateway' };
      if (redis) {
        try { await redis.set(cacheKey, JSON.stringify(failObj), { ex: 300 }); } catch {} // 5 minutes TTL
      }
      return failObj;
    } catch (err) {
      const detail = err.response?.data?.message || err.message;
      logger.debug('NowPaymentsService', `getMinAmount unavailable for pair ${from}->${to}: ${detail}`);
      const errObj = { success: false, error: detail };
      if (redis) {
        try { await redis.set(cacheKey, JSON.stringify(errObj), { ex: 300 }); } catch {} // 5 minutes TTL
      }
      return errObj;
    }
  }

  /**
   * Get the status of a specific payment by its payment_id.
   */
  async getPaymentStatus(paymentId) {
    if (!this.apiKey) {
      logger.error('NowPaymentsService', 'NOWPAYMENTS_API_KEY is not configured');
      return { success: false, error: 'Payment gateway not configured' };
    }

    try {
      logger.info('NowPaymentsService', `Fetching payment status: payment_id=${paymentId}`);
      const response = await axios.get(
        `${this.baseURL}/v1/payment/${paymentId}`,
        {
          headers: {
            'x-api-key': this.apiKey,
          },
          timeout: 10000,
        }
      );

      const body = response.data;
      return { success: true, status: body.payment_status || body.status };
    } catch (err) {
      const detail = err.response?.data?.message || err.message;
      logger.error('NowPaymentsService', `getPaymentStatus exception: ${detail}`);
      return { success: false, error: detail };
    }
  }
}

module.exports = new NowPaymentsService();
