/**
 * Inject 7 HWID entries into hwid_devices for a specific license
 * Usage: node scripts/inject-hwid.js
 */
const crypto = require('crypto');
const path = require('path');

// Ensure .env is loaded from backend root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const db = require('../src/config/database');
const logger = require('../src/config/logger');

const LICENSE_ID = '4c7a4e45-4186-460e-945c-e91c59219626';

// 7 sample Roblox HWID entries
const hwidEntries = [
  { roblox_username: 'xXShadowPro_Xx',   roblox_id: '2745618293', hwid: 'HWID-A7F3B2C1D4E5-001' },
  { roblox_username: 'BloxFruitKing99',  roblox_id: '1582937465', hwid: 'HWID-B8C4D3E2F6A1-002' },
  { roblox_username: 'NightHunter_YT',   roblox_id: '3982746150', hwid: 'HWID-C9D5E4F3A7B2-003' },
  { roblox_username: 'SpeedDemonRBX',    roblox_id: '5129837460', hwid: 'HWID-D0E6F5A4B8C3-004' },
  { roblox_username: 'ValincLegend',     roblox_id: '7236451890', hwid: 'HWID-E1F7A6B5C9D4-005' },
  { roblox_username: 'ProBuilderXL',     roblox_id: '8475629301', hwid: 'HWID-F2A8B7C6D0E5-006' },
  { roblox_username: 'EpicScripter123',  roblox_id: '6392814750', hwid: 'HWID-A3B9C8D7E1F6-007' },
];

async function inject() {
  try {
    // Connect to DB
    await db.connect();
    const pool = db.getPool();

    // Verify license exists
    const [licenseRows] = await pool.execute(
      'SELECT id, license_key, tier, status, hwid_limit FROM licenses WHERE id = ?',
      [LICENSE_ID]
    );

    if (licenseRows.length === 0) {
      console.error(`❌ License ${LICENSE_ID} not found!`);
      process.exit(1);
    }

    const license = licenseRows[0];
    console.log(`✅ License found: ${license.license_key} (${license.tier}, status: ${license.status})`);
    console.log(`   HWID limit: ${license.hwid_limit}`);

    // Check existing HWID count
    const [existingRows] = await pool.execute(
      'SELECT COUNT(*) AS cnt FROM hwid_devices WHERE license_id = ?',
      [LICENSE_ID]
    );
    console.log(`   Existing HWIDs: ${existingRows[0].cnt}`);

    // Insert 7 HWID entries
    let inserted = 0;
    for (const entry of hwidEntries) {
      const id = crypto.randomUUID();
      await pool.execute(
        `INSERT INTO hwid_devices (id, license_id, roblox_username, roblox_id, roblox_avatar, hwid, status)
         VALUES (?, ?, ?, ?, ?, ?, 'active')`,
        [id, LICENSE_ID, entry.roblox_username, entry.roblox_id, null, entry.hwid]
      );
      inserted++;
      console.log(`   ✅ [${inserted}/7] ${entry.roblox_username} - ${entry.hwid}`);
    }

    // Final count
    const [finalRows] = await pool.execute(
      'SELECT COUNT(*) AS cnt FROM hwid_devices WHERE license_id = ?',
      [LICENSE_ID]
    );
    console.log(`\n🎉 Done! Total HWIDs for license: ${finalRows[0].cnt}`);

    await db.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

inject();
