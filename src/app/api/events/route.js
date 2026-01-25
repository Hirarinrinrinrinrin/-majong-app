
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const status = searchParams.get('status');
    const years = searchParams.get('years');

    try {
        if (years === 'true') {
            // Get min and max dates
            const result = db.prepare("SELECT MIN(date) as minDate, MAX(date) as maxDate FROM events").get();
            if (!result.minDate) return NextResponse.json([]);

            const minYear = new Date(result.minDate).getFullYear();
            const maxYear = new Date().getFullYear() + 1; // Allow viewing next year
            const yearList = [];

            // Calculate fiscal years.
            // If date is 2024-03-31, it's 2023 FY.
            // If date is 2024-04-01, it's 2024 FY.
            // We just need a range of years to display.

            // Simple approach: minYear-1 to maxYear
            for (let y = minYear - 1; y <= maxYear; y++) {
                yearList.push(y);
            }

            // Filter years that actually have data? Or just distinct fiscal years?
            // Let's do distinct fiscal years from DB to be precise
            const dates = db.prepare("SELECT date FROM events").all();
            const fiscalYears = new Set();
            dates.forEach(d => {
                const date = new Date(d.date);
                const year = date.getFullYear();
                const month = date.getMonth() + 1;
                const fy = month < 4 ? year - 1 : year;
                fiscalYears.add(fy);
            });
            // Also ensure current FY is always available
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth() + 1;
            const currentFY = currentMonth < 4 ? currentYear - 1 : currentYear;
            fiscalYears.add(currentFY);

            return NextResponse.json(Array.from(fiscalYears).sort((a, b) => b - a));
        }

        if (active === 'true') {
            const event = db.prepare("SELECT * FROM events WHERE status = 'active' LIMIT 1").get();
            return NextResponse.json(event || null);
        }

        if (status) {
            const events = db.prepare("SELECT * FROM events WHERE status = ? ORDER BY date DESC").all(status);
            return NextResponse.json(events);
        }

        // Default: return all events
        const events = db.prepare('SELECT * FROM events ORDER BY date DESC').all();
        return NextResponse.json(events);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const { date, name } = await request.json();
        const id = uuidv4();

        if (!date) return NextResponse.json({ error: 'Date is required' }, { status: 400 });
        // name is optional? User says "Event Name / Date". Assume both can be input.

        // Check duplicates for (date, name)
        // If name is empty, uniqueness on date? "Same day duplication OK (but name+date double dup NG)"
        // This implies name is important discriminator.

        try {
            const stmt = db.prepare("INSERT INTO events (id, date, name, status, is_active) VALUES (?, ?, ?, 'scheduled', 0)");
            stmt.run(id, date, name ? name.trim() : '');
        } catch (e) {
            if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return NextResponse.json({ error: '同日・同名のイベントは既に登録されています。' }, { status: 409 });
            }
            throw e;
        }

        return NextResponse.json({ success: true, id });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const { id, status } = await request.json();

        if (status === 'active') {
            const trans = db.transaction(() => {
                // Deactivate currently active event if any? 
                // "Select from registered to hold". 
                // Usually ensures only one active.
                db.prepare("UPDATE events SET status = 'finished', is_active = 0 WHERE status = 'active'").run();
                db.prepare("UPDATE events SET status = 'active', is_active = 1 WHERE id = ?").run(id);
            });
            trans();
        } else if (status === 'finished') {
            db.prepare("UPDATE events SET status = 'finished', is_active = 0 WHERE id = ?").run(id);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { id } = await request.json();
        // Only allow deleting scheduled events? 
        // User "Delete the said event from 'Event Registration'" - implied after finalization, but also maybe manual delete?
        // Standard DELETE for cleanup.

        const info = db.prepare("DELETE FROM events WHERE id = ? AND status = 'scheduled'").run(id);
        if (info.changes === 0) {
            return NextResponse.json({ error: 'Event not found or not scheduled' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
