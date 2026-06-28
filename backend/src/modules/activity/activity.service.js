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
}

module.exports = new ActivityService();
