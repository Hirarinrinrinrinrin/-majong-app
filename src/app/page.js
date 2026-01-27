'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([
    { name: '', score: '' },
    { name: '', score: '' },
    { name: '', score: '' },
    { name: '', score: '' },
  ]);
  const [error, setError] = useState('');
  const [calculated, setCalculated] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [members, setMembers] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/events?active=true').then(res => res.json()),
      fetch('/api/members').then(res => res.json())
    ])
      .then(([eventData, membersData]) => {
        setEvent(eventData);
        setMembers(membersData);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleInputChange = (index, field, value) => {
    const newPlayers = [...players];
    newPlayers[index][field] = value;
    setPlayers(newPlayers);
    setError('');
    setCalculated(null);
    setSuccess(false);
  };

  const validateAndCalculate = () => {
    // Basic Validation
    if (players.some(p => !p.name || p.score === '')) {
      setError('全員の名前と点数を入力してください。');
      return;
    }

    // Check for unregistered members
    const unregistered = players.filter(p => !members.some(m => m.name === p.name));
    if (unregistered.length > 0) {
      setError(`以下のプレイヤーは会員リストに存在しません: ${unregistered.map(p => p.name).join(', ')}`);
      return;
    }

    // Check for duplicate names
    const names = players.map(p => p.name);
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      setError('同じ名前のプレイヤーが重複して入力されています。');
      return;
    }

    const scores = players.map(p => parseInt(p.score, 10));
    const total = scores.reduce((a, b) => a + b, 0);

    if (total !== 100000) {
      setError(`点数の合計が100,000点ではありません。（現在: ${total}点 / 差: ${total - 100000}点）`);
      return;
    }

    const playersWithIndex = players.map((p, i) => ({ ...p, score: parseInt(p.score, 10), originalIndex: i }));

    // Sort descending
    playersWithIndex.sort((a, b) => b.score - a.score);

    // Assign Ranks and Calculate
    const calcResults = [...playersWithIndex];

    // Group by score to handle ties
    const groups = [];
    calcResults.forEach(p => {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup[0].score === p.score) {
        lastGroup.push(p);
      } else {
        groups.push([p]);
      }
    });

    const rankBases = { 0: null, 1: 25000, 2: 35000, 3: 40000 }; // 0-based index maps to Rank 1, 2, 3, 4
    let sumOthers = 0;
    let rankCounter = 0;
    let topGroup = null;

    groups.forEach(group => {
      const currentRankIndex = rankCounter;
      // rank is 1-based
      const rank = currentRankIndex + 1;

      // Check if this is the top group (containing index 0)
      if (currentRankIndex === 0) {
        topGroup = group;
        group.forEach(p => p.rank = 1);
      } else {
        // Calculate average base for this group
        // The group occupies indices from currentRankIndex to currentRankIndex + group.length - 1
        let baseSum = 0;
        for (let i = 0; i < group.length; i++) {
          const targetIndex = currentRankIndex + i; // 0=1st, 1=2nd, 2=3rd, 3=4th
          baseSum += (rankBases[targetIndex] || 0);
        }
        const avgBase = baseSum / group.length;

        // Calculate score for each member
        group.forEach(p => {
          p.rank = rank;
          // specific requirement: Math.ceil for rounding up 2nd-4th
          p.recalculated = Math.ceil((p.score - avgBase) / 1000);
          sumOthers += p.recalculated;
        });
      }

      rankCounter += group.length;
    });

    // Finalize Top Group
    if (topGroup) {
      const totalTopScore = -sumOthers;
      const count = topGroup.length;
      const baseTopScore = Math.floor(totalTopScore / count);
      const remainder = totalTopScore % count; // e.g. 51 % 2 = 1

      topGroup.forEach((p, i) => {
        // Distribute remainder to first players in list (random/ordered by input doesn't matter much for tie)
        p.recalculated = baseTopScore + (i < remainder ? 1 : 0);
      });
    }

    setCalculated(calcResults);
  };

  const handleSubmit = async () => {
    if (!calculated || !event) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_id: event.id,
          players: calculated.map(p => ({
            name: p.name,
            score: p.recalculated,
            raw_score: p.score
          }))
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || '送信に失敗しました (サーバーエラー)';
        } catch (e) {
          errorMessage = '送信に失敗しました (詳細不明: ' + res.status + ')';
          console.error('Response parsing failed:', errorText);
        }
        throw new Error(errorMessage);
      }

      setSuccess(true);
      setPlayers([
        { name: '', score: '' },
        { name: '', score: '' },
        { name: '', score: '' },
        { name: '', score: '' },
      ]);
      setCalculated(null);
    } catch (e) {
      console.error(e);
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500 font-sans">読み込み中...</div>;

  if (!event) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#f3f4f6] font-sans">
        <div className="glass-panel p-10 text-center max-w-md w-full border-t-4 border-[#004d80]">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <h1 className="text-xl font-bold mb-3 text-gray-900">本日の開催はありません</h1>
          <p className="text-gray-500 text-sm leading-relaxed">管理者によりイベントが作成されるのをお待ちください。</p>
          <div className="mt-8 text-center">
            <a href="/admin/login" className="text-xs text-blue-600 hover:underline">管理者メニュー</a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8 flex flex-col items-center justify-center relative bg-[#f3f4f6] font-sans">
      {/* Subtle Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-gray-100 pointer-events-none -z-10"></div>

      <div className="glass-panel w-full max-w-2xl p-6 md:p-10 animate-fade-in relative overflow-hidden shadow-xl">
        {/* Header Section */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3 text-[#004d80] tracking-tight">
            MAHJONG SCORE
          </h1>
          <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full border border-gray-200 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-sm font-semibold text-gray-600 tracking-wide">
              {event.date.replace(/-/g, '/')}
            </span>
          </div>
        </div>

        {success ? (
          <div className="text-center py-10 animate-fade-in">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-100">
              <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">送信完了！</h2>
            <p className="text-gray-500 mb-8">お疲れ様でした。次のゲームを始めましょう。</p>
            <button
              onClick={() => setSuccess(false)}
              className="btn-primary w-full md:w-auto min-w-[200px]"
            >
              続けて入力する
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-5 mb-10">
              {players.map((player, index) => {
                const datalistId = `member-list-${index}`;
                return (
                  <div key={index} className="flex gap-4 items-center animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="w-8 text-center font-bold text-gray-400 text-sm">
                      {index + 1}
                    </div>

                    {/* Datalist for this specific input */}
                    <datalist id={datalistId}>
                      {members.map(m => (
                        <option key={m.id} value={m.name} />
                      ))}
                    </datalist>

                    <input
                      type="text"
                      list={datalistId}
                      autoComplete="off"
                      placeholder="プレイヤー名"
                      value={player.name}
                      onChange={(e) => handleInputChange(index, 'name', e.target.value)}
                      className="input-field flex-1 transition-shadow focus:ring-2 focus:ring-blue-100"
                    />
                    <div className="relative w-36 md:w-40">
                      <button
                        tabIndex="-1"
                        onClick={() => {
                          const current = player.score.toString();
                          if (current.startsWith('-')) {
                            handleInputChange(index, 'score', current.substring(1));
                          } else {
                            handleInputChange(index, 'score', '-' + current);
                          }
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors font-bold z-10"
                      >
                        ±
                      </button>
                      <input
                        type="text"
                        inputMode="decimal"
                        pattern="[-0-9]*"
                        placeholder="点数"
                        value={player.score}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '' || /^-?\d*$/.test(val)) {
                            handleInputChange(index, 'score', val);
                          }
                        }}
                        className="input-field w-full text-right !pl-10 !pr-14 font-mono tracking-tight"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">点</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="p-4 mb-8 bg-red-50 border border-red-100 rounded-lg text-red-600 flex items-start gap-3 animate-fade-in text-sm">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {!calculated ? (
              <button
                onClick={validateAndCalculate}
                className="btn-primary w-full py-4 text-base shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                計算確認
              </button>
            ) : (
              <div className="space-y-8 animate-fade-in">
                <div className="relative py-2">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                  <div className="relative flex justify-center"><span className="bg-white px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Result</span></div>
                </div>

                <div className="space-y-3">
                  {calculated.map((p, i) => (
                    <div key={i} className="flex justify-between items-center p-5 rounded-lg bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className={`
                                            w-10 h-10 flex items-center justify-center rounded-full font-bold text-lg shadow-sm border
                                            ${p.rank === 1 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                            p.rank === 2 ? 'bg-gray-50 text-gray-700 border-gray-200' :
                              p.rank === 3 ? 'bg-orange-50 text-orange-800 border-orange-200' :
                                'bg-slate-50 text-slate-500 border-slate-200'}
                                        `}>
                          {p.rank}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 leading-tight">{p.name}</div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5">Score: {p.score.toLocaleString()}</div>
                        </div>
                      </div>
                      <div className={`text-2xl font-black font-mono tracking-tight ${p.recalculated > 0 ? 'text-green-600' : p.recalculated < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        {p.recalculated > 0 ? '+' : ''}{p.recalculated}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => setCalculated(null)}
                    className="btn-secondary w-1/3 shadow-sm hover:shadow"
                  >
                    修正
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="btn-primary flex-1 py-3 text-base shadow-md hover:shadow-lg transition-all"
                  >
                    {submitting ? '送信中...' : '確定して送信'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <footer className="mt-8 text-gray-400 text-xs text-center font-medium">
        &copy; {new Date().getFullYear()} Antigravity Mahjong Club
        <div className="mt-2">
          <a href="/admin/login" className="hover:text-gray-600 underline">管理者メニュー</a>
        </div>
      </footer>
    </main>
  );
}
