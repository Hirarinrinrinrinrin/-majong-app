
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database('majong.db');

try {
    db.exec("PRAGMA foreign_keys = OFF;");
    db.exec("BEGIN TRANSACTION");

    const scoresSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='scores'").get().sql;
    console.log('Original SQL:', scoresSql);

    // If the schema references events_old, we must recreate the table
    if (scoresSql.includes('events_old')) {
        console.log('Detected reference to events_old. Recreating scores table...');

        db.exec("ALTER TABLE scores RENAME TO scores_old");

        db.exec(`
          CREATE TABLE scores (
            id TEXT PRIMARY KEY,
            event_id TEXT NOT NULL,
            player_1_name TEXT NOT NULL,
            player_1_score INTEGER NOT NULL,
            player_2_name TEXT NOT NULL,
            player_2_score INTEGER NOT NULL,
            player_3_name TEXT NOT NULL,
            player_3_score INTEGER NOT NULL,
            player_4_name TEXT NOT NULL,
            player_4_score INTEGER NOT NULL,
            submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(event_id) REFERENCES events(id)
          );
        `);

        db.exec("INSERT INTO scores SELECT * FROM scores_old");
        db.exec("DROP TABLE scores_old");
    }

    db.exec("COMMIT");
    console.log('Done.');
} catch (e) {
    console.error(e);
    if (db.inTransaction) db.exec("ROLLBACK");
}
