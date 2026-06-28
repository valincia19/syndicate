/**
 * Verify releases table has new columns
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const db = require('../src/config/database');

async function verify() {
  try {
    await db.connect();
    const pool = db.getPool();
    const [cols] = await pool.execute(
      `SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'releases' ORDER BY ORDINAL_POSITION`
    );
    console.log('releases table columns:');
    cols.forEach(c => console.log(`  ${c.COLUMN_NAME.padEnd(16)} ${c.COLUMN_TYPE.padEnd(30)} ${c.COLUMN_DEFAULT || ''}`));
    await db.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
verify();
