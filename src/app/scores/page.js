'use client';

import { useState, useEffect } from 'react';

// Read-only score viewer for members. Shows only finished events + cumulative
// totals — the active (in-progress) event is intentionally never fetched here.
// Reuses the same /api/scores endpoints the admin "年間成績レポート" tab uses;
// those already exclude the active event via `is_active = 0`.

export default function ScoresPage() {
    const [loading, setLoading] = useState(true);
    const [fiscalYear, setFiscalYear] = useState(null);
    const [availableYears, setAvailableYears] = useState([]);
    const [subTab, setSubTab] = useState('ranking'); // 'ranking' or 'archive'
    const [rankingType, setRankingType] = useState('total');
    const [yearlyRanking, setYearlyRanking] = useState([]);
    const [yearlyEvents, setYearlyEvents] = useState([]);

    const init = async () => {
        setLoading(true);
        try {
            const [settingsRes, yearsRes] = await Promise.all([
                fetch('/api/settings'),
                fetch('/api/events?years=true')
            ]);
            const settings = await settingsRes.json();
            const years = await yearsRes.json();
            setAvailableYears(years || []);

            let fy = settings.current_fiscal_year;
            if (!fy) {
                const d = new Date();
                fy = d.getMonth() < 3 ? d.getFullYear() - 1 : d.getFullYear();
            }
            setFiscalYear(fy);
            await loadYear(fy);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    useEffect(() => {
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadYear = async (year) => {
        const [rankingRes, eventsRes] = await Promise.all([
            fetch(`/api/scores?type=yearly&year=${year}`),
            fetch(`/api/scores?type=yearly_events&year=${year}`)
        ]);
        setYearlyRanking(await rankingRes.json());
        setYearlyEvents(await eventsRes.json());
    };

    const handleYearChange = async (y) => {
        setFiscalYear(y);
        setLoading(true);
        await loadYear(y);
        setLoading(false);
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/scores/login';
    };

    // Reusable ranking table (mirrors the admin dashboard's cumulative/archive views)
    const RankingTable = ({ data, emptyMessage, mode = 'archive' }) => (
        <div className="overflow-x-auto border-t border-b border-gray-200 mb-8">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">順位</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">プレイヤー名</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">トータルスコア</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">役満</th>
                        {mode === 'cumulative' ? (
                            <>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">1位</th>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">2位</th>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">3位</th>
                                <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">4位</th>
                            </>
                        ) : (
                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">推移 (履歴)</th>
                        )}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                    {data.map((player, index) => {
                        let stats = [0, 0, 0, 0];
                        let totalGames = 0;
                        if (mode === 'cumulative' && player.history) {
                            totalGames = player.history.length;
                            player.history.forEach(h => {
                                if (h.rank >= 1 && h.rank <= 4) stats[h.rank - 1]++;
                            });
                        }

                        return (
                            <tr key={player.name} className="hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-4">
                                    <span className={`
                                    inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold
                                    ${index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                            index === 1 ? 'bg-gray-100 text-gray-800' :
                                                index === 2 ? 'bg-orange-100 text-orange-800' :
                                                    'text-gray-500'}
                                `}>
                                        {index + 1}
                                    </span>
                                </td>
                                <td className="py-3 px-4">
                                    <span className="font-medium text-gray-900">{player.name}</span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <span className={`font-mono font-medium ${player.total > 0 ? 'text-green-600' : player.total < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                                        {player.total > 0 ? '+' : ''}{player.total}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                    {player.yakuman > 0 ? (
                                        <span className="inline-flex items-center justify-center bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded">
                                            🀄 {player.yakuman}
                                        </span>
                                    ) : (
                                        <span className="text-gray-300">-</span>
                                    )}
                                </td>
                                {mode === 'cumulative' ? (
                                    [0, 1, 2, 3].map(i => (
                                        <td key={i} className="py-3 px-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-sm font-semibold text-gray-700">{stats[i]}</span>
                                                <span className="text-[10px] text-gray-400">
                                                    {totalGames > 0 ? ((stats[i] / totalGames) * 100).toFixed(1) + '%' : '0%'}
                                                </span>
                                            </div>
                                        </td>
                                    ))
                                ) : (
                                    <td className="py-3 px-4">
                                        <div className="flex flex-wrap gap-2">
                                            {player.history?.map((h, i) => (
                                                <div key={i} className="text-xs flex items-center gap-1 text-gray-500">
                                                    <span className="text-gray-400">{h.rank}位</span>
                                                    <span className={h.score > 0 ? 'text-green-600' : h.score < 0 ? 'text-red-600' : ''}>
                                                        {h.score > 0 ? '+' : ''}{h.score}
                                                    </span>
                                                    {i < player.history.length - 1 && <span className="text-gray-300">/</span>}
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                    {data.length === 0 && (
                        <tr>
                            <td colSpan={mode === 'cumulative' ? 8 : 5} className="py-8 text-center text-gray-400 text-sm">{emptyMessage}</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-gray-500 font-sans">読み込み中...</div>;
    }

    return (
        <main className="min-h-screen bg-[#f3f4f6] font-sans">
            <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
                    <h1 className="text-lg font-bold text-[#004d80]">MAHJONG SCORE VIEWER</h1>
                    <div className="flex items-center gap-3">
                        <select
                            value={fiscalYear || ''}
                            onChange={(e) => handleYearChange(Number(e.target.value))}
                            className="text-xs border-gray-300 rounded shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                        >
                            {Array.from(new Set([...availableYears, fiscalYear])).sort((a, b) => b - a).map(y => (
                                <option key={y} value={y}>{y}年度</option>
                            ))}
                        </select>
                        <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-gray-600 underline">
                            ログアウト
                        </button>
                    </div>
                </div>
                <div className="max-w-5xl mx-auto px-4 sm:px-8 pb-3 flex gap-2">
                    <button
                        onClick={() => setSubTab('ranking')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${subTab === 'ranking' ? 'bg-[#004d80] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        累計ランキング
                    </button>
                    <button
                        onClick={() => setSubTab('archive')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${subTab === 'archive' ? 'bg-[#004d80] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        開催別アーカイブ
                    </button>
                </div>
            </header>

            <div className="max-w-5xl mx-auto p-4 sm:p-8">
                {subTab === 'ranking' && (
                    <section className="animate-fade-in bg-white p-6 border border-gray-200 rounded shadow-sm">
                        <div className="mb-6 text-center">
                            <h2 className="text-xl font-bold text-gray-900">{fiscalYear}年度 累計ランキング</h2>
                            <p className="text-sm text-gray-500 mt-1">集計対象: {yearlyRanking.length}名</p>
                        </div>

                        <div className="flex justify-center mb-6">
                            <div className="flex bg-gray-200 p-1 rounded overflow-x-auto max-w-full no-scrollbar">
                                <div className="flex space-x-1 min-w-max">
                                    {[
                                        { id: 'total', label: 'トータル' },
                                        { id: 'best_score', label: '最高打点' },
                                        { id: 'avoidance_rate', label: 'ラス回避率' },
                                        { id: 'most_wins', label: '最多勝' }
                                    ].map(type => (
                                        <button
                                            key={type.id}
                                            onClick={() => setRankingType(type.id)}
                                            className={`px-3 py-1 text-xs font-medium rounded transition-all ${rankingType === type.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {rankingType === 'total' && (
                            <RankingTable data={yearlyRanking} emptyMessage="データがまだありません。" mode="cumulative" />
                        )}

                        {rankingType === 'best_score' && (
                            <div className="overflow-x-auto border-t border-b border-gray-200 mb-8">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50">
                                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 w-16">順位</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-gray-500">プレイヤー名</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 text-right">打点</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 text-right">対局日</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const allGames = [];
                                            yearlyRanking.forEach(p => {
                                                if (p.history) {
                                                    p.history.forEach(h => {
                                                        const score = h.raw_score !== undefined && h.raw_score !== null ? h.raw_score : h.score;
                                                        const isRaw = h.raw_score !== undefined && h.raw_score !== null;
                                                        allGames.push({ name: p.name, score, date: h.date, isRaw });
                                                    });
                                                }
                                            });
                                            const sorted = allGames.sort((a, b) => b.score - a.score);

                                            const bestScores = [];
                                            const seenPlayers = new Set();
                                            for (const game of sorted) {
                                                if (!seenPlayers.has(game.name)) {
                                                    bestScores.push(game);
                                                    seenPlayers.add(game.name);
                                                }
                                            }

                                            if (bestScores.length === 0) return <tr><td colSpan="4" className="p-8 text-center text-sm text-gray-400">データがありません</td></tr>;

                                            return bestScores.map((game, i) => (
                                                <tr key={i} className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
                                                    <td className="py-3 px-4 text-sm font-mono text-gray-500">{i + 1}</td>
                                                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{game.name}</td>
                                                    <td className={`py-3 px-4 text-sm font-mono font-bold text-right ${game.isRaw ? 'text-gray-800' : 'text-green-600'}`}>
                                                        {game.isRaw ? game.score.toLocaleString() : (game.score > 0 ? '+' + game.score : game.score)}
                                                    </td>
                                                    <td className="py-3 px-4 text-sm text-gray-500 text-right">{game.date}</td>
                                                </tr>
                                            ));
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {rankingType === 'avoidance_rate' && (
                            <div className="overflow-x-auto border-t border-b border-gray-200 mb-8">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50">
                                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 w-16">順位</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-gray-500">プレイヤー名</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 text-right">ラス回避率</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 text-right">対局数</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const stats = yearlyRanking.map(p => {
                                                const games = p.history || [];
                                                const total = games.length;
                                                const fourths = games.filter(g => g.rank === 4).length;
                                                const rate = total > 0 ? ((total - fourths) / total) : 0;
                                                const latestDate = games.length > 0 ? games[0].date : '-';
                                                return { name: p.name, rate, total, date: latestDate };
                                            }).filter(p => p.total > 0).sort((a, b) => {
                                                if (b.rate !== a.rate) return b.rate - a.rate;
                                                return b.total - a.total;
                                            });

                                            if (stats.length === 0) return <tr><td colSpan="4" className="p-8 text-center text-sm text-gray-400">データがありません</td></tr>;

                                            return stats.map((stat, i) => (
                                                <tr key={i} className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
                                                    <td className="py-3 px-4 text-sm font-mono text-gray-500">{i + 1}</td>
                                                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{stat.name}</td>
                                                    <td className="py-3 px-4 text-sm font-mono font-bold text-blue-600 text-right">{(stat.rate * 100).toFixed(1)}%</td>
                                                    <td className="py-3 px-4 text-sm text-gray-500 text-right">{stat.date} (計{stat.total}戦)</td>
                                                </tr>
                                            ));
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {rankingType === 'most_wins' && (
                            <div className="overflow-x-auto border-t border-b border-gray-200 mb-8">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-200 bg-gray-50">
                                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 w-16">順位</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-gray-500">プレイヤー名</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 text-right">1位回数</th>
                                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 text-right">最新勝利日</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const stats = yearlyRanking.map(p => {
                                                const games = p.history || [];
                                                const wins = games.filter(g => g.rank === 1);
                                                const count = wins.length;
                                                const latestWin = wins.length > 0 ? wins[0].date : '-';
                                                return { name: p.name, count, date: latestWin };
                                            }).filter(p => p.count > 0).sort((a, b) => b.count - a.count).slice(0, 5);

                                            if (stats.length === 0) return <tr><td colSpan="4" className="p-8 text-center text-sm text-gray-400">データがありません</td></tr>;

                                            return stats.map((stat, i) => (
                                                <tr key={i} className="hover:bg-gray-50 border-b border-gray-100 last:border-0">
                                                    <td className="py-3 px-4 text-sm font-mono text-gray-500">{i + 1}</td>
                                                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{stat.name}</td>
                                                    <td className="py-3 px-4 text-sm font-mono font-bold text-yellow-600 text-right">{stat.count}勝</td>
                                                    <td className="py-3 px-4 text-sm text-gray-500 text-right">{stat.date}</td>
                                                </tr>
                                            ));
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div className="p-4 bg-blue-50 border border-blue-100 rounded text-xs text-blue-700 flex gap-2">
                            <span className="font-bold">Note:</span>
                            <span>このランキングは「集計済（終了済み）」のイベントスコアのみを集計対象としています。現在開催中のイベントスコアは含まれません。</span>
                        </div>
                    </section>
                )}

                {subTab === 'archive' && (
                    <section className="animate-fade-in space-y-8">
                        {yearlyEvents.length > 0 ? (
                            yearlyEvents.map((event) => (
                                <div key={event.id} className="bg-white border border-gray-200 rounded shadow-sm">
                                    <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-200">
                                        <h3 className="font-bold text-gray-900 text-sm">
                                            📅 {event.date} {event.name && `- ${event.name}`}
                                        </h3>
                                    </div>
                                    <div className="p-0">
                                        <RankingTable
                                            data={event.rankings.map(r => ({ ...r, total: r.score }))}
                                            emptyMessage="データがありません。"
                                            mode="archive"
                                        />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 bg-white rounded border border-gray-200 border-dashed">
                                <p className="text-gray-400 text-sm">アーカイブが見つかりません。</p>
                            </div>
                        )}
                    </section>
                )}
            </div>
        </main>
    );
}
