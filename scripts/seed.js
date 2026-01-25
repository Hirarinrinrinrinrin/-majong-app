
const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(process.cwd(), 'majong.db');
const db = new Database(dbPath);

const today = new Date().toISOString().split('T')[0];
const id = uuidv4();

try {
    db.prepare('CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, date TEXT NOT NULL UNIQUE, is_active INTEGER DEFAULT 0)').run();

    // Deactivate others
    db.prepare('UPDATE events SET is_active = 0').run();

    // Insert today
    try {
        db.prepare('INSERT INTO events (id, date, is_active) VALUES (?, ?, 1)').run(id, today);
        console.log('Created active event for', today);
    } catch (e) {
        if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            console.log('Event for today already exists, setting to active.');
            db.prepare('UPDATE events SET is_active = 1 WHERE date = ?').run(today);
        } else {
            throw e;
        }
    }
} catch (error) {
    console.error('Seeding failed:', error);
}
