const voucherService = require('./vouchers.service');
const { AppError } = require('../../middleware/errorHandler.middleware');

class VoucherController {
  async list(req, res, next) {
    try {
      const vouchers = await voucherService.getAll();
      res.status(200).json({ status: 'success', data: { vouchers } });
    } catch (err) { next(err); }
  }

  async create(req, res, next) {
    try {
      const voucher = await voucherService.create(req.body, req.user.id);
      res.status(201).json({ status: 'success', message: 'Voucher created', data: { voucher } });
    } catch (err) { next(err); }
  }

  async delete(req, res, next) {
    try {
      await voucherService.delete(req.params.id);
      res.status(200).json({ status: 'success', message: 'Voucher deleted' });
    } catch (err) { next(err); }
  }

  async redeem(req, res, next) {
    try {
      const { code } = req.body;
      const result = await voucherService.redeem(code, req.user.id);
      
      if (!result) {
        throw new AppError('Invalid voucher code', 404);
      }

      // Log user activity
      const activityService = require('../activity/activity.service');
      await activityService.log(req.user.id, 'claim_voucher', { 
        code: code,
        license_key: result.license.license_key,
        tier: result.license.tier
      });

      res.status(200).json({
        status: 'success',
        message: 'License activated successfully via voucher',
        data: { license: result.license, code: result.code },
      });
    } catch (err) { next(err); }
  }

  async validate(req, res, next) {
    try {
      const { code, plan } = req.body;
      const result = await voucherService.validate(code, plan, req.user.id);
      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (err) { next(err); }
  }
}

module.exports = new VoucherController();
