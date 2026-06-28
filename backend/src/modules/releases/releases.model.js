const crypto = require('crypto');
const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

class ReleaseModel {
  async createTable() {
    const pool = getPool();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS releases (
        id          VARCHAR(36)   PRIMARY KEY,
        name        VARCHAR(255)  NOT NULL,
        description TEXT          NULL,
        category    VARCHAR(50)   NULL DEFAULT 'Universal',
        version     VARCHAR(50)   NULL DEFAULT 'v1.0.0',
        loadstring  TEXT          NULL,
        logo_text   VARCHAR(5)    NULL,
        logo_gradient VARCHAR(255) NULL,
        operational_status VARCHAR(20) NOT NULL DEFAULT 'Online' CHECK(operational_status IN ('Online','Maintenance')),
        script_type VARCHAR(10)   NOT NULL DEFAULT 'free' CHECK(script_type IN ('free','plan')),
        prefix      VARCHAR(64)   NOT NULL,
        script_id   VARCHAR(36)   NULL,
        game_id     VARCHAR(50)   NOT NULL,
        game_name   VARCHAR(255)  NULL,
        game_logo   VARCHAR(500)  NULL,
        game_banner VARCHAR(500)  NULL,
        features    JSONB         NULL,
        user_id     VARCHAR(36)   NOT NULL,
        status      VARCHAR(20)   NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published')),
        created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_releases_user_id ON releases(user_id);
      CREATE INDEX IF NOT EXISTS idx_releases_status ON releases(status);
      CREATE INDEX IF NOT EXISTS idx_releases_created_at ON releases(created_at);
      CREATE INDEX IF NOT EXISTS idx_releases_prefix ON releases(prefix);
    `);

    try {
      await pool.query('DROP TRIGGER IF EXISTS set_releases_updated_at ON releases');
      await pool.query(`
        CREATE TRIGGER set_releases_updated_at
          BEFORE UPDATE ON releases
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
    } catch (err) {
      logger.warn('Model:Release', 'Trigger creation skipped', { error: err.message });
    }

    logger.info('Model:Release', 'Table "releases" ready');
  }

  async findAll(userId = null, onlyPublished = false) {
    const pool = getPool();
    let sql = `SELECT r.*, u.name AS developer_name
       FROM releases r
       LEFT JOIN users u ON r.user_id = u.id`;
    const params = [];
    const conditions = [];
    if (userId) { conditions.push(`r.user_id = $${params.length + 1}`); params.push(userId); }
    if (onlyPublished) { conditions.push("r.status = 'published'"); }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY r.created_at DESC';
    const result = await pool.query(sql, params);
    return result.rows;
  }

  async findById(id) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT r.*, u.name AS developer_name
       FROM releases r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.id = $1`, [id]
    );
    return result.rows[0] || null;
  }

  async findByPrefix(prefix) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT r.*, u.name AS developer_name
       FROM releases r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.prefix = $1`, [prefix]
    );
    return result.rows[0] || null;
  }

  async create(data) {
    const pool = getPool();
    const id = crypto.randomUUID();
    const prefix = crypto.randomBytes(16).toString('hex');
    const { name, description, category, version, loadstring, script_id, script_type, logo_text, logo_gradient, operational_status,
            game_id, game_name, game_logo, game_banner, features, user_id, status } = data;
    await pool.query(
      `INSERT INTO releases (id, name, description, category, version, loadstring, script_id, script_type,
        logo_text, logo_gradient, operational_status,
        prefix, game_id, game_name, game_logo, game_banner, features, user_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [id, name, description || null, category || 'Universal', version || 'v1.0.0', loadstring || null, script_id || null, script_type || 'free',
       logo_text || null, logo_gradient || null, operational_status || 'Online', prefix,
       game_id, game_name || null, game_logo || null, game_banner || null,
       features ? JSON.stringify(features) : '[]', user_id, status || 'draft']
    );
    return this.findById(id);
  }

  async update(id, updateData) {
    const pool = getPool();
    const ALLOWED = ['name', 'description', 'category', 'version', 'loadstring', 'script_id', 'script_type', 'logo_text', 'logo_gradient',
      'operational_status', 'game_id', 'game_name', 'game_logo', 'game_banner', 'features', 'status'];
    const fields = Object.keys(updateData).filter(f => ALLOWED.includes(f));
    if (fields.length === 0) return this.findById(id);
    const values = fields.map(f => {
      if (f === 'features') return JSON.stringify(updateData[f]);
      return updateData[f];
    });
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    await pool.query(`UPDATE releases SET ${setClause} WHERE id = $${fields.length + 1}`, [...values, id]);
    return this.findById(id);
  }

  async delete(id) {
    const pool = getPool();
    await pool.query('DELETE FROM releases WHERE id = $1', [id]);
  }
}

module.exports = new ReleaseModel();
