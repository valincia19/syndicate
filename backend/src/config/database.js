const { Pool, types } = require('pg');
const env = require('./env');
const logger = require('./logger');

// OID 1114 is for TIMESTAMP WITHOUT TIME ZONE.
// Forces the pg driver to parse timestamps as UTC instead of Node's local server time.
types.setTypeParser(1114, (val) => {
  if (!val) return null;
  return new Date(val.replace(' ', 'T') + 'Z');
});

let pool = null;

const SCHEMA = 'valinc_syndicate';

const createPool = () => {
  const sslConfig = env.database.ssl
    ? { ssl: { rejectUnauthorized: false } }
    : {};

  pool = new Pool({
    host: env.database.host,
    port: env.database.port,
    user: env.database.user,
    password: env.database.password,
    database: env.database.name,
    max: env.database.connectionLimit,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    options: `-c search_path=${SCHEMA} -c timezone=UTC`,
    ...sslConfig,
  });
  return pool;
};

const createSchema = async () => {
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
    await client.query(`SET search_path TO ${SCHEMA}`);
  } finally {
    client.release();
  }
};

const testConnection = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1 + 1 AS result');
    const version = await client.query('SELECT version()');
    client.release();
    logger.info('Database', 'PostgreSQL connected', {
      host: `${env.database.host}:${env.database.port}`,
      database: env.database.name,
      version: version.rows[0].version,
      pool: `${env.database.connectionLimit} connections`,
    });
    return true;
  } catch (error) {
    logger.error('Database', 'Database connection failed', { error: error.message });
    throw error;
  }
};

const ensureUpdateTrigger = async () => {
  const p = getPool();
  await p.query(`
    CREATE OR REPLACE FUNCTION ${SCHEMA}.update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);
  logger.info('Database', 'updated_at trigger function ready');
};

const connect = async () => {
  if (!pool) createPool();
  await createSchema();
  await testConnection();
  await ensureUpdateTrigger();
  return pool;
};

const getPool = () => {
  if (!pool) throw new Error('Database pool not initialized. Call connect() first.');
  return pool;
};

const disconnect = async () => {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('Database', 'Database disconnected');
  }
};

module.exports = { connect, disconnect, getPool, createPool };
