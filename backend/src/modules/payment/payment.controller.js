const tokopayService = require('./tokopay.service');
const nowpaymentsService = require('./nowpayments.service');
const paymentModel = require('./payment.model');
const licensesModel = require('../licenses/licenses.model');
const currencyModel = require('../currency/currency.model');
const voucherModel = require('../vouchers/vouchers.model');
const { v4: uuidv4 } = require('uuid');
const env = require('../../config/env');
const logger = require('../../config/logger');
const { getRedis } = require('../../config/redis');

/** Plan configuration - single source of truth */
const PLAN_CONFIG = {
  premium: { price_usd: 2, duration_days: 30, hwid_count: 5,  extra_hwid_price_usd: 0 },
  pro:     { price_usd: 6, duration_days: 90, hwid_count: 12, extra_hwid_price_usd: 0.5, max_hwid: 50 },
};

/** Max extra HWID slots per plan */
const PRO_EXTRA_HWID_PRICE_USD = 0.5;  // per slot
const PRO_MAX_HWID = 50;
const PRO_BASE_HWID = 12;

class PaymentController {
  /**
   * Helper method to validate voucher and calculate discounted amount
   * @private
   */
  async _getDiscountedAmount(voucherCode, plan, userId, amountIDR) {
    if (!voucherCode) return { discountedAmount: amountIDR, discountPercent: 0, voucher: null };
    
    const trimmed = voucherCode.trim().toUpperCase();
    const voucher = await voucherModel.findByCode(trimmed);
    if (!voucher) {
      throw new Error('Voucher code not found');
    }

    if (voucher.tier !== plan) {
      throw new Error(`This voucher is only valid for the ${voucher.tier.toUpperCase()} plan`);
    }

    if (voucher.active_from && new Date(voucher.active_from) > new Date()) {
      throw new Error('This voucher is not active yet');
    }

    if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
      throw new Error('This voucher has expired');
    }

    if (voucher.uses_count >= voucher.max_uses) {
      throw new Error('This voucher has reached its maximum usage limit');
    }

    const claimCount = await voucherModel.countClaims(voucher.id, userId);
    if (claimCount >= 3) {
      throw new Error('You have already claimed this voucher the maximum number of times (3)');
    }

    const discountPercent = voucher.discount_percent || 0;
    const discountedAmount = Math.ceil(amountIDR * (1 - discountPercent / 100));

