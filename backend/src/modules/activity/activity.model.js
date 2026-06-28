const crypto = require('crypto');
const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

class ActivityModel {
  async createTable() {
    const pool = getPool();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_activities (
        id          VARCHAR(36)   PRIMARY KEY,
        user_id     VARCHAR(36)   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action      VARCHAR(100)  NOT NULL,
        details     JSONB         NULL,
        created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_activities_user ON user_activities(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_activities_created ON user_activities(created_at DESC);
    `);

    logger.info('Model:Activity', 'Table "user_activities" ready');
  }

  async log(userId, action, details = null) {
    const pool = getPool();
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO user_activities (id, user_id, action, details)
       VALUES ($1, $2, $3, $4)`,
      [id, userId, action, details ? JSON.stringify(details) : null]
    );
    return { id, user_id: userId, action, details, created_at: new Date() };
  }

  async findByUserId(userId, limit = 50, offset = 0) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM user_activities
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  }

  async countByUserId(userId) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count FROM user_activities
       WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0].count;
  }

  async findAll(filters = {}, limit = 50, offset = 0) {
    const pool = getPool();
    let sql = `SELECT ua.*, u.name AS user_name, u.email AS user_email, u.role AS user_role, u.avatar AS user_avatar
       FROM user_activities ua
       LEFT JOIN users u ON ua.user_id = u.id`;
    const params = [];
    const conditions = [];

    if (filters.action) {
      conditions.push(`ua.action = $${params.length + 1}`);
      params.push(filters.action);
    }
    if (filters.user_id) {
      conditions.push(`ua.user_id = $${params.length + 1}`);
      params.push(filters.user_id);
    }
    if (filters.search) {
      const searchParam = `%${filters.search}%`;
      conditions.push(`(u.name ILIKE $${params.length + 1} OR u.email ILIKE $${params.length + 1} OR ua.action ILIKE $${params.length + 1})`);
      params.push(searchParam);
    }
    if (filters.roles && Array.isArray(filters.roles) && filters.roles.length) {
      const placeholders = filters.roles.map((_, idx) => `$${params.length + idx + 1}`).join(', ');
      conditions.push(`u.role IN (${placeholders})`);
      params.push(...filters.roles);
    }

    if (conditions.length) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ` ORDER BY ua.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(sql, params);
    return result.rows;
  }

  async countAll(filters = {}) {
    const pool = getPool();
    let sql = `SELECT COUNT(*)::int AS count 
       FROM user_activities ua
       LEFT JOIN users u ON ua.user_id = u.id`;
    const params = [];
    const conditions = [];

    if (filters.action) {
      conditions.push(`ua.action = $${params.length + 1}`);
      params.push(filters.action);
    }
    if (filters.user_id) {
      conditions.push(`ua.user_id = $${params.length + 1}`);
      params.push(filters.user_id);
    }
    if (filters.search) {
      const searchParam = `%${filters.search}%`;
      conditions.push(`(u.name ILIKE $${params.length + 1} OR u.email ILIKE $${params.length + 1} OR ua.action ILIKE $${params.length + 1})`);
      params.push(searchParam);
    }
    if (filters.roles && Array.isArray(filters.roles) && filters.roles.length) {
      const placeholders = filters.roles.map((_, idx) => `$${params.length + idx + 1}`).join(', ');
      conditions.push(`u.role IN (${placeholders})`);
      params.push(...filters.roles);
    }

    if (conditions.length) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    const result = await pool.query(sql, params);
    return result.rows[0].count;
  }

  async delete(id) {
    const pool = getPool();
    await pool.query('DELETE FROM user_activities WHERE id = $1', [id]);
    return true;
  }

  async clean(range) {
    const pool = getPool();
    let query = '';
    if (range === '7d') {
      query = "DELETE FROM user_activities WHERE created_at < NOW() - INTERVAL '7 days'";
    } else if (range === '30d') {
      query = "DELETE FROM user_activities WHERE created_at < NOW() - INTERVAL '30 days'";
    } else if (range === 'all') {
      query = "DELETE FROM user_activities";
    } else {
      throw new Error('Invalid range specified for clean action');
    }
    const res = await pool.query(query);
    return res.rowCount || 0;
  }
}

module.exports = new ActivityModel();
