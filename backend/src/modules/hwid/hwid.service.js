
const HwidModel = require('./hwid.model');
const { AppError } = require('../../middleware/errorHandler.middleware');

class HwidService {
  async getAll() { return HwidModel.findAll(); }

  async getById(id) {
    const hwid = await HwidModel.findById(id);
    if (!hwid) throw new AppError('HWID not found', 404);
    return hwid;
  }

  async getByLicense(licenseId) {
    const pool = require('../../config/database').getPool();
    const result = await pool.query(
      `SELECT h.*, l.license_key
       FROM hwid_devices h
       LEFT JOIN licenses l ON h.license_id = l.id
       WHERE h.license_id = $1
       ORDER BY h.created_at DESC`, [licenseId]
    );
    return result.rows;
  }

  async create(data) {
    return HwidModel.create(data);
  }

  async update(id, data) {
    const hwid = await HwidModel.findById(id);
    if (!hwid) throw new AppError('HWID not found', 404);
    return HwidModel.update(id, data);
  }

  async delete(id) {
    const hwid = await HwidModel.findById(id);
    if (!hwid) throw new AppError('HWID not found', 404);
    await HwidModel.delete(id);
  }

  async resetDevice(id) {
    const hwid = await HwidModel.findById(id);
    if (!hwid) throw new AppError('HWID not found', 404);
    await HwidModel.resetDevice(id);
  }

  async resetByLicense(licenseId) {
    await HwidModel.resetByLicense(licenseId);
  }

  async countDeletesInLastWeek(licenseId) {
    return HwidModel.countDeletesInLastWeek(licenseId);
  }

  async logDeletion(licenseId) {
    await HwidModel.logDeletion(licenseId);
  }

  async getOldestDeleteInLastWeek(licenseId) {
    return HwidModel.getOldestDeleteInLastWeek(licenseId);
  }
}

module.exports = new HwidService();
