const ReleaseModel = require('./releases.model');
const { AppError } = require('../../middleware/errorHandler.middleware');
const logger = require('../../config/logger');
const cacheUtility = require('../../utils/cache.utility');

class ReleaseService {
  async createRelease(data, userId) {
    if (!data.name || !data.name.trim()) throw new AppError('Release name is required', 400);
    if (!data.game_id || !data.game_id.trim()) throw new AppError('Game ID is required', 400);

    const created = await ReleaseModel.create({
      name: data.name.trim(),
      description: data.description || '',
      category: data.category || 'Universal',
      version: data.version || 'v1.0.0',
      loadstring: data.loadstring || null,
      script_id: data.script_id || null,
      script_type: data.script_type || 'free',
      logo_text: data.logo_text || null,
      logo_gradient: data.logo_gradient || null,
      operational_status: data.operational_status || 'Online',
      game_id: data.game_id.trim(),
      game_name: data.game_name || null,
      game_logo: data.game_logo || null,
      game_banner: data.game_banner || null,
      features: Array.isArray(data.features) ? data.features : [],
      user_id: userId,
      status: 'draft',
    });

    await cacheUtility.delPrefix('cache:releases:');
    await cacheUtility.delPrefix('cache:loader:');
    return created;
  }

  async getReleases(userId, userRole) {
    // owner/admin sees all releases; developer sees only their own
    if (userRole === 'owner' || userRole === 'admin') {
      return ReleaseModel.findAll(null);
    }
    return ReleaseModel.findAll(userId);
  }

  async getAllPublic() {
    return cacheUtility.getOrSet(
      'cache:releases:public',
      () => ReleaseModel.findAll(null, true),
      3600 // 1 Hour TTL
    );
  }

  async getReleaseById(id, userId, userRole) {
    const release = await ReleaseModel.findById(id);
    if (!release) throw new AppError('Release not found', 404);
    const isOwnerRole = userRole === 'owner' || userRole === 'admin';
    if (!isOwnerRole && release.user_id !== userId) throw new AppError('Not authorized', 403);
    return release;
  }

  async updateRelease(id, data, userId, userRole) {
    const release = await ReleaseModel.findById(id);
    if (!release) throw new AppError('Release not found', 404);
    const isOwnerRole = userRole === 'owner' || userRole === 'admin';
    if (!isOwnerRole && release.user_id !== userId) throw new AppError('Not authorized', 403);

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.version !== undefined) updateData.version = data.version;
    if (data.loadstring !== undefined) updateData.loadstring = data.loadstring;
    if (data.script_id !== undefined) updateData.script_id = data.script_id;
    if (data.script_type !== undefined) updateData.script_type = data.script_type;
    if (data.logo_text !== undefined) updateData.logo_text = data.logo_text;
    if (data.logo_gradient !== undefined) updateData.logo_gradient = data.logo_gradient;
    if (data.operational_status !== undefined) updateData.operational_status = data.operational_status;
    if (data.game_id !== undefined) updateData.game_id = data.game_id.trim();
    if (data.game_name !== undefined) updateData.game_name = data.game_name;
    if (data.game_logo !== undefined) updateData.game_logo = data.game_logo;
    if (data.game_banner !== undefined) updateData.game_banner = data.game_banner;
    if (data.features !== undefined) updateData.features = data.features;
    if (data.status !== undefined) updateData.status = data.status;

    const updated = await ReleaseModel.update(id, updateData);
    await cacheUtility.delPrefix('cache:releases:');
    await cacheUtility.delPrefix('cache:loader:');
    return updated;
  }

  async deleteRelease(id, userId, userRole) {
    const release = await ReleaseModel.findById(id);
    if (!release) throw new AppError('Release not found', 404);
    const isOwnerRole = userRole === 'owner' || userRole === 'admin';
    if (!isOwnerRole && release.user_id !== userId) throw new AppError('Not authorized', 403);
    await ReleaseModel.delete(id);
    await cacheUtility.delPrefix('cache:releases:');
    await cacheUtility.delPrefix('cache:loader:');
  }

  async getLoaderContent(prefix) {
    // Strip .lua suffix if present
    const cleanPrefix = prefix.replace(/\.lua$/i, '');
    const cacheKey = `cache:loader:${cleanPrefix}`;

    return cacheUtility.getOrSet(
      cacheKey,
      async () => {
        const release = await ReleaseModel.findByPrefix(cleanPrefix);
        if (!release) throw new AppError('Release not found', 404);
        if (!release.script_id) throw new AppError('No script linked to this release', 404);

        const ScriptService = require('../scripts/scripts.service');
        const pseudoUser = { id: release.user_id, role: 'owner' };
        const content = await ScriptService.getScriptContent(release.script_id, pseudoUser);

        return {
          name: release.name,
          version: release.version,
          content,
        };
      },
      3600 // 1 Hour TTL
    );
  }

  async fetchGameInfo(gameId) {
    const https = require('https');

    // Extract numeric ID from full Roblox URL if pasted directly
    const urlMatch = String(gameId).match(/roblox\.com\/games\/(\d+)/i);
    const resolvedGameId = urlMatch ? urlMatch[1] : String(gameId).trim();

    const fetchJson = (url) => new Promise((resolve, reject) => {
      https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error('Failed to parse Roblox API response')); }
        });
      }).on('error', reject);
    });

    let universeId = resolvedGameId;

    // Try to resolve place ID to universe ID first
    try {
      const placeRes = await fetchJson(`https://apis.roblox.com/universes/v1/places/${resolvedGameId}/universe`);
      if (placeRes && placeRes.universeId) {
        universeId = placeRes.universeId;
      }
    } catch {
      // Not a place ID, try as universe ID directly
    }

    // Fetch game details
    const gameRes = await fetchJson(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
    if (!gameRes || !gameRes.data || gameRes.data.length === 0) {
      throw new AppError('Game not found. Please check the Game ID.', 404);
    }

    const game = gameRes.data[0];

    // Fetch thumbnails (icon/logo)
    let logo = null;
    let banner = null;
    try {
      const iconRes = await fetchJson(
        `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=128x128&format=Png`
      );
      if (iconRes && iconRes.data && iconRes.data[0] && iconRes.data[0].imageUrl) {
        logo = iconRes.data[0].imageUrl;
      }
    } catch { /* thumbnail optional */ }

    try {
      const thumbRes = await fetchJson(
        `https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeId}&countPerUniverse=1&defaults=true&size=768x432&format=Png`
      );
      if (thumbRes && thumbRes.data && thumbRes.data[0] && thumbRes.data[0].thumbnails && thumbRes.data[0].thumbnails[0]) {
        banner = thumbRes.data[0].thumbnails[0].imageUrl;
      }
    } catch { /* thumbnail optional */ }

    return {
      game_name: game.name,
      game_description: game.description,
      game_id: universeId.toString(),
      game_logo: logo,
      game_banner: banner,
      genre: game.genre,
      playing: game.playing,
    };
  }
}

module.exports = new ReleaseService();
