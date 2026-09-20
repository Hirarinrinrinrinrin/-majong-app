import { NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';

export async function POST(request) {
    try {
        const body = await request.json();
        const { type, password } = body;

        if (!type || !password) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
        }

        const inputHash = crypto.createHash('sha256').update(password).digest('hex');

        // Fetch stored password
        const passwordKeys = { admin: 'admin_password', user: 'user_password', scores: 'scores_password' };
        const key = passwordKeys[type];
        if (!key) {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }
        const stored = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);

        if (!stored || stored.value !== inputHash) {
            return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
        }

        const response = NextResponse.json({ success: true });

        // Set Cookie
        // User: 24h, Admin: Session (expires on close, or short lived?)
        // Requirement: "User side ... 24 hours not required. Admin ... every time."
        // "Admin every time" usually means session cookie that dies when browser closes.

        if (type === 'user') {
            const oneDay = 24 * 60 * 60 * 1000;
            response.cookies.set('auth_user_session', 'true', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: oneDay / 1000 // maxAge is in seconds for cookie options usually? NextJS cookies set uses maxAge in seconds
            });
        } else if (type === 'admin') {
            // No maxAge -> Session cookie
            response.cookies.set('auth_admin_session', 'true', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                // No maxAge
            });
        } else if (type === 'scores') {
            // Read-only score viewing link: long-lived so shared URLs stay usable without re-login
            const thirtyDays = 30 * 24 * 60 * 60;
            response.cookies.set('auth_scores_session', 'true', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: thirtyDays
            });
        }

        return response;

    } catch (error) {
        console.error('Login Error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
