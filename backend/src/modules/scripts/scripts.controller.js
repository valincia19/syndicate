const scriptService = require('./scripts.service');
const { AppError } = require('../../middleware/errorHandler.middleware');

class ScriptController {
  // ── Scripts ──────────────────────────────────────────────
  async deploy(req, res, next) {
    try {
      if (!req.file) throw new AppError('No Lua file uploaded.', 400);
      if (!req.file.originalname.endsWith('.lua') && !req.file.originalname.endsWith('.txt')) throw new AppError('Only .lua or .txt files are allowed.', 400);

      const folderId = req.body.folder_id || null;
      const script = await scriptService.uploadScript(req.file.buffer, req.file.originalname, req.user.id, folderId);

      res.status(201).json({ status: 'success', message: 'Script deployed', data: { script } });
    } catch (err) { next(err); }
  }

  async list(req, res, next) {
    try {
      const statusFilter = req.query.status || null;
      const folderId = req.query.folder_id || null;
      const scripts = await scriptService.getScripts(statusFilter, folderId);
      res.status(200).json({ status: 'success', data: { scripts } });
    } catch (err) { next(err); }
  }

  async getScript(req, res, next) {
    try {
      const script = await scriptService.getScriptById(req.params.id);
      res.status(200).json({ status: 'success', data: { script } });
    } catch (err) { next(err); }
  }

  async stats(req, res, next) {
    try {
      const data = await scriptService.getStats();
      res.status(200).json({ status: 'success', data });
    } catch (err) { next(err); }
  }

  async publish(req, res, next) {
    try {
      const { changelog, version } = req.body;
      const script = await scriptService.publishScript(req.params.id, { changelog: changelog || '', version: version || undefined });
      res.status(200).json({ status: 'success', message: 'Script published', data: { script } });
    } catch (err) { next(err); }
  }

  async deprecate(req, res, next) {
    try {
      const script = await scriptService.deprecateScript(req.params.id);
      res.status(200).json({ status: 'success', message: 'Script deprecated', data: { script } });
    } catch (err) { next(err); }
  }

  async move(req, res, next) {
    try {
      const script = await scriptService.moveScript(req.params.id, req.body.folder_id);
      res.status(200).json({ status: 'success', message: 'Script moved', data: { script } });
    } catch (err) { next(err); }
  }

  async getContent(req, res, next) {
    try {
      const content = await scriptService.getScriptContent(req.params.id, req.user);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      // Note: No Access-Control-Allow-Origin header here - content is auth-only.
      res.send(content);
    } catch (err) { next(err); }
  }

  // ── Folders ──────────────────────────────────────────────
  async listFolders(req, res, next) {
    try {
      const parentId = req.query.parent_id || null;
      const folders = await scriptService.getFolders(parentId);
      res.status(200).json({ status: 'success', data: { folders } });
    } catch (err) { next(err); }
  }

  async getFolder(req, res, next) {
    try {
      const folder = await scriptService.getFolderById(req.params.id);
      res.status(200).json({ status: 'success', data: { folder } });
    } catch (err) { next(err); }
  }

  async createFolder(req, res, next) {
    try {
      const folder = await scriptService.createFolder({ name: req.body.name, parent_id: req.body.parent_id || null, user_id: req.user.id });
      res.status(201).json({ status: 'success', message: 'Folder created', data: { folder } });
    } catch (err) { next(err); }
  }

  async updateFolder(req, res, next) {
    try {
      const folder = await scriptService.updateFolder(req.params.id, req.body);
      res.status(200).json({ status: 'success', message: 'Folder updated', data: { folder } });
    } catch (err) { next(err); }
  }

  async deleteFolder(req, res, next) {
    try {
      await scriptService.deleteFolder(req.params.id);
      res.status(200).json({ status: 'success', message: 'Folder deleted' });
    } catch (err) { next(err); }
  }

  async updateContent(req, res, next) {
    try {
      const script = await scriptService.updateScriptContent(req.params.id, req.body.content);
      res.status(200).json({ status: 'success', message: 'Script content updated', data: { script } });
    } catch (err) { next(err); }
  }

  async update(req, res, next) {
    try {
      const script = await scriptService.updateScript(req.params.id, req.body);
      res.status(200).json({ status: 'success', message: 'Script updated', data: { script } });
    } catch (err) { next(err); }
  }

  async delete(req, res, next) {
    try {
      await scriptService.deleteScript(req.params.id);
      res.status(200).json({ status: 'success', message: 'Script deleted' });
    } catch (err) { next(err); }
  }

  async breadcrumb(req, res, next) {
    try {
      const crumbs = await scriptService.getBreadcrumb(req.params.id);
      res.status(200).json({ status: 'success', data: { breadcrumb: crumbs } });
    } catch (err) { next(err); }
  }

  async bulkMove(req, res, next) {
    try {
      const { script_ids, folder_ids, target_folder_id } = req.body;
      const results = await scriptService.bulkMove({ script_ids, folder_ids, target_folder_id });
      res.status(200).json({ status: 'success', message: 'Items moved', data: results });
    } catch (err) { next(err); }
  }

  async repairOrphans(req, res, next) {
    try {
      const results = await scriptService.repairOrphans();
      res.status(200).json({ status: 'success', message: 'Orphaned files and folders restored to root level', data: results });
    } catch (err) { next(err); }
  }
}

module.exports = new ScriptController();
