const crypto = require('crypto');
const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

class ChangelogModel {
  async createTable() {
    const pool = getPool();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS changelogs (
        id          VARCHAR(36)   PRIMARY KEY,
        version     VARCHAR(50)   NOT NULL,
        title       VARCHAR(255)  NOT NULL,
        description TEXT          NULL,
        type        VARCHAR(20)   NOT NULL DEFAULT 'web' CHECK(type IN ('web','game')),
        game_name   VARCHAR(255)  NULL,
        game_id     VARCHAR(100)  NULL,
        changes     JSONB         NOT NULL DEFAULT '[]'::jsonb,
        user_id     VARCHAR(36)   NOT NULL,
        released_at TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure columns exist for existing tables
    try {
      await pool.query(`ALTER TABLE changelogs ADD COLUMN IF NOT EXISTS game_name VARCHAR(255) NULL`);
      await pool.query(`ALTER TABLE changelogs ADD COLUMN IF NOT EXISTS game_id VARCHAR(100) NULL`);
    } catch (err) {
      // ignore if already exists
    }

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_changelogs_type ON changelogs(type);
      CREATE INDEX IF NOT EXISTS idx_changelogs_released_at ON changelogs(released_at DESC);
    `);

    try {
      await pool.query('DROP TRIGGER IF EXISTS set_changelogs_updated_at ON changelogs');
      await pool.query(`
        CREATE TRIGGER set_changelogs_updated_at
          BEFORE UPDATE ON changelogs
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
    } catch (err) {
      logger.warn('Model:Changelog', 'Trigger creation skipped', { error: err.message });
    }

    // Seed default records if table is empty
    await this.seedDefaults();

    logger.info('Model:Changelog', 'Table "changelogs" ready');
  }

  async seedDefaults() {
    const pool = getPool();
    const countRes = await pool.query('SELECT COUNT(*) FROM changelogs');
    if (parseInt(countRes.rows[0].count, 10) > 0) return;

    const dummyUserRes = await pool.query('SELECT id FROM users LIMIT 1');
    const dummyUserId = dummyUserRes.rows.length > 0 ? dummyUserRes.rows[0].id : 'system-seed';

    const seedData = [
      {
        id: crypto.randomUUID(),
        version: 'v1.0.1',
        title: 'VALINC Syndicate 1.0.1 — Internationalization & Security Release',
        description: 'Global multi-language support and compliance architecture.',
        type: 'web',
        game_name: null,
        game_id: null,
        changes: JSON.stringify([
          '[New] Multi-language support (EN, ID, FR, JA) with smart browser auto-detection.',
          '[New] Dedicated trust & compliance pages: Cookie Policy, Security Architecture, Terms, and Privacy.',
          '[Improved] Complete monochrome UI refinement across legal pages and navigation.',
          '[Fixed] Fixed dropdown squishing in header language selector and responsive layouts.'
        ]),
        user_id: dummyUserId,
        released_at: new Date('2026-06-27T12:00:00Z')
      },
      {
        id: crypto.randomUUID(),
        version: 'v1.0.0',
        title: 'VALINC Syndicate 1.0.0 — Major Portal & Studio Release',
        description: 'Complete portal and scripting platform launch.',
        type: 'web',
        game_name: null,
        game_id: null,
        changes: JSON.stringify([
          '[New] Complete Roblox Scripting Portal with HWID key management and license vaults.',
          '[New] Integrated NOWPayments gateway supporting crypto & automated transaction tracking.',
          '[New] Studio Staff & Developer Panel for live ticket support and release management.',
          '[Security] Implemented PostgreSQL connection pooling, Upstash Redis rate limiting, and bcrypt auth.'
        ]),
        user_id: dummyUserId,
        released_at: new Date('2026-06-15T12:00:00Z')
      },
      {
        id: crypto.randomUUID(),
        version: 'v1.0.0-game',
        title: 'Universal Roblox Execution Suite 1.0',
        description: 'Core executor script VM and auto-rejoin features.',
        type: 'game',
        game_name: 'Blox Fruits',
        game_id: 'blox-fruits',
        changes: JSON.stringify([
          '[New] High-speed dynamic VM obfuscation and loader handshake protocol.',
          '[New] Auto-Rejoin & Server Telemetry module integration for Roblox clients.',
          '[Improved] Enhanced anti-tamper security checks during execution.'
        ]),
        user_id: dummyUserId,
        released_at: new Date('2026-06-10T12:00:00Z')
      }
    ];

    for (const item of seedData) {
      await pool.query(
        `INSERT INTO changelogs (id, version, title, description, type, game_name, game_id, changes, user_id, released_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10)`,
        [item.id, item.version, item.title, item.description, item.type, item.game_name, item.game_id, item.changes, item.user_id, item.released_at]
      );
    }
  }

  async findAll(type = null) {
    const pool = getPool();
    let sql = `SELECT c.*, u.name AS author_name
               FROM changelogs c
               LEFT JOIN users u ON c.user_id = u.id`;
    const params = [];

    if (type && ['web', 'game'].includes(type)) {
      sql += ` WHERE c.type = $1`;
      params.push(type);
    }

    sql += ` ORDER BY c.released_at DESC`;

    const res = await pool.query(sql, params);
    return res.rows;
  }

  async findById(id) {
    const pool = getPool();
    const res = await pool.query(
      `SELECT c.*, u.name AS author_name FROM changelogs c LEFT JOIN users u ON c.user_id = u.id WHERE c.id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  async create({ version, title, description, type, game_name, game_id, changes, userId }) {
    const pool = getPool();
    const id = crypto.randomUUID();
    const jsonChanges = Array.isArray(changes) ? JSON.stringify(changes) : (changes || '[]');

    const res = await pool.query(
      `INSERT INTO changelogs (id, version, title, description, type, game_name, game_id, changes, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)
       RETURNING *`,
      [id, version, title, description || null, type || 'web', game_name || null, game_id || null, jsonChanges, userId]
    );

    return res.rows[0];
  }

  async update(id, { version, title, description, type, game_name, game_id, changes }) {
    const pool = getPool();
    const jsonChanges = Array.isArray(changes) ? JSON.stringify(changes) : (changes || '[]');

    const res = await pool.query(
      `UPDATE changelogs
       SET version = $1, title = $2, description = $3, type = $4, game_name = $5, game_id = $6, changes = $7::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [version, title, description || null, type || 'web', game_name || null, game_id || null, jsonChanges, id]
    );

    return res.rows[0];
  }

  async delete(id) {
    const pool = getPool();
    const res = await pool.query(`DELETE FROM changelogs WHERE id = $1 RETURNING id`, [id]);
    return res.rowCount > 0;
  }
}

module.exports = new ChangelogModel();
