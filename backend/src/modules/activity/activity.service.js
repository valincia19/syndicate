const ActivityModel = require('./activity.model');

class ActivityService {
  async log(userId, action, details = null) {
    return ActivityModel.log(userId, action, details);
  }

  async getForUser(userId, limit = 50, offset = 0) {
    const logs = await ActivityModel.findByUserId(userId, limit, offset);
    const total = await ActivityModel.countByUserId(userId);
    return { logs, total };
  }

  async getAll(filters = {}, limit = 50, offset = 0) {
    const logs = await ActivityModel.findAll(filters, limit, offset);
    const total = await ActivityModel.countAll(filters);
    return { logs, total };
  }

  async cleanLogs(range) {
    return ActivityModel.clean(range);
  }
}

module.exports = new ActivityService();
