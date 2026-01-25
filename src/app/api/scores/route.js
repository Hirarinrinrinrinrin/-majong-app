
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    try {
        const body = await request.json();
        const { event_id, players } = body;
        console.log(`[API] POST /scores - Event: ${event_id}, Players:`, players);

        // Pre-check: Verify event exists and is active/scheduled (just existence is strictly needed for FK, but status check is good practice)
        // Just checking existence is enough to prevent 500.
        const event = db.prepare('SELECT id FROM events WHERE id = ?').get(event_id);
        if (!event) {
            console.warn(`[API] Event not found: ${event_id}`);
            return NextResponse.json({
                error: '開催中のイベントが見つかりません。画面を再読み込みしてください。'
            }, { status: 404 });
        }

        const id = uuidv4();

        const stmt = db.prepare(`
      INSERT INTO scores (
        id, event_id, 
        player_1_name, player_1_score, player_1_raw_score, player_1_yakuman,
        player_2_name, player_2_score, player_2_raw_score, player_2_yakuman,
        player_3_name, player_3_score, player_3_raw_score, player_3_yakuman,
        player_4_name, player_4_score, player_4_raw_score, player_4_yakuman
      ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, 0, ?, ?, ?, 0, ?, ?, ?, 0)
    `);

        const info = stmt.run(
            id, event_id,
            players[0].name, players[0].score, players[0].raw_score || null,
            players[1].name, players[1].score, players[1].raw_score || null,
            players[2].name, players[2].score, players[2].raw_score || null,
            players[3].name, players[3].score, players[3].raw_score || null
        );
        console.log(`[API] Score inserted: ${id}, Changes: ${info.changes}`);

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error('API Error:', error);
        if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
            return NextResponse.json({
                error: '開催中のイベントが見つかりません（削除された可能性があります）。画面を再読み込みしてください。'
            }, { status: 404 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { id, updates } = body;
        console.log(`[API] PUT /scores - ID: ${id}, Updates:`, updates);

        if (!id || !updates) {
            return NextResponse.json({ error: 'ID and updates required' }, { status: 400 });
        }

        const setClauses = [];
        const values = [];

        Object.keys(updates).forEach(key => {
            if (['player_1_yakuman', 'player_2_yakuman', 'player_3_yakuman', 'player_4_yakuman'].includes(key)) {
                setClauses.push(`${key} = ?`);
                values.push(updates[key]);
            }
        });

        if (setClauses.length === 0) {
            return NextResponse.json({ success: true }); // No valid updates
        }

        values.push(id);

        const stmt = db.prepare(`UPDATE scores SET ${setClauses.join(', ')} WHERE id = ?`);
        const info = stmt.run(...values);
        console.log(`[API] Score updated. Changes: ${info.changes}`);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const event_id = searchParams.get('event_id');
    const type = searchParams.get('type');
    const year = searchParams.get('year') || new Date().getFullYear();

    console.log(`[API] GET /scores - Type: ${type}, EventID: ${event_id}`);

    try {
        // Fiscal Year Logic: April 1st to March 31st of next year
        const startDate = `${year}-04-01`;
        const endDate = `${parseInt(year) + 1}-03-31`;

        if (type === 'yearly') {
            const scores = db.prepare(`
                    SELECT 
                        p_name as name, 
                        SUM(p_score) as total,
                        SUM(p_yakuman) as yakuman,
                        json_group_array(json_object('rank', rank, 'score', p_score, 'raw_score', p_raw_score, 'date', e.date)) as history
                    FROM (
                        SELECT event_id, player_1_name as p_name, player_1_score as p_score, player_1_raw_score as p_raw_score, player_1_yakuman as p_yakuman, 1 as rank FROM scores
                        UNION ALL
                        SELECT event_id, player_2_name as p_name, player_2_score as p_score, player_2_raw_score as p_raw_score, player_2_yakuman as p_yakuman, 2 as rank FROM scores
                        UNION ALL
                        SELECT event_id, player_3_name as p_name, player_3_score as p_score, player_3_raw_score as p_raw_score, player_3_yakuman as p_yakuman, 3 as rank FROM scores
                        UNION ALL
                        SELECT event_id, player_4_name as p_name, player_4_score as p_score, player_4_raw_score as p_raw_score, player_4_yakuman as p_yakuman, 4 as rank FROM scores
                    ) s
                    JOIN events e ON s.event_id = e.id
                    WHERE e.date BETWEEN ? AND ? AND e.is_active = 0
                    GROUP BY p_name
                    ORDER BY total DESC
                `).all(startDate, endDate);

            const parsedScores = scores.map(s => ({
                ...s,
                history: JSON.parse(s.history).sort((a, b) => new Date(b.date) - new Date(a.date))
            }));

            return NextResponse.json(parsedScores);
        }

        if (type === 'yearly_events') {
            const events = db.prepare(`
                    SELECT 
                        e.id, 
                        e.date,
                        json_group_array(json_object(
                            'submitted_at', s.submitted_at,
                            'player_1_name', s.player_1_name, 'player_1_score', s.player_1_score, 'player_1_yakuman', s.player_1_yakuman,
                            'player_2_name', s.player_2_name, 'player_2_score', s.player_2_score, 'player_2_yakuman', s.player_2_yakuman,
                            'player_3_name', s.player_3_name, 'player_3_score', s.player_3_score, 'player_3_yakuman', s.player_3_yakuman,
                            'player_4_name', s.player_4_name, 'player_4_score', s.player_4_score, 'player_4_yakuman', s.player_4_yakuman
                        )) as matches
                    FROM events e
                    LEFT JOIN scores s ON e.id = s.event_id
                    WHERE e.date BETWEEN ? AND ? AND e.is_active = 0
                    GROUP BY e.id
                    ORDER BY e.date DESC
                `).all(startDate, endDate);

            const result = events.map(event => {
                let matches = JSON.parse(event.matches).filter(m => m.player_1_name);
                matches.sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));

                const playerScores = {};
                const playerHistory = {};
                const playerYakuman = {};

                matches.forEach(match => {
                    const gamePlayers = [
                        { name: match.player_1_name, score: match.player_1_score },
                        { name: match.player_2_name, score: match.player_2_score },
                        { name: match.player_3_name, score: match.player_3_score },
                        { name: match.player_4_name, score: match.player_4_score }
                    ].sort((a, b) => b.score - a.score);

                    [1, 2, 3, 4].forEach(i => {
                        const name = match[`player_${i}_name`];
                        const yakuman = match[`player_${i}_yakuman`] || 0;
                        if (name) {
                            playerYakuman[name] = (playerYakuman[name] || 0) + yakuman;
                        }
                    });

                    gamePlayers.forEach((p, rankIndex) => {
                        if (p.name) {
                            playerScores[p.name] = (playerScores[p.name] || 0) + p.score;
                            if (!playerHistory[p.name]) playerHistory[p.name] = [];
                            playerHistory[p.name].push({ rank: rankIndex + 1, score: p.score });
                        }
                    });
                });

                const rankings = Object.entries(playerScores)
                    .map(([name, score]) => ({
                        name,
                        score,
                        yakuman: playerYakuman[name] || 0,
                        history: playerHistory[name]
                    }))
                    .sort((a, b) => b.score - a.score)
                    .map((p, i) => ({ ...p, rank: i + 1 }));

                return {
                    id: event.id,
                    date: event.date,
                    rankings
                };
            });

            return NextResponse.json(result);
        }

        if (event_id) {
            const scores = db.prepare('SELECT * FROM scores WHERE event_id = ? ORDER BY submitted_at DESC').all(event_id);
            console.log(`[API] Found ${scores.length} scores for EventID: ${event_id}`);
            return NextResponse.json(scores);
        }

        return NextResponse.json([]);
    } catch (error) {
        console.error('API Error:', error);
        console.error('Error Stack:', error.stack);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
export async function DELETE(request) {
    try {
        const body = await request.json();
        const { id } = body;
        console.log(`[API] DELETE /scores - ID: ${id}`);

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const stmt = db.prepare("DELETE FROM scores WHERE id = ?");
        const info = stmt.run(id);

        if (info.changes === 0) {
            return NextResponse.json({ error: 'Score not found' }, { status: 404 });
        }

        console.log(`[API] Score deleted. Changes: ${info.changes}`);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
