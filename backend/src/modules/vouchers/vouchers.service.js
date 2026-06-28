const crypto = require('crypto');
const VoucherModel = require('./vouchers.model');
const LicenseModel = require('../licenses/licenses.model');
const { AppError } = require('../../middleware/errorHandler.middleware');
const cacheUtility = require('../../utils/cache.utility');

const TIER_CONFIG = {
  premium: { hwid_limit: 5,  duration_days: 30 },
  pro:     { hwid_limit: 12, duration_days: 90 },
};

function generateVoucherCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const part = (len) => {
    let s = '';
    for (let i = 0; i < len; i++) s += chars.charAt(crypto.randomInt(0, chars.length));
    return s;
  };
  return `${part(4)}-${part(3)}-${part(4)}`;
}

function generateLicenseKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let i = 0; i < 20; i++) {
    key += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return `SYNDICATE_${key}`;
}

class VoucherService {
  async getAll() {
    return cacheUtility.getOrSet(
      'cache:vouchers:all',
      () => VoucherModel.findAll(),
      3600 // 1 Hour TTL
    );
  }

  async create(data, adminId) {
    let code = data.code ? data.code.trim().toUpperCase() : '';
    const tier = data.tier || 'premium';
    const config = TIER_CONFIG[tier] || TIER_CONFIG.premium;
    const discount_percent = Math.max(0, Math.min(100, parseInt(data.discount_percent) || 0));

    if (code) {
      // Validate alphanumeric and length
      if (!/^[A-Z0-9_-]+$/.test(code)) {
        throw new AppError('Custom code can only contain alphanumeric characters, hyphens, and underscores', 400);
      }
      // Check duplicate
      const existing = await VoucherModel.findByCode(code);
      if (existing) {
        throw new AppError('Voucher code already exists', 400);
      }
    } else {
      // Generate random code
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 10) {
        code = generateVoucherCode();
        const existing = await VoucherModel.findByCode(code);
        if (!existing) isUnique = true;
        attempts++;
      }
    }

    const hwid_limit = data.hwid_limit || config.hwid_limit;
    const duration_days = data.duration_days || config.duration_days;
    const max_uses = parseInt(data.max_uses) || 1;
    if (max_uses < 1) {
      throw new AppError('Max uses must be at least 1', 400);
    }

    let active_from = null;
    if (data.active_from) {
      const parsedDate = new Date(data.active_from);
      if (isNaN(parsedDate.getTime())) {
        throw new AppError('Invalid active start date format', 400);
      }
      active_from = parsedDate.toISOString();
    }

    let expires_at = null;
    if (data.expires_at) {
      const parsedDate = new Date(data.expires_at);
      if (isNaN(parsedDate.getTime())) {
        throw new AppError('Invalid expiration date format', 400);
      }
      expires_at = parsedDate.toISOString();
    }

    const voucher = await VoucherModel.create({
      code,
      tier,
      hwid_limit,
      duration_days,
      max_uses,
      discount_percent,
      active_from,
      expires_at,
      created_by: adminId,
    });

    await cacheUtility.del('cache:vouchers:all');
    return voucher;
  }

  async delete(id) {
    const voucher = await VoucherModel.findById(id);
    if (!voucher) {
      throw new AppError('Voucher not found', 404);
    }
    if (voucher.uses_count > 0) {
      throw new AppError('Cannot delete a voucher that has already been claimed', 400);
    }
    await VoucherModel.delete(id);
    await cacheUtility.del('cache:vouchers:all');
  }

  async validate(codeText, plan, userId) {
    if (!codeText || typeof codeText !== 'string') {
      throw new AppError('Voucher code is required', 400);
    }

    const trimmed = codeText.trim().toUpperCase();
    const voucher = await VoucherModel.findByCode(trimmed);
    if (!voucher) {
      throw new AppError('Voucher code not found', 404);
    }

    // Check tier / plan match
    if (plan && voucher.tier !== plan) {
      throw new AppError(`This voucher is only valid for the ${voucher.tier.toUpperCase()} plan`, 400);
    }

    // Check active_from
    if (voucher.active_from && new Date(voucher.active_from) > new Date()) {
      const activeDateStr = new Date(voucher.active_from).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      throw new AppError(`This voucher is not active yet. It will be active starting on ${activeDateStr}`, 400);
    }

    // Check expiration
    if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
      throw new AppError('This voucher has expired', 400);
    }

    // Check max uses limit
    if (voucher.uses_count >= voucher.max_uses) {
      throw new AppError('This voucher has reached its maximum usage limit', 400);
    }

    // Check if user already claimed this specific voucher (max 3 times)
    const claimCount = await VoucherModel.countClaims(voucher.id, userId);
    if (claimCount >= 3) {
      throw new AppError('You have already claimed this voucher the maximum number of times (3)', 400);
    }

    return {
      code: voucher.code,
      tier: voucher.tier,
      discount_percent: voucher.discount_percent || 0
    };
  }

  async redeem(codeText, userId) {
    if (!codeText || typeof codeText !== 'string') {
      throw new AppError('Voucher code is required', 400);
    }

    const trimmed = codeText.trim().toUpperCase();
    const voucher = await VoucherModel.findByCode(trimmed);
    if (!voucher) {
      // We return null so the controller/router can fallback to standard redeem if needed
      return null;
    }

    // Check active_from
    if (voucher.active_from && new Date(voucher.active_from) > new Date()) {
      const activeDateStr = new Date(voucher.active_from).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      throw new AppError(`This voucher is not active yet. It will be active starting on ${activeDateStr}`, 400);
    }

    // Check expiration
    if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
      throw new AppError('This voucher has expired', 400);
    }

    // Check max uses limit
    if (voucher.uses_count >= voucher.max_uses) {
      throw new AppError('This voucher has reached its maximum usage limit', 400);
    }

    // Check if user already claimed this specific voucher (max 3 times)
    const claimCount = await VoucherModel.countClaims(voucher.id, userId);
    if (claimCount >= 3) {
      throw new AppError('You have already claimed this voucher the maximum number of times (3)', 400);
    }

    // ATOMIC LOCK: Try incrementing voucher uses count atomically to prevent race conditions
    const updatedVoucher = await VoucherModel.incrementUsesAtomic(voucher.id);
    if (!updatedVoucher) {
      throw new AppError('This voucher has reached its maximum usage limit or is being claimed concurrently', 400);
    }

    // Generate license key
    const licenseKey = generateLicenseKey();
    let expires_at = null;
    if (voucher.duration_days > 0) {
      const d = new Date();
      d.setDate(d.getDate() + voucher.duration_days);
      expires_at = d.toISOString();
    }

    // Create active license for user
    const license = await LicenseModel.create({
      license_key: licenseKey,
      user_id: userId,
      tier: voucher.tier,
      status: 'active',
      hwid_limit: voucher.hwid_limit,
      source: 'voucher',
      expires_at,
    });

    // Save claim log
    await VoucherModel.createClaim(voucher.id, userId);

    await cacheUtility.del(`cache:user_licenses:${userId}`);
    await cacheUtility.del('cache:vouchers:all');

    return { license, code: voucher.code };
  }
}

module.exports = new VoucherService();
