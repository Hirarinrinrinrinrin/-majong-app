const fetch = require('node-fetch'); // Needs node-fetch or use native fetch in Node 18+

async function testLogin() {
    console.log('Testing User Login...');
    try {
        const resUser = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'user', password: 'user' })
        });

        if (resUser.ok) {
            console.log('User Login: SUCCESS');
            const cookies = resUser.headers.get('set-cookie');
            console.log('Set-Cookie:', cookies ? 'YES' : 'NO');
        } else {
            console.log('User Login: FAILED', resUser.status, await resUser.text());
        }
    } catch (e) {
        console.log('User Login Error:', e.message);
    }

    console.log('Testing Admin Login...');
    try {
        const resAdmin = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'admin', password: 'admin' })
        });

        if (resAdmin.ok) {
            console.log('Admin Login: SUCCESS');
        } else {
            console.log('Admin Login: FAILED', resAdmin.status, await resAdmin.text());
        }
    } catch (e) {
        console.log('Admin Login Error:', e.message);
    }
}

testLogin();
