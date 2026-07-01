
const crypto = require('crypto');
const LicenseModel = require('./licenses.model');
const { AppError } = require('../../middleware/errorHandler.middleware');
const cacheUtility = require('../../utils/cache.utility');
const logger = require('../../config/logger');

const TIER_CONFIG = {
  free:    { hwid_limit: 1,  durationDays: 7 },
  premium: { hwid_limit: 5,  durationDays: 30 },
  pro:     { hwid_limit: 12, durationDays: 90 },
};

function generateLicenseKey(prefix = 'SYNDICATE') {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let random = '';
  for (let i = 0; i < 20; i++) {
    random += chars.charAt(crypto.randomInt(0, chars.length));
  }
  const cleanPrefix = (prefix || 'SYNDICATE').toUpperCase().trim();
  return `${cleanPrefix}_${random}`;
}

class LicenseService {
  async getLicenses() {
    return LicenseModel.findAll();
  }

  async getLicensesPaginated(options = {}) {
    return LicenseModel.findPaginated(options);
  }

  async getLicense(id) {
    const license = await LicenseModel.findById(id);
    if (!license) throw new AppError('License not found', 404);
    return license;
  }

  async getLicenseForUser(id, userId) {
    const license = await LicenseModel.findById(id);
    if (!license) throw new AppError('License not found', 404);
    if (license.user_id !== userId) {
      throw new AppError('You do not have permission to view this license', 403);
    }
    return license;
  }

  async getMyLicenses(userId) {
    const cacheKey = `cache:user_licenses:${userId}`;
    return cacheUtility.getOrSet(
      cacheKey,
      () => LicenseModel.findByUserId(userId),
      300 // 5 Minutes TTL
    );
  }

  async createLicense(data) {
    const license_key = generateLicenseKey();
    const tier = data.tier || 'free';

    const config = TIER_CONFIG[tier] || TIER_CONFIG.free;
    const hwid_limit = data.hwid_limit !== undefined ? parseInt(data.hwid_limit) : config.hwid_limit;

    const durationDays = data.duration_days !== undefined ? parseInt(data.duration_days) : config.durationDays;
    let expires_at = null;
    if (durationDays > 0) {
      const d = new Date();
      d.setDate(d.getDate() + durationDays);
      expires_at = d.toISOString();
    }

    const license = await LicenseModel.create({
      license_key,
      user_id: data.user_id || null,
      tier,
      max_uses: 0,
      hwid_limit,
      expires_at,
    });

    if (data.user_id) {
      await cacheUtility.del(`cache:user_licenses:${data.user_id}`);
    }
    await cacheUtility.delPrefix('cache:user_licenses:');
    
    logger.info('LicenseService', 'New license key created', { 
      key: license.license_key, 
      tier: license.tier, 
      userId: data.user_id 
    });

    return license;
  }

  async updateLicense(id, data) {
    const license = await LicenseModel.findById(id);
    if (!license) throw new AppError('License not found', 404);
    const updated = await LicenseModel.update(id, data);
    if (license.user_id) {
      await cacheUtility.del(`cache:user_licenses:${license.user_id}`);
    }
    await cacheUtility.delPrefix('cache:user_licenses:');
    
    logger.info('LicenseService', 'License updated successfully', { 
      id, 
      updatedFields: Object.keys(data) 
    });

    return updated;
  }

  async deleteLicense(id) {
    const license = await LicenseModel.findById(id);
    if (!license) throw new AppError('License not found', 404);
    await LicenseModel.delete(id);
    if (license.user_id) {
      await cacheUtility.del(`cache:user_licenses:${license.user_id}`);
    }
    await cacheUtility.delPrefix('cache:user_licenses:');
    
    logger.info('LicenseService', 'License deleted successfully', { 
      id, 
      key: license.license_key 
    });
  }

  async lookupLicense(queryText) {
    if (!queryText || typeof queryText !== 'string') {
      throw new AppError('Search query is required', 400);
    }
    const results = await LicenseModel.lookup(queryText.trim());
    return results;
  }

