const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

class ExecutionModel {
  async createTable() {
    const pool = getPool();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS execution_logs (
        id          BIGSERIAL PRIMARY KEY,
        date        DATE NOT NULL,
        count       INT NOT NULL DEFAULT 0,
        created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (date)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS execution_keys (
        id          BIGSERIAL PRIMARY KEY,
        date        DATE NOT NULL,
        license_key VARCHAR(50) NOT NULL,
        count       INT NOT NULL DEFAULT 0,
        created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (date, license_key)
      )
    `);

    try {
      await pool.query('DROP TRIGGER IF EXISTS set_execution_logs_updated_at ON execution_logs');
      await pool.query(`
        CREATE TRIGGER set_execution_logs_updated_at
          BEFORE UPDATE ON execution_logs
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
      await pool.query('DROP TRIGGER IF EXISTS set_execution_keys_updated_at ON execution_keys');
      await pool.query(`
        CREATE TRIGGER set_execution_keys_updated_at
          BEFORE UPDATE ON execution_keys
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
    } catch (err) {
      logger.warn('Model:Execution', 'Trigger creation skipped', { error: err.message });
    }

    logger.info('Model:Execution', 'Tables "execution_logs" + "execution_keys" ready');
  }

  async recordExecution(key = null) {
    const pool = getPool();
    const today = new Date().toISOString().slice(0, 10);

    await pool.query(
      `INSERT INTO execution_logs (date, count) VALUES ($1, 1)
       ON CONFLICT (date) DO UPDATE SET count = execution_logs.count + 1`,
      [today]
    );

    if (key) {
      await pool.query(
        `INSERT INTO execution_keys (date, license_key, count) VALUES ($1, $2, 1)
         ON CONFLICT (date, license_key) DO UPDATE SET count = execution_keys.count + 1`,
        [today, key]
      );
    }

    const result = await pool.query(
      'SELECT count FROM execution_logs WHERE date = $1',
      [today]
    );
    return result.rows[0] ? result.rows[0].count : 0;
  }

  async getTotal() {
    const pool = getPool();
    const result = await pool.query('SELECT COALESCE(SUM(count), 0)::int AS total FROM execution_logs');
    return result.rows[0]?.total || 0;
  }

  async getToday() {
    const pool = getPool();
    const today = new Date().toISOString().slice(0, 10);
    const result = await pool.query('SELECT count FROM execution_logs WHERE date = $1', [today]);
    return result.rows[0]?.count || 0;
  }

  async getWeeklyHistory() {
    const pool = getPool();
    const result = await pool.query(
      `SELECT date, count FROM execution_logs
       WHERE date >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY date ASC`
    );
    return result.rows;
  }

  async getRecentActivity(limit = 10) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT date, count FROM execution_logs
       ORDER BY date DESC
       LIMIT $1`,
      [parseInt(limit) || 10]
    );
    return result.rows;
  }
}

module.exports = new ExecutionModel();
