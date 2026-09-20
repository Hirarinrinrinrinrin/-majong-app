import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const row = db.prepare("SELECT value FROM settings WHERE key = 'current_fiscal_year'").get();
        return NextResponse.json({
            current_fiscal_year: row ? parseInt(row.value, 10) : null
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { current_fiscal_year } = body;

        console.log('[API] POST /settings', { current_fiscal_year });

        if (current_fiscal_year) {
            db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('current_fiscal_year', ?)").run(String(current_fiscal_year));
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { action } = body;

        console.log('[API] PUT /settings', { action });

        if (action === 'update_password') {
            const { type, password } = body;
            if (!type || !password) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

            const passwordKeys = { admin: 'admin_password', user: 'user_password', scores: 'scores_password' };
            const key = passwordKeys[type];
            if (!key) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
            const crypto = require('crypto');
            const hash = crypto.createHash('sha256').update(password).digest('hex');

            db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, hash);
            return NextResponse.json({ success: true });
        }

        if (action === 'increment_fiscal_year') {
            const row = db.prepare("SELECT value FROM settings WHERE key = 'current_fiscal_year'").get();
            if (!row) {
                return NextResponse.json({ error: 'Fiscal year not set' }, { status: 400 });
            }
            const nextYear = parseInt(row.value, 10) + 1;
            db.prepare("UPDATE settings SET value = ? WHERE key = 'current_fiscal_year'").run(String(nextYear));
            return NextResponse.json({ success: true, new_fiscal_year: nextYear });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
