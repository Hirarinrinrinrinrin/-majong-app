
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'majong.db');
const db = new Database(dbPath);

try {
    console.log('Resetting data...');

    // Delete all scores
    db.prepare('DELETE FROM scores').run();
    console.log('Scores deleted.');

    // Delete all events
    db.prepare('DELETE FROM events').run();
    console.log('Events deleted.');

    // Members are PRESERVED (do not delete from members table)
    console.log('Members preserved.');

    console.log('Data reset complete.');

} catch (error) {
    console.error('Error resetting data:', error);
    process.exit(1);
}
