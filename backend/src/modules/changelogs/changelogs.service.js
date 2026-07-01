const ChangelogModel = require('./changelogs.model');
const { AppError } = require('../../middleware/errorHandler.middleware');

class ChangelogService {
  async getAll(type = null) {
    return ChangelogModel.findAll(type);
  }

  async create(data, userId) {
    if (!data.version || !data.version.trim()) {
      throw new AppError('Version is required (e.g. v1.0.2)', 400);
    }
    if (!data.title || !data.title.trim()) {
      throw new AppError('Title is required', 400);
    }
    if (data.type && !['web', 'game'].includes(data.type)) {
      throw new AppError('Type must be either "web" or "game"', 400);
    }

    const changesArray = Array.isArray(data.changes)
      ? data.changes
      : (typeof data.changes === 'string'
          ? data.changes.split('\n').map(s => s.trim()).filter(Boolean)
          : []);

    return ChangelogModel.create({
      version: data.version.trim(),
      title: data.title.trim(),
      description: data.description || '',
      type: data.type || 'web',
      game_name: data.game_name || null,
      game_id: data.game_id || null,
      changes: changesArray,
      userId: userId,
    });
  }

  async update(id, data) {
    const existing = await ChangelogModel.findById(id);
    if (!existing) {
      throw new AppError('Changelog entry not found', 404);
    }

    const changesArray = Array.isArray(data.changes)
      ? data.changes
      : (typeof data.changes === 'string'
          ? data.changes.split('\n').map(s => s.trim()).filter(Boolean)
          : existing.changes);

    return ChangelogModel.update(id, {
      version: data.version ? data.version.trim() : existing.version,
      title: data.title ? data.title.trim() : existing.title,
      description: data.description !== undefined ? data.description : existing.description,
      type: data.type || existing.type,
      game_name: data.game_name !== undefined ? data.game_name : existing.game_name,
      game_id: data.game_id !== undefined ? data.game_id : existing.game_id,
      changes: changesArray,
    });
  }

  async delete(id) {
    const existing = await ChangelogModel.findById(id);
    if (!existing) {
      throw new AppError('Changelog entry not found', 404);
    }
    return ChangelogModel.delete(id);
  }
}

module.exports = new ChangelogService();
