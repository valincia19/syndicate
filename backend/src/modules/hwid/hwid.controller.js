
const hwidService = require('./hwid.service');

class HwidController {
  async list(req, res, next) {
    try { const data = await hwidService.getAll(); res.status(200).json({ status: 'success', statusCode: 200, message: 'HWIDs retrieved', data: { hwids: data } }); }
    catch (err) { next(err); }
  }

  async byLicenseForUser(req, res, next) {
    try {
      // Verify the license belongs to this user
      const LicenseModel = require('../licenses/licenses.model');
      const license = await LicenseModel.findById(req.params.licenseId);
      if (!license) return res.status(404).json({ status: 'error', message: 'License not found' });
      if (license.user_id !== req.user.id && !['admin', 'owner'].includes(req.user.role)) {
        return res.status(403).json({ status: 'error', message: 'You do not have access to this license' });
      }
      const data = await hwidService.getByLicense(req.params.licenseId);
      res.status(200).json({ status: 'success', statusCode: 200, message: 'HWIDs retrieved', data: { hwids: data } });
    } catch (err) { next(err); }
  }

  async deleteByLicenseForUser(req, res, next) {
    try {
      const LicenseModel = require('../licenses/licenses.model');
      const license = await LicenseModel.findById(req.params.licenseId);
      if (!license) return res.status(404).json({ status: 'error', message: 'License not found' });
      if (license.user_id !== req.user.id && !['admin', 'owner'].includes(req.user.role)) {
        return res.status(403).json({ status: 'error', message: 'You do not have access to this license' });
      }
      // Verify the HWID belongs to this license
      const hwid = await hwidService.getById(req.params.hwidId);
      if (hwid.license_id !== req.params.licenseId) {
        return res.status(403).json({ status: 'error', message: 'This device does not belong to this license' });
      }

      // Enforce weekly limits for premium (3) and pro (6) if user is managing their own license and is not admin/owner
      if (license.user_id === req.user.id && !['admin', 'owner'].includes(req.user.role)) {
        let limit = 0;
        if (license.tier === 'premium') limit = 3;
        else if (license.tier === 'pro') limit = 6;

        if (limit > 0) {
          const weeklyDeletes = await hwidService.countDeletesInLastWeek(license.id);
          if (weeklyDeletes >= limit) {
            const oldestLog = await hwidService.getOldestDeleteInLastWeek(license.id);
            let nextAvailableAt = null;
            if (oldestLog) {
              // 7 days from the oldest deletion log
              nextAvailableAt = new Date(new Date(oldestLog.deleted_at).getTime() + 7 * 24 * 60 * 60 * 1000);
            }
            return res.status(403).json({
              status: 'error',
              message: `You have reached the limit of ${limit} unlinks per week for your ${license.tier.charAt(0).toUpperCase() + license.tier.slice(1)} plan.`,
              code: 'LIMIT_EXCEEDED',
              nextAvailableAt: nextAvailableAt ? nextAvailableAt.toISOString() : null
            });
          }
        }
      }

      await hwidService.delete(req.params.hwidId);

      // Log the deletion for tracked plans to manage weekly limit
      if (['premium', 'pro'].includes(license.tier)) {
        await hwidService.logDeletion(license.id);
      }

      // Log user activity
      const activityService = require('../activity/activity.service');
      await activityService.log(req.user.id, 'unlink_device', { 
        license_id: license.id, 
        license_key: license.license_key,
        roblox_username: hwid.roblox_username, 
        roblox_id: hwid.roblox_id 
      });

      res.status(200).json({ status: 'success', statusCode: 200, message: 'Device unlinked' });
    } catch (err) { next(err); }
  }

  async resetDeviceForUser(req, res, next) {
    try {
      const LicenseModel = require('../licenses/licenses.model');
      const license = await LicenseModel.findById(req.params.licenseId);
      if (!license) return res.status(404).json({ status: 'error', message: 'License not found' });
      if (license.user_id !== req.user.id && !['admin', 'owner'].includes(req.user.role)) {
        return res.status(403).json({ status: 'error', message: 'You do not have access to this license' });
      }
      // Verify the HWID belongs to this license
      const hwid = await hwidService.getById(req.params.hwidId);
      if (hwid.license_id !== req.params.licenseId) {
        return res.status(403).json({ status: 'error', message: 'This device does not belong to this license' });
      }
      await hwidService.resetDevice(req.params.hwidId);

      // Log user activity
      const activityService = require('../activity/activity.service');
      await activityService.log(req.user.id, 'reset_device_hwid', { 
        license_id: license.id, 
        license_key: license.license_key,
        roblox_username: hwid.roblox_username, 
        roblox_id: hwid.roblox_id 
      });

      res.status(200).json({ status: 'success', statusCode: 200, message: 'Device HWID reset' });
    } catch (err) { next(err); }
  }

  async resetByLicenseForUser(req, res, next) {
    try {
      const LicenseModel = require('../licenses/licenses.model');
      const license = await LicenseModel.findById(req.params.licenseId);
      if (!license) return res.status(404).json({ status: 'error', message: 'License not found' });
      if (license.user_id !== req.user.id && !['admin', 'owner'].includes(req.user.role)) {
        return res.status(403).json({ status: 'error', message: 'You do not have access to this license' });
      }
      await hwidService.resetByLicense(req.params.licenseId);

      // Log user activity
      const activityService = require('../activity/activity.service');
      await activityService.log(req.user.id, 'reset_all_devices_hwid', { 
        license_id: license.id, 
        license_key: license.license_key 
      });

      res.status(200).json({ status: 'success', statusCode: 200, message: 'All devices reset' });
    } catch (err) { next(err); }
  }

  async byLicense(req, res, next) {
    try { const data = await hwidService.getByLicense(req.params.licenseId); res.status(200).json({ status: 'success', statusCode: 200, message: 'HWIDs retrieved', data: { hwids: data } }); }
    catch (err) { next(err); }
  }

  async get(req, res, next) {
    try { const data = await hwidService.getById(req.params.id); res.status(200).json({ status: 'success', statusCode: 200, message: 'HWID retrieved', data: { hwid: data } }); }
    catch (err) { next(err); }
  }

  async create(req, res, next) {
    try { const data = await hwidService.create(req.body); res.status(201).json({ status: 'success', statusCode: 201, message: 'HWID created', data: { hwid: data } }); }
    catch (err) { next(err); }
  }

  async update(req, res, next) {
    try { const data = await hwidService.update(req.params.id, req.body); res.status(200).json({ status: 'success', statusCode: 200, message: 'HWID updated', data: { hwid: data } }); }
    catch (err) { next(err); }
  }

  async delete(req, res, next) {
    try { await hwidService.delete(req.params.id); res.status(200).json({ status: 'success', statusCode: 200, message: 'HWID deleted' }); }
    catch (err) { next(err); }
  }
}

module.exports = new HwidController();
