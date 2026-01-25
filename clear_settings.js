const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.cwd(), 'majong.db');
const db = new Database(dbPath);

console.log('--- Before ---');
console.log('Settings:', db.prepare("SELECT * FROM settings").all());
console.log('Events:', db.prepare("SELECT * FROM events").all());

db.prepare("DELETE FROM settings WHERE key = 'current_fiscal_year'").run();

// Ensure no zombie events from my testing if any (though I used non-existent ID)
// But just in case
// db.prepare("DELETE FROM events").run(); 

console.log('--- After ---');
console.log('Settings:', db.prepare("SELECT * FROM settings").all());
