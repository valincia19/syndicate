const db = require('../../config/database');
const logger = require('../../config/logger');

class CurrencyModel {
  async createTable() {
    const pool = db.getPool();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS currency_rates (
        id SERIAL PRIMARY KEY,
        currency_code VARCHAR(3) UNIQUE NOT NULL,
        currency_name VARCHAR(50) NOT NULL,
        rate_to_idr DECIMAL(15, 2) NOT NULL DEFAULT 1.00,
        rate_code VARCHAR(10) DEFAULT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_currency_active ON currency_rates(is_active);
      CREATE INDEX IF NOT EXISTS idx_currency_code ON currency_rates(currency_code);

      -- Add rate_code column if not exists
      ALTER TABLE currency_rates ADD COLUMN IF NOT EXISTS rate_code VARCHAR(10);

      -- Populate rate_code from currency_code where null
      UPDATE currency_rates SET rate_code = currency_code WHERE rate_code IS NULL;

      -- Insert default currencies if not exist
      INSERT INTO currency_rates (currency_code, currency_name, rate_to_idr, rate_code, is_active)
      VALUES
        ('IDR', 'Indonesian Rupiah', 1.00, 'IDR', true),
        ('USD', 'US Dollar', 16400.00, 'USD', true),
        ('SGD', 'Singapore Dollar', 12100.00, 'SGD', true),
        ('MYR', 'Malaysian Ringgit', 3480.00, 'MYR', true),
        ('EUR', 'Euro', 17600.00, 'EUR', true),
        ('GBP', 'British Pound', 20800.00, 'GBP', true),
        ('AUD', 'Australian Dollar', 10900.00, 'AUD', true),
        ('CAD', 'Canadian Dollar', 12000.00, 'CAD', true),
        ('HKD', 'Hong Kong Dollar', 2100.00, 'HKD', true),
        ('JPY', 'Japanese Yen', 102.00, 'JPY', true),
        ('KRW', 'South Korean Won', 11.80, 'KRW', true),
        ('CNY', 'Chinese Yuan', 2250.00, 'CNY', true),
        ('INR', 'Indian Rupee', 196.00, 'INR', true),
        ('PHP', 'Philippine Peso', 280.00, 'PHP', true),
        ('THB', 'Thai Baht', 445.00, 'THB', true),
        ('VND', 'Vietnamese Dong', 0.65, 'VND', true),
        ('SAR', 'Saudi Riyal', 4370.00, 'SAR', true),
        ('AED', 'UAE Dirham', 4460.00, 'AED', true),
        ('BRL', 'Brazilian Real', 3000.00, 'BRL', true),
        ('TRY', 'Turkish Lira', 500.00, 'TRY', true),
        ('RUB', 'Russian Ruble', 188.00, 'RUB', true),
        ('MXN', 'Mexican Peso', 900.00, 'MXN', true)
      ON CONFLICT (currency_code) DO NOTHING;
    `);

    logger.info('Model:Currency', 'Table "currency_rates" ready with defaults');
  }

  async getAll() {
    const pool = db.getPool();
    const result = await pool.query(
      'SELECT * FROM currency_rates ORDER BY is_active DESC, currency_code ASC'
    );
    return result.rows;
  }

  async getActive() {
    const pool = db.getPool();
    const result = await pool.query(
      'SELECT * FROM currency_rates WHERE is_active = true ORDER BY currency_code ASC'
    );
    return result.rows;
  }

  async getByCode(code) {
    const pool = db.getPool();
    const result = await pool.query(
      'SELECT * FROM currency_rates WHERE currency_code = $1',
      [code.toUpperCase()]
    );
    return result.rows[0];
  }

  async create(data) {
    const pool = db.getPool();
    const { currency_code, currency_name, rate_to_idr, rate_code, is_active = true } = data;
    
    const result = await pool.query(
      `INSERT INTO currency_rates (currency_code, currency_name, rate_to_idr, rate_code, is_active)
       VALUES ($1, $2, $3, COALESCE($4, $1), $5)
       RETURNING *`,
      [currency_code.toUpperCase(), currency_name, rate_to_idr, rate_code ? rate_code.toUpperCase() : null, is_active]
    );
    return result.rows[0];
  }

  async update(code, data) {
    const pool = db.getPool();
    const { currency_name, rate_to_idr, rate_code, is_active } = data;
    
    const result = await pool.query(
      `UPDATE currency_rates
       SET currency_name = COALESCE($1, currency_name),
           rate_to_idr = COALESCE($2, rate_to_idr),
           rate_code = COALESCE($3, rate_code),
           is_active = COALESCE($4, is_active),
           updated_at = CURRENT_TIMESTAMP
       WHERE currency_code = $5
       RETURNING *`,
      [currency_name, rate_to_idr, rate_code ? rate_code.toUpperCase() : null, is_active, code.toUpperCase()]
    );
    return result.rows[0];
  }

  async delete(code) {
    const pool = db.getPool();
    await pool.query('DELETE FROM currency_rates WHERE currency_code = $1', [code.toUpperCase()]);
  }
}

module.exports = new CurrencyModel();
