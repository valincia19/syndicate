const changelogService = require('./changelogs.service');

class ChangelogController {
  async list(req, res, next) {
    try {
      const type = req.query.type || null;
      const changelogs = await changelogService.getAll(type);
      res.status(200).json({ status: 'success', data: { changelogs } });
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const changelog = await changelogService.create(req.body, req.user.id);
      res.status(201).json({ status: 'success', message: 'Changelog published', data: { changelog } });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const changelog = await changelogService.update(req.params.id, req.body);
      res.status(200).json({ status: 'success', message: 'Changelog updated', data: { changelog } });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await changelogService.delete(req.params.id);
      res.status(200).json({ status: 'success', message: 'Changelog deleted' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ChangelogController();
