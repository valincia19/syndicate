const crypto = require('crypto');
const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

class RedeemModel {
  async createTable() {
    const pool = getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS redeem_codes (
        id            VARCHAR(36)   PRIMARY KEY,
        code          VARCHAR(50)   NOT NULL,
        tier          VARCHAR(10)   NOT NULL DEFAULT 'free' CHECK(tier IN ('free','premium','pro')),
        hwid_limit    INT           NOT NULL DEFAULT 1,
        duration_days INT           NOT NULL DEFAULT 7,
        status        VARCHAR(10)   NOT NULL DEFAULT 'unused' CHECK(status IN ('unused','used')),
        used_by       VARCHAR(36)   NULL,
        used_at       TIMESTAMP     NULL,
        created_by    VARCHAR(36)   NOT NULL,
        created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (code)
      )
    `);
    
    // Safety check/migration: ensure updated_at column exists
    await pool.query(`
      ALTER TABLE redeem_codes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_redeem_status ON redeem_codes(status);
    `);

    try {
      await pool.query('DROP TRIGGER IF EXISTS set_redeem_codes_updated_at ON redeem_codes');
      await pool.query(`
        CREATE TRIGGER set_redeem_codes_updated_at
          BEFORE UPDATE ON redeem_codes
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
    } catch (err) {
      logger.warn('Model:Redeem', 'Trigger creation skipped', { error: err.message });
    }

    logger.info('Model:Redeem', 'Table "redeem_codes" ready');
  }

  async findAll() {
    const pool = getPool();
    const result = await pool.query(
      `SELECT r.*,
              u.email AS created_by_email,
              uu.email AS used_by_email, uu.name AS used_by_name
       FROM redeem_codes r
       LEFT JOIN users u ON r.created_by = u.id
       LEFT JOIN users uu ON r.used_by = uu.id
       ORDER BY r.created_at DESC`
    );
    return result.rows;
  }

  async findById(id) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT r.*,
              u.email AS created_by_email,
              uu.email AS used_by_email, uu.name AS used_by_name
       FROM redeem_codes r
       LEFT JOIN users u ON r.created_by = u.id
       LEFT JOIN users uu ON r.used_by = uu.id
       WHERE r.id = $1`, [id]
    );
    return result.rows[0] || null;
  }

  async findByCode(code) {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM redeem_codes WHERE code = $1', [code]
    );
    return result.rows[0] || null;
  }

  async create(data) {
    const pool = getPool();
    const id = crypto.randomUUID();
    const { code, tier, hwid_limit, duration_days, created_by } = data;
    await pool.query(
      `INSERT INTO redeem_codes (id, code, tier, hwid_limit, duration_days, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, code, tier, hwid_limit, duration_days, created_by]
    );
    return this.findById(id);
  }

  async markUsed(id, userId) {
    const pool = getPool();
    await pool.query(
      'UPDATE redeem_codes SET status = $1, used_by = $2, used_at = CURRENT_TIMESTAMP WHERE id = $3',
      ['used', userId, id]
    );
    return this.findById(id);
  }

  async markUsedAtomic(id, userId) {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE redeem_codes 
       SET status = 'used', used_by = $1, used_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND status = 'unused' 
       RETURNING *`,
      [userId, id]
    );
    return result.rows[0] || null;
  }

  async delete(id) {
    const pool = getPool();
    await pool.query('DELETE FROM redeem_codes WHERE id = $1', [id]);
  }
}

module.exports = new RedeemModel();
