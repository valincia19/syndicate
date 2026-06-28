const crypto = require('crypto');
const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

class TicketModel {
  async createTable() {
    const pool = getPool();

    // Create ENUM types for ticket category and status (dropdown constraints)
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE ticket_category AS ENUM ('general', 'technical', 'billing', 'bug');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('user', 'staff', 'admin', 'developer', 'owner');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id          VARCHAR(36)     PRIMARY KEY,
        user_id     VARCHAR(36)     NOT NULL,
        code        VARCHAR(20)     NOT NULL,
        subject     VARCHAR(255)    NOT NULL,
        category    ticket_category NOT NULL DEFAULT 'general',
        status      ticket_status   NOT NULL DEFAULT 'open',
        created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (code)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ticket_messages (
        id          VARCHAR(36)   PRIMARY KEY,
        ticket_id   VARCHAR(36)   NOT NULL,
        sender_id   VARCHAR(36)   NOT NULL,
        sender_role user_role     NOT NULL DEFAULT 'user',
        content     TEXT          NOT NULL,
        created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id);
      CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
      CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
      CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(code);
      CREATE INDEX IF NOT EXISTS idx_messages_ticket_id ON ticket_messages(ticket_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON ticket_messages(created_at);
    `);

    try {
      await pool.query('DROP TRIGGER IF EXISTS set_tickets_updated_at ON tickets');
      await pool.query(`
        CREATE TRIGGER set_tickets_updated_at
          BEFORE UPDATE ON tickets
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
    } catch (err) {
      logger.warn('Model:Ticket', 'Trigger creation skipped', { error: err.message });
    }

    logger.info('Model:Ticket', 'Tables "tickets" and "ticket_messages" ready');
  }

  /**
   * Generate ticket code and create ticket in a single transaction.
   * Uses SELECT FOR UPDATE to prevent race conditions on code generation.
   */
  async create(data) {
    const pool = getPool();
    const id = crypto.randomUUID();
    const { user_id, subject, category } = data;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Lock the tickets table to atomically generate the next sequential code
      const result = await client.query(
        `SELECT code FROM tickets ORDER BY CAST(SUBSTRING(code FROM 5) AS INTEGER) DESC LIMIT 1 FOR UPDATE`
      );

      let code;
      if (result.rows.length === 0) {
        code = 'TKT-001';
      } else {
        const lastCode = result.rows[0].code;
        const lastNum = parseInt(lastCode.replace('TKT-', ''), 10);
        code = isNaN(lastNum) ? 'TKT-001' : `TKT-${String(lastNum + 1).padStart(3, '0')}`;
      }

      // Insert ticket
      await client.query(
        `INSERT INTO tickets (id, user_id, code, subject, category)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, user_id, code, subject, category || 'general']
      );

      // Commit - code is now live and no other transaction can race
      await client.query('COMMIT');

      return this.findById(id);
    } catch (err) {
      // Rollback on any error - release the lock and undo any partial writes
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async findById(id) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT t.*,
              (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id)::int AS message_count,
              (SELECT tm.created_at FROM ticket_messages tm WHERE tm.ticket_id = t.id ORDER BY tm.created_at DESC LIMIT 1) AS last_reply_at
       FROM tickets t WHERE t.id = $1`,
      [id]
    );
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async findByUserId(userId) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT t.*,
              (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id)::int AS message_count,
              (SELECT tm.created_at FROM ticket_messages tm WHERE tm.ticket_id = t.id ORDER BY tm.created_at DESC LIMIT 1) AS last_reply_at
       FROM tickets t
       WHERE t.user_id = $1
       ORDER BY t.updated_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async findAll() {
    const pool = getPool();
    const result = await pool.query(
      `SELECT t.*,
              u.username AS user_username,
              u.email AS user_email,
              (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id)::int AS message_count,
              (SELECT tm.created_at FROM ticket_messages tm WHERE tm.ticket_id = t.id ORDER BY tm.created_at DESC LIMIT 1) AS last_reply_at
       FROM tickets t
       LEFT JOIN users u ON t.user_id = u.id
       ORDER BY t.updated_at DESC`
    );
    return result.rows;
  }

  async updateStatus(id, status) {
    const pool = getPool();
    await pool.query(
      `UPDATE tickets SET status = $1 WHERE id = $2`,
      [status, id]
    );
    return this.findById(id);
  }

  async addMessage(data) {
    const pool = getPool();
    const id = crypto.randomUUID();
    const { ticket_id, sender_id, sender_role, content } = data;

    await pool.query(
      `INSERT INTO ticket_messages (id, ticket_id, sender_id, sender_role, content)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, ticket_id, sender_id, sender_role || 'user', content]
    );

    await pool.query(
      `UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [ticket_id]
    );

    const result = await pool.query(
      `SELECT tm.*, u.username AS sender_username, u.avatar AS sender_avatar
       FROM ticket_messages tm
       LEFT JOIN users u ON tm.sender_id = u.id
       WHERE tm.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  async getMessages(ticketId) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT tm.*, u.username AS sender_username, u.avatar AS sender_avatar
       FROM ticket_messages tm
       LEFT JOIN users u ON tm.sender_id = u.id
       WHERE tm.ticket_id = $1
       ORDER BY tm.created_at ASC`,
      [ticketId]
    );
    return result.rows;
  }
}

module.exports = new TicketModel();