  /**
   * Create a free trial key for public claim (no auth required).
   * Key is marked with source='free_key' so it can be distinguished
   * from admin-created or redeem keys in the dashboard.
   *
   * @param {string} ip - Claimer IP for activity logging
   * @returns {Object} Created license row
   */
  async createFreeKey(ip, userAgent = '') {
    // Fetch settings from database if exists, fallback to defaults
    let config = { hwid_limit: 1, durationDays: 7, durationUnit: 'days', key_prefix: 'SYNDICATE', max_keys_per_ip: 2 };
    try {
      const adminService = require('../admin/admin.service');
      const freeKeySettings = await adminService.getSystemSetting('free_key_settings');
      if (freeKeySettings) {
        if (!freeKeySettings.is_enabled) {
          throw new AppError('Free key claiming is currently disabled by system administrator.', 403);
        }
        config = {
          hwid_limit: freeKeySettings.hwid_limit ?? 1,
          durationDays: freeKeySettings.duration_days ?? 7,
          durationUnit: freeKeySettings.duration_unit || 'days',
          key_prefix: freeKeySettings.key_prefix || 'SYNDICATE',
          max_keys_per_ip: freeKeySettings.max_keys_per_ip ?? 2
        };
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      // otherwise ignore error and use defaults
    }

    const fingerprint = crypto.createHash('sha256').update(`${ip || ''}|${userAgent || ''}`).digest('hex');

    // Check IP or Fingerprint claims count to prevent VPN/Proxy bypass
    if (ip || fingerprint) {
      const db = require('../../config/database');
      const pool = db.getPool();
      const countRes = await pool.query(
        "SELECT COUNT(*)::int AS count FROM licenses WHERE source = 'free_key' AND (claim_ip = $1 OR claim_fingerprint = $2)",
        [ip, fingerprint]
      );
      const currentClaims = countRes.rows[0]?.count || 0;
      if (currentClaims >= config.max_keys_per_ip) {
        logger.warn('LicenseService', 'Free key claim limit exceeded for IP/Fingerprint', {
          ip,
          fingerprint,
          currentClaims,
          maxAllowed: config.max_keys_per_ip,
        });
        throw new AppError(`Batas maksimal klaim free key per Perangkat/Browser (IP/Fingerprint) telah tercapai (Maksimal: ${config.max_keys_per_ip}x).`, 429);
      }
    }

    const license_key = generateLicenseKey(config.key_prefix);

    let expires_at = null;
    if (config.durationDays > 0) {
      const d = new Date();
      if (config.durationUnit === 'hours') {
        d.setHours(d.getHours() + config.durationDays);
      } else {
        d.setDate(d.getDate() + config.durationDays);
      }
      expires_at = d.toISOString();
    }

    const license = await LicenseModel.create({
      license_key,
      user_id: null,
      tier: 'free',
      status: 'active',
      max_uses: 0,
      hwid_limit: config.hwid_limit,
      source: 'free_key',
      expires_at,
      claim_ip: ip,
      claim_fingerprint: fingerprint
    });

    logger.info('LicenseService', 'Free trial key generated successfully', { 
      key: license.license_key, 
      ip 
    });

    return license;
  }

  async claimLicense(key, userId) {
    if (!key || typeof key !== 'string') {
      throw new AppError('License key is required', 400);
    }

    const db = require('../../config/database');
    const pool = db.getPool();

    // Find the license
    const trimmed = key.trim();
    const result = await pool.query('SELECT * FROM licenses WHERE license_key = $1', [trimmed]);
    const license = result.rows[0];

    if (!license) {
      throw new AppError('Invalid license key', 404);
    }

    if (license.user_id) {
      throw new AppError('This license key has already been claimed by another user', 400);
    }

    if (license.status !== 'unused') {
      throw new AppError(`This license key cannot be claimed (Status: ${license.status})`, 400);
    }

    // Determine new expires_at if it's set
    let expiresAt = license.expires_at;
    if (expiresAt) {
      const durationMs = new Date(expiresAt).getTime() - new Date(license.created_at).getTime();
      if (durationMs > 0) {
        expiresAt = new Date(Date.now() + durationMs).toISOString();
      }
    }

    // Update license atomically
    const updateRes = await pool.query(
      `UPDATE licenses 
       SET user_id = $1, status = 'active', expires_at = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 AND user_id IS NULL AND status = 'unused' 
       RETURNING *`,
      [userId, expiresAt, license.id]
    );

    const updatedLicense = updateRes.rows[0];
    if (!updatedLicense) {
      throw new AppError('Failed to claim license, please try again', 400);
    }

    // Log activity
    const activityService = require('../activity/activity.service');
    await activityService.log(userId, 'claim_license', {
      license_key: updatedLicense.license_key,
      tier: updatedLicense.tier
    });

    // Clear caches
    await cacheUtility.del(`cache:user_licenses:${userId}`);
    
    logger.info('LicenseService', 'License key claimed by user', { 
      key: updatedLicense.license_key, 
      userId 
    });

    return updatedLicense;
  }
}

module.exports = new LicenseService();
