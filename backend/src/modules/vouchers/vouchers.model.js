const crypto = require('crypto');
const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

class VoucherModel {
  async createTable() {
    const pool = getPool();
    
    // Create vouchers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vouchers (
        id            VARCHAR(36)   PRIMARY KEY,
        code          VARCHAR(50)   NOT NULL,
        tier          VARCHAR(10)   NOT NULL DEFAULT 'premium' CHECK(tier IN ('premium','pro')),
        hwid_limit    INT           NOT NULL DEFAULT 5,
        duration_days INT           NOT NULL DEFAULT 30,
        max_uses      INT           NOT NULL DEFAULT 1,
        uses_count    INT           NOT NULL DEFAULT 0,
        discount_percent INT        NOT NULL DEFAULT 0,
        active_from   TIMESTAMP     NULL,
        expires_at    TIMESTAMP     NULL,
        created_by    VARCHAR(36)   NOT NULL,
        created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (code)
      )
    `);
    
    // Safety check/migration: ensure active_from column exists if table was already created
    await pool.query(`
      ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS active_from TIMESTAMP NULL;
    `);

    // Safety check/migration: ensure discount_percent column exists
    await pool.query(`
      ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS discount_percent INT NOT NULL DEFAULT 0;
    `);

    // Safety check/migration: ensure updated_at column exists
    await pool.query(`
      ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);
    
    // Create index on code
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
    `);

    // Create voucher_claims table (Allow multiple claims per user, e.g. up to 3 times)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS voucher_claims (
        id            VARCHAR(36)   PRIMARY KEY,
        voucher_id    VARCHAR(36)   NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
        user_id       VARCHAR(36)   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        claimed_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Safety check/migration: drop the unique constraint if it still exists in existing databases
    await pool.query(`
      ALTER TABLE voucher_claims DROP CONSTRAINT IF EXISTS voucher_claims_voucher_id_user_id_key;
    `);

    try {
      await pool.query('DROP TRIGGER IF EXISTS set_vouchers_updated_at ON vouchers');
      await pool.query(`
        CREATE TRIGGER set_vouchers_updated_at
          BEFORE UPDATE ON vouchers
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
    } catch (err) {
      logger.warn('Model:Voucher', 'Trigger creation skipped', { error: err.message });
    }

    logger.info('Model:Voucher', 'Tables "vouchers" and "voucher_claims" ready');
  }

  async findAll() {
    const pool = getPool();
    const result = await pool.query(
      `SELECT v.*,
              u.email AS created_by_email
       FROM vouchers v
       LEFT JOIN users u ON v.created_by = u.id
       ORDER BY v.created_at DESC`
    );
    return result.rows;
  }

  async findById(id) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT v.*,
              u.email AS created_by_email
       FROM vouchers v
       LEFT JOIN users u ON v.created_by = u.id
       WHERE v.id = $1`, [id]
    );
    return result.rows[0] || null;
  }

  async findByCode(code) {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM vouchers WHERE code = $1', [code]
    );
    return result.rows[0] || null;
  }

  async create(data) {
    const pool = getPool();
    const id = crypto.randomUUID();
    const { code, tier, hwid_limit, duration_days, max_uses, discount_percent, active_from, expires_at, created_by } = data;
    await pool.query(
      `INSERT INTO vouchers (id, code, tier, hwid_limit, duration_days, max_uses, discount_percent, active_from, expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, code, tier, hwid_limit, duration_days, max_uses, discount_percent || 0, active_from, expires_at, created_by]
    );
    return this.findById(id);
  }

  async incrementUses(id) {
    const pool = getPool();
    await pool.query(
      'UPDATE vouchers SET uses_count = uses_count + 1 WHERE id = $1',
      [id]
    );
    return this.findById(id);
  }

  async incrementUsesAtomic(id) {
    const pool = getPool();
    const result = await pool.query(
      `UPDATE vouchers 
       SET uses_count = uses_count + 1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND uses_count < max_uses 
       RETURNING *`,
      [id]
    );
    return result.rows[0] || null;
  }

  async delete(id) {
    const pool = getPool();
    await pool.query('DELETE FROM vouchers WHERE id = $1', [id]);
  }

  async findClaim(voucherId, userId) {
    const pool = getPool();
    const result = await pool.query(
      'SELECT * FROM voucher_claims WHERE voucher_id = $1 AND user_id = $2',
      [voucherId, userId]
    );
    return result.rows[0] || null;
  }

  async countClaims(voucherId, userId) {
    const pool = getPool();
    const result = await pool.query(
      'SELECT COUNT(*)::int AS count FROM voucher_claims WHERE voucher_id = $1 AND user_id = $2',
      [voucherId, userId]
    );
    return result.rows[0].count;
  }

  async createClaim(voucherId, userId) {
    const pool = getPool();
    const id = crypto.randomUUID();
    await pool.query(
      'INSERT INTO voucher_claims (id, voucher_id, user_id) VALUES ($1, $2, $3)',
      [id, voucherId, userId]
    );
    return id;
  }
}

module.exports = new VoucherModel();
