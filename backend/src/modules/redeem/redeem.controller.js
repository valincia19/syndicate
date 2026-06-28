
const redeemService = require('./redeem.service');

class RedeemController {
  async list(req, res, next) {
    try {
      const codes = await redeemService.getAll();
      res.status(200).json({ status: 'success', data: { codes } });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const code = await redeemService.create(req.body, req.user.id);
      res.status(201).json({ status: 'success', message: 'Redeem code created', data: { code } });
    } catch (err) { next(err); }
  }

  async delete(req, res, next) {
    try {
      await redeemService.delete(req.params.id);
      res.status(200).json({ status: 'success', message: 'Redeem code deleted' });
    } catch (err) { next(err); }
  }

  async redeem(req, res, next) {
    try {
      const { code } = req.body;
      const result = await redeemService.redeem(code, req.user.id);

      // Log user activity
      const activityService = require('../activity/activity.service');
      await activityService.log(req.user.id, 'redeem_code', { 
        code: code,
        license_key: result.license.license_key,
        tier: result.license.tier
      });

      res.status(200).json({
        status: 'success',
        message: 'License activated successfully',
        data: { license: result.license, code: result.code },
      });
    } catch (err) { next(err); }
  }
}

module.exports = new RedeemController();
