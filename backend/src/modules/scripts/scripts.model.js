const crypto = require('crypto');
const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

class ScriptModel {
  async createTable() {
    const pool = getPool();

    try {
      const releasesExists = await pool.query(
        `SELECT 1 FROM information_schema.tables WHERE table_catalog = current_database() AND table_name = 'releases'`
      );
      const scriptsExists = await pool.query(
        `SELECT 1 FROM information_schema.tables WHERE table_catalog = current_database() AND table_name = 'scripts'`
      );

      if (releasesExists.rows.length > 0 && scriptsExists.rows.length === 0) {
        logger.info('Model:Script', 'Migrating: renaming releases → scripts');
        await pool.query('ALTER TABLE releases RENAME TO scripts');
      } else if (releasesExists.rows.length > 0 && scriptsExists.rows.length > 0) {
        logger.warn('Model:Script', 'Both releases and scripts tables exist - skipping rename. This is expected during the transition period.');
      }
    } catch (err) {
      logger.warn('Model:Script', 'Table rename skipped:', { error: err.message });
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS scripts (
        id          VARCHAR(36)   PRIMARY KEY,
        name        VARCHAR(255)  NOT NULL,
        version     VARCHAR(50)   NOT NULL DEFAULT '1.0.0',
        file_path   VARCHAR(500)  NOT NULL,
        file_url    VARCHAR(500)  NOT NULL,
        user_id     VARCHAR(36)   NOT NULL,
        folder_id   VARCHAR(36)   NULL,
        status      VARCHAR(20)   NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','deprecated')),
        downloads   INT           NOT NULL DEFAULT 0,
        changelog   TEXT          NULL,
        created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS script_folders (
        id          VARCHAR(36)   PRIMARY KEY,
        name        VARCHAR(255)  NOT NULL,
        parent_id   VARCHAR(36)   NULL,
        user_id     VARCHAR(36)   NOT NULL,
        created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES script_folders(id) ON DELETE CASCADE
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_scripts_user_id ON scripts(user_id);
      CREATE INDEX IF NOT EXISTS idx_scripts_folder_id ON scripts(folder_id);
      CREATE INDEX IF NOT EXISTS idx_scripts_status ON scripts(status);
      CREATE INDEX IF NOT EXISTS idx_scripts_created_at ON scripts(created_at);
      CREATE INDEX IF NOT EXISTS idx_folders_parent ON script_folders(parent_id);
      CREATE INDEX IF NOT EXISTS idx_folders_user ON script_folders(user_id);
    `);

    try {
      await pool.query('DROP TRIGGER IF EXISTS set_scripts_updated_at ON scripts');
      await pool.query(`
        CREATE TRIGGER set_scripts_updated_at
          BEFORE UPDATE ON scripts
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
      await pool.query('DROP TRIGGER IF EXISTS set_script_folders_updated_at ON script_folders');
      await pool.query(`
        CREATE TRIGGER set_script_folders_updated_at
          BEFORE UPDATE ON script_folders
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      `);
    } catch (err) {
      logger.warn('Model:Script', 'Trigger creation skipped', { error: err.message });
    }

    logger.info('Model:Script', 'Tables "scripts" + "script_folders" ready');
  }

  async findAll(statusFilter = null, folderId = null) {
    const pool = getPool();
    let sql = `SELECT s.*, u.name AS developer_name, u.email AS developer_email
       FROM scripts s
       LEFT JOIN users u ON s.user_id = u.id`;
    const params = [];
    const conditions = [];
    if (statusFilter) { conditions.push(`s.status = $${params.length + 1}`); params.push(statusFilter); }
    if (folderId !== null) {
      if (folderId === '__root__') {
        conditions.push('s.folder_id IS NULL');
      } else {
        conditions.push(`s.folder_id = $${params.length + 1}`);
        params.push(folderId);
      }
    }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY s.created_at DESC';
    const result = await pool.query(sql, params);
    return result.rows;
  }

  async findById(id) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT s.*, u.name AS developer_name, u.email AS developer_email
       FROM scripts s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`, [id]
    );
    return result.rows[0] || null;
  }

  async create(data) {
    const pool = getPool();
    const id = crypto.randomUUID();
    const { name, version, file_path, file_url, user_id, folder_id } = data;
    await pool.query(
      `INSERT INTO scripts (id, name, version, file_path, file_url, user_id, folder_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, name, version || '1.0.0', file_path, file_url, user_id, folder_id || null]
    );
    return this.findById(id);
  }

  async update(id, updateData) {
    const pool = getPool();
    const ALLOWED = ['name', 'version', 'status', 'downloads', 'changelog', 'folder_id'];
    const fields = Object.keys(updateData).filter(f => ALLOWED.includes(f));
    if (fields.length === 0) return this.findById(id);
    const values = fields.map(f => updateData[f]);
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    await pool.query(`UPDATE scripts SET ${setClause} WHERE id = $${fields.length + 1}`, [...values, id]);
    return this.findById(id);
  }

