const db = require('../../config/database');
const { AppError } = require('../../middleware/errorHandler.middleware');
const ExecutionModel = require('../executions/executions.model');
const crypto = require('crypto');

class KeyauthService {
  async verifyLicense(key, hwid, robloxData = {}) {
    const pool = db.getPool();
    const result = await pool.query(
      'SELECT id, expires_at, status, tier, hwid, hwid_limit FROM licenses WHERE license_key = $1 LIMIT 1',
      [key]
    );

    if (result.rows.length === 0) {
      throw new AppError('License key not found', 404);
    }

    const license = result.rows[0];
    const isExpired = license.expires_at && new Date(license.expires_at) < new Date();
    if (isExpired) {
      throw new AppError('License key expired', 400);
    }

    if (license.status === 'revoked') {
      throw new AppError('License key has been revoked', 403);
    }

    if (license.status === 'unused') {
      throw new AppError('License key is not activated. Please activate it first.', 400);
    }

    // Check hwid_devices table for verification
    const devicesRes = await pool.query(
      "SELECT id, hwid, status FROM hwid_devices WHERE license_id = $1",
      [license.id]
    );
    const devices = devicesRes.rows;

    if (devices.length === 0) {
      // Auto-bind primary HWID if none is registered in licenses table yet (first execution)
      if (!license.hwid) {
        await pool.query(
          "UPDATE licenses SET hwid = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
          [hwid, license.id]
        );
        license.hwid = hwid;
      }

      // Backward compatibility: If no devices registered in hwid_devices but licenses.hwid matches
      if (license.hwid === hwid) {
        const deviceId = crypto.randomUUID();
        await pool.query(
          "INSERT INTO hwid_devices (id, license_id, roblox_username, roblox_id, roblox_avatar, hwid, status) VALUES ($1, $2, $3, $4, $5, $6, 'active')",
          [deviceId, license.id, robloxData.roblox_username || '', robloxData.roblox_id || '', robloxData.roblox_avatar || '', hwid]
        );
      } else {
        throw new AppError('HWID mismatch. Device is not registered for this key.', 403);
      }
    } else {
      let match = devices.find(d => d.hwid === hwid && d.status === 'active');
      if (!match) {
        // Automatically link a new device if slots are still available
        const activeDevices = devices.filter(d => d.status === 'active');
        if (activeDevices.length < license.hwid_limit) {
          const deviceId = crypto.randomUUID();
          await pool.query(
            "INSERT INTO hwid_devices (id, license_id, roblox_username, roblox_id, roblox_avatar, hwid, status) VALUES ($1, $2, $3, $4, $5, $6, 'active')",
            [deviceId, license.id, robloxData.roblox_username || '', robloxData.roblox_id || '', robloxData.roblox_avatar || '', hwid]
          );
        } else {
          throw new AppError('HWID mismatch. Device is not registered for this key.', 403);
        }
      } else {
        // Update roblox details on the active device if provided
        if (robloxData.roblox_username || robloxData.roblox_id) {
          await pool.query(
            "UPDATE hwid_devices SET roblox_username = $1, roblox_id = $2, roblox_avatar = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4",
            [robloxData.roblox_username || '', robloxData.roblox_id || '', robloxData.roblox_avatar || '', match.id]
          );
        }
      }
    }

    // Key matches HWID: increment usage log
    await pool.query(
      "UPDATE licenses SET uses = uses + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [license.id]
    );

    // Record execution asynchronously for analytics
    ExecutionModel.recordExecution(key).catch(err =>
      console.error('Failed to record execution:', err.message)
    );

    return {
      valid: true,
      expires_at: license.expires_at,
      tier: license.tier,
      hwid_limit: license.hwid_limit
    };
  }

  async activateLicense(key, hwid, robloxData = {}) {
    const pool = db.getPool();
    const result = await pool.query(
      'SELECT id, expires_at, status, tier, hwid, hwid_limit FROM licenses WHERE license_key = $1 LIMIT 1',
      [key]
    );

    if (result.rows.length === 0) {
      throw new AppError('License key not found', 404);
    }

    const license = result.rows[0];
    const isExpired = license.expires_at && new Date(license.expires_at) < new Date();
    if (isExpired) {
      throw new AppError('License key expired', 400);
    }

    if (license.status === 'revoked') {
      throw new AppError('License key has been revoked', 403);
    }

    if (license.status === 'unused') {
      // First time activation: Bind HWID, set active, set first usage
      await pool.query(
        "UPDATE licenses SET hwid = $1, status = 'active', uses = 1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [hwid, license.id]
      );

      // Register device in hwid_devices
      const deviceId = crypto.randomUUID();
      await pool.query(
        "INSERT INTO hwid_devices (id, license_id, roblox_username, roblox_id, roblox_avatar, hwid, status) VALUES ($1, $2, $3, $4, $5, $6, 'active')",
        [deviceId, license.id, robloxData.roblox_username || '', robloxData.roblox_id || '', robloxData.roblox_avatar || '', hwid]
      );

      // Record execution asynchronously for analytics
      ExecutionModel.recordExecution(key).catch(err =>
        console.error('Failed to record execution:', err.message)
      );

      return {
        activated: true,
        expires_at: license.expires_at,
        tier: license.tier,
        hwid_limit: license.hwid_limit
      };
    }

    if (license.status === 'active') {
      // Fetch currently registered devices
      const devicesRes = await pool.query(
        "SELECT id, hwid, status FROM hwid_devices WHERE license_id = $1",
        [license.id]
      );
      const devices = devicesRes.rows;

      const match = devices.find(d => d.hwid === hwid);
      if (match) {
        if (match.status === 'inactive') {
          // Reactivate device
          await pool.query(
            "UPDATE hwid_devices SET status = 'active', roblox_username = $1, roblox_id = $2, roblox_avatar = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4",
            [robloxData.roblox_username || '', robloxData.roblox_id || '', robloxData.roblox_avatar || '', match.id]
          );
        } else {
          // Update details
          await pool.query(
            "UPDATE hwid_devices SET roblox_username = $1, roblox_id = $2, roblox_avatar = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4",
            [robloxData.roblox_username || '', robloxData.roblox_id || '', robloxData.roblox_avatar || '', match.id]
          );
        }

        // Record execution asynchronously for analytics
        ExecutionModel.recordExecution(key).catch(err =>
          console.error('Failed to record execution:', err.message)
        );

        return {
          activated: true,
          expires_at: license.expires_at,
          tier: license.tier,
          hwid_limit: license.hwid_limit
        };
      }

      // If not registered yet, check limits
      const activeDevices = devices.filter(d => d.status === 'active');
      if (activeDevices.length < license.hwid_limit) {
        const deviceId = crypto.randomUUID();
        await pool.query(
          "INSERT INTO hwid_devices (id, license_id, roblox_username, roblox_id, roblox_avatar, hwid, status) VALUES ($1, $2, $3, $4, $5, $6, 'active')",
          [deviceId, license.id, robloxData.roblox_username || '', robloxData.roblox_id || '', robloxData.roblox_avatar || '', hwid]
        );

        // Record execution asynchronously for analytics
        ExecutionModel.recordExecution(key).catch(err =>
          console.error('Failed to record execution:', err.message)
        );

        return {
          activated: true,
          expires_at: license.expires_at,
          tier: license.tier,
          hwid_limit: license.hwid_limit
        };
      } else {
        throw new AppError('License already activated on another device', 403);
      }
    }

    throw new AppError(`License is in status ${license.status}`, 400);
  }
}

module.exports = new KeyauthService();
