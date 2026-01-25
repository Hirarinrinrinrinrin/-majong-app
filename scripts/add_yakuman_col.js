
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database('majong.db');

console.log('Adding yakuman columns...');

try {
    const columns = ['player_1_yakuman', 'player_2_yakuman', 'player_3_yakuman', 'player_4_yakuman'];

    columns.forEach(col => {
        try {
            db.exec(`ALTER TABLE scores ADD COLUMN ${col} INTEGER DEFAULT 0`);
            console.log(`Added ${col}`);
        } catch (e) {
            console.log(`${col} might already exist or failed: ${e.message}`);
        }
    });

    console.log('Done.');
} catch (e) {
    console.error(e);
}
