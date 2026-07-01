const keyauthService = require('./keyauth.service');

class KeyauthController {
  async verify(req, res, next) {
    try {
      const { key } = req.params;
      const { hwid, roblox_username, roblox_id, roblox_avatar, executor } = req.query;

      if (!key) {
        return res.status(400).json({ status: 'error', statusCode: 400, message: 'License key is required' });
      }
      if (!hwid) {
        return res.status(400).json({ status: 'error', statusCode: 400, message: 'HWID is required' });
      }

      const robloxData = {
        roblox_username: roblox_username || '',
        roblox_id: roblox_id || '',
        roblox_avatar: roblox_avatar || '',
        executor: executor || ''
      };

      const result = await keyauthService.verifyLicense(key.trim(), hwid.trim(), robloxData);
      return res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'License verified successfully',
        data: result
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({
          status: 'error',
          statusCode: err.statusCode,
          message: err.message
        });
      }
      next(err);
    }
  }

  async activate(req, res, next) {
    try {
      const { key } = req.params;
      const { hwid, roblox_username, roblox_id, roblox_avatar, executor } = req.query;

      if (!key) {
        return res.status(400).json({ status: 'error', statusCode: 400, message: 'License key is required' });
      }
      if (!hwid) {
        return res.status(400).json({ status: 'error', statusCode: 400, message: 'HWID is required' });
      }

      const robloxData = {
        roblox_username: roblox_username || '',
        roblox_id: roblox_id || '',
        roblox_avatar: roblox_avatar || '',
        executor: executor || ''
      };

      const result = await keyauthService.activateLicense(key.trim(), hwid.trim(), robloxData);
      return res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'License activated successfully',
        data: result
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({
          status: 'error',
          statusCode: err.statusCode,
          message: err.message
        });
      }
      next(err);
    }
  }
}

module.exports = new KeyauthController();
