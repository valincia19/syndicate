const executionService = require('./executions.service');

class ExecutionController {
  async stats(req, res, next) {
    try {
      const data = await executionService.getStats();
      res.status(200).json({ status: 'success', statusCode: 200, message: 'Execution stats retrieved', data });
    } catch (err) { next(err); }
  }
}

module.exports = new ExecutionController();
