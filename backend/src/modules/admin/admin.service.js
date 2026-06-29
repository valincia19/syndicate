/**
 * Admin Service Layer
 * Owner-level operations: user management, system settings
 */

const UserModel = require('../auth/auth.model');
const { AppError } = require('../../middleware/errorHandler.middleware');
const cacheUtility = require('../../utils/cache.utility');

const VALID_ROLES = ['user', 'staff', 'admin', 'developer', 'owner'];

class AdminService {
  /**
   * Get users with pagination and search
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async getUsers(options = {}) {
    return UserModel.findPaginated(options);
  }

  /**
   * Get real-time system overview statistics
   * @returns {Promise<Object>}
   */
  async getOverviewStats() {
    return cacheUtility.getOrSet(
      'cache:admin:overview_stats',
      async () => {
        const { getPool } = require('../../config/database');
        const pool = getPool();

        const [licensesRes, hwidRes, usersRes, dailyOpsRes, totalOpsRes] = await Promise.all([
          pool.query(`SELECT COUNT(*)::int AS count FROM licenses WHERE status = 'active'`),
          pool.query(`SELECT COUNT(*)::int AS count FROM hwid_devices`),
          pool.query(`SELECT COUNT(*)::int AS count FROM users`),
          pool.query(`SELECT COUNT(*)::int AS count FROM user_activities WHERE created_at >= CURRENT_DATE`),
          pool.query(`SELECT COUNT(*)::int AS count FROM user_activities`)
        ]);

        const dailyCount = dailyOpsRes.rows[0]?.count || 0;
        const totalCount = totalOpsRes.rows[0]?.count || 0;

        return {
          activeLicenses: licensesRes.rows[0]?.count || 0,
          hwidWhitelisted: hwidRes.rows[0]?.count || 0,
          totalUsers: usersRes.rows[0]?.count || 0,
          dailyOperations: dailyCount > 0 ? dailyCount : totalCount,
        };
      },
      60 // 1 Minute TTL
    );
  }

