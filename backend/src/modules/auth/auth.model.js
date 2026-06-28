const crypto = require('crypto');
const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

class UserModel {
  async createTable() {
    const pool = getPool();

    const cols = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_catalog = current_database() AND table_name = 'users' AND column_name = 'id'`
    );

    if (cols.rows.length > 0 && cols.rows[0].data_type === 'integer') {
      logger.warn('Model:User', 'Old schema detected (INT id). Dropping for migration...');
      await pool.query('DROP TABLE IF EXISTS users CASCADE');
    }

    // Create ENUM type for user roles (dropdown constraint)
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('user', 'staff', 'admin', 'developer', 'owner');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id                   VARCHAR(36)   PRIMARY KEY,
        name                 VARCHAR(100)  NOT NULL,
        username             VARCHAR(50)   NULL,
        avatar               VARCHAR(255)  NULL,
        email                VARCHAR(150)  NOT NULL,
        discord_id           VARCHAR(50)   NULL,
        password             VARCHAR(255)  NOT NULL,
        role                 user_role     NOT NULL DEFAULT 'user',
        verified             SMALLINT      NOT NULL DEFAULT 0,
        balance              DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        suspended            SMALLINT      NOT NULL DEFAULT 0,
        created_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at           TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (email),
        UNIQUE (username)
      )
    `);

    try {
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
      `);
    } catch (err) {
      logger.warn('Model:User', 'Index creation skipped', { error: err.message });
    }

    try {
      await pool.query('DROP TRIGGER IF EXISTS set_users_updated_at ON users');
      await pool.query(`
        CREATE TRIGGER set_users_updated_at
          BEFORE UPDATE ON users
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
    } catch (err) {
      logger.warn('Model:User', 'Trigger creation skipped', { error: err.message });
    }

    logger.info('Model:User', 'Table "users" ready');
  }

  async findByEmail(email) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, name, username, avatar, email, discord_id,
              password, role, verified, balance, suspended, created_at, updated_at
       FROM users WHERE email = $1`,
      [email]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async findById(id) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, name, username, avatar, email, discord_id,
              role, verified, balance, suspended, created_at, updated_at
       FROM users WHERE id = $1`,
      [id]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async findByUsername(username) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, name, username, avatar, email, discord_id, role, verified, balance, suspended, created_at, updated_at
       FROM users WHERE username = $1`,
      [username]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async create(userData) {
    const pool = getPool();
    const id = crypto.randomUUID();
    const { name, username, avatar, email, password, discord_id, role, verified } = userData;
    await pool.query(
      `INSERT INTO users (id, name, username, avatar, email, discord_id, password, role, verified, balance, suspended)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [id, name, username || null, avatar || null, email, discord_id || null, password, role || 'user', verified || 0, 0.00, 0]
    );
    return this.findById(id);
  }

  async findAll() {
    const pool = getPool();
    const result = await pool.query(
      `SELECT id, name, username, avatar, email, discord_id,
              role, verified, balance, suspended, created_at, updated_at
       FROM users ORDER BY created_at DESC`
    );
    return result.rows;
  }

  async findPaginated({ search = '', role = '', suspended = '', verified = '', limit = 20, offset = 0 } = {}) {
    const pool = getPool();
    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    if (search && search.trim() !== '') {
      whereClauses.push(`(
        u.name ILIKE $${paramIndex} OR 
        u.username ILIKE $${paramIndex} OR 
        u.email ILIKE $${paramIndex} OR 
        u.discord_id ILIKE $${paramIndex} OR
        u.role::text ILIKE $${paramIndex}
      )`);
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (role && role.trim() !== '') {
      whereClauses.push(`u.role = $${paramIndex}`);
      params.push(role.trim());
      paramIndex++;
    }

    if (suspended !== undefined && suspended !== null && suspended !== '') {
      whereClauses.push(`u.suspended = $${paramIndex}`);
      params.push(parseInt(suspended, 10));
      paramIndex++;
    }

    if (verified !== undefined && verified !== null && verified !== '') {
      whereClauses.push(`u.verified = $${paramIndex}`);
      params.push(parseInt(verified, 10));
      paramIndex++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT u.id, u.name, u.username, u.avatar, u.email, u.discord_id,
             u.role, u.verified, u.balance, u.suspended, u.created_at, u.updated_at,
             COALESCE(l.keys_count, 0)::int AS keys_count,
             COALESCE(d.used_hwids, 0)::int AS used_hwids,
             (COALESCE(l.total_hwid_limit, 0) - COALESCE(d.used_hwids, 0))::int AS unused_hwids
      FROM users u
      LEFT JOIN (
        SELECT user_id, COUNT(id) AS keys_count, SUM(hwid_limit) AS total_hwid_limit
        FROM licenses
        GROUP BY user_id
      ) l ON u.id = l.user_id
      LEFT JOIN (
        SELECT l.user_id, COUNT(d.id) AS used_hwids
        FROM hwid_devices d
        JOIN licenses l ON d.license_id = l.id
        WHERE d.status = 'active'
        GROUP BY l.user_id
      ) d ON u.id = d.user_id
      ${whereSql}
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) as total FROM users u ${whereSql}
    `;

    const queryParams = [...params, limit, offset];

    const [rowsResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, params)
    ]);

    const total = parseInt(countResult.rows[0]?.total || 0, 10);
    return { users: rowsResult.rows, total };
  }

  async update(id, updateData) {
    const pool = getPool();
    const ALLOWED_FIELDS = [
      'name', 'username', 'avatar', 'email',
      'password', 'discord_id',
      'role', 'verified', 'balance', 'suspended'
    ];
    const fields = Object.keys(updateData).filter(f => ALLOWED_FIELDS.includes(f));
    if (fields.length === 0) return this.findById(id);
    const values = fields.map(f => updateData[f]);
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    await pool.query(
      `UPDATE users SET ${setClause} WHERE id = $${fields.length + 1}`,
      [...values, id]
    );
    return this.findById(id);
  }

  async delete(id) {
    const pool = getPool();
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  async deductBalanceAtomic(userId, amount) {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE users 
       SET balance = balance - $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND balance >= $1 
       RETURNING id, balance`,
      [amount, userId]
    );
    return result.rows[0] || null;
  }

  async addBalanceAtomic(userId, amount) {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE users 
       SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, balance`,
      [amount, userId]
    );
    return result.rows[0] || null;
  }
}

module.exports = new UserModel();
