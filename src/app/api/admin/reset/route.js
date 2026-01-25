import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const body = await request.json();
        const { resetMembers, resetYears } = body;

        console.log('[API] POST /admin/reset', { resetMembers, resetYears });

        const transaction = db.transaction(() => {
            // 1. Reset Members
            if (resetMembers) {
                db.prepare('DELETE FROM members').run();
                console.log('[API] All members deleted.');
            }

            // 2. Reset Game Data by Fiscal Year
            if (resetYears && Array.isArray(resetYears) && resetYears.length > 0) {
                for (const year of resetYears) {
                    const startDate = `${year}-04-01`;
                    const endDate = `${parseInt(year) + 1}-03-31`;

                    // Find events in this range
                    const events = db.prepare('SELECT id FROM events WHERE date BETWEEN ? AND ?').all(startDate, endDate);

                    if (events.length > 0) {
                        const eventIds = events.map(e => e.id);
                        const placeholders = eventIds.map(() => '?').join(',');

                        // Delete scores for these events
                        db.prepare(`DELETE FROM scores WHERE event_id IN (${placeholders})`).run(...eventIds);

                        // Delete events
                        db.prepare(`DELETE FROM events WHERE id IN (${placeholders})`).run(...eventIds);

                        console.log(`[API] Deleted ${events.length} events and associated scores for FY ${year}`);
                    }
                }
            }

            // 3. Auto-reset Year Setting if no events remain
            if (resetYears && Array.isArray(resetYears) && resetYears.length > 0) {
                const remaining = db.prepare('SELECT count(*) as count FROM events').get();
                if (remaining.count === 0) {
                    db.prepare("DELETE FROM settings WHERE key = 'current_fiscal_year'").run();
                    console.log('[API] All events deleted. Reset fiscal year setting.');
                }
            }
        });

        transaction();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
