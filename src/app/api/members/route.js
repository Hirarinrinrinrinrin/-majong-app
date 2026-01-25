
import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const members = db.prepare('SELECT * FROM members ORDER BY id ASC').all();
        return NextResponse.json(members);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { name } = await request.json();

        if (!name || name.trim() === '') {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const stmt = db.prepare('INSERT INTO members (name) VALUES (?)');
        const info = stmt.run(name.trim());

        return NextResponse.json({ success: true, id: info.lastInsertRowid, name: name.trim() });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const { id, name } = await request.json();

        if (!id || !name || name.trim() === '') {
            return NextResponse.json({ error: 'ID and Name are required' }, { status: 400 });
        }

        const stmt = db.prepare('UPDATE members SET name = ? WHERE id = ?');
        const info = stmt.run(name.trim(), id);

        if (info.changes === 0) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { id } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const stmt = db.prepare('DELETE FROM members WHERE id = ?');
        const info = stmt.run(id);

        if (info.changes === 0) {
            return NextResponse.json({ error: 'Member not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