    return { discountedAmount, discountPercent, voucher };
  }

  /**
   * POST /v1/payment/qris/create-order
   * Buat order QRIS baru via Tokopay.
   */
  async createQRISOrder(req, res, next) {
    try {
      const { plan, voucher: voucherCode, extra_hwid_slots: extraHwidRaw } = req.body;
      const userId = req.user?.id;

      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

      if (!plan || !PLAN_CONFIG[plan]) {
        return res.status(400).json({ success: false, error: `Invalid plan. Valid plans: ${Object.keys(PLAN_CONFIG).join(', ')}` });
      }

      // Ambil kurs USD→IDR dari database (diisi owner via halaman currency)
      const usdCurrency = await currencyModel.getByCode('USD');
      const usdRate = usdCurrency ? Number(usdCurrency.rate_to_idr) : 20000;

      const planConfig = PLAN_CONFIG[plan];
      let amountIDR = Math.ceil(planConfig.price_usd * usdRate);

      // Extra HWID slots - only for Pro plan
      let extraHwidSlots = 0;
      if (plan === 'pro' && extraHwidRaw) {
        extraHwidSlots = Math.max(0, Math.min(PRO_MAX_HWID - PRO_BASE_HWID, parseInt(extraHwidRaw, 10) || 0));
        const extraUSD = extraHwidSlots * PRO_EXTRA_HWID_PRICE_USD;
        amountIDR += Math.ceil(extraUSD * usdRate);
      }

      let discountPercent = 0;
      let appliedVoucherCode = null;

      if (voucherCode) {
        try {
          const discountInfo = await this._getDiscountedAmount(voucherCode, plan, userId, amountIDR);
          amountIDR = discountInfo.discountedAmount;
          discountPercent = discountInfo.discountPercent;
          appliedVoucherCode = discountInfo.voucher.code;
        } catch (vErr) {
          return res.status(400).json({ success: false, error: vErr.message });
        }
      }

      // ref_id unik untuk merchant
      const refId = `VSYN-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
      const userEmail = req.user?.email || `user${userId}@valincsyn.app`;
      // Prioritas: name (full name) → username → fallback
      const userName = req.user?.name || req.user?.username || `User-${userId.slice(0, 8)}`;

      // Expired order dari .env: TOKOPAY_ORDER_EXPIRY (default 24h)
      const expirySeconds = env.TOKOPAY_ORDER_EXPIRY_SECONDS || 86400;
      const expiredTs = Math.floor(Date.now() / 1000) + expirySeconds;

      logger.info('PaymentController', `Creating QRIS order: plan=${plan} amount_idr=${amountIDR} usd_rate=${usdRate} expiry=${expirySeconds}s user=${userId} voucher=${appliedVoucherCode}`);

      const tokopayResult = await tokopayService.createOrder({
        ref_id: refId,
        kode_channel: 'QRIS',
        amount: amountIDR,
        customer_name: userName,
        customer_email: userEmail,
        customer_phone: req.user?.phone || '08123456789',
        redirect_url: `${env.frontendUrl}/portal/payment/qris?orderId=${refId}`,
        expired_ts: expiredTs,
        plan_label: `VALINC SYNDICATE ${plan.toUpperCase()} Plan`,
        items: [
          {
            product_code: `VSYN-${plan.toUpperCase()}`,
            name: `VALINC SYNDICATE ${plan.toUpperCase()} Plan`,
            price: amountIDR,
            product_url: `${env.frontendUrl}/portal/plans`,
            image_url: '',
          },
        ],
      });

      if (!tokopayResult.success) {
        logger.error('PaymentController', `Tokopay order failed: ${tokopayResult.error}`);
        return res.status(502).json({
          success: false,
          error: 'Payment gateway error',
          detail: tokopayResult.error || 'Gagal membuat order di Tokopay',
        });
      }

      const tpData = tokopayResult.data;

      // Simpan expired_at ke DB - pakai dari env, bukan dari Tokopay response
      const storedExpiredAt = new Date(expiredTs * 1000);

      // Simpan transaksi ke database
      await paymentModel.create({
        user_id: userId,
        ref_id: refId,
        trx_id: tpData.trx_id,
        payment_method: 'qris',
        plan_type: plan,
        amount: amountIDR,
        total_bayar: tpData.total_bayar,
        total_diterima: tpData.total_diterima,
        status: 'pending',
        qr_link: tpData.qr_link || tpData.pay_url,
        pay_url: tpData.pay_url,
        expired_at: storedExpiredAt,
        voucher_code: appliedVoucherCode,
        extra_hwid_slots: extraHwidSlots || 0,
      });

      return res.status(200).json({
        success: true,
        data: {
          ref_id: refId,
          trx_id: tpData.trx_id,
          pay_url: tpData.pay_url,
          qr_link: tpData.qr_link,       // URL gambar QR (bisa di-embed langsung)
          qr_string: tpData.qr_string,   // Raw QRIS string
          total_bayar: tpData.total_bayar,
          total_diterima: tpData.total_diterima,
          price_usd: planConfig.price_usd,
          usd_rate: usdRate,
          amount_idr: amountIDR,
          expired_at: Math.floor(storedExpiredAt.getTime() / 1000),
          plan_type: plan,
          discount_percent: discountPercent,
          voucher_code: appliedVoucherCode,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /v1/payment/crypto/create-order
   * Buat order crypto baru via NOWPayments.
   */
  async createCryptoOrder(req, res, next) {
    try {
      const { plan, coin, voucher: voucherCode, extra_hwid_slots: extraHwidRaw } = req.body;
      const userId = req.user?.id;

      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

      if (!plan || !PLAN_CONFIG[plan]) {
        return res.status(400).json({ success: false, error: `Invalid plan. Valid plans: ${Object.keys(PLAN_CONFIG).join(', ')}` });
      }

      if (!coin) {
        return res.status(400).json({ success: false, error: 'Crypto coin (e.g. usdttrc20) is required' });
      }

      // Ambil kurs USD→IDR dari database untuk konversi & pencatatan DB (dalam IDR)
      const usdCurrency = await currencyModel.getByCode('USD');
      const usdRate = usdCurrency ? Number(usdCurrency.rate_to_idr) : 20000;

      const planConfig = PLAN_CONFIG[plan];
      let priceUSD = planConfig.price_usd;
      let amountIDR = Math.ceil(priceUSD * usdRate);

      // Extra HWID slots - only for Pro plan
      let extraHwidSlots = 0;
      if (plan === 'pro' && extraHwidRaw) {
        extraHwidSlots = Math.max(0, Math.min(PRO_MAX_HWID - PRO_BASE_HWID, parseInt(extraHwidRaw, 10) || 0));
        const extraUSD = extraHwidSlots * PRO_EXTRA_HWID_PRICE_USD;
        priceUSD += extraUSD;
        amountIDR += Math.ceil(extraUSD * usdRate);
      }

      let discountPercent = 0;
      let appliedVoucherCode = null;

      if (voucherCode) {
        try {
          const discountInfo = await this._getDiscountedAmount(voucherCode, plan, userId, amountIDR);
          amountIDR = discountInfo.discountedAmount;
          discountPercent = discountInfo.discountPercent;
          appliedVoucherCode = discountInfo.voucher.code;
          // Apply same discount to priceUSD
          priceUSD = priceUSD * (1 - discountPercent / 100);
        } catch (vErr) {
          return res.status(400).json({ success: false, error: vErr.message });
        }
      }

      const refId = `VSYN-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
      
      const successUrl = `${env.frontendUrl}/portal/plans?payment=success&orderId=${refId}`;
      const cancelUrl = `${env.frontendUrl}/portal/payment?plan=${plan}`;
      const ipnCallbackUrl = `${env.backendUrl}/v1/payment/callback/nowpayments`;

      logger.info('PaymentController', `Creating NOWPayments crypto order: plan=${plan} coin=${coin} price_usd=${priceUSD} amount_idr=${amountIDR} user=${userId} voucher=${appliedVoucherCode}`);

      // 1. Create Invoice
      const nowpaymentsResult = await nowpaymentsService.createInvoice({
        price_amount: priceUSD,
        price_currency: 'usd',
        order_id: refId,
        order_description: `VALINC SYNDICATE ${plan.toUpperCase()} Plan`,
        ipn_callback_url: ipnCallbackUrl,
        success_url: successUrl,
        cancel_url: cancelUrl
      });

      if (!nowpaymentsResult.success) {
        logger.error('PaymentController', `NOWPayments invoice creation failed: ${nowpaymentsResult.error}`);
        return res.status(502).json({
          success: false,
          error: 'Payment gateway error',
          detail: nowpaymentsResult.error || 'Gagal membuat invoice di NOWPayments',
        });
      }

      const npInvoiceData = nowpaymentsResult.data;

      // 2. Create Payment for the Invoice
      const payResult = await nowpaymentsService.createInvoicePayment(npInvoiceData.invoice_id, coin);
      if (!payResult.success) {
        logger.error('PaymentController', `NOWPayments payment creation failed for coin=${coin}: ${payResult.error}`);
        return res.status(400).json({
          success: false,
          error: payResult.error || `Gagal membuat pembayaran dengan koin ${coin.toUpperCase()}`,
        });
      }

      const npPaymentData = payResult.data;

      // Simpan expired_at: default 24h dari sekarang (NOWPayments default)
      const storedExpiredAt = new Date(Date.now() + 86400 * 1000);

      // Simpan transaksi ke database (jumlah disimpan dalam IDR agar konsisten dengan admin panel/history)
      await paymentModel.create({
        user_id: userId,
        ref_id: refId,
        trx_id: npPaymentData.payment_id,
        payment_method: 'crypto',
        plan_type: plan,
        amount: amountIDR,
        total_bayar: amountIDR,
        total_diterima: amountIDR,
        status: 'pending',
        pay_url: npInvoiceData.invoice_url,
        bank_code: coin,
        crypto_address: npPaymentData.pay_address,
        crypto_amount: npPaymentData.pay_amount,
        crypto_extra_id: npPaymentData.payin_extra_id,
        expired_at: storedExpiredAt,
        voucher_code: appliedVoucherCode,
        extra_hwid_slots: extraHwidSlots || 0,
      });

      return res.status(200).json({
        success: true,
        data: {
          ref_id: refId,
          trx_id: npPaymentData.payment_id,
          pay_url: npInvoiceData.invoice_url,
          price_usd: priceUSD,
          amount_idr: amountIDR,
          expired_at: Math.floor(storedExpiredAt.getTime() / 1000),
          plan_type: plan,
          discount_percent: discountPercent,
          voucher_code: appliedVoucherCode,
          crypto_address: npPaymentData.pay_address,
          crypto_amount: npPaymentData.pay_amount,
          crypto_extra_id: npPaymentData.payin_extra_id,
          coin: coin,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /v1/payment/callback/nowpayments
   * Webhook callback dari NOWPayments setelah status pembayaran berubah.
   */
  async nowpaymentsCallback(req, res, next) {
    try {
      let callbackData = req.body;

      // rawBodyParser mengirim Buffer - parse jika perlu
      if (Buffer.isBuffer(callbackData)) {
        callbackData = JSON.parse(callbackData.toString());
      } else if (typeof callbackData === 'string') {
        callbackData = JSON.parse(callbackData);
      }

      const signature = req.headers['x-nowpayments-sig'];
      
      const isValid = nowpaymentsService.verifyCallbackSignature(callbackData, signature);
      if (!isValid) {
        logger.warn('PaymentController', `Invalid NOWPayments callback signature for order_id=${callbackData?.order_id}`);
        return res.status(403).json({ success: false, error: 'Invalid signature' });
      }

      const { order_id, payment_status, payment_id } = callbackData;
      
      logger.info('PaymentController', `Received NOWPayments callback: order_id=${order_id} status=${payment_status} payment_id=${payment_id}`);

      const tx = await paymentModel.findByRefId(order_id);
      if (!tx) {
        logger.warn('PaymentController', `NOWPayments callback for unknown order_id=${order_id}`);
        return res.status(404).json({ success: false, error: 'Transaction not found' });
      }

      // Status sukses dari NOWPayments: 'finished'
      if (payment_status === 'finished' && tx.status !== 'paid') {
        await paymentModel.updateStatus(order_id, 'paid', payment_id, new Date());
        await this._activateLicense(tx.user_id, tx.plan_type, tx.ref_id);
        logger.info('PaymentController', `NOWPayments callback activated license: user=${tx.user_id} plan=${tx.plan_type} ref_id=${order_id}`);
      } else if (['failed', 'expired'].includes(payment_status) && tx.status === 'pending') {
        await paymentModel.updateStatus(order_id, 'failed', payment_id);
        logger.info('PaymentController', `NOWPayments callback marked order as failed: ref_id=${order_id} status=${payment_status}`);
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /v1/payment/crypto/coins
   * Ambil daftar koin crypto yang diaktifkan merchant.
   * Mendukung filter koin yang memiliki minimum deposit lebih kecil atau sama dengan harga plan (fiat equivalent).
   */
  async getMerchantCoins(req, res, next) {
    try {
      const { plan, voucher: voucherCode, extra_hwid_slots: extraHwidRaw } = req.query;
      const userId = req.user?.id;

      const result = await nowpaymentsService.getMerchantCoins();
      if (!result.success) {
        return res.status(502).json({ success: false, error: 'Failed to retrieve merchant coins' });
      }

      const currencies = result.currencies;

      // Jika parameter plan tidak ada, kembalikan seluruh currencies langsung
      if (!plan || !PLAN_CONFIG[plan]) {
        return res.status(200).json({ success: true, data: currencies });
      }

      // Hitung harga plan saat ini dalam USD
      const planConfig = PLAN_CONFIG[plan];
      let priceUSD = planConfig.price_usd;

      // Tambahkan biaya extra HWID slots jika ada (Pro plan only)
      if (plan === 'pro' && extraHwidRaw) {
        const extraHwidSlots = Math.max(0, Math.min(PRO_MAX_HWID - PRO_BASE_HWID, parseInt(extraHwidRaw, 10) || 0));
        priceUSD += extraHwidSlots * PRO_EXTRA_HWID_PRICE_USD;
      }

      if (voucherCode && userId) {
        try {
          const trimmed = voucherCode.trim().toUpperCase();
          const voucher = await voucherModel.findByCode(trimmed);
          if (voucher && voucher.tier === plan && voucher.uses_count < voucher.max_uses) {
            const discountPercent = voucher.discount_percent || 0;
            priceUSD = priceUSD * (1 - discountPercent / 100);
          }
        } catch (vErr) {
          // Abaikan kesalahan voucher, gunakan harga dasar
        }
      }

      const redis = getRedis();
      const mapCacheKey = 'np_coins_min_map';
      let minMap = null;

      if (redis) {
        try {
          const cachedMap = await redis.get(mapCacheKey);
          if (cachedMap) {
            minMap = typeof cachedMap === 'string' ? JSON.parse(cachedMap) : cachedMap;
          }
        } catch (cErr) {
          // Fail open on Redis read error
        }
      }

      // Jika minMap belum ada di Redis, bangun map baru secara bertahap (chunk size 20)
      if (!minMap) {
        minMap = {};
        const chunkSize = 20;
        for (let i = 0; i < currencies.length; i += chunkSize) {
          const chunk = currencies.slice(i, i + chunkSize);
          await Promise.all(
            chunk.map(async (coin) => {
              try {
                const minResult = await nowpaymentsService.getMinAmount('usd', coin);
                if (minResult && minResult.success && typeof minResult.min_amount === 'number') {
                  minMap[coin] = minResult.min_amount;
                }
              } catch {
                // Ignore single coin failure
              }
            })
          );
        }

        if (redis && Object.keys(minMap).length > 0) {
          try {
            await redis.set(mapCacheKey, JSON.stringify(minMap), { ex: 300 }); // Cache 5 min
          } catch (cErr) {
            // Ignore Redis write error
          }
        }
      }

      // Filter koin secara presisi & instan berdasarkan minMap
      const filteredCoins = currencies.filter((coin) => {
        return typeof minMap[coin] === 'number' && priceUSD >= minMap[coin];
      });

      return res.status(200).json({ success: true, data: filteredCoins });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /v1/payment/crypto/status?ref_id=VSYN-...
   * Polling status transaksi crypto.
   */
  async checkCryptoStatus(req, res, next) {
    try {
      const { ref_id } = req.query;
      const userId = req.user?.id;

      if (!ref_id) return res.status(400).json({ success: false, error: 'ref_id is required' });

      const tx = await paymentModel.findByRefId(ref_id);
      if (!tx) return res.status(404).json({ success: false, error: 'Transaction not found' });
      if (tx.user_id !== userId) return res.status(403).json({ success: false, error: 'Unauthorized' });

      if (tx.status === 'paid') {
        return res.status(200).json({
          success: true,
          data: { ref_id, status: 'Success', amount: tx.amount, plan: tx.plan_type },
        });
      }

      if (!tx.trx_id) {
        return res.status(200).json({
          success: true,
          data: { ref_id, status: 'Pending', amount: tx.amount, plan: tx.plan_type },
        });
      }

      const result = await nowpaymentsService.getPaymentStatus(tx.trx_id);
      if (!result.success) {
        return res.status(502).json({ success: false, error: 'Payment gateway error' });
      }

      const npStatus = result.status; // waiting, confirming, confirmed, finished, failed, expired
      let txStatus = 'pending';

      if (npStatus === 'finished') {
        txStatus = 'paid';
        await paymentModel.updateStatus(ref_id, 'paid', tx.trx_id, new Date());
        await this._activateLicense(userId, tx.plan_type, tx.ref_id);
        logger.info('PaymentController', `License activated via checkCryptoStatus: user=${userId} plan=${tx.plan_type} ref=${ref_id}`);
      } else if (['failed', 'expired'].includes(npStatus)) {
        txStatus = 'failed';
        await paymentModel.updateStatus(ref_id, 'failed', tx.trx_id);
      }

      const displayStatus = txStatus === 'paid' ? 'Success' : (txStatus === 'failed' ? 'Failed' : 'Pending');

      return res.status(200).json({
        success: true,
        data: { ref_id, status: displayStatus, amount: tx.amount, plan: tx.plan_type },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /v1/payment/qris/order?ref_id=VSYN-...
   * Ambil detail transaksi berdasarkan ref_id.
   */
  async getQRISOrder(req, res, next) {
    try {
      const { ref_id } = req.query;
      const userId = req.user?.id;

      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
      if (!ref_id) return res.status(400).json({ success: false, error: 'ref_id is required' });

      const tx = await paymentModel.findByRefId(ref_id);
      if (!tx) return res.status(404).json({ success: false, error: 'Order not found' });
      if (tx.user_id !== userId) return res.status(403).json({ success: false, error: 'Forbidden' });

      const usdCurrency = await currencyModel.getByCode('USD');
      const usdRate = usdCurrency ? Number(usdCurrency.rate_to_idr) : 20000;
      const planConfig = PLAN_CONFIG[tx.plan_type] || PLAN_CONFIG.premium;

      const extraSlots = tx.extra_hwid_slots || 0;
      let totalUSD = planConfig.price_usd;
      if (tx.plan_type === 'pro' && extraSlots > 0) {
        totalUSD += extraSlots * PRO_EXTRA_HWID_PRICE_USD;
      }

      return res.status(200).json({
        success: true,
        data: {
          ref_id: tx.ref_id,
          trx_id: tx.trx_id,
          pay_url: tx.pay_url,
          qr_link: tx.qr_link,
          qr_string: tx.qr_string || null,
          va_number: tx.va_number || null,
          bank_code: tx.bank_code || null,
          total_bayar: tx.total_bayar || tx.amount,
          total_diterima: tx.total_diterima || tx.amount,
          price_usd: Number(totalUSD.toFixed(2)),
          base_price_usd: planConfig.price_usd,
          extra_hwid_slots: extraSlots,
          extra_hwid_price_usd: Number((extraSlots * PRO_EXTRA_HWID_PRICE_USD).toFixed(2)),
          usd_rate: usdRate,
          amount_idr: tx.amount,
          expired_at: tx.expired_at ? Math.floor(new Date(tx.expired_at).getTime() / 1000) : null,
          status: tx.status,
          plan_type: tx.plan_type,
          crypto_address: tx.crypto_address || null,
          crypto_amount: tx.crypto_amount || null,
          crypto_extra_id: tx.crypto_extra_id || null,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /v1/payment/qris/status?ref_id=VSYN-...
   * Cek status pembayaran dari Tokopay dan update DB jika sudah paid.
   */
  async checkQRISStatus(req, res, next) {
    try {
      const { ref_id } = req.query;
      const userId = req.user?.id;

      if (!ref_id) return res.status(400).json({ success: false, error: 'ref_id is required' });

      const tx = await paymentModel.findByRefId(ref_id);
      if (!tx) return res.status(404).json({ success: false, error: 'Transaction not found' });
      if (tx.user_id !== userId) return res.status(403).json({ success: false, error: 'Unauthorized' });

      // Jika sudah paid di DB, kembalikan langsung tanpa hit Tokopay
      if (tx.status === 'paid') {
        return res.status(200).json({
          success: true,
          data: { ref_id, status: 'Success', amount: tx.amount, plan: tx.plan_type },
        });
      }

      const result = await tokopayService.checkOrderStatus(ref_id);
      if (!result.success) {
        return res.status(502).json({ success: false, error: 'Payment gateway error' });
      }

      const tokopayStatus = result.data.status; // Pending | Success | Failed | Expired

      if (tokopayStatus === 'Success' && tx.status !== 'paid') {
        await paymentModel.updateStatus(ref_id, 'paid', result.data.trx_id, new Date());
        await this._activateLicense(userId, tx.plan_type, tx.ref_id);
        logger.info('PaymentController', `License activated: user=${userId} plan=${tx.plan_type} ref=${ref_id}`);
      } else if (['Failed', 'Expired'].includes(tokopayStatus) && tx.status === 'pending') {
        await paymentModel.updateStatus(ref_id, 'failed', result.data.trx_id);
      }

      return res.status(200).json({
        success: true,
        data: { ref_id, status: tokopayStatus, amount: tx.amount, plan: tx.plan_type },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /v1/payment/callback/tokopay
   * Webhook callback dari Tokopay setelah pembayaran berhasil/gagal.
   */
  async tokopayCallback(req, res, next) {
    try {
      let callbackData = req.body;

      // rawBodyParser mengirim Buffer - parse jika perlu
      if (Buffer.isBuffer(callbackData)) {
        callbackData = JSON.parse(callbackData.toString());
      } else if (typeof callbackData === 'string') {
        callbackData = JSON.parse(callbackData);
      }

      const isValid = tokopayService.verifyCallbackSignature(callbackData);
      if (!isValid) {
        logger.warn('PaymentController', `Invalid callback signature for reff_id=${callbackData?.reff_id}`);
        return res.status(403).json({ success: false, error: 'Invalid signature' });
      }

      const { reff_id, status, trx_id } = callbackData;
      const tx = await paymentModel.findByRefId(reff_id);
      if (!tx) {
        logger.warn('PaymentController', `Callback for unknown reff_id=${reff_id}`);
        return res.status(404).json({ success: false, error: 'Transaction not found' });
      }

      if (status === 'Success' && tx.status !== 'paid') {
        await paymentModel.updateStatus(reff_id, 'paid', trx_id, new Date());
        await this._activateLicense(tx.user_id, tx.plan_type, tx.ref_id);
        logger.info('PaymentController', `Callback activated license: user=${tx.user_id} plan=${tx.plan_type}`);
      } else if (['Failed', 'Expired'].includes(status) && tx.status === 'pending') {
        await paymentModel.updateStatus(reff_id, 'failed', trx_id);
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Aktifkan lisensi user setelah pembayaran berhasil.
   * @private
   */
  async _activateLicense(userId, planType, refId) {
    const config = PLAN_CONFIG[planType];
    if (!config) {
      logger.error('PaymentController', `Unknown plan type "${planType}" for license activation`);
      return null;
    }

    // Ambil voucher_code jika ada pada transaksi
    let voucherCode = null;
    if (refId) {
      const tx = await paymentModel.findByRefId(refId);
      if (!tx) {
        logger.error('PaymentController', `Transaction not found for ref_id ${refId}`);
        return null;
      }
      if (tx.license_id) {
        logger.warn('PaymentController', `License already activated for transaction ref_id ${refId}`);
        return tx.license_id;
      }
      if (tx.voucher_code) {
        voucherCode = tx.voucher_code;
      }
    }

    const licenseKey = `VSYN-${Date.now().toString(36).toUpperCase()}-${uuidv4().slice(0, 6).toUpperCase()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.duration_days);

    // Extra HWID slots from the transaction (Pro plan only)
    const txExtraHwid = (tx && tx.extra_hwid_slots) ? parseInt(tx.extra_hwid_slots, 10) : 0;
    const finalHwidLimit = config.hwid_count + txExtraHwid;

    const license = await licensesModel.create({
      user_id: userId,
      license_key: licenseKey,
      tier: planType,
      hwid_limit: finalHwidLimit,
      expires_at: expiresAt,
      status: 'active',
    });

    // Link lisensi ke transaksi
    if (refId && license && license.id) {
      await paymentModel.linkLicense(refId, license.id);
    }

    // Catat claim voucher di database jika transaksi ini menggunakan voucher
    if (voucherCode) {
      try {
        const voucher = await voucherModel.findByCode(voucherCode);
        if (voucher) {
          await voucherModel.createClaim(voucher.id, userId);
          await voucherModel.incrementUses(voucher.id);
          logger.info('PaymentController', `Voucher claimed successfully on paid transaction: user=${userId} voucher=${voucher.code}`);
        }
      } catch (vErr) {
        logger.error('PaymentController', `Failed to log voucher claim for user=${userId} voucher=${voucherCode}: ${vErr.message}`);
      }
    }

    logger.info('PaymentController', `License created: key=${licenseKey} plan=${planType} expires=${expiresAt.toISOString()}`);
    return license ? license.id : null;
  }

  /**
   * GET /v1/payment/qris/download?ref_id=VSYN-...
   * Proxy download gambar QRIS dari Tokopay supaya tidak kena CORS di browser.
   * Server fetch gambar → stream ke client sebagai attachment.
   */
  async downloadQRIS(req, res, next) {
    try {
      const { ref_id } = req.query;
      const userId = req.user?.id;

      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
      if (!ref_id) return res.status(400).json({ success: false, error: 'ref_id is required' });

      const tx = await paymentModel.findByRefId(ref_id);
      if (!tx) return res.status(404).json({ success: false, error: 'Order not found' });
      if (tx.user_id !== userId) return res.status(403).json({ success: false, error: 'Forbidden' });

      const qrUrl = tx.qr_link;
      if (!qrUrl) return res.status(404).json({ success: false, error: 'QR image not available for this order' });

      // Fetch gambar dari Tokopay (server-side, tidak ada CORS)
      const imgResponse = await fetch(qrUrl, {
        headers: { 'User-Agent': 'VALINC-SYNDICATE/1.0' },
      });

      if (!imgResponse.ok) {
        logger.warn('PaymentController', `Failed to fetch QR image: ${imgResponse.status} ${qrUrl}`);
        return res.status(502).json({ success: false, error: 'Failed to fetch QR image from gateway' });
      }

      const contentType = imgResponse.headers.get('content-type') || 'image/png';
      const buffer = Buffer.from(await imgResponse.arrayBuffer());

      const filename = `QRIS-${ref_id}.png`;

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Cache-Control', 'no-cache');
      return res.send(buffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /v1/payment/bank/create-order
   * Buat order Bank Transfer (Virtual Account) baru via Tokopay.
   */
  async createBankOrder(req, res, next) {
    try {
      const { plan, bank, voucher: voucherCode, extra_hwid_slots: extraHwidRaw } = req.body;
      const userId = req.user?.id;

      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

      if (!plan || !PLAN_CONFIG[plan]) {
        return res.status(400).json({ success: false, error: `Invalid plan. Valid plans: ${Object.keys(PLAN_CONFIG).join(', ')}` });
      }

      const SUPPORTED_BANKS = ['BCAVA', 'MANDIRIVA', 'BNIVA', 'BRIVA', 'PERMATAVA', 'BSIVA', 'CIMBVA', 'DANAMONVA', 'BNCVA'];
      if (!bank || !SUPPORTED_BANKS.includes(bank)) {
        return res.status(400).json({ success: false, error: `Invalid bank channel. Supported: ${SUPPORTED_BANKS.join(', ')}` });
      }

      // Ambil kurs USD→IDR dari database (diisi owner via halaman currency)
      const usdCurrency = await currencyModel.getByCode('USD');
      const usdRate = usdCurrency ? Number(usdCurrency.rate_to_idr) : 20000;

      const planConfig = PLAN_CONFIG[plan];
      let amountIDR = Math.ceil(planConfig.price_usd * usdRate);

      // Extra HWID slots - only for Pro plan
      let extraHwidSlots = 0;
      if (plan === 'pro' && extraHwidRaw) {
        extraHwidSlots = Math.max(0, Math.min(PRO_MAX_HWID - PRO_BASE_HWID, parseInt(extraHwidRaw, 10) || 0));
        amountIDR += Math.ceil(extraHwidSlots * PRO_EXTRA_HWID_PRICE_USD * usdRate);
      }

      let discountPercent = 0;
      let appliedVoucherCode = null;

      if (voucherCode) {
        try {
          const discountInfo = await this._getDiscountedAmount(voucherCode, plan, userId, amountIDR);
          amountIDR = discountInfo.discountedAmount;
          discountPercent = discountInfo.discountPercent;
          appliedVoucherCode = discountInfo.voucher.code;
        } catch (vErr) {
          return res.status(400).json({ success: false, error: vErr.message });
        }
      }

      // ref_id unik untuk merchant
      const refId = `VSYN-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
      const userEmail = req.user?.email || `user${userId}@valincsyn.app`;
      // Prioritas: name (full name) → username → fallback
      const userName = req.user?.name || req.user?.username || `User-${userId.slice(0, 8)}`;

      // Expired order dari .env: TOKOPAY_ORDER_EXPIRY (default 24h)
      const expirySeconds = env.TOKOPAY_ORDER_EXPIRY_SECONDS || 86400;
      const expiredTs = Math.floor(Date.now() / 1000) + expirySeconds;

      logger.info('PaymentController', `Creating bank order: plan=${plan} bank=${bank} amount_idr=${amountIDR} usd_rate=${usdRate} expiry=${expirySeconds}s user=${userId} voucher=${appliedVoucherCode}`);

      const tokopayResult = await tokopayService.createOrder({
        ref_id: refId,
        kode_channel: bank,
        amount: amountIDR,
        customer_name: userName,
        customer_email: userEmail,
        customer_phone: req.user?.phone || '08123456789',
        redirect_url: `${env.frontendUrl}/portal/payment/bank?orderId=${refId}`,
        expired_ts: expiredTs,
        plan_label: `VALINC SYNDICATE ${plan.toUpperCase()} Plan`,
        items: [
          {
            product_code: `VSYN-${plan.toUpperCase()}`,
            name: `VALINC SYNDICATE ${plan.toUpperCase()} Plan`,
            price: amountIDR,
            product_url: `${env.frontendUrl}/portal/plans`,
            image_url: '',
          },
        ],
      });

      if (!tokopayResult.success) {
        logger.error('PaymentController', `Tokopay order failed: ${tokopayResult.error}`);
        return res.status(502).json({
          success: false,
          error: 'Payment gateway error',
          detail: tokopayResult.error || 'Gagal membuat order di Tokopay',
        });
      }

      const tpData = tokopayResult.data;

      // Simpan expired_at ke DB
      const storedExpiredAt = new Date(expiredTs * 1000);

      // Simpan transaksi ke database
      await paymentModel.create({
        user_id: userId,
        ref_id: refId,
        trx_id: tpData.trx_id,
        payment_method: 'bank',
        plan_type: plan,
        amount: amountIDR,
        total_bayar: tpData.total_bayar,
        total_diterima: tpData.total_diterima,
        status: 'pending',
        pay_url: tpData.pay_url,
        va_number: tpData.nomor_va,
        bank_code: bank,
        expired_at: storedExpiredAt,
        voucher_code: appliedVoucherCode,
        extra_hwid_slots: extraHwidSlots || 0,
      });

      return res.status(200).json({
        success: true,
        data: {
          ref_id: refId,
          trx_id: tpData.trx_id,
          pay_url: tpData.pay_url,
          va_number: tpData.nomor_va,
          bank_code: bank,
          total_bayar: tpData.total_bayar,
          total_diterima: tpData.total_diterima,
          price_usd: planConfig.price_usd,
          usd_rate: usdRate,
          amount_idr: amountIDR,
          expired_at: Math.floor(storedExpiredAt.getTime() / 1000),
          plan_type: plan,
          discount_percent: discountPercent,
          voucher_code: appliedVoucherCode,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /v1/payment/emoney/create-order
   * Buat order E-Money baru via Tokopay.
   */
  async createEmoneyOrder(req, res, next) {
    try {
      const { plan, emoney, voucher: voucherCode, extra_hwid_slots: extraHwidRaw } = req.body;
      const userId = req.user?.id;
 
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
 
      if (!plan || !PLAN_CONFIG[plan]) {
        return res.status(400).json({ success: false, error: `Invalid plan. Valid plans: ${Object.keys(PLAN_CONFIG).join(', ')}` });
      }
 
      const SUPPORTED_EMONEY = ['GOPAY', 'SHOPEEPAY', 'OVOPUSH', 'DANA', 'LINKAJA', 'ASTRAPAY', 'VIRGO'];
      if (!emoney || !SUPPORTED_EMONEY.includes(emoney)) {
        return res.status(400).json({ success: false, error: `Invalid e-money channel. Supported: ${SUPPORTED_EMONEY.join(', ')}` });
      }
 
      // Ambil kurs USD→IDR dari database (diisi owner via halaman currency)
      const usdCurrency = await currencyModel.getByCode('USD');
      const usdRate = usdCurrency ? Number(usdCurrency.rate_to_idr) : 20000;
 
      const planConfig = PLAN_CONFIG[plan];
      let amountIDR = Math.ceil(planConfig.price_usd * usdRate);

      // Extra HWID slots - only for Pro plan
      let extraHwidSlots = 0;
      if (plan === 'pro' && extraHwidRaw) {
        extraHwidSlots = Math.max(0, Math.min(PRO_MAX_HWID - PRO_BASE_HWID, parseInt(extraHwidRaw, 10) || 0));
        amountIDR += Math.ceil(extraHwidSlots * PRO_EXTRA_HWID_PRICE_USD * usdRate);
      }

      let discountPercent = 0;
      let appliedVoucherCode = null;

      if (voucherCode) {
        try {
          const discountInfo = await this._getDiscountedAmount(voucherCode, plan, userId, amountIDR);
          amountIDR = discountInfo.discountedAmount;
          discountPercent = discountInfo.discountPercent;
          appliedVoucherCode = discountInfo.voucher.code;
        } catch (vErr) {
          return res.status(400).json({ success: false, error: vErr.message });
        }
      }
 
      // ref_id unik untuk merchant
      const refId = `VSYN-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
      const userEmail = req.user?.email || `user${userId}@valincsyn.app`;
      // Prioritas: name (full name) → username → fallback
      const userName = req.user?.name || req.user?.username || `User-${userId.slice(0, 8)}`;
 
      // Expired order dari .env: TOKOPAY_ORDER_EXPIRY (default 24h)
      const expirySeconds = env.TOKOPAY_ORDER_EXPIRY_SECONDS || 86400;
      const expiredTs = Math.floor(Date.now() / 1000) + expirySeconds;
 
      logger.info('PaymentController', `Creating emoney order: plan=${plan} emoney=${emoney} amount_idr=${amountIDR} usd_rate=${usdRate} expiry=${expirySeconds}s user=${userId} voucher=${appliedVoucherCode}`);
 
      const tokopayResult = await tokopayService.createOrder({
        ref_id: refId,
        kode_channel: emoney,
        amount: amountIDR,
        customer_name: userName,
        customer_email: userEmail,
        customer_phone: req.user?.phone || '08123456789',
        redirect_url: `${env.frontendUrl}/portal/payment/emoney?orderId=${refId}`,
        expired_ts: expiredTs,
        plan_label: `VALINC SYNDICATE ${plan.toUpperCase()} Plan`,
        items: [
          {
            product_code: `VSYN-${plan.toUpperCase()}`,
            name: `VALINC SYNDICATE ${plan.toUpperCase()} Plan`,
            price: amountIDR,
            product_url: `${env.frontendUrl}/portal/plans`,
            image_url: '',
          },
        ],
      });
 
      if (!tokopayResult.success) {
        logger.error('PaymentController', `Tokopay order failed: ${tokopayResult.error}`);
        return res.status(502).json({
          success: false,
          error: 'Payment gateway error',
          detail: tokopayResult.error || 'Gagal membuat order di Tokopay',
        });
      }
 
      const tpData = tokopayResult.data;
      // Log raw data for debugging deeplink URL
      logger.info('PaymentController', `Emoney order created: channel=${emoney} pay_url=${tpData.pay_url} qr_link=${tpData.qr_link} trx_id=${tpData.trx_id}`);
 
      // Simpan expired_at ke DB
      const storedExpiredAt = new Date(expiredTs * 1000);
 
      // Simpan transaksi ke database
      await paymentModel.create({
        user_id: userId,
        ref_id: refId,
        trx_id: tpData.trx_id,
        payment_method: 'emoney',
        plan_type: plan,
        amount: amountIDR,
        total_bayar: tpData.total_bayar,
        total_diterima: tpData.total_diterima,
        status: 'pending',
        pay_url: tpData.pay_url,
        qr_link: tpData.qr_link,
        qr_string: tpData.qr_string,
        bank_code: emoney,
        expired_at: storedExpiredAt,
        voucher_code: appliedVoucherCode,
        extra_hwid_slots: extraHwidSlots || 0,
      });
 
      return res.status(200).json({
        success: true,
        data: {
          ref_id: refId,
          trx_id: tpData.trx_id,
          pay_url: tpData.pay_url,
          qr_link: tpData.qr_link,
          qr_string: tpData.qr_string,
          bank_code: emoney,
          total_bayar: tpData.total_bayar,
          total_diterima: tpData.total_diterima,
          price_usd: planConfig.price_usd,
          usd_rate: usdRate,
          amount_idr: amountIDR,
          expired_at: Math.floor(storedExpiredAt.getTime() / 1000),
          plan_type: plan,
          discount_percent: discountPercent,
          voucher_code: appliedVoucherCode,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /v1/payment/bank/order?ref_id=VSYN-...
   * Ambil detail transaksi bank berdasarkan ref_id.
   */
  async getBankOrder(req, res, next) {
    return this.getQRISOrder(req, res, next);
  }

  /**
   * GET /v1/payment/bank/status?ref_id=VSYN-...
   * Cek status pembayaran bank transfer dari Tokopay dan update DB jika paid.
   */
  async checkBankStatus(req, res, next) {
    return this.checkQRISStatus(req, res, next);
  }

  /**
   * GET /v1/payment/emoney/order?ref_id=VSYN-...
   * Ambil detail transaksi emoney berdasarkan ref_id.
   */
  async getEmoneyOrder(req, res, next) {
    return this.getQRISOrder(req, res, next);
  }

  /**
   * GET /v1/payment/emoney/status?ref_id=VSYN-...
   * Cek status pembayaran emoney dari Tokopay dan update DB jika paid.
   */
  async checkEmoneyStatus(req, res, next) {
    return this.checkQRISStatus(req, res, next);
  }

  /**
   * POST /v1/payment/retail/create-order
   * Buat order Retail (Alfamart / Indomaret) baru via Tokopay.
   */
  async createRetailOrder(req, res, next) {
    try {
      const { plan, retail, voucher: voucherCode, extra_hwid_slots: extraHwidRaw } = req.body;
      const userId = req.user?.id;
 
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });
 
      if (!plan || !PLAN_CONFIG[plan]) {
        return res.status(400).json({ success: false, error: `Invalid plan. Valid plans: ${Object.keys(PLAN_CONFIG).join(', ')}` });
      }
 
      const SUPPORTED_RETAIL = ['ALFAMART', 'INDOMARET'];
      if (!retail || !SUPPORTED_RETAIL.includes(retail)) {
        return res.status(400).json({ success: false, error: `Invalid retail channel. Supported: ${SUPPORTED_RETAIL.join(', ')}` });
      }
 
      // Ambil kurs USD→IDR dari database (diisi owner via halaman currency)
      const usdCurrency = await currencyModel.getByCode('USD');
      const usdRate = usdCurrency ? Number(usdCurrency.rate_to_idr) : 20000;
 
      const planConfig = PLAN_CONFIG[plan];
      let amountIDR = Math.ceil(planConfig.price_usd * usdRate);

      // Extra HWID slots - only for Pro plan
      let extraHwidSlots = 0;
      if (plan === 'pro' && extraHwidRaw) {
        extraHwidSlots = Math.max(0, Math.min(PRO_MAX_HWID - PRO_BASE_HWID, parseInt(extraHwidRaw, 10) || 0));
        amountIDR += Math.ceil(extraHwidSlots * PRO_EXTRA_HWID_PRICE_USD * usdRate);
      }

      let discountPercent = 0;
      let appliedVoucherCode = null;

      if (voucherCode) {
        try {
          const discountInfo = await this._getDiscountedAmount(voucherCode, plan, userId, amountIDR);
          amountIDR = discountInfo.discountedAmount;
          discountPercent = discountInfo.discountPercent;
          appliedVoucherCode = discountInfo.voucher.code;
        } catch (vErr) {
          return res.status(400).json({ success: false, error: vErr.message });
        }
      }
 
      // ref_id unik untuk merchant
      const refId = `VSYN-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`;
      const userEmail = req.user?.email || `user${userId}@valincsyn.app`;
      // Prioritas: name (full name) → username → fallback
      const userName = req.user?.name || req.user?.username || `User-${userId.slice(0, 8)}`;
 
      // Expired order dari .env: TOKOPAY_ORDER_EXPIRY (default 24h)
      const expirySeconds = env.TOKOPAY_ORDER_EXPIRY_SECONDS || 86400;
      const expiredTs = Math.floor(Date.now() / 1000) + expirySeconds;
 
      logger.info('PaymentController', `Creating retail order: plan=${plan} retail=${retail} amount_idr=${amountIDR} usd_rate=${usdRate} expiry=${expirySeconds}s user=${userId} voucher=${appliedVoucherCode}`);
 
      const tokopayResult = await tokopayService.createOrder({
        ref_id: refId,
        kode_channel: retail,
        amount: amountIDR,
        customer_name: userName,
        customer_email: userEmail,
        customer_phone: req.user?.phone || '08123456789',
        redirect_url: `${env.frontendUrl}/portal/payment/retail?orderId=${refId}`,
        expired_ts: expiredTs,
        plan_label: `VALINC SYNDICATE ${plan.toUpperCase()} Plan`,
        items: [
          {
            product_code: `VSYN-${plan.toUpperCase()}`,
            name: `VALINC SYNDICATE ${plan.toUpperCase()} Plan`,
            price: amountIDR,
            product_url: `${env.frontendUrl}/portal/plans`,
            image_url: '',
          },
        ],
      });
 
      if (!tokopayResult.success) {
        logger.error('PaymentController', `Tokopay order failed: ${tokopayResult.error}`);
        return res.status(502).json({
          success: false,
          error: 'Payment gateway error',
          detail: tokopayResult.error || 'Gagal membuat order di Tokopay',
        });
      }
 
      const tpData = tokopayResult.data;
 
      // Simpan expired_at ke DB
      const storedExpiredAt = new Date(expiredTs * 1000);
 
      // Simpan transaksi ke database
      await paymentModel.create({
        user_id: userId,
        ref_id: refId,
        trx_id: tpData.trx_id,
        payment_method: 'retail',
        plan_type: plan,
        amount: amountIDR,
        total_bayar: tpData.total_bayar,
        total_diterima: tpData.total_diterima,
        status: 'pending',
        pay_url: tpData.pay_url,
        va_number: tpData.nomor_va,
        bank_code: retail,
        expired_at: storedExpiredAt,
        voucher_code: appliedVoucherCode,
        extra_hwid_slots: extraHwidSlots || 0,
      });
 
      return res.status(200).json({
        success: true,
        data: {
          ref_id: refId,
          trx_id: tpData.trx_id,
          pay_url: tpData.pay_url,
          va_number: tpData.nomor_va,
          bank_code: retail,
          total_bayar: tpData.total_bayar,
          total_diterima: tpData.total_diterima,
          price_usd: planConfig.price_usd,
          usd_rate: usdRate,
          amount_idr: amountIDR,
          expired_at: Math.floor(storedExpiredAt.getTime() / 1000),
          plan_type: plan,
          discount_percent: discountPercent,
          voucher_code: appliedVoucherCode,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /v1/payment/retail/order?ref_id=VSYN-...
   * Ambil detail transaksi retail berdasarkan ref_id.
   */
  async getRetailOrder(req, res, next) {
    return this.getQRISOrder(req, res, next);
  }

  /**
   * GET /v1/payment/retail/status?ref_id=VSYN-...
   * Cek status pembayaran retail dari Tokopay dan update DB jika paid.
   */
  async checkRetailStatus(req, res, next) {
    return this.checkQRISStatus(req, res, next);
  }

  /**
   * GET /v1/payment/history
   * Ambil riwayat transaksi user.
   */
  async getTransactionHistory(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

      const transactions = await paymentModel.findByUserId(userId, 50);
      const mappedTransactions = transactions.map(tx => {
        if (tx.status === 'pending' && tx.expired_at && new Date(tx.expired_at) < new Date()) {
          return { ...tx, status: 'expired' };
        }
        return tx;
      });

      return res.status(200).json({
        success: true,
        data: { transactions: mappedTransactions },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /v1/payment/admin/all
   * Ambil semua transaksi (untuk owner, admin, developer).
   */
  async getAllTransactions(req, res, next) {
    try {
      const page = parseInt(req.query.page || 1, 10);
      const limit = parseInt(req.query.limit || 20, 10);
      const offset = (page - 1) * limit;

      const filters = {
        search: req.query.search || '',
        status: req.query.status || 'all',
        method: req.query.method || 'all',
        plan: req.query.plan || 'all',
      };

      const { transactions, total } = await paymentModel.findAll(filters, limit, offset);

      const mappedTransactions = transactions.map(tx => {
        if (tx.status === 'pending' && tx.expired_at && new Date(tx.expired_at) < new Date()) {
          return { ...tx, status: 'expired' };
        }
        return tx;
      });

      return res.status(200).json({
        success: true,
        data: {
          transactions: mappedTransactions,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          }
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /v1/payment/admin/finance-stats
   * Ambil statistik finansial sistem (untuk owner).
   */
  async getFinanceStats(req, res, next) {
    try {
      const stats = await paymentModel.getFinanceStats();
      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentController();
