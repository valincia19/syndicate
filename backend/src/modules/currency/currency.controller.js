const currencyModel = require('./currency.model');

// ─── Master plan prices in USD (source of truth) ──────────────────────────────
const PLAN_PRICES_USD = {
  premium: { price_usd: 2, original_usd: 5, label: 'Premium', duration: 30, hwid_count: 5 },
  pro:     { price_usd: 6, original_usd: 15, label: 'Pro', duration: 90, hwid_count: 12 },
};

exports.getAllCurrencies = async (req, res) => {
  try {
    const currencies = await currencyModel.getAll();
    res.json({ success: true, data: currencies });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getActiveCurrencies = async (req, res) => {
  try {
    const currencies = await currencyModel.getActive();
    res.json({ success: true, data: currencies });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /v1/currency/plans (public)
 * Returns plan prices in USD (master) and IDR (charge currency) + equivalents for display.
 */
exports.getPlanPrices = async (req, res) => {
  try {
    // Fetch all active currency rates for equivalents
    const activeCurrencies = await currencyModel.getActive();

    // Find the USD rate to IDR
    const usdCurrency = activeCurrencies.find(c => c.rate_code === 'USD' || c.currency_code === 'USD');
    const usdRate = usdCurrency ? Number(usdCurrency.rate_to_idr) : 20000;

    const plans = {};
    for (const [key, plan] of Object.entries(PLAN_PRICES_USD)) {
      const priceIDR = Math.ceil(plan.price_usd * usdRate);
      const originalIDR = Math.ceil(plan.original_usd * usdRate);

      // Build equivalents: priceIDR / rate
      const equivalents = {};
      for (const currency of activeCurrencies) {
        if (currency.currency_code === 'IDR') continue;
        const rate = Number(currency.rate_to_idr);
        if (rate > 0) {
          equivalents[currency.currency_code] = {
            amount: Math.round((priceIDR / rate) * 100) / 100,
            original: Math.round((originalIDR / rate) * 100) / 100,
          };
        }
      }

      plans[key] = {
        price_usd: plan.price_usd,
        original_usd: plan.original_usd,
        price_idr: priceIDR,
        original_idr: originalIDR,
        duration: plan.duration,
        hwid_count: plan.hwid_count,
        discount_percent: Math.round((1 - plan.price_usd / plan.original_usd) * 100),
        label: plan.label,
        equivalents,
      };
    }

    // Fetch censor_pricing setting from system_settings
    const censorSetting = await currencyModel.getSetting('censor_pricing');
    const isCensored = censorSetting ? !!censorSetting.enabled : false;

    res.json({ success: true, data: { base_currency: 'USD', usd_rate: usdRate, plans, censor_pricing: isCensored } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.createCurrency = async (req, res) => {
  try {
    const { currency_code, currency_name, rate_to_idr, rate_code, is_active } = req.body;
    if (!currency_code || !currency_name || !rate_to_idr) {
      return res.status(400).json({ success: false, error: 'currency_code, currency_name, and rate_to_idr required' });
    }
    const existing = await currencyModel.getByCode(currency_code);
    if (existing) {
      return res.status(409).json({ success: false, error: 'Currency already exists' });
    }
    const currency = await currencyModel.create({ currency_code, currency_name, rate_to_idr, rate_code, is_active });
    res.status(201).json({ success: true, data: currency });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateCurrency = async (req, res) => {
  try {
    const { code } = req.params;
    const currency = await currencyModel.getByCode(code);
    if (!currency) {
      return res.status(404).json({ success: false, error: 'Currency not found' });
    }
    const updated = await currencyModel.update(code, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteCurrency = async (req, res) => {
  try {
    const { code } = req.params;
    const currency = await currencyModel.getByCode(code);
    if (!currency) {
      return res.status(404).json({ success: false, error: 'Currency not found' });
    }
    await currencyModel.delete(code);
    res.json({ success: true, message: `Currency ${code} deleted` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.bulkUpdateCurrencies = async (req, res) => {
  try {
    const { updates } = req.body;
    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ success: false, error: 'updates array is required' });
    }
    const results = [];
    for (const item of updates) {
      const { currency_code, ...data } = item;
      if (currency_code) {
        const updated = await currencyModel.update(currency_code, data);
        results.push(updated);
      }
    }
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /v1/currency/settings (owner only)
 * Returns currency-related settings like censor_pricing
 */
exports.getCurrencySettings = async (req, res) => {
  try {
    const censorSetting = await currencyModel.getSetting('censor_pricing');
    res.json({
      success: true,
      data: {
        censor_pricing: censorSetting ? !!censorSetting.enabled : false,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PUT /v1/currency/settings (owner only)
 * Updates currency-related settings
 */
exports.updateCurrencySettings = async (req, res) => {
  try {
    const { censor_pricing } = req.body;

    if (typeof censor_pricing === 'boolean') {
      await currencyModel.saveSetting('censor_pricing', { enabled: censor_pricing });
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: { censor_pricing: !!censor_pricing },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
