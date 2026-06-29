/**
 * Admin Controller Layer
 * Handles HTTP for owner-level operations
 */

const adminService = require('./admin.service');

class AdminController {
  /**
   * GET /v1/admin/users
   */
  async listUsers(req, res, next) {
    try {
      const search = req.query.search || '';
      const role = req.query.role || '';
      const suspended = req.query.suspended || '';
      const verified = req.query.verified || '';
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
      const offset = (page - 1) * limit;

      const { users, total } = await adminService.getUsers({ search, role, suspended, verified, limit, offset });
      const totalPages = Math.ceil(total / limit) || 1;

      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Users retrieved successfully',
        data: {
          users,
          pagination: {
            total,
            page,
            limit,
            totalPages,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /v1/admin/stats
   */
  async getStats(req, res, next) {
    try {
      const stats = await adminService.getOverviewStats();
      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Admin stats retrieved successfully',
        data: { stats },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /v1/admin/users/:id/role
   */
  async updateRole(req, res, next) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const user = await adminService.updateUserRole(id, role, req.user.id);
      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'User role updated successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /v1/admin/users/:id
   * Body: any allowed fields (name, username, email, role, balance, etc.)
   */
  async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const user = await adminService.updateUser(id, updateData, req.user.id);
      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'User updated successfully',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /v1/admin/users/:id/suspend
   * Body: { suspended: boolean }
   */
  async toggleSuspend(req, res, next) {
    try {
      const { id } = req.params;
      const { suspended } = req.body;
      const user = await adminService.toggleSuspend(id, suspended, req.user.id, req.user.role);
      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: suspended ? 'User suspended' : 'User unsuspended',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /v1/admin/users/:id
   */
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      await adminService.deleteUser(id, req.user.id);
      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'User deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /v1/admin/activities
   */
  async listActivities(req, res, next) {
    try {
      const search = req.query.search || '';
      const action = req.query.action || '';
      const userId = req.query.user_id || '';
      const roleGroup = req.query.role_group || '';
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
      const offset = (page - 1) * limit;

      const { logs, total } = await adminService.getActivities({
        search,
        action,
        user_id: userId,
        role_group: roleGroup,
        limit,
        offset,
      });

      const totalPages = Math.ceil(total / limit) || 1;

      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Activities retrieved successfully',
        data: {
          logs,
          pagination: {
            total,
            page,
            limit,
            totalPages,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /v1/admin/activities/:id
   */
  async deleteActivity(req, res, next) {
    try {
      const { id } = req.params;
      await adminService.deleteActivity(id, req.user.id);
      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Activity log deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /v1/admin/settings/:key
   */
  async getSetting(req, res, next) {
    try {
      const { key } = req.params;
      const settings = await adminService.getSystemSetting(key);
      res.status(200).json({
        status: 'success',
        statusCode: 200,
        message: 'Settings retrieved successfully',
        data: settings,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /v1/admin/settings/:key
   */
  async saveSetting(req, res, next) {
    try {
      const { key } = req.params;
      const data = await adminService.saveSystemSetting(key, req.body);
      res.status(200).json({ status: 'success', statusCode: 200, message: 'Setting saved', data });
    } catch (err) { next(err); }
  }

  async listExecutionLogs(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const data = await adminService.getExecutionLogs(page, limit);
      res.status(200).json({ status: 'success', statusCode: 200, data });
    } catch (err) { next(err); }
  }

  async listExecutionKeys(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const search = req.query.search || '';
      const data = await adminService.getExecutionKeys(page, limit, search);
      res.status(200).json({ status: 'success', statusCode: 200, data });
    } catch (err) { next(err); }
  }
}

module.exports = new AdminController();
