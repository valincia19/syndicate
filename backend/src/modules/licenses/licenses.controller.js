
const licenseService = require('./licenses.service');

class LicenseController {
  async list(req, res, next) {
    try {
      const search = req.query.search || '';
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
      const offset = (page - 1) * limit;

      const { licenses, total } = await licenseService.getLicensesPaginated({ search, limit, offset });
      const totalPages = Math.ceil(total / limit) || 1;

      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Licenses retrieved successfully',
        data: {
          licenses,
          pagination: {
            total,
            page,
            limit,
            totalPages,
          },
        },
      });
    } catch (err) { next(err); }
  }

  async myLicenses(req, res, next) {
    try {
      const licenses = await licenseService.getMyLicenses(req.user.id);
      res.status(200).json({ status: 'success', data: { licenses } });
    } catch (err) { next(err); }
  }

  async getForUser(req, res, next) {
    try {
      let license;
      if (req.user && ['admin', 'owner'].includes(req.user.role)) {
        license = await licenseService.getLicense(req.params.id);
      } else {
        license = await licenseService.getLicenseForUser(req.params.id, req.user.id);
      }
      res.status(200).json({ status: 'success', data: { license } });
    } catch (err) { next(err); }
  }

  async get(req, res, next) {
    try {
      const license = await licenseService.getLicense(req.params.id);
      res.status(200).json({ status: 'success', data: { license } });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const license = await licenseService.createLicense(req.body);
      res.status(201).json({ status: 'success', message: 'License created', data: { license } });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const license = await licenseService.updateLicense(req.params.id, req.body);
      res.status(200).json({ status: 'success', message: 'License updated', data: { license } });
    } catch (err) { next(err); }
  }

  async delete(req, res, next) {
    try {
      await licenseService.deleteLicense(req.params.id);
      res.status(200).json({ status: 'success', message: 'License deleted' });
    } catch (err) { next(err); }
  }

  async lookup(req, res, next) {
    try {
      const { query } = req.query;
      const licenses = await licenseService.lookupLicense(query);
      res.status(200).json({ status: 'success', data: { licenses } });
    } catch (err) { next(err); }
  }

  /**
   * Public endpoint — generate a free trial key.
   * Requires a valid server-verified session_id. Rate-limited per IP.
   */
  async freeKey(req, res, next) {
    try {
      const { session_id } = req.body;
      const AppError = require('../../utils/appError');
      const redisModule = require('../../config/redis');
      const redis = redisModule.getRedis();

      if (!redis) {
        throw new AppError('Verification system unavailable (Redis disconnected)', 503);
      }

      if (!session_id) {
        throw new AppError('Verification session ID is required', 400);
      }

      const sessionData = await redis.get(`session:${session_id}`);
      if (!sessionData) {
        throw new AppError('Invalid or expired verification session', 403);
      }

      let session = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;

      if (!session.captcha) {
        throw new AppError('Captcha verification step incomplete', 403);
      }
      if (!session.shortlink) {
        throw new AppError('Shortlink verification step incomplete', 403);
      }

      const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
      if (session.ip && session.ip !== 'unknown' && session.ip !== ip) {
        throw new AppError('IP address mismatch for session', 403);
      }

      const userAgent = req.headers['user-agent'] || '';
      const license = await licenseService.createFreeKey(ip, userAgent);

      // BURN SESSION TIMING: Delete session ONLY after DB create succeeds
      await redis.del(`session:${session_id}`);

      // Log activity (fire-and-forget, don't block response)
      try {
        const activityService = require('../activity/activity.service');
        activityService.log(null, 'free_key_claimed', {
          ip,
          license_key: license.license_key,
          tier: license.tier,
        }).catch(() => {});
      } catch { /* ignore activity log failure */ }

      res.status(201).json({
        status: 'success',
        statusCode: 201,
        message: 'Free key generated successfully',
        data: {
          license_key: license.license_key,
          tier: license.tier,
          status: license.status,
          hwid_limit: license.hwid_limit,
          expires_at: license.expires_at,
        },
      });
    } catch (err) { next(err); }
  }
}

module.exports = new LicenseController();
