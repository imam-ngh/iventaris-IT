const { Pool } = require('pg');
require('dotenv').config();

// Check if running on Railway (Railway sets these env vars)
const isRailway = process.env.RAILWAY_ENVIRONMENT !== undefined;

// Database configuration
const pool = new Pool({
  user: isRailway ? process.env.POSTGRES_USER : process.env.DB_USER,
  host: isRailway ? process.env.POSTGRES_HOST : process.env.DB_HOST,
  database: isRailway ? process.env.POSTGRES_DB : process.env.DB_DATABASE,
  password: isRailway ? process.env.POSTGRES_PASSWORD : process.env.DB_PASSWORD,
  port: isRailway ? process.env.POSTGRES_PORT : process.env.DB_PORT,
  ssl: isRailway ? { rejectUnauthorized: false } : false
});

// Log connection info (for debugging)
console.log('Database config:');
console.log('  Host:', isRailway ? process.env.POSTGRES_HOST : process.env.DB_HOST);
console.log('  Database:', isRailway ? process.env.POSTGRES_DB : process.env.DB_DATABASE);
console.log('  User:', isRailway ? process.env.POSTGRES_USER : process.env.DB_USER);
console.log('  Railway:', isRailway);

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool: pool
};
