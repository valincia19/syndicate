const crypto = require('crypto');
const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

class HwidModel {
  async createTable() {
    const pool = getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hwid_devices (
        id              VARCHAR(36)   PRIMARY KEY,
        license_id      VARCHAR(36)   NULL,
        roblox_username VARCHAR(100)  NOT NULL DEFAULT '',
        roblox_id       VARCHAR(50)   NOT NULL DEFAULT '',
        roblox_avatar   VARCHAR(255)  NULL,
        hwid            VARCHAR(255)  NULL,
        status          VARCHAR(10)   NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
        created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS hwid_deletion_logs (
        id          VARCHAR(36)   PRIMARY KEY,
        license_id  VARCHAR(36)   NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
        deleted_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_hwid_license ON hwid_devices(license_id);
      CREATE INDEX IF NOT EXISTS idx_hwid_hwid ON hwid_devices(hwid);
      CREATE INDEX IF NOT EXISTS idx_deletion_logs_license ON hwid_deletion_logs(license_id);
      CREATE INDEX IF NOT EXISTS idx_deletion_logs_deleted_at ON hwid_deletion_logs(deleted_at);
    `);

    try {
      await pool.query('DROP TRIGGER IF EXISTS set_hwid_devices_updated_at ON hwid_devices');
      await pool.query(`
        CREATE TRIGGER set_hwid_devices_updated_at
          BEFORE UPDATE ON hwid_devices
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
    } catch (err) {
      logger.warn('Model:Hwid', 'Trigger creation skipped', { error: err.message });
    }

    logger.info('Model:Hwid', 'Table "hwid_devices" and "hwid_deletion_logs" ready');
  }

  async findAll() {
    const pool = getPool();
    const result = await pool.query(
      `SELECT h.*, l.license_key
       FROM hwid_devices h
       LEFT JOIN licenses l ON h.license_id = l.id
       ORDER BY h.created_at DESC`
    );
    return result.rows;
  }

  async findById(id) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT h.*, l.license_key
       FROM hwid_devices h
       LEFT JOIN licenses l ON h.license_id = l.id
       WHERE h.id = $1`, [id]
    );
    return result.rows[0] || null;
  }

  async create(data) {
    const pool = getPool();
    const id = crypto.randomUUID();
    const { license_id, roblox_username, roblox_id, roblox_avatar, hwid, status } = data;
    await pool.query(
      `INSERT INTO hwid_devices (id, license_id, roblox_username, roblox_id, roblox_avatar, hwid, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, license_id || null, roblox_username || '', roblox_id || '', roblox_avatar || null, hwid, status || 'active']
    );
    return this.findById(id);
  }

  async update(id, updateData) {
    const pool = getPool();
    const ALLOWED = ['license_id', 'roblox_username', 'roblox_id', 'roblox_avatar', 'hwid', 'status'];
    const fields = Object.keys(updateData).filter(f => ALLOWED.includes(f));
    if (fields.length === 0) return this.findById(id);
    const values = fields.map(f => updateData[f]);
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    await pool.query(`UPDATE hwid_devices SET ${setClause} WHERE id = $${fields.length + 1}`, [...values, id]);
    return this.findById(id);
  }

  async delete(id) {
    const pool = getPool();
    await pool.query('DELETE FROM hwid_devices WHERE id = $1', [id]);
  }

  async resetDevice(id) {
    const pool = getPool();
    await pool.query("UPDATE hwid_devices SET hwid = NULL WHERE id = $1", [id]);
  }

  async resetByLicense(licenseId) {
    const pool = getPool();
    await pool.query("UPDATE hwid_devices SET hwid = NULL WHERE license_id = $1", [licenseId]);
    logger.info('Model:Hwid', 'Reset all HWID values for license', { licenseId });
  }

  async countDeletesInLastWeek(licenseId) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM hwid_deletion_logs
       WHERE license_id = $1 AND deleted_at > NOW() - INTERVAL '7 days'`,
      [licenseId]
    );
    return result.rows[0].cnt;
  }

  async getOldestDeleteInLastWeek(licenseId) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT deleted_at FROM hwid_deletion_logs
       WHERE license_id = $1 AND deleted_at > NOW() - INTERVAL '7 days'
       ORDER BY deleted_at ASC
       LIMIT 1`,
      [licenseId]
    );
    return result.rows[0] || null;
  }

  async logDeletion(licenseId) {
    const pool = getPool();
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO hwid_deletion_logs (id, license_id) VALUES ($1, $2)`,
      [id, licenseId]
    );
  }
}

module.exports = new HwidModel();
