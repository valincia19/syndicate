const crypto = require('crypto');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const env = require('../../config/env');
const ScriptModel = require('./scripts.model');
const { AppError } = require('../../middleware/errorHandler.middleware');
const logger = require('../../config/logger');
const cacheUtility = require('../../utils/cache.utility');

class ScriptService {
  constructor() {
    this.s3Client = null;
  }

  getS3Client() {
    if (!this.s3Client) {
      const { endpoint, accessKeyId, secretAccessKey } = env.r2;
      if (!endpoint || !accessKeyId || !secretAccessKey) {
        throw new AppError('Cloudflare R2 storage is not configured properly.', 500);
      }
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: endpoint,
        credentials: { accessKeyId, secretAccessKey },
      });
    }
    return this.s3Client;
  }

  // ── Scripts ──────────────────────────────────────────────
  async getScriptById(id) {
    const script = await ScriptModel.findById(id);
    if (!script) throw new AppError('Script not found', 404);
    return script;
  }

  async uploadScript(fileBuffer, originalName, userId, folderId = null) {
    if (!fileBuffer || !originalName) {
      throw new AppError('File content and name are required', 400);
    }

    const s3 = this.getS3Client();
    
    // Build R2 path: scripts[/Folder/SubFolder]/<random>.lua
    let folderPath = '';
    if (folderId) {
      folderPath = await ScriptModel.getFolderPath(folderId);
      if (folderPath) folderPath += '/';
    }

    const folderRandomName = crypto.randomBytes(16).toString('hex');
    const fileRandomName = crypto.randomBytes(24).toString('hex') + '.lua';
    const fileKey = folderPath
      ? `scripts/${folderPath}${folderRandomName}/${fileRandomName}`
      : `scripts/${folderRandomName}/${fileRandomName}`;

    logger.info('ScriptService', 'Uploading Lua script to R2', {
      originalName, folderId, bucket: env.r2.bucketName, key: fileKey,
    });

    try {
      await s3.send(new PutObjectCommand({
        Bucket: env.r2.bucketName,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: 'text/plain',
      }));

      const publicUrlBase = env.r2.publicUrl.replace(/\/$/, '');
      const fileUrl = `${publicUrlBase}/${fileKey}`;

      logger.info('ScriptService', 'Upload successful', { url: fileUrl });

      const script = await ScriptModel.create({
        name: originalName,
        version: '1.0.0',
        file_path: fileKey,
        file_url: fileUrl,
        user_id: userId,
        folder_id: folderId || null,
      });

      // Cache Invalidation (Cache-Aside Pattern)
      await cacheUtility.delPrefix('cache:scripts:');

      return script;
    } catch (err) {
      logger.error('ScriptService', 'Upload failed', { error: err.message });
      const errorMsg = env.nodeEnv === 'production' ? 'Script deployment failed' : `Deployment failed: ${err.message}`;
      throw new AppError(errorMsg, 500);
    }
  }

  async getScripts(statusFilter = null, folderId = null) {
    const cacheKey = `cache:scripts:${statusFilter || 'all'}:${folderId || 'root'}`;
    return cacheUtility.getOrSet(
      cacheKey,
      () => ScriptModel.findAll(statusFilter, folderId),
      3600 // 1 Hour TTL
    );
  }

  async getStats() {
    return ScriptModel.getStats();
  }

  async publishScript(id, { changelog, version }) {
    const script = await ScriptModel.findById(id);
    if (!script) throw new AppError('Script not found', 404);
    
    const cleanVer = (v) => String(v || '').trim().replace(/^v/, '');
    if (script.status === 'published' && cleanVer(script.version) === cleanVer(version)) {
      throw new AppError('Script is already published with this version', 400);
    }
    const updated = await ScriptModel.update(id, { status: 'published', changelog: changelog || script.changelog, version: version || script.version });
    await cacheUtility.delPrefix('cache:scripts:');
    return updated;
  }

  async deprecateScript(id) {
    const script = await ScriptModel.findById(id);
    if (!script) throw new AppError('Script not found', 404);
    const updated = await ScriptModel.update(id, { status: 'deprecated' });
    await cacheUtility.delPrefix('cache:scripts:');
    return updated;
  }

  async moveScript(id, folderId) {
    const script = await ScriptModel.findById(id);
    if (!script) throw new AppError('Script not found', 404);
    const updated = await ScriptModel.update(id, { folder_id: folderId || null });
    await cacheUtility.delPrefix('cache:scripts:');
    return updated;
  }

  async getScriptContent(id, requestingUser) {
    const script = await ScriptModel.findById(id);
    if (!script) throw new AppError('Script not found', 404);

    // ── BOLA Protection: owner or staff+ can read content ──────────────────────
    const STAFF_ROLES = ['staff', 'admin', 'developer', 'owner'];
    const isOwner = script.user_id === requestingUser.id;
    const isStaff = STAFF_ROLES.includes(requestingUser.role);
    // Note: developers are already authorized at the route level (owner/developer only).
    // This check enforces that a developer can ONLY read their own scripts.
    if (!isOwner && !isStaff) {
      throw new AppError('You do not have permission to read this script', 403);
    }

    try {
      const s3 = this.getS3Client();
      const { GetObjectCommand } = require('@aws-sdk/client-s3');
      const response = await s3.send(new GetObjectCommand({
        Bucket: env.r2.bucketName,
        Key: script.file_path,
      }));
      const streamToString = (stream) =>
        new Promise((resolve, reject) => {
          const chunks = [];
          stream.on('data', chunk => chunks.push(chunk));
          stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
          stream.on('error', reject);
        });
      return await streamToString(response.Body);
    } catch (err) {
      logger.error('ScriptService', 'Failed to read script content', { error: err.message });
      throw new AppError('Failed to read script content', 500);
    }
  }

  // ── Folders ──────────────────────────────────────────────
  async getFolders(parentId = null) {
    return ScriptModel.findFolders(parentId);
  }

  async getFolderById(id) {
    const folder = await ScriptModel.findFolderById(id);
    if (!folder) throw new AppError('Folder not found', 404);
    return folder;
  }

  async createFolder(data) {
    if (!data.name || !data.name.trim()) throw new AppError('Folder name is required', 400);
    return ScriptModel.createFolder(data);
  }

  async updateFolder(id, data) {
    const folder = await ScriptModel.findFolderById(id);
    if (!folder) throw new AppError('Folder not found', 404);
    return ScriptModel.updateFolder(id, data);
  }

  async deleteFolder(id) {
    const folder = await ScriptModel.findFolderById(id);
    if (!folder) throw new AppError('Folder not found', 404);

    const deletedScripts = await ScriptModel.deleteFolder(id);

    // Clean up files from R2 storage for all deleted scripts inside folder & subfolders
    try {
      const s3 = this.getS3Client();
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      for (const script of deletedScripts) {
        if (script.file_path) {
          await s3.send(new DeleteObjectCommand({
            Bucket: env.r2.bucketName,
            Key: script.file_path,
          })).catch(err => {
            logger.warn('ScriptService', 'Failed to delete file from R2 during folder deletion', { scriptId: script.id, error: err.message });
          });
        }
      }
    } catch (err) {
      logger.warn('ScriptService', 'R2 cleanup error during folder deletion', { error: err.message });
    }

    await cacheUtility.delPrefix('cache:scripts:');
  }

  async updateScript(id, data) {
    const updated = await ScriptModel.update(id, data);
    await cacheUtility.delPrefix('cache:scripts:');
    return updated;
  }

  async deleteScript(id) {
    const script = await ScriptModel.findById(id);
    if (!script) throw new AppError('Script not found', 404);
    // Delete from R2 storage as well
    try {
      const s3 = this.getS3Client();
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      await s3.send(new DeleteObjectCommand({
        Bucket: env.r2.bucketName,
        Key: script.file_path,
      }));
    } catch (err) {
      logger.warn('ScriptService', 'Failed to delete from R2 (may already be gone)', { error: err.message });
    }
    await ScriptModel.delete(id);
    await cacheUtility.delPrefix('cache:scripts:');
  }

  async bulkMove({ script_ids = [], folder_ids = [], target_folder_id }) {
    const results = { moved_scripts: 0, moved_folders: 0, errors: [] };

    for (const scriptId of script_ids) {
      try {
        await ScriptModel.update(scriptId, { folder_id: target_folder_id || null });
        results.moved_scripts++;
      } catch (err) {
        results.errors.push({ id: scriptId, type: 'script', error: err.message });
        logger.error('ScriptService', 'Bulk move script failed', { id: scriptId, error: err.message });
      }
    }
    for (const folderId of folder_ids) {
      try {
        await ScriptModel.updateFolder(folderId, { parent_id: target_folder_id || null });
        results.moved_folders++;
      } catch (err) {
        results.errors.push({ id: folderId, type: 'folder', error: err.message });
        logger.error('ScriptService', 'Bulk move folder failed', { id: folderId, error: err.message });
      }
    }
    return results;
  }

  async updateScriptContent(id, content) {
    const script = await ScriptModel.findById(id);
    if (!script) throw new AppError('Script not found', 404);
    
    const s3 = this.getS3Client();
    try {
      await s3.send(new PutObjectCommand({
        Bucket: env.r2.bucketName,
        Key: script.file_path,
        Body: Buffer.from(content, 'utf-8'),
        ContentType: 'text/plain',
      }));
      logger.info('ScriptService', 'Script content updated successfully on R2', { id, path: script.file_path });
      return script;
    } catch (err) {
      logger.error('ScriptService', 'Failed to update script content on R2', { error: err.message });
      throw new AppError(`Update failed: ${err.message}`, 500);
    }
  }

  async getBreadcrumb(folderId) {
    const parts = [];
    let current = folderId;
    while (current) {
      const folder = await ScriptModel.findFolderById(current);
      if (!folder) break;
      parts.unshift({ id: folder.id, name: folder.name });
      current = folder.parent_id;
    }
    return parts;
  }
}

module.exports = new ScriptService();
