
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database('majong.db');

console.log('--- Tables ---');
const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all();
tables.forEach(t => console.log(t.name, t.sql));

console.log('--- Triggers ---');
const triggers = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='trigger'").all();
triggers.forEach(t => console.log(t.name, t.sql));

console.log('--- Foreign Keys ---');
const fks = db.prepare("PRAGMA foreign_key_list(scores)").all();
console.log('Scores FK:', fks);
