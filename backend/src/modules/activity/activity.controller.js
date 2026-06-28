const activityService = require('./activity.service');

class ActivityController {
  async log(req, res, next) {
    try {
      const { action, details } = req.body;
      if (!action) {
        return res.status(400).json({ status: 'error', message: 'Action is required' });
      }
      const data = await activityService.log(req.user.id, action, details);
      res.status(201).json({ status: 'success', statusCode: 201, message: 'Activity logged', data });
    } catch (err) {
      next(err);
    }
  }

  async getMyActivities(req, res, next) {
    try {
      const limit = parseInt(req.query.limit, 10) || 50;
      const offset = parseInt(req.query.offset, 10) || 0;
      const data = await activityService.getForUser(req.user.id, limit, offset);
      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Activities retrieved',
        data
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ActivityController();
