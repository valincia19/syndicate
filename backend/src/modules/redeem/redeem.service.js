
const crypto = require('crypto');
const RedeemModel = require('./redeem.model');
const LicenseModel = require('../licenses/licenses.model');
const { AppError } = require('../../middleware/errorHandler.middleware');
const cacheUtility = require('../../utils/cache.utility');
const logger = require('../../config/logger');

const TIER_CONFIG = {
  free:    { hwid_limit: 1,  duration_days: 7 },
  premium: { hwid_limit: 5,  duration_days: 30 },
  pro:     { hwid_limit: 12, duration_days: 90 },
};

function generateRedeemCode() {
  // SECURITY: Use crypto.randomInt() instead of Math.random() so codes
  // are not predictable from observed samples.
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

class RedeemService {
  async getAll() {
    return RedeemModel.findAll();
  }

  async create(data, adminId) {
    const code = generateRedeemCode();
    const tier = data.tier || 'free';
    const config = TIER_CONFIG[tier] || TIER_CONFIG.free;

    const createdCode = await RedeemModel.create({
      code,
      tier,
      hwid_limit: data.hwid_limit || config.hwid_limit,
      duration_days: data.duration_days || config.duration_days,
      created_by: adminId,
    });

    logger.info('RedeemService', 'Redeem code created by admin', {
      code,
      tier,
      createdBy: adminId
    });

    return createdCode;
  }

  async delete(id) {
    const code = await RedeemModel.findById(id);
    if (!code) throw new AppError('Redeem code not found', 404);
    if (code.status === 'used') throw new AppError('Cannot delete a used redeem code', 400);
    await RedeemModel.delete(id);
    
    logger.info('RedeemService', 'Redeem code deleted by admin', {
      id,
      code: code.code
    });
  }

  async redeem(codeText, userId) {
    if (!codeText || typeof codeText !== 'string') {
      throw new AppError('Redeem code is required', 400);
    }

    const code = await RedeemModel.findByCode(codeText.trim().toUpperCase());
    if (!code) {
      throw new AppError('Invalid redeem code', 404);
    }
    if (code.status === 'used') {
      throw new AppError('This redeem code has already been used', 400);
    }

    // ATOMIC LOCK: Try marking code as used atomically to prevent double-click race conditions
    const updatedCode = await RedeemModel.markUsedAtomic(code.id, userId);
    if (!updatedCode) {
      throw new AppError('This redeem code has already been used or is currently being processed', 400);
    }

    // Generate license for this user
    const licenseKey = generateLicenseKey();
    let expires_at = null;
    if (code.duration_days > 0) {
      const d = new Date();
      d.setDate(d.getDate() + code.duration_days);
      expires_at = d.toISOString();
    }

    const license = await LicenseModel.create({
      license_key: licenseKey,
      user_id: userId,
      tier: code.tier,
      status: 'active',
      hwid_limit: code.hwid_limit,
      source: 'redeem',
      expires_at,
    });

    await cacheUtility.del(`cache:user_licenses:${userId}`);

    logger.info('RedeemService', 'Redeem code redeemed successfully', {
      code: codeText,
      userId,
      licenseKey
    });

    return { license, code: code.code };
  }
}

module.exports = new RedeemService();
