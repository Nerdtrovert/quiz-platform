const mysql = require('mysql2/promise');
require('dotenv').config();

// Build DB config from DATABASE_URL (preferred) or individual DB_* envs
const dbConfig = {
  waitForConnections: true,
  connectionLimit: 10,
};

if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    dbConfig.host = url.hostname;
    dbConfig.port = url.port ? Number(url.port) : 3306;
    dbConfig.user = decodeURIComponent(url.username);
    dbConfig.password = decodeURIComponent(url.password);
    dbConfig.database = url.pathname ? url.pathname.replace(/^\//, '') : undefined;

    // Support a query param like ?ssl=true or ?ssl-mode=REQUIRED
    const sslParam = url.searchParams.get('ssl') || url.searchParams.get('sslmode') || url.searchParams.get('ssl-mode');
    if (sslParam && ['true', 'require', 'required', '1'].includes(sslParam.toLowerCase())) {
      dbConfig.ssl = { rejectUnauthorized: false };
    }
  } catch (e) {
    console.error('Invalid DATABASE_URL:', e.message);
    // fall through to env var config below
  }
}

if (!dbConfig.host) {
  dbConfig.host = process.env.DB_HOST || 'localhost';
  dbConfig.port = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;
  dbConfig.user = process.env.DB_USER;
  dbConfig.password = process.env.DB_PASSWORD;
  dbConfig.database = process.env.DB_NAME;
}

// Enable SSL if DB_SSL is set to true, or if connecting to an Aiven database
if (process.env.DB_SSL === 'true' || (dbConfig.host && dbConfig.host.includes('aivencloud.com'))) {
  dbConfig.ssl = { rejectUnauthorized: false };
}

const pool = mysql.createPool(dbConfig);

module.exports = pool;
