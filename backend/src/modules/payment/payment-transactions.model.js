const db = require('../../config/database');
const logger = require('../../config/logger');

class PaymentTransactionModel {
  async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        license_id VARCHAR(36),
        ref_id VARCHAR(100) UNIQUE NOT NULL,
        trx_id VARCHAR(100),
        payment_method VARCHAR(50) NOT NULL,
        plan_type VARCHAR(20) NOT NULL,
        amount INTEGER NOT NULL,
        total_bayar INTEGER,
        total_diterima INTEGER,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        qr_link TEXT,
        qr_string TEXT,
        pay_url TEXT,
        va_number VARCHAR(50),
        bank_code VARCHAR(20),
        voucher_code VARCHAR(50),
        crypto_address TEXT,
        crypto_amount VARCHAR(50),
        crypto_extra_id VARCHAR(100),
        expired_at TIMESTAMP,
        paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_payment_ref_id ON payment_transactions(ref_id);
      CREATE INDEX IF NOT EXISTS idx_payment_user_id ON payment_transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_payment_status ON payment_transactions(status);

      -- Migration: tambah kolom qr_string jika tabel sudah ada tapi kolom belum ada
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'payment_transactions' AND column_name = 'qr_string'
        ) THEN
          ALTER TABLE payment_transactions ADD COLUMN qr_string TEXT;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'payment_transactions' AND column_name = 'va_number'
        ) THEN
          ALTER TABLE payment_transactions ADD COLUMN va_number VARCHAR(50);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'payment_transactions' AND column_name = 'bank_code'
        ) THEN
          ALTER TABLE payment_transactions ADD COLUMN bank_code VARCHAR(20);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'payment_transactions' AND column_name = 'total_bayar'
        ) THEN
          ALTER TABLE payment_transactions ADD COLUMN total_bayar INTEGER;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'payment_transactions' AND column_name = 'total_diterima'
        ) THEN
          ALTER TABLE payment_transactions ADD COLUMN total_diterima INTEGER;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'payment_transactions' AND column_name = 'voucher_code'
        ) THEN
          ALTER TABLE payment_transactions ADD COLUMN voucher_code VARCHAR(50);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'payment_transactions' AND column_name = 'crypto_address'
        ) THEN
          ALTER TABLE payment_transactions ADD COLUMN crypto_address TEXT;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'payment_transactions' AND column_name = 'crypto_amount'
        ) THEN
          ALTER TABLE payment_transactions ADD COLUMN crypto_amount VARCHAR(50);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'payment_transactions' AND column_name = 'crypto_extra_id'
        ) THEN
          ALTER TABLE payment_transactions ADD COLUMN crypto_extra_id VARCHAR(100);
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'payment_transactions' AND column_name = 'extra_hwid_slots'
        ) THEN
          ALTER TABLE payment_transactions ADD COLUMN extra_hwid_slots INTEGER DEFAULT 0;
        END IF;
      END $$;
    `;

    try {
      const pool = db.getPool();
      await pool.query(query);
      logger.info('Model:PaymentTransaction', 'Table "payment_transactions" ready');
    } catch (error) {
      logger.error('Model:PaymentTransaction', 'Failed to create payment_transactions table', { error: error.message });
      throw error;
    }
  }
}

module.exports = new PaymentTransactionModel();
