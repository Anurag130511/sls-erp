const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

if (process.env.DATABASE_URL) {
  // Postgres — used automatically whenever DATABASE_URL is set (Neon,
  // Render Postgres, Railway, Supabase, etc. all provide one). This is
  // the path for genuinely free hosting: Render's free web service tier
  // wipes local files on every restart AND every ~15-minute idle
  // spin-down, so a local SQLite file cannot survive there — a real
  // managed database (like Neon's permanent free tier) is what makes
  // free hosting actually work. Models and queries elsewhere never
  // change based on which dialect is active; Sequelize abstracts the SQL.
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      // Most managed Postgres hosts (Neon included) require SSL and use
      // certificates not in Node's default trust store — this is the
      // standard safe way to accept that without disabling SSL entirely.
      ssl: process.env.DB_SSL === 'false' ? false : { require: true, rejectUnauthorized: false },
    },
    logging: false,
  });
} else {
  // SQLite fallback — zero external setup, used for local development
  // and for any deployment with a real persistent disk (see README).
  const storage = process.env.DB_STORAGE || path.join(__dirname, '../../data/database.sqlite');

  // The folder holding the SQLite file must exist before Sequelize can
  // open it — on a fresh deployment (especially a mounted persistent
  // disk whose path might not match what's in this repo), that folder
  // may not exist yet. Create it if missing so first boot never fails.
  const dbDir = path.dirname(storage);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage,
    logging: false,
  });
}

module.exports = sequelize;
