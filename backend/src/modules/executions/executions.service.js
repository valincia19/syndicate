const ExecutionModel = require('./executions.model');

class ExecutionService {
  async getStats() {
    const [total, today, history] = await Promise.all([
      ExecutionModel.getTotal(),
      ExecutionModel.getToday(),
      ExecutionModel.getWeeklyHistory(),
    ]);

    return { total, today, history };
  }
}

module.exports = new ExecutionService();
