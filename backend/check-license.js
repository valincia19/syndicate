const { connect, getPool } = require('./src/config/database');

async function main() {
  await connect();
  const pool = getPool();
  const key = process.argv[2] || process.env.LICENSE_KEY;
  if (!key) {
    console.log('Usage: node check-license.js <LICENSE_KEY>');
    process.exit(1);
  }
  try {
    const res = await pool.query("SELECT * FROM licenses WHERE license_key = $1", [key]);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

main();
