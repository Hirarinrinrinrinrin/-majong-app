
import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

const dbPath = process.env.DATABASE_FILE || path.join(process.cwd(), 'majong.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    name TEXT,
    status TEXT DEFAULT 'finished', -- 'scheduled', 'active', 'finished'
    is_active INTEGER DEFAULT 0, -- Keeping for backward compatibility temporarily, but status is source of truth
    UNIQUE(date, name)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Migration for existing tables (will error if columns exist, wrapped in try-catch in application logic usually, but here best effort with simple check if possible, or just ignore errors in a real migration system. Since this is 'db.exec', I'll attempt to add columns safely using a separate block or relying on user resetting DB if needed. 
  -- actually, better-sqlite3 exec allows multiple statements. 
  -- I'll try to add columns if they don't exist is hard in one-shot script without logic.
  -- I will assume I can just update the CREATE statement for new installs, and for the running instance I might need a migration step. 
  -- Given the user environment, I will try to run a migration script via immediate execution in the file.
`);

try {
  db.exec("ALTER TABLE events ADD COLUMN name TEXT");
} catch (e) { /* ignore if exists */ }

try {
  db.exec("ALTER TABLE events ADD COLUMN status TEXT DEFAULT 'finished'");
} catch (e) { /* ignore if exists */ }

// Migrate existing data
try {
  db.exec("UPDATE events SET status = 'active' WHERE is_active = 1 AND status = 'finished'");
  db.exec("UPDATE events SET status = 'finished' WHERE is_active = 0 AND status = 'finished'");
} catch (e) { /* ignore */ }

db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    player_1_name TEXT NOT NULL,
    player_1_score INTEGER NOT NULL,
    player_1_raw_score INTEGER, -- 素点
    player_1_yakuman INTEGER DEFAULT 0,
    player_2_name TEXT NOT NULL,
    player_2_score INTEGER NOT NULL,
    player_2_raw_score INTEGER, -- 素点
    player_2_yakuman INTEGER DEFAULT 0,
    player_3_name TEXT NOT NULL,
    player_3_score INTEGER NOT NULL,
    player_3_raw_score INTEGER, -- 素点
    player_3_yakuman INTEGER DEFAULT 0,
    player_4_name TEXT NOT NULL,
    player_4_score INTEGER NOT NULL,
    player_4_raw_score INTEGER, -- 素点
    player_4_yakuman INTEGER DEFAULT 0,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(event_id) REFERENCES events(id)
  );
`);

// Migration for raw_score
try {
  db.exec("ALTER TABLE scores ADD COLUMN player_1_raw_score INTEGER");
  db.exec("ALTER TABLE scores ADD COLUMN player_2_raw_score INTEGER");
  db.exec("ALTER TABLE scores ADD COLUMN player_3_raw_score INTEGER");
  db.exec("ALTER TABLE scores ADD COLUMN player_4_raw_score INTEGER");
} catch (e) { /* ignore if exists */ }

// Seed default passwords
try {
  const userPwd = db.prepare("SELECT value FROM settings WHERE key = 'user_password'").get();
  if (!userPwd) {
    // sha256 of 'user'
    const hash = crypto.createHash('sha256').update('user').digest('hex');
    db.prepare("INSERT INTO settings (key, value) VALUES ('user_password', ?)").run(hash);
  }

  const adminPwd = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get();
  if (!adminPwd) {
    // sha256 of 'admin'
    const hash = crypto.createHash('sha256').update('admin').digest('hex');
    db.prepare("INSERT INTO settings (key, value) VALUES ('admin_password', ?)").run(hash);
  }

  const scoresPwd = db.prepare("SELECT value FROM settings WHERE key = 'scores_password'").get();
  if (!scoresPwd) {
    // sha256 of 'scores'
    const hash = crypto.createHash('sha256').update('scores').digest('hex');
    db.prepare("INSERT INTO settings (key, value) VALUES ('scores_password', ?)").run(hash);
  }
} catch (e) {
  console.error('Failed to seed passwords', e);
}

export default db;
