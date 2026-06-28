const crypto = require('crypto');
const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

class LicenseModel {
  async createTable() {
    const pool = getPool();

    // Create ENUM types for license tier and status (dropdown constraints)
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE license_tier AS ENUM ('free', 'premium', 'pro');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE license_status AS ENUM ('unused', 'active', 'revoked', 'expired');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS licenses (
        id          VARCHAR(36)    PRIMARY KEY,
        license_key VARCHAR(50)    NOT NULL,
        user_id     VARCHAR(36)    NULL,
        tier        license_tier   NOT NULL DEFAULT 'free',
        status      license_status NOT NULL DEFAULT 'unused',
        hwid        VARCHAR(255)   NULL,
        uses        INT            NOT NULL DEFAULT 0,
        max_uses    INT            NOT NULL DEFAULT 0,
        hwid_limit  INT            NOT NULL DEFAULT 1,
        source      VARCHAR(20)    NOT NULL DEFAULT 'admin',
        expires_at  TIMESTAMP      NULL,
        created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (license_key)
      )
    `);

    // Ensure claim_ip and claim_fingerprint columns exist for IP & Browser Fingerprint rate limiting
    await pool.query(`
      ALTER TABLE licenses ADD COLUMN IF NOT EXISTS claim_ip VARCHAR(45) NULL;
      ALTER TABLE licenses ADD COLUMN IF NOT EXISTS claim_fingerprint VARCHAR(64) NULL;
      CREATE INDEX IF NOT EXISTS idx_licenses_claim_ip ON licenses(claim_ip);
      CREATE INDEX IF NOT EXISTS idx_licenses_claim_fp ON licenses(claim_fingerprint);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_licenses_user_id ON licenses(user_id);
      CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
    `);

    try {
      await pool.query('DROP TRIGGER IF EXISTS set_licenses_updated_at ON licenses');
      await pool.query(`
        CREATE TRIGGER set_licenses_updated_at
          BEFORE UPDATE ON licenses
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
    } catch (err) {
      logger.warn('Model:License', 'Trigger creation skipped', { error: err.message });
    }

    logger.info('Model:License', 'Table "licenses" ready');
  }

  async findAll() {
    const pool = getPool();
    const result = await pool.query(
      `SELECT l.*, u.name AS user_name, u.email AS user_email,
              (SELECT COUNT(*) FROM hwid_devices h WHERE h.license_id = l.id)::int AS device_count
       FROM licenses l
       LEFT JOIN users u ON l.user_id = u.id
       ORDER BY l.created_at DESC`
    );
    return result.rows;
  }

  async findPaginated({ search = '', limit = 20, offset = 0 } = {}) {
    const pool = getPool();
    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    if (search && search.trim() !== '') {
      whereClauses.push(`(
        l.license_key ILIKE $${paramIndex} OR 
        u.email ILIKE $${paramIndex} OR 
        u.name ILIKE $${paramIndex} OR 
        l.tier::text ILIKE $${paramIndex} OR
        l.status::text ILIKE $${paramIndex}
      )`);
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT l.*, u.name AS user_name, u.email AS user_email,
             (SELECT COUNT(*) FROM hwid_devices h WHERE h.license_id = l.id)::int AS device_count
      FROM licenses l
      LEFT JOIN users u ON l.user_id = u.id
      ${whereSql}
      ORDER BY l.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM licenses l
      LEFT JOIN users u ON l.user_id = u.id
      ${whereSql}
    `;

    const queryParams = [...params, limit, offset];

    const [rowsResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, params)
    ]);

    const total = parseInt(countResult.rows[0]?.total || 0, 10);
    return { licenses: rowsResult.rows, total };
  }

  async findByUserId(userId) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT l.*, u.name AS user_name, u.email AS user_email,
              (SELECT COUNT(*) FROM hwid_devices h WHERE h.license_id = l.id)::int AS device_count
       FROM licenses l
       LEFT JOIN users u ON l.user_id = u.id
       WHERE l.user_id = $1
       ORDER BY l.created_at DESC`, [userId]
    );
    return result.rows;
  }

  async findById(id) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT l.*, u.name AS user_name, u.email AS user_email,
              (SELECT COUNT(*) FROM hwid_devices h WHERE h.license_id = l.id)::int AS device_count
       FROM licenses l
       LEFT JOIN users u ON l.user_id = u.id
       WHERE l.id = $1`, [id]
    );
    return result.rows[0] || null;
  }

  async create(data) {
    const pool = getPool();
    const id = crypto.randomUUID();
    const { license_key, user_id, tier, status, max_uses, hwid_limit, source, expires_at, claim_ip, claim_fingerprint } = data;
    await pool.query(
      `INSERT INTO licenses (id, license_key, user_id, tier, status, max_uses, hwid_limit, source, expires_at, claim_ip, claim_fingerprint)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [id, license_key, user_id || null, tier || 'free', status || 'unused', max_uses || 0, hwid_limit || 1, source || 'admin', expires_at || null, claim_ip || null, claim_fingerprint || null]
    );
    return this.findById(id);
  }

  async update(id, updateData) {
    const pool = getPool();
    const ALLOWED = ['user_id', 'tier', 'status', 'hwid', 'uses', 'max_uses', 'hwid_limit', 'source', 'expires_at'];
    const fields = Object.keys(updateData).filter(f => ALLOWED.includes(f));
    if (fields.length === 0) return this.findById(id);
    const values = fields.map(f => updateData[f]);
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    await pool.query(`UPDATE licenses SET ${setClause} WHERE id = $${fields.length + 1}`, [...values, id]);
    return this.findById(id);
  }

  async delete(id) {
    const pool = getPool();
    await pool.query('DELETE FROM licenses WHERE id = $1', [id]);
  }

  /**
   * Mark all expired licenses as 'expired' where expires_at is in the past
   * and status is still 'active' or 'unused'. Runs at startup and every 6 hours.
   */
  async cleanupExpired() {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE licenses SET status = 'expired', updated_at = CURRENT_TIMESTAMP
       WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP
       AND status IN ('active', 'unused')`
    );
    if (result.rowCount > 0) {
      logger.info('Model:License', 'Expired licenses cleaned up', { count: result.rowCount });
    }
    return result.rowCount;
  }
  
  /**
   * Refactored: Get licenses within a specific UTC date range
   * Use this instead of relying on CURRENT_DATE or DATE() casting in SQL
   * 
   * @param {string} startDate - UTC start date ISO string
   * @param {string} endDate - UTC end date ISO string
   */
  async findActiveInRange(startDate, endDate) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT l.*, u.name AS user_name, u.email AS user_email,
              (SELECT COUNT(*) FROM hwid_devices h WHERE h.license_id = l.id)::int AS device_count
       FROM licenses l
       LEFT JOIN users u ON l.user_id = u.id
       WHERE l.created_at >= $1 AND l.created_at <= $2
       ORDER BY l.created_at DESC`,
      [startDate, endDate]
    );
    return result.rows;
  }

  async lookup(queryText) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT DISTINCT l.*, u.name AS user_name, u.email AS user_email,
              (SELECT COUNT(*) FROM hwid_devices h2 WHERE h2.license_id = l.id)::int AS device_count
       FROM licenses l
       LEFT JOIN users u ON l.user_id = u.id
       LEFT JOIN hwid_devices h ON h.license_id = l.id
       WHERE l.id = $1
          OR l.license_key = $2
          OR u.email = $3
          OR h.hwid = $4`,
      [queryText, queryText, queryText, queryText]
    );
    return result.rows;
  }
}

module.exports = new LicenseModel();
