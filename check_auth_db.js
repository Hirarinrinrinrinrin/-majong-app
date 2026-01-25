const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.cwd(), 'majong.db');
const db = new Database(dbPath);

console.log('Checking passwords in settings table...');
const userPwd = db.prepare("SELECT value FROM settings WHERE key = 'user_password'").get();
const adminPwd = db.prepare("SELECT value FROM settings WHERE key = 'admin_password'").get();

console.log('User Password Hash:', userPwd ? userPwd.value : 'MISSING');
console.log('Admin Password Hash:', adminPwd ? adminPwd.value : 'MISSING');

// Check if they match SHA-256 of 'user' and 'admin'
const crypto = require('crypto');
const expectedUser = crypto.createHash('sha256').update('user').digest('hex');
const expectedAdmin = crypto.createHash('sha256').update('admin').digest('hex');

if (userPwd && userPwd.value === expectedUser) {
    console.log('User Password: CORRECT (default)');
} else {
    console.log('User Password: CUSTOM or INCORRECT');
}

if (adminPwd && adminPwd.value === expectedAdmin) {
    console.log('Admin Password: CORRECT (default)');
} else {
    console.log('Admin Password: CUSTOM or INCORRECT');
}