  /**
   * Update a user's role
   * @param {string} targetUserId - UUID of user to update
   * @param {string} newRole - new role value
   * @param {string} actorId - UUID of the owner performing the action
   */
  async updateUserRole(targetUserId, newRole, actorId) {
    if (!VALID_ROLES.includes(newRole)) {
      throw new AppError(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`, 400);
    }

    const user = await UserModel.findById(targetUserId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.id === actorId) {
      throw new AppError('Cannot change your own role', 400);
    }

    const updated = await UserModel.update(targetUserId, { role: newRole });
    await cacheUtility.del(`cache:user_profile:${targetUserId}`);

    const activityService = require('../activity/activity.service');
    await activityService.log(actorId, 'update_user_role', {
      target_user_id: targetUserId,
      target_user_name: user.name,
      target_user_email: user.email,
      new_role: newRole
    });

    return updated;
  }

  /**
   * Update multiple user fields at once
   * @param {string} userId - UUID
   * @param {Object} data - fields to update (name, username, email, role, balance, etc.)
   * @returns {Promise<Object>}
   */
  async updateUser(userId, data, actorId) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    const updated = await UserModel.update(userId, data);
    await cacheUtility.del(`cache:user_profile:${userId}`);

    if (actorId) {
      const activityService = require('../activity/activity.service');
      await activityService.log(actorId, 'update_user_data', {
        target_user_id: userId,
        target_user_name: user.name,
        target_user_email: user.email,
        updated_fields: Object.keys(data)
      });
    }

    return updated;
  }

  /**
   * Toggle user suspended status
   * @param {string} targetUserId - UUID
   * @param {boolean} suspend - true to suspend, false to unsuspend
   * @param {string} actorId - Actor's UUID
   * @param {string} actorRole - Actor's role
   * @returns {Promise<Object>} Updated user
   */
  async toggleSuspend(targetUserId, suspend, actorId, actorRole) {
    const user = await UserModel.findById(targetUserId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.id === actorId) {
      throw new AppError('Cannot suspend your own account', 400);
    }

    if (actorRole === 'admin') {
      if (user.role === 'owner') {
        throw new AppError('Admins cannot suspend Owner accounts', 403);
      }
      if (user.role === 'admin') {
        throw new AppError('Admins cannot suspend other Admin accounts', 403);
      }
    }

    const updated = await UserModel.update(targetUserId, { suspended: suspend ? 1 : 0 });
    await cacheUtility.del(`cache:user_profile:${targetUserId}`);

    const activityService = require('../activity/activity.service');
    await activityService.log(actorId, suspend ? 'suspend_user' : 'unsuspend_user', {
      target_user_id: targetUserId,
      target_user_name: user.name,
      target_user_email: user.email
    });

    if (suspend) {
      const { wssRegistry } = require('../../config/websocket');
      wssRegistry.terminateUser(targetUserId, 'Your account has been suspended.');
    }

    return updated;
  }

  /**
   * Delete a user
   * @param {string} targetUserId - UUID
   * @param {string} actorId - UUID of the owner
   */
  async deleteUser(targetUserId, actorId) {
    const user = await UserModel.findById(targetUserId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.id === actorId) {
      throw new AppError('Cannot delete your own account', 400);
    }

    await UserModel.delete(targetUserId);
    await cacheUtility.del(`cache:user_profile:${targetUserId}`);

    const activityService = require('../activity/activity.service');
    await activityService.log(actorId, 'delete_user', {
      target_user_id: targetUserId,
      target_user_name: user.name,
      target_user_email: user.email
    });

    const { wssRegistry } = require('../../config/websocket');
    wssRegistry.terminateUser(targetUserId, 'Account no longer exists.');
  }

  /**
   * Get all user activity logs (paginated + filtered)
   * @param {Object} options
   * @returns {Promise<Object>}
   */
  async getActivities(options = {}) {
    const ActivityModel = require('../activity/activity.model');
    const { search = '', action = '', user_id = '', role_group = '', limit = 50, offset = 0 } = options;

    const filters = {};
    if (search.trim()) filters.search = search.trim();
    if (action.trim()) filters.action = action.trim();
    if (user_id.trim()) filters.user_id = user_id.trim();

    if (role_group === 'admin') {
      filters.roles = ['owner', 'admin', 'staff'];
    } else if (role_group === 'user') {
      filters.roles = ['user', 'developer'];
    }

    const [logs, total] = await Promise.all([
      ActivityModel.findAll(filters, limit, offset),
      ActivityModel.countAll(filters)
    ]);

    return { logs, total };
  }

  /**
   * Delete an activity log entry
   * @param {string} logId
   * @param {string} actorId
   * @returns {Promise<boolean>}
   */
  async deleteActivity(logId, actorId) {
    const ActivityModel = require('../activity/activity.model');
    await ActivityModel.delete(logId);

    const activityService = require('../activity/activity.service');
    await activityService.log(actorId, 'delete_activity', {
      deleted_log_id: logId
    });
    return true;
  }

  /**
   * Get system setting by key name
   * @param {string} keyName
   * @returns {Promise<Object>}
   */
  async getSystemSetting(keyName) {
    const { getPool } = require('../../config/database');
    const pool = getPool();
    const result = await pool.query(
      'SELECT key_value FROM system_settings WHERE key_name = $1',
      [keyName]
    );
    return result.rows[0]?.key_value || null;
  }

  /**
   * Save system setting by key name
   * @param {string} keyName
   * @param {Object} keyValue
   * @returns {Promise<Object>}
   */
  async saveSystemSetting(keyName, keyValue) {
    const { getPool } = require('../../config/database');
    const pool = getPool();
    await pool.query(
      `INSERT INTO system_settings (key_name, key_value)
       VALUES ($1, $2)
       ON CONFLICT (key_name)
       DO UPDATE SET key_value = EXCLUDED.key_value, updated_at = CURRENT_TIMESTAMP`,
      [keyName, JSON.stringify(keyValue)]
    );
    await cacheUtility.del(`cache:settings:${keyName}`);
    return keyValue;
  }

  async getExecutionLogs(page = 1, limit = 20) {
    const { getPool } = require('../../config/database');
    const pool = getPool();
    const offset = (page - 1) * limit;

    const countRes = await pool.query('SELECT COUNT(*)::int AS count FROM execution_logs');
    const logsRes = await pool.query(
      'SELECT * FROM execution_logs ORDER BY date DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    return {
      total: countRes.rows[0].count,
      page,
      limit,
      logs: logsRes.rows
    };
  }

  async getExecutionKeys(page = 1, limit = 20, search = '') {
    const { getPool } = require('../../config/database');
    const pool = getPool();
    const offset = (page - 1) * limit;

    let countQuery = 'SELECT COUNT(*)::int AS count FROM execution_keys';
    let dataQuery = 'SELECT * FROM execution_keys ORDER BY date DESC, count DESC LIMIT $1 OFFSET $2';
    const params = [limit, offset];

    if (search) {
      countQuery = 'SELECT COUNT(*)::int AS count FROM execution_keys WHERE license_key ILIKE $1';
      dataQuery = 'SELECT * FROM execution_keys WHERE license_key ILIKE $3 ORDER BY date DESC, count DESC LIMIT $1 OFFSET $2';
      params.push(`%${search}%`);
    }

    const countRes = await pool.query(countQuery, search ? [params[2]] : []);
    const keysRes = await pool.query(dataQuery, params);

    return {
      total: countRes.rows[0].count,
      page,
      limit,
      keys: keysRes.rows
    };
  }
}

module.exports = new AdminService();