  async delete(id) {
    const pool = getPool();
    await pool.query('DELETE FROM scripts WHERE id = $1', [id]);
  }

  async getStats() {
    const pool = getPool();
    const counts = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'published')::int AS published,
        COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
        COUNT(*) FILTER (WHERE status = 'deprecated')::int AS deprecated,
        COALESCE(SUM(downloads), 0)::int AS total_downloads
      FROM scripts
    `);
    const folderCount = await pool.query(`SELECT COUNT(*)::int AS total FROM script_folders`);
    const recent = await pool.query(`
      SELECT s.id, s.name, s.version, s.status, s.created_at,
             u.name AS developer_name, u.email AS developer_email
      FROM scripts s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC
      LIMIT 5
    `);
    return {
      total_scripts: Number(counts.rows[0].total),
      published: Number(counts.rows[0].published || 0),
      draft: Number(counts.rows[0].draft || 0),
      deprecated: Number(counts.rows[0].deprecated || 0),
      total_downloads: Number(counts.rows[0].total_downloads || 0),
      total_folders: Number(folderCount.rows[0].total || 0),
      recent_deployments: recent.rows,
    };
  }

  async findFolders(parentId = null) {
    const pool = getPool();
    let sql = `SELECT f.*, u.name AS creator_name,
        (SELECT COUNT(*) FROM scripts s WHERE s.folder_id = f.id)::int AS script_count,
        (SELECT COUNT(*) FROM scripts s WHERE s.folder_id = f.id AND s.status = 'published')::int AS published_count,
        (SELECT COUNT(*) FROM scripts s WHERE s.folder_id = f.id AND s.status = 'draft')::int AS draft_count,
        (SELECT COUNT(*) FROM script_folders child WHERE child.parent_id = f.id)::int AS subfolder_count
       FROM script_folders f
       LEFT JOIN users u ON f.user_id = u.id`;
    const params = [];
    if (parentId === null || parentId === '__root__') {
      sql += ' WHERE f.parent_id IS NULL';
    } else {
      sql += ` WHERE f.parent_id = $1`;
      params.push(parentId);
    }
    sql += ' ORDER BY f.name ASC';
    const result = await pool.query(sql, params);
    return result.rows;
  }

  async findFolderById(id) {
    const pool = getPool();
    const result = await pool.query(
      `SELECT f.*, u.name AS creator_name,
        (SELECT COUNT(*) FROM scripts s WHERE s.folder_id = f.id)::int AS script_count,
        (SELECT COUNT(*) FROM scripts s WHERE s.folder_id = f.id AND s.status = 'published')::int AS published_count,
        (SELECT COUNT(*) FROM scripts s WHERE s.folder_id = f.id AND s.status = 'draft')::int AS draft_count,
        (SELECT COUNT(*) FROM script_folders child WHERE child.parent_id = f.id)::int AS subfolder_count
       FROM script_folders f
       LEFT JOIN users u ON f.user_id = u.id
       WHERE f.id = $1`, [id]
    );
    return result.rows[0] || null;
  }

  async getFolderPath(folderId) {
    const parts = [];
    let current = folderId;
    const pool = getPool();
    while (current) {
      const result = await pool.query('SELECT id, name, parent_id FROM script_folders WHERE id = $1', [current]);
      if (result.rows.length === 0) break;
      parts.unshift(result.rows[0].name);
      current = result.rows[0].parent_id;
    }
    return parts.join('/');
  }

  async createFolder(data) {
    const pool = getPool();
    const id = crypto.randomUUID();
    const { name, parent_id, user_id } = data;
    await pool.query(
      `INSERT INTO script_folders (id, name, parent_id, user_id) VALUES ($1, $2, $3, $4)`,
      [id, name, parent_id || null, user_id]
    );
    return this.findFolderById(id);
  }

  async updateFolder(id, data) {
    const pool = getPool();
    const ALLOWED = ['name', 'parent_id'];
    const fields = Object.keys(data).filter(f => ALLOWED.includes(f));
    if (fields.length === 0) return this.findFolderById(id);
    const values = fields.map(f => data[f]);
    const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    await pool.query(`UPDATE script_folders SET ${setClause} WHERE id = $${fields.length + 1}`, [...values, id]);
    return this.findFolderById(id);
  }

  async deleteFolder(id) {
    const pool = getPool();
    await pool.query('UPDATE scripts SET folder_id = NULL WHERE folder_id = $1', [id]);
    const folder = await pool.query('SELECT parent_id FROM script_folders WHERE id = $1', [id]);
    const newParent = folder.rows.length ? folder.rows[0].parent_id : null;
    await pool.query('UPDATE script_folders SET parent_id = $1 WHERE parent_id = $2', [newParent, id]);
    await pool.query('DELETE FROM script_folders WHERE id = $1', [id]);
  }
}

module.exports = new ScriptModel();
