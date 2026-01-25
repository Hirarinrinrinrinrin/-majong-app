
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'majong.db');
const db = new Database(dbPath);

console.log('Starting migration for events table constraint...');

try {
    const schema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='events'").get();
    console.log('Current schema:', schema?.sql);

    // Disable Foreign Keys for modification
    db.exec("PRAGMA foreign_keys = OFF;");

    db.exec("BEGIN TRANSACTION");

    // 1. Rename old table
    db.exec("ALTER TABLE events RENAME TO events_old");

    // 2. Create new table with correct constraints
    db.exec(`
        CREATE TABLE events (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            name TEXT,
            status TEXT DEFAULT 'finished',
            is_active INTEGER DEFAULT 0,
            UNIQUE(date, name)
        )
    `);

    // 3. Copy data
    const columns = db.prepare("PRAGMA table_info(events_old)").all().map(c => c.name);
    console.log('Existing columns:', columns);

    const hasName = columns.includes('name');
    const hasStatus = columns.includes('status');

    let fields = ['id', 'date', 'is_active'];
    let selectFields = ['id', 'date', 'is_active'];

    if (hasName) {
        fields.push('name');
        selectFields.push('name');
    }

    if (hasStatus) {
        fields.push('status');
        selectFields.push('status');
    } else {
        fields.push('status');
        selectFields.push("CASE WHEN is_active=1 THEN 'active' ELSE 'finished' END");
    }

    const insertSql = `INSERT INTO events (${fields.join(', ')}) SELECT ${selectFields.join(', ')} FROM events_old`;
    console.log('Migrating data:', insertSql);
    db.exec(insertSql);

    // 4. Drop old table
    db.exec("DROP TABLE events_old");

    db.exec("COMMIT");

    // Check constraint validity (optional but good)
    db.exec("PRAGMA foreign_key_check;");

    console.log('Migration completed successfully.');

} catch (error) {
    if (db.inTransaction) db.exec("ROLLBACK");
    console.error('Migration failed:', error);
    process.exit(1);
}
