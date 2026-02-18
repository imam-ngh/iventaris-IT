const fs = require('fs');
const path = require('path');
const { query, pool } = require('./db');

async function migrate() {
  const DB_FILE = path.join(__dirname, 'database.json');
  
  if (!fs.existsSync(DB_FILE)) {
    console.log('database.json not found. Nothing to migrate.');
    return;
  }

  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

  try {
    // Create tables
    console.log('Creating tables...');
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id TEXT PRIMARY KEY,
        no INTEGER,
        name TEXT,
        merk TEXT,
        sn TEXT,
        lokasi TEXT,
        kondisi_before TEXT,
        checklist TEXT,
        kondisi_after TEXT,
        catatan TEXT,
        date DATE,
        qr_code TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrate users
    console.log('Migrating users...');
    for (const user of data.users) {
      await query(
        'INSERT INTO users (id, username, password, name) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING',
        [user.id, user.username, user.password, user.name]
      );
    }

    // Migrate inventory
    console.log('Migrating inventory...');
    for (const item of data.inventory) {
      await query(
        `INSERT INTO inventory (id, no, name, merk, sn, lokasi, kondisi_before, checklist, kondisi_after, catatan, date, qr_code, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO NOTHING`,
        [
          item.id,
          item.no,
          item.name,
          item.merk,
          item.sn,
          item.lokasi,
          item.kondisiBefore,
          item.checklist,
          item.kondisiAfter,
          item.catatan,
          item.date,
          item.qrCode,
          item.createdAt
        ]
      );
    }

    console.log('Migration successful!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
