const db = require('../../config/database');

class PaymentModel {
  /**
   * Create new payment transaction record
   */
  async create(transactionData) {
    const {
      user_id,
      license_id = null,
      ref_id,
      trx_id = null,
      payment_method,
      plan_type,
      amount,
      total_bayar = null,
      total_diterima = null,
      status = 'pending',
      qr_link = null,
      qr_string = null,
      pay_url = null,
      expired_at = null,
      va_number = null,
      bank_code = null,
      voucher_code = null,
      crypto_address = null,
      crypto_amount = null,
      crypto_extra_id = null,
      extra_hwid_slots = 0,
    } = transactionData;

    const query = `
      INSERT INTO payment_transactions 
      (user_id, license_id, ref_id, trx_id, payment_method, plan_type, amount, total_bayar, total_diterima, status, qr_link, qr_string, pay_url, expired_at, va_number, bank_code, voucher_code, crypto_address, crypto_amount, crypto_extra_id, extra_hwid_slots)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING id
    `;

    const pool = db.getPool();
    const result = await pool.query(query, [
      user_id,
      license_id,
      ref_id,
      trx_id,
      payment_method,
      plan_type,
      amount,
      total_bayar !== null ? total_bayar : amount,
      total_diterima !== null ? total_diterima : amount,
      status,
      qr_link,
      qr_string,
      pay_url,
      expired_at ? new Date(expired_at) : null,
      va_number,
      bank_code,
      voucher_code,
      crypto_address,
      crypto_amount,
      crypto_extra_id,
      extra_hwid_slots,
    ]);

    return result.rows[0].id;
  }

  /**
   * Find transaction by ref_id
   */
  async findByRefId(refId) {
    const query = `
      SELECT * FROM payment_transactions 
      WHERE ref_id = $1
      LIMIT 1
    `;
    const pool = db.getPool();
    const result = await pool.query(query, [refId]);
    return result.rows[0] || null;
  }

  /**
   * Update transaction status
   */
  async updateStatus(refId, status, trxId = null, paidAt = null) {
    const query = `
      UPDATE payment_transactions 
      SET status = $1, trx_id = COALESCE($2, trx_id), paid_at = $3, updated_at = CURRENT_TIMESTAMP
      WHERE ref_id = $4
    `;
    const pool = db.getPool();
    await pool.query(query, [status, trxId, paidAt, refId]);
  }

  /**
   * Link transaction to license
   */
  async linkLicense(refId, licenseId) {
    const query = `
      UPDATE payment_transactions 
      SET license_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE ref_id = $2
    `;
    const pool = db.getPool();
    await pool.query(query, [licenseId, refId]);
  }

  /**
   * Get user's payment history
   */
  async findByUserId(userId, limit = 20) {
    const query = `
      SELECT * FROM payment_transactions 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const pool = db.getPool();
    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }

  /**
   * Get all payment transactions in the system
   */
  async findAll({ search, status, method, plan } = {}, limit = 20, offset = 0) {
    const pool = db.getPool();
    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    // 1. Filter by Status
    if (status && status !== 'all') {
      if (status === 'expired') {
        whereClauses.push(`(pt.status = 'expired' OR (pt.status = 'pending' AND pt.expired_at < CURRENT_TIMESTAMP))`);
      } else if (status === 'pending') {
        whereClauses.push(`(pt.status = 'pending' AND (pt.expired_at IS NULL OR pt.expired_at >= CURRENT_TIMESTAMP))`);
      } else {
        whereClauses.push(`pt.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }
    }

    // 2. Filter by Method
    if (method && method !== 'all') {
      whereClauses.push(`pt.payment_method = $${paramIndex}`);
      params.push(method);
      paramIndex++;
    }

    // 3. Filter by Plan
    if (plan && plan !== 'all') {
      whereClauses.push(`pt.plan_type = $${paramIndex}`);
      params.push(plan);
      paramIndex++;
    }

    // 4. Search Filter
    if (search) {
      whereClauses.push(`(
        pt.ref_id ILIKE $${paramIndex} OR 
        u.email ILIKE $${paramIndex} OR 
        u.name ILIKE $${paramIndex} OR 
        pt.voucher_code ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Main Query
    const query = `
      SELECT pt.*, u.email as user_email, u.name as user_name 
      FROM payment_transactions pt
      LEFT JOIN users u ON pt.user_id = u.id
      ${whereSql}
      ORDER BY pt.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    // Count Query (to get total pages)
    const countQuery = `
      SELECT COUNT(*) as total
      FROM payment_transactions pt
      LEFT JOIN users u ON pt.user_id = u.id
      ${whereSql}
    `;

    const queryParams = [...params, limit, offset];
    
    // Execute both queries
    const [rowsResult, countResult] = await Promise.all([
      pool.query(query, queryParams),
      pool.query(countQuery, params)
    ]);

    const total = parseInt(countResult.rows[0]?.total || 0, 10);
    return {
      transactions: rowsResult.rows,
      total
    };
  }
}

module.exports = new PaymentModel();
