'use client';

import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { calculateGameScores } from '@/lib/scoring';

// SQLite's CURRENT_TIMESTAMP stores "YYYY-MM-DD HH:MM:SS" in UTC with no
// timezone suffix, so `new Date(...)` on it directly gets misread as local
// time. Mark it as UTC explicitly so it converts to the viewer's local time.
const formatSubmittedTime = (submittedAt) => {
    if (!submittedAt) return '';
    const utcIso = submittedAt.replace(' ', 'T') + 'Z';
    return new Date(utcIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Icons for the sidebar
const Icons = {
    Dashboard: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>,
    Chart: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>,
    Archive: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>,
    Users: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
    Settings: () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
};

export default function AdminDashboard() {
    // Initial state must be deterministic for hydration
    const [fiscalYear, setFiscalYear] = useState(null);
    const [currentRealYear, setCurrentRealYear] = useState(null);
    const [isClient, setIsClient] = useState(false);
    const [needInitialSetup, setNeedInitialSetup] = useState(false); // New state for initial setup

    const [activeTab, setActiveTab] = useState('active_event');
    const [events, setEvents] = useState([]);
    const [scheduledEvents, setScheduledEvents] = useState([]);
    const [activeEvent, setActiveEvent] = useState(null);
    const [activeEventScores, setActiveEventScores] = useState([]);
    const [yearlyRanking, setYearlyRanking] = useState([]);
    const [yearlyEvents, setYearlyEvents] = useState([]);
    const [yearlySubTab, setYearlySubTab] = useState('ranking'); // 'ranking' or 'archive'
    const [rankingType, setRankingType] = useState('total'); // 'total', 'best_score', 'avoidance_rate', 'most_wins'

    const [availableYears, setAvailableYears] = useState([]);

    // Event Registration State
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventName, setNewEventName] = useState('');

    // Yakuman Editing State
    const [editingGameId, setEditingGameId] = useState(null);
    const [editYakumanValues, setEditYakumanValues] = useState({});

    // Member Management State
    const [members, setMembers] = useState([]);
    const [newMemberName, setNewMemberName] = useState('');
    const [editingMember, setEditingMember] = useState(null);
    const [memberLoading, setMemberLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const [loading, setLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar state

    // History Detail State
    const [selectedHistoryEvent, setSelectedHistoryEvent] = useState(null);
    const [historyDetailScores, setHistoryDetailScores] = useState([]);
    const [historyDetailLoading, setHistoryDetailLoading] = useState(false);

    // Finished-event correction (requires separate "edit" password)
    const [editUnlocked, setEditUnlocked] = useState(false);
    const [editPasswordPrompt, setEditPasswordPrompt] = useState(false);
    const [editPasswordInput, setEditPasswordInput] = useState('');
    const [editPasswordError, setEditPasswordError] = useState('');
    const [editingHistoryGameId, setEditingHistoryGameId] = useState(null);
    const [editHistoryValues, setEditHistoryValues] = useState(null); // { player_1_name, player_1_raw_score, player_1_yakuman, ... }

    // Reset/Settings State
    const [resetMemberData, setResetMemberData] = useState(false);
    const [resetYears, setResetYears] = useState({}); // { 2024: true, 2025: false }

    useEffect(() => {
        const init = async () => {
            const d = new Date();
            setCurrentRealYear(d.getFullYear());
            setIsClient(true);

            await loadData();
        };
        init();
    }, []);

    // Also reload if fiscalYear changes via UI interaction (only after initial load)
    useEffect(() => {
        if (isClient && fiscalYear !== null) {
            // Check if we need to reload specifically for this year change
            // (loadData handles fetching dependent data)
            // We can skip if it's just the initial setting
            // But simpler to just allow re-fetch
        }
    }, [fiscalYear]);

    const loadData = async (targetFY = fiscalYear) => {
        setLoading(true);
        try {
            // 1. Fetch System Settings (Fiscal Year)
            const settingsRes = await fetch('/api/settings');
            const settings = await settingsRes.json();

            let currentFY = settings.current_fiscal_year;

            // If not set in DB, check if we have any events at all
            // If no events, it's a fresh install -> Need Setup
            // If events exist but no setting (migration case), imply from events or date
            if (currentFY === null) {
                const eventsRes = await fetch('/api/events');
                const eventsData = await eventsRes.json();
                if (eventsData && eventsData.length > 0) {
                    // Migration: Detect most recent fiscal year
                    const d = new Date();
                    currentFY = d.getMonth() < 3 ? d.getFullYear() - 1 : d.getFullYear();
                    // Savign it immediately might be aggressive, but let's just use it 
                    // OR should we force them to set it? 
                    // Let's assume for existing users, we default to calculated and don't force setup, 
                    // but maybe show a warning? For now, silence is golden for migration.
                } else {
                    // Truly fresh
                    setNeedInitialSetup(true);
                    // Set a default for the UI placeholder
                    const d = new Date();
                    currentFY = d.getMonth() < 3 ? d.getFullYear() - 1 : d.getFullYear();
                }
            }

            // Update state if we resolved a year (even if temporary/proposed)
            if (currentFY && fiscalYear !== currentFY) {
                setFiscalYear(currentFY);
            }

            const effectiveFY = targetFY || currentFY;

            const promises = [
                fetchActiveEvent(),
                fetchScheduledEvents(),
                fetchHistory(),
                fetchMembers(),
                fetchAvailableYears()
            ];

            if (effectiveFY) {
                promises.push(fetchYearlyRanking(effectiveFY));
                promises.push(fetchYearlyEvents(effectiveFY));
            }

            await Promise.all(promises);
        } catch (e) {
            console.error("Failed to load data", e);
        }
        setLoading(false);
    };

    const fetchAvailableYears = async () => {
        try {
            const res = await fetch('/api/events?years=true');
            const data = await res.json();
            setAvailableYears(data || []);
            return data || [];
        } catch (e) {
            console.error(e);
            return [];
        }
    };

    const fetchActiveEvent = async () => {
        try {
            const res = await fetch('/api/events?active=true');
            const data = await res.json();
            setActiveEvent(data && data.id ? data : null);
            if (data && data.id) {
                const scoresRes = await fetch(`/api/scores?event_id=${data.id}`);
                const scoresData = await scoresRes.json();
                setActiveEventScores(scoresData);
            } else {
                setActiveEventScores([]);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchScheduledEvents = async () => {
        try {
            const res = await fetch('/api/events?status=scheduled');
            const data = await res.json();
            setScheduledEvents(data);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchYearlyRanking = async (year = fiscalYear) => {
        try {
            const res = await fetch(`/api/scores?type=yearly&year=${year}`);
            const data = await res.json();
            setYearlyRanking(data);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchYearlyEvents = async (year = fiscalYear) => {
        try {
            const res = await fetch(`/api/scores?type=yearly_events&year=${year}`);
            const data = await res.json();
            setYearlyEvents(data);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchHistory = async () => {
        const res = await fetch('/api/events');
        const data = await res.json();
        setEvents(data);
    };

    const fetchMembers = async () => {
        try {
            const res = await fetch('/api/members');
            const data = await res.json();
            setMembers(data); // Assuming array of { id, name }
        } catch (e) {
            console.error(e);
        }
    };

    // --- Member Actions ---

    const addMember = async (e) => {
        e.preventDefault();
        if (!newMemberName.trim()) return;
        setMemberLoading(true);
        try {
            await fetch('/api/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newMemberName })
            });
            setNewMemberName('');
            await fetchMembers();
        } catch (err) {
            alert('登録に失敗しました');
        } finally {
            setMemberLoading(false);
        }
    };

    const deleteMember = async (id) => {
        if (!confirm('本当に削除しますか？')) return;
        try {
            const res = await fetch('/api/members', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (!res.ok) throw new Error('Failed');
            await fetchMembers();
        } catch (err) {
            alert('削除に失敗しました');
        }
    };

    const startEditMember = (member) => {
        setEditingMember({ ...member });
    };

    const saveEditMember = async () => {
        if (!editingMember || !editingMember.name.trim()) return;
        try {
            const res = await fetch('/api/members', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingMember.id, name: editingMember.name })
            });
            if (!res.ok) throw new Error('Failed');
            setEditingMember(null);
            await fetchMembers();
        } catch (err) {
            alert('更新に失敗しました');
        }
    };

    // --- Event Actions ---

    const registerEvent = async (e) => {
        e.preventDefault();
        if (!newEventDate) return;
        try {
            const res = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: newEventDate, name: newEventName })
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed');
            }
            setNewEventDate('');
            setNewEventName('');
            await loadData(); // refresh scheduled list
        } catch (err) {
            alert(err.message);
        }
    };

    const activateEvent = async (id, name, date) => {
        if (confirm(`${date} ${name || ''} を開催しますか？\n（現在開催中のイベントがある場合、それは終了扱いとなります）`)) {
            try {
                const res = await fetch('/api/events', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, status: 'active' })
                });
                if (!res.ok) throw new Error('Failed');
                await loadData();
            } catch (err) {
                alert('開催に失敗しました');
            }
        }
    };

    const deleteScheduledEvent = async (id) => {
        if (!confirm('イベント登録を削除しますか？')) return;
        try {
            const res = await fetch('/api/events', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (!res.ok) throw new Error('Failed');
            await loadData();
        } catch (err) {
            alert('削除に失敗しました');
        }
    };

    const finalizeEvent = async () => {
        if (!activeEvent) return;
        if (confirm('現在の開催を終了し、年度累計に反映させますか？\n（この操作は取り消せません）')) {
            await fetch('/api/events', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: activeEvent.id, status: 'finished' })
            });
            await loadData();
            setActiveTab('active_event'); // Stay on tab but show empty or registered
        }
    };

    // --- Fiscal Year Closing Logic ---
    const closeFiscalYear = async () => {
        if (!fiscalYear) return;
        const nextYear = fiscalYear + 1;

        if (confirm(`${fiscalYear}年度の集計を確定し、${nextYear}年度へ切り替えますか？\n\n・「${fiscalYear}年度」は過去ログに保存されます。\n・現在の「開催中イベント」は強制的に終了します（未終了の場合）。\n・${nextYear}年度の新しいスタートとなります。`)) {
            try {
                // Determine if there is an active event to force-finish?
                // The API implementation of increment_fiscal_year could ideally handle "closing" logic, 
                // but currently it just bumps the number. 
                // Let's ensure active event is finished first via Client logic or improve API later.
                if (activeEvent) {
                    await fetch('/api/events', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: activeEvent.id, status: 'finished' })
                    });
                }

                const res = await fetch('/api/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'increment_fiscal_year' })
                });

                if (!res.ok) throw new Error('Failed to increment year');

                const data = await res.json();
                setFiscalYear(data.new_fiscal_year);
                alert(`${fiscalYear}年度の締め作業が完了しました。\n${data.new_fiscal_year}年度へ切り替わりました。`);

                await loadData(data.new_fiscal_year);
            } catch (e) {
                console.error(e);
                alert('年度更新に失敗しました。');
            }
        }
    };

    // --- Initial Setup Action ---
    const saveInitialYear = async () => {
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ current_fiscal_year: fiscalYear }) // user selected or default
            });
            if (!res.ok) throw new Error('Failed');

            setNeedInitialSetup(false);
            alert('開始年度を設定しました。');
            await loadData(fiscalYear);
        } catch (e) {
            alert('設定保存に失敗しました');
        }
    };

    // --- Yakuman Editing ---

    const startEditYakuman = (game) => {
        setEditingGameId(game.id);
        const values = {};
        [1, 2, 3, 4].forEach(i => {
            values[`player_${i}_yakuman`] = game[`player_${i}_yakuman`] || 0;
        });
        setEditYakumanValues(values);
    };

    const cancelEditYakuman = () => {
        setEditingGameId(null);
        setEditYakumanValues({});
    };

    const saveEditYakuman = async () => {
        try {
            const res = await fetch('/api/scores', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingGameId, updates: editYakumanValues })
            });
            if (!res.ok) throw new Error('Failed');
            setEditingGameId(null);
            await fetchActiveEvent(); // Refresh only active event scores
        } catch (e) {
            alert('更新に失敗しました');
        }
    };

    // --- Password Management ---
    const changePassword = async (type, newPassword) => {
        if (!newPassword || newPassword.trim().length === 0) {
            alert('パスワードを入力してください');
            return;
        }
        const typeLabels = { user: '一般ユーザー', admin: '管理者', scores: 'スコア閲覧', edit: '終了済みデータ編集' };
        if (!confirm(`${typeLabels[type] || type}のパスワードを変更しますか？`)) return;

        try {
            const res = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_password', type, password: newPassword })
            });

            if (!res.ok) throw new Error('Failed');
            alert('パスワードを更新しました');
            // Clear input
            const inputIds = { user: 'new-user-pwd', admin: 'new-admin-pwd', scores: 'new-scores-pwd', edit: 'new-edit-pwd' };
            const inputId = inputIds[type];
            const input = document.getElementById(inputId);
            if (input) input.value = '';
        } catch (e) {
            alert('更新に失敗しました');
        }
    };

    // --- Reset / Initialization ---
    const executeReset = async () => {
        const yearsToDelete = Object.keys(resetYears).filter(y => resetYears[y]).map(Number);
        const hasMemberDelete = resetMemberData;

        if (yearsToDelete.length === 0 && !hasMemberDelete) {
            alert('初期化する対象が選択されていません。');
            return;
        }

        let confirmMsg = '以下のデータを完全に削除し、初期化します。\n\n';
        if (hasMemberDelete) confirmMsg += '・全ての会員データ\n';
        if (yearsToDelete.length > 0) confirmMsg += `・${yearsToDelete.join(', ')}年度の対局データ\n`;
        confirmMsg += '\n本当によろしいですか？\nこの操作は取り消せません。';

        if (!confirm(confirmMsg)) return;

        // Double check
        if (!confirm('【最終確認】\n本当に実行しますか？')) return;

        try {
            setLoading(true);
            const res = await fetch('/api/admin/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resetMembers: hasMemberDelete, resetYears: yearsToDelete })
            });

            if (!res.ok) throw new Error('Failed');

            alert('初期化が完了しました。');

            // Re-initialize state
            setResetMemberData(false);
            setResetYears({});

            // Reload EVERYTHING
            const d = new Date();
            const currentFY = d.getMonth() < 3 ? d.getFullYear() - 1 : d.getFullYear();
            setFiscalYear(currentFY);
            await loadData(currentFY);

        } catch (e) {
            console.error(e);
            alert('初期化に失敗しました。');
        } finally {
            setLoading(false);
        }
    };

    const deleteGame = async (id) => {
        if (!confirm('この対局ログを削除しますか？\n（この操作は取り消せません）')) return;
        try {
            const res = await fetch('/api/scores', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            if (!res.ok) throw new Error('Failed to delete');

            await fetchActiveEvent(); // Refresh data
        } catch (e) {
            alert('削除に失敗しました');
            console.error(e);
        }
    };

    // Helper: Calculate ranking from scores (Client-side)
    const calculateRanking = (scores) => {
        const ranking = {};
        [...scores].reverse().forEach(game => {
            ['player_1', 'player_2', 'player_3', 'player_4'].forEach((p, index) => {
                const name = game[`${p}_name`];
                const score = game[`${p}_score`];
                const yakuman = game[`${p}_yakuman`] || 0;
                const rank = index + 1;

                if (name) {
                    if (!ranking[name]) {
                        ranking[name] = { total: 0, yakuman: 0, history: [] };
                    }
                    ranking[name].total += score;
                    ranking[name].yakuman += yakuman;
                    ranking[name].history.push({ rank, score });
                }
            });
        });

        return Object.entries(ranking)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.total - a.total);
    };

    const getActiveRanking = () => calculateRanking(activeEventScores);

    // --- History Detail Actions ---
    const openHistoryDetail = async (event) => {
        setSelectedHistoryEvent(event);
        setHistoryDetailLoading(true);
        try {
            const res = await fetch(`/api/scores?event_id=${event.id}`);
            const data = await res.json();
            setHistoryDetailScores(data);
        } catch (e) {
            console.error(e);
            alert('データ取得に失敗しました');
        } finally {
            setHistoryDetailLoading(false);
        }
    };

    const closeHistoryDetail = () => {
        setSelectedHistoryEvent(null);
        setHistoryDetailScores([]);
        setEditingHistoryGameId(null);
        setEditHistoryValues(null);
    };

    // --- Finished-Event Correction (separate "edit" password) ---
    const submitEditUnlock = async (e) => {
        e.preventDefault();
        setEditPasswordError('');
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'edit', password: editPasswordInput })
            });
            if (!res.ok) {
                setEditPasswordError('パスワードが間違っています');
                return;
            }
            setEditUnlocked(true);
            setEditPasswordPrompt(false);
            setEditPasswordInput('');
        } catch (err) {
            setEditPasswordError('エラーが発生しました');
        }
    };

    const startEditHistoryGame = (game) => {
        if (!editUnlocked) {
            setEditPasswordPrompt(true);
            return;
        }
        setEditingHistoryGameId(game.id);
        setEditHistoryValues([1, 2, 3, 4].map(i => ({
            name: game[`player_${i}_name`],
            raw_score: String(game[`player_${i}_raw_score`] ?? game[`player_${i}_score`]),
            yakuman: game[`player_${i}_yakuman`] || 0
        })));
    };

    const cancelEditHistoryGame = () => {
        setEditingHistoryGameId(null);
        setEditHistoryValues(null);
    };

    const updateEditHistoryField = (index, field, value) => {
        setEditHistoryValues(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const saveEditHistoryGame = async () => {
        if (!editHistoryValues) return;

        if (editHistoryValues.some(p => !p.name.trim())) {
            alert('全員の名前を入力してください。');
            return;
        }

        const rawScores = editHistoryValues.map(p => parseInt(p.raw_score, 10));
        if (rawScores.some(s => isNaN(s))) {
            alert('素点は数値で入力してください。');
            return;
        }

        const total = rawScores.reduce((a, b) => a + b, 0);
        if (total !== 100000) {
            alert(`素点の合計が100,000点ではありません。（現在: ${total}点 / 差: ${total - 100000}点）`);
            return;
        }

        const calcInput = editHistoryValues.map((p, i) => ({ name: p.name.trim(), score: rawScores[i] }));
        const calcResult = calculateGameScores(calcInput);

        const updates = {};
        calcResult.forEach(p => {
            const i = p.originalIndex + 1;
            updates[`player_${i}_name`] = p.name;
            updates[`player_${i}_raw_score`] = p.score;
            updates[`player_${i}_score`] = p.recalculated;
            updates[`player_${i}_yakuman`] = parseInt(editHistoryValues[p.originalIndex].yakuman, 10) || 0;
        });

        try {
            const res = await fetch('/api/scores', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingHistoryGameId, updates })
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || '更新に失敗しました');
            }
            cancelEditHistoryGame();
            await openHistoryDetail(selectedHistoryEvent);
            if (fiscalYear) {
                await fetchYearlyRanking(fiscalYear);
                await fetchYearlyEvents(fiscalYear);
            }
        } catch (e) {
            alert(e.message);
        }
    };

    // --- PDF Export ---
    const exportToPDF = async (elementId, fileName) => {
        const input = document.getElementById(elementId);
        if (!input) return;

        setLoading(true); // Reuse loading state or add specific one
        try {
            const canvas = await html2canvas(input, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            const imgX = (pdfWidth - imgWidth * ratio) / 2;
            const imgY = 30;

            pdf.setFontSize(10);
            pdf.text('Generate by MJ Score Admin', 10, 10);

            // Auto fit width, might strictly need more math for multi-page but starting with scale-to-fit
            const finalWidth = pdfWidth - 20;
            const finalHeight = (imgHeight * finalWidth) / imgWidth;

            pdf.addImage(imgData, 'PNG', 10, 20, finalWidth, finalHeight);
            pdf.save(`${fileName}.pdf`);
        } catch (e) {
            console.error(e);
            alert('PDF生成に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    // Reusable Table Component (Corporate Style)
    const RankingTable = ({ data, emptyMessage, mode = 'default' }) => (
        <div className="overflow-x-auto border-t border-b border-gray-200 mb-8">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-gray-200">
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide w-16">順位</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">プレイヤー名</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">トータルスコア</th>

                        {(mode === 'cumulative' || mode === 'archive') && (
                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">役満</th>
                        )}

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
                        // Calculate stats for cumulative mode
                        let stats = [0, 0, 0, 0];
                        let totalGames = 0;
                        if (mode === 'cumulative' && player.history) {
                            totalGames = player.history.length;
                            player.history.forEach(h => {
                                if (h.rank >= 1 && h.rank <= 4) {
                                    stats[h.rank - 1]++;
                                }
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

                                {(mode === 'cumulative' || mode === 'archive') && (
                                    <td className="py-3 px-4 text-center">
                                        {player.yakuman > 0 ? (
                                            <span className="inline-flex items-center justify-center bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded">
                                                🀄 {player.yakuman}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                )}

                                {mode === 'cumulative' ? (
                                    <>
                                        {[0, 1, 2, 3].map(i => (
                                            <td key={i} className="py-3 px-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-semibold text-gray-700">{stats[i]}</span>
                                                    <span className="text-[10px] text-gray-400">
                                                        {totalGames > 0 ? ((stats[i] / totalGames) * 100).toFixed(1) + '%' : '0%'}
                                                    </span>
                                                </div>
                                            </td>
                                        ))}
                                    </>
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

    if (loading) return <div className="min-h-screen p-8 flex justify-center text-gray-500 items-center">Loading...</div>;

    return (
        <div className="min-h-screen flex bg-[#f3f4f6] font-sans">
            {/* --- MOBILE OVERLAY --- */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}

            {/* --- SIDEBAR NAVIGATION --- */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-[240px] bg-[#004d80] text-white flex flex-col transition-transform duration-300 transform md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-xl`}>
                <div className="flex items-center h-16 px-6 bg-[#003d66] border-b border-[#003355]">
                    <span className="text-lg font-bold tracking-tight text-white">MJ Score Admin</span>
                </div>

                <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                    <button
                        onClick={() => { setActiveTab('active_event'); setSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-md transition-colors ${activeTab === 'active_event'
                            ? 'bg-[#005a96] text-white shadow-sm ring-1 ring-[#006bb3]'
                            : 'text-blue-100 hover:bg-[#003d66] hover:text-white'
                            }`}
                    >
                        <Icons.Dashboard />
                        開催中イベント
                    </button>
                    <button
                        onClick={() => { setActiveTab('yearly'); setSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-md transition-colors ${activeTab === 'yearly'
                            ? 'bg-[#005a96] text-white shadow-sm ring-1 ring-[#006bb3]'
                            : 'text-blue-100 hover:bg-[#003d66] hover:text-white'
                            }`}
                    >
                        <Icons.Chart />
                        年間成績レポート
                    </button>
                    <button
                        onClick={() => { setActiveTab('members'); setSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-md transition-colors ${activeTab === 'members'
                            ? 'bg-[#005a96] text-white shadow-sm ring-1 ring-[#006bb3]'
                            : 'text-blue-100 hover:bg-[#003d66] hover:text-white'
                            }`}
                    >
                        <Icons.Users />
                        会員管理
                    </button>
                    <button
                        onClick={() => { setActiveTab('history'); setSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-md transition-colors ${activeTab === 'history'
                            ? 'bg-[#005a96] text-white shadow-sm ring-1 ring-[#006bb3]'
                            : 'text-blue-100 hover:bg-[#003d66] hover:text-white'
                            }`}
                    >
                        <Icons.Archive />
                        過去データ管理
                    </button>
                    <button
                        onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-md transition-colors ${activeTab === 'settings'
                            ? 'bg-[#005a96] text-white shadow-sm ring-1 ring-[#006bb3]'
                            : 'text-blue-100 hover:bg-[#003d66] hover:text-white'
                            }`}
                    >
                        <Icons.Settings />
                        初期化メニュー
                    </button>
                </nav>

                <div className="p-4 border-t border-[#003d66] bg-[#004675]">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#005a96] text-xs font-bold ring-2 ring-[#003d66]">AD</div>
                        <div>
                            <p className="text-xs font-medium text-white">管理者</p>
                            <p className="text-[10px] text-blue-200">system@antigravity.jp</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* --- MAIN CONTENT AREA --- */}
            <main className="flex-1 md:ml-[240px] transition-all duration-300 min-w-0">
                {/* Header Area */}
                {/* Header Area */}
                <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between min-h-16 px-4 sm:px-8 bg-white border-b border-gray-200 shadow-sm py-2 sm:py-0">
                    <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-md md:hidden"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                        </button>
                        <h1 className="text-lg font-bold text-gray-900 border-l-4 border-[#004d80] pl-3 py-1">
                            {activeTab === 'active_event' && '開催中イベント'}
                            {activeTab === 'yearly' && '年間成績レポート'}
                            {activeTab === 'members' && '会員管理'}
                            {activeTab === 'history' && '過去データ管理'}
                            {activeTab === 'settings' && '初期化メニュー'}
                        </h1>

                        {/* Sub-navigation mapped to Header for "Yearly" */}
                        {activeTab === 'yearly' && (
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 sm:mt-0 w-full sm:w-auto">
                                <div className="flex items-center p-1 space-x-1 bg-gray-100 rounded-lg border border-gray-200 overflow-x-auto max-w-full">
                                    <button
                                        onClick={() => setYearlySubTab('ranking')}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${yearlySubTab === 'ranking'
                                            ? 'bg-white text-gray-900 shadow-sm font-bold'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        累計ランキング
                                    </button>
                                    <button
                                        onClick={() => setYearlySubTab('archive')}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${yearlySubTab === 'archive'
                                            ? 'bg-white text-gray-900 shadow-sm font-bold'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        開催別アーカイブ
                                    </button>
                                </div>

                                <div className="h-6 w-px bg-gray-300"></div>

                                {/* Fiscal Year Selector */}
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-gray-500">年度:</span>
                                    <select
                                        value={fiscalYear}
                                        onChange={(e) => setFiscalYear(Number(e.target.value))}
                                        className="text-xs border-gray-300 rounded shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    >
                                        {Array.from(new Set([...availableYears, fiscalYear]))
                                            .sort((a, b) => b - a)
                                            .map(y => (
                                                <option key={y} value={y}>{y}年度</option>
                                            ))}
                                    </select>
                                </div>

                                {isClient && fiscalYear < currentRealYear + 1 && (
                                    <button
                                        onClick={closeFiscalYear}
                                        className="text-xs bg-gray-800 text-white px-3 py-1.5 rounded hover:bg-gray-700 transition-colors shadow-sm whitespace-nowrap"
                                        title={`${fiscalYear}年度を締め切り、翌年度へ切り替えます`}
                                    >
                                        年度集計 (締め)
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="text-xs text-gray-400">v1.4.0</div>
                </header>

                <div className="p-8">
                    {/* --- ACTIVE EVENT TAB --- */}
                    {activeTab === 'active_event' && (
                        <div className="animate-fade-in space-y-8">

                            {/* NEW: Initial System Setup */}
                            {needInitialSetup && (
                                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 shadow-md rounded-r-lg">
                                    <h3 className="text-lg font-bold text-blue-900 mb-2">🎉 システムへようこそ！</h3>
                                    <p className="text-sm text-blue-700 mb-4 leading-relaxed">
                                        スコア管理を始める前に、現在の<strong>「開始年度」</strong>を設定してください。<br />
                                        通常は現在の年度（例：4月以降なら今年、1-3月なら前年）を入力します。
                                    </p>
                                    <div className="flex items-end gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-blue-800 mb-1">年度 (西暦)</label>
                                            <input
                                                type="number"
                                                value={fiscalYear || ''}
                                                onChange={(e) => setFiscalYear(Number(e.target.value))}
                                                className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                            />
                                        </div>
                                        <button
                                            onClick={saveInitialYear}
                                            className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
                                        >
                                            設定を保存して開始
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Section 1: Active Event Status */}
                            <section className="bg-white border border-gray-200 rounded shadow-sm">
                                <div className="px-6 py-4 border-b border-gray-200 bg-green-50/50 flex justify-between items-center">
                                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${activeEvent ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                                        開催中のイベント
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => loadData()}
                                            className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-1"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" /></svg>
                                            データ更新
                                        </button>
                                        {activeEvent && (
                                            <button
                                                onClick={finalizeEvent}
                                                className="btn-secondary text-xs"
                                            >
                                                終了して集計
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {activeEvent ? (
                                    <div className="p-6">
                                        <h2 className="text-xl font-bold text-gray-900 mb-6">
                                            {activeEvent.date} {activeEvent.name && <span className="text-gray-600 ml-2 text-lg">/ {activeEvent.name}</span>}
                                        </h2>

                                        {/* Ranking */}
                                        <div className="mb-8">
                                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                                <Icons.Chart /> リアルタイム順位
                                            </h4>
                                            <RankingTable data={getActiveRanking()} emptyMessage="対局データがまだありません。" />
                                        </div>

                                        {/* History */}
                                        <div>
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                    <Icons.Dashboard /> 直近の対局ログ
                                                </h4>
                                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{activeEventScores.length} 件</span>
                                            </div>
                                            <div className="max-h-64 overflow-y-auto custom-scrollbar border border-gray-100 rounded">
                                                <table className="w-full text-left border-collapse text-sm">
                                                    <tbody className="divide-y divide-gray-100">
                                                        {activeEventScores.map(game => (
                                                            <tr key={game.id} className="hover:bg-gray-50">
                                                                <td className="p-3 text-gray-400 font-mono w-20 border-r border-gray-50 text-xs align-top">
                                                                    {formatSubmittedTime(game.submitted_at)}
                                                                </td>
                                                                <td className="p-3">
                                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:flex sm:flex-wrap">
                                                                        {[1, 2, 3, 4].map(i => (
                                                                            <div key={i} className="flex items-center gap-1 text-xs w-[48%] sm:w-auto">
                                                                                <span className="font-semibold text-gray-700">{game[`player_${i}_name`]}</span>
                                                                                <span className={`ml-1 ${game[`player_${i}_score`] > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                                                    {game[`player_${i}_score`] > 0 ? '+' : ''}{game[`player_${i}_score`]}
                                                                                </span>

                                                                                {/* Yakuman Display / Edit */}
                                                                                {editingGameId === game.id ? (
                                                                                    <div className="ml-2 flex items-center">
                                                                                        <span className="text-[10px] text-red-600 mr-1">🀄</span>
                                                                                        <input
                                                                                            type="number"
                                                                                            min="0"
                                                                                            className="w-10 text-[10px] border border-gray-300 rounded px-1 py-0.5 text-right"
                                                                                            value={editYakumanValues[`player_${i}_yakuman`] || 0}
                                                                                            onChange={(e) => setEditYakumanValues({ ...editYakumanValues, [`player_${i}_yakuman`]: parseInt(e.target.value) || 0 })}
                                                                                        />
                                                                                    </div>
                                                                                ) : (
                                                                                    (game[`player_${i}_yakuman`] > 0) && (
                                                                                        <span className="ml-2 text-[10px] bg-red-100 text-red-800 px-1.5 rounded border border-red-200">
                                                                                            🀄 {game[`player_${i}_yakuman`]}
                                                                                        </span>
                                                                                    )
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                                <td className="p-3 w-20 text-right align-top">
                                                                    {editingGameId === game.id ? (
                                                                        <div className="flex flex-col gap-1">
                                                                            <button onClick={saveEditYakuman} className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded">保存</button>
                                                                            <button onClick={cancelEditYakuman} className="text-[10px] bg-gray-200 text-gray-700 px-2 py-1 rounded">中止</button>
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex gap-2 justify-end">
                                                                            <button onClick={() => startEditYakuman(game)} className="text-[10px] text-blue-600 hover:underline">
                                                                                修正
                                                                            </button>
                                                                            <button onClick={() => deleteGame(game.id)} className="text-[10px] text-red-500 hover:text-red-700 hover:underline">
                                                                                削除
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {activeEventScores.length === 0 && (
                                                            <tr><td colSpan="3" className="p-8 text-center text-gray-400 text-xs">対局履歴なし</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-gray-500 text-sm">
                                        開催中のイベントはありません。<br />
                                        下のリストからイベントを選択して「開催」してください。
                                    </div>
                                )}
                            </section>

                            {/* Section 2: Event Registration & Management */}
                            <section className="bg-white border border-gray-200 rounded shadow-sm">
                                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
                                    <h3 className="text-sm font-semibold text-gray-900">イベント登録・管理</h3>
                                </div>
                                <div className="p-6">
                                    {/* Register Form */}
                                    <form onSubmit={registerEvent} className="flex flex-wrap gap-4 items-end mb-8 bg-gray-50 p-4 rounded border border-gray-100">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">開催日</label>
                                            <input
                                                type="date"
                                                value={newEventDate}
                                                onChange={(e) => setNewEventDate(e.target.value)}
                                                className="input-field text-sm"
                                                required
                                            />
                                        </div>
                                        <div className="flex-1 min-w-[200px]">
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">イベント名 (任意)</label>
                                            <input
                                                type="text"
                                                value={newEventName}
                                                onChange={(e) => setNewEventName(e.target.value)}
                                                placeholder="例: 第1回 定例会"
                                                className="input-field text-sm w-full"
                                            />
                                        </div>
                                        <button type="submit" className="btn-primary whitespace-nowrap">
                                            新規登録
                                        </button>
                                    </form>

                                    {/* Scheduled List */}
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">登録済みイベントリスト</h4>
                                    <div className="overflow-x-auto border border-gray-200 rounded">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="py-2 px-4 text-xs font-semibold text-gray-500">開催日</th>
                                                    <th className="py-2 px-4 text-xs font-semibold text-gray-500">イベント名</th>
                                                    <th className="py-2 px-4 text-xs font-semibold text-gray-500 text-right">操作</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {scheduledEvents.map(event => (
                                                    <tr key={event.id} className="hover:bg-gray-50">
                                                        <td className="py-3 px-4 text-sm text-gray-900 font-mono">{event.date}</td>
                                                        <td className="py-3 px-4 text-sm text-gray-900">{event.name || '-'}</td>
                                                        <td className="py-3 px-4 text-right">
                                                            <div className="flex justify-end gap-3 text-xs">
                                                                <button
                                                                    onClick={() => activateEvent(event.id, event.name, event.date)}
                                                                    className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded transition-colors"
                                                                >
                                                                    開催する
                                                                </button>
                                                                <button
                                                                    onClick={() => deleteScheduledEvent(event.id)}
                                                                    className="text-red-500 hover:text-red-700 px-2 py-1"
                                                                >
                                                                    削除
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {scheduledEvents.length === 0 && (
                                                    <tr>
                                                        <td colSpan="3" className="py-8 text-center text-gray-400 text-sm">
                                                            登録済みのイベントはありません
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* --- YEARLY TAB --- */}
                    {activeTab === 'yearly' && (
                        <div className="animate-fade-in space-y-8">
                            {/* Cumulative Ranking Section */}
                            {yearlySubTab === 'ranking' && (
                                <section className="animate-fade-in">
                                    <div className="flex justify-end mb-4">
                                        <button
                                            onClick={() => exportToPDF('report-cumulative', `${fiscalYear}_cumulative_ranking`)}
                                            className="text-xs bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-1"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                            PDF出力
                                        </button>
                                    </div>
                                    <div id="report-cumulative" className="bg-white p-6 border border-gray-200 rounded shadow-sm">
                                        <div className="mb-6 text-center">
                                            <h2 className="text-xl font-bold text-gray-900">{fiscalYear}年度 累計ランキング</h2>
                                            <p className="text-sm text-gray-500 mt-1">集計対象: {yearlyRanking.length}名</p>
                                        </div>
                                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                            <h3 className="text-sm font-semibold text-gray-900">{fiscalYear}年度 累計ランキング</h3>

                                            {/* Ranking Type Selector */}
                                            <div className="flex bg-gray-200 p-1 rounded overflow-x-auto max-w-full no-scrollbar">
                                                <div className="flex space-x-1 min-w-max">
                                                    {[
                                                        { id: 'total', label: 'トータル' },
                                                        { id: 'best_score', label: '最高得点' },
                                                        { id: 'avoidance_rate', label: 'ラス回避率' },
                                                        { id: 'most_wins', label: '最多勝' }
                                                    ].map(type => (
                                                        <button
                                                            key={type.id}
                                                            onClick={() => setRankingType(type.id)}
                                                            className={`px-3 py-1 text-xs font-medium rounded transition-all ${rankingType === type.id
                                                                ? 'bg-white text-gray-900 shadow-sm'
                                                                : 'text-gray-600 hover:text-gray-900'
                                                                }`}
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
                                                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 text-right">得点</th>
                                                            <th className="py-3 px-4 text-xs font-semibold text-gray-500 text-right">対局日</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(() => {
                                                            // Flatten all history into single games
                                                            const allGames = [];
                                                            yearlyRanking.forEach(p => {
                                                                if (p.history) {
                                                                    p.history.forEach(h => {
                                                                        const score = h.raw_score !== undefined && h.raw_score !== null ? h.raw_score : h.score;
                                                                        const isRaw = h.raw_score !== undefined && h.raw_score !== null;
                                                                        allGames.push({ name: p.name, score: score, date: h.date, isRaw });
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
                                                                // Use latest game date? Or just generic. Request said "Game Date" but for cumulative rate it implies 'Latest Activity' or N/A. 
                                                                // Let's show total games instead of date for context, or just latest date.
                                                                // User explicitly asked for "Game Date". I'll use the latest game date.
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
                                                            }).filter(p => p.count > 0).sort((a, b) => b.count - a.count).slice(0, 5); // Limit to top 5

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
                                    </div>
                                    <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded text-xs text-blue-700 flex gap-2">
                                        <span className="font-bold">Note:</span>
                                        <span>このランキングは「集計済（終了済み）」のイベントスコアのみを集計対象としています。現在開催中のイベントスコアは含まれません。</span>
                                    </div>
                                </section>
                            )}

                            {/* Breakdown by Event Section */}
                            {yearlySubTab === 'archive' && (
                                <section className="animate-fade-in">
                                    <div className="space-y-8">
                                        {yearlyEvents.length > 0 ? (
                                            yearlyEvents.map((event) => (
                                                <div key={event.id} id={`report-event-${event.id}`} className="bg-white border border-gray-200 rounded shadow-sm break-inside-avoid">
                                                    <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-200 flex items-center justify-between">
                                                        <h3 className="font-bold text-gray-900 text-sm">
                                                            📅 {event.date} {event.name && `- ${event.name}`}
                                                        </h3>
                                                        <div className="flex items-center gap-2">
                                                            <span className="badge badge-inactive">集計済</span>
                                                            <button
                                                                onClick={() => exportToPDF(`report-event-${event.id}`, `${event.date}_${event.name || 'event'}_ranking`)}
                                                                className="text-xs bg-white border border-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-1"
                                                                data-html2canvas-ignore
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                                                PDF
                                                            </button>
                                                        </div>
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
                                    </div>
                                </section>
                            )}
                        </div>
                    )}

                    {/* --- MEMBERS TAB --- */}
                    {activeTab === 'members' && (
                        <div className="animate-fade-in space-y-6">
                            {/* Add Member Form */}
                            <div className="bg-white border border-gray-200 rounded shadow-sm p-6">
                                <h3 className="text-sm font-semibold text-gray-900 mb-4">新規会員登録</h3>
                                <form onSubmit={addMember} className="flex gap-4 items-center">
                                    <input
                                        type="text"
                                        placeholder="名前を入力 (例: 山田 太郎)"
                                        value={newMemberName}
                                        onChange={(e) => setNewMemberName(e.target.value)}
                                        className="input-field flex-1 max-w-sm"
                                    />
                                    <button type="submit" disabled={memberLoading || !newMemberName.trim()} className="btn-primary">
                                        {memberLoading ? '追加中...' : '追加'}
                                    </button>
                                </form>
                            </div>

                            {/* Members List */}
                            <div className="bg-white border border-gray-200 rounded shadow-sm">
                                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                                    <h3 className="text-sm font-semibold text-gray-900">会員リスト ({members.length}名)</h3>
                                </div>
                                <div className="p-0 overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">ID</th>
                                                <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide">名前</th>
                                                <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {members
                                                .slice((currentPage - 1) * 20, currentPage * 20)
                                                .map((member) => (
                                                    <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="py-4 px-6 text-sm text-gray-500">#{member.id}</td>
                                                        <td className="py-4 px-6 text-sm font-medium text-gray-900">
                                                            {editingMember?.id === member.id ? (
                                                                <div className="flex gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={editingMember.name}
                                                                        onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                                                                        className="input-field p-1 text-sm w-48"
                                                                    />
                                                                    <button onClick={saveEditMember} className="text-green-600 text-xs hover:underline">保存</button>
                                                                    <button onClick={() => setEditingMember(null)} className="text-gray-500 text-xs hover:underline">キャンセル</button>
                                                                </div>
                                                            ) : (
                                                                member.name
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-6 text-right">
                                                            <div className="flex justify-end gap-3 text-xs">
                                                                <button
                                                                    onClick={() => startEditMember(member)}
                                                                    className="text-blue-600 hover:text-blue-800 font-medium"
                                                                >
                                                                    編集
                                                                </button>
                                                                <span className="text-gray-300">|</span>
                                                                <button
                                                                    onClick={() => deleteMember(member.id)}
                                                                    className="text-red-600 hover:text-red-800 font-medium"
                                                                >
                                                                    削除
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            {members.length === 0 && (
                                                <tr><td colSpan="3" className="p-12 text-center text-gray-400 text-sm">会員が登録されていません</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {members.length > 20 && (
                                    <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                                        <div className="text-xs text-gray-500">
                                            {(currentPage - 1) * 20 + 1} - {Math.min(currentPage * 20, members.length)} / {members.length} 名を表示
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                disabled={currentPage === 1}
                                                className="px-3 py-1 border border-gray-300 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                            >
                                                前へ
                                            </button>
                                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 rounded">
                                                Page {currentPage}
                                            </span>
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(members.length / 20), prev + 1))}
                                                disabled={currentPage >= Math.ceil(members.length / 20)}
                                                className="px-3 py-1 border border-gray-300 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                            >
                                                次へ
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* --- HISTORY TAB --- */}
                    {activeTab === 'history' && (
                        <div className="animate-fade-in">
                            <div className="bg-white border border-gray-200 rounded shadow-sm">
                                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
                                    <h3 className="text-sm font-semibold text-gray-900">全イベント履歴</h3>
                                </div>
                                <div className="p-0 overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-50 border-b border-gray-200">
                                            <tr>
                                                <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide">日付</th>
                                                <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide">ステータス</th>
                                                <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {events.map((event) => (
                                                <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="py-4 px-6 text-sm font-medium text-gray-900">{event.date}</td>
                                                    <td className="py-4 px-6">
                                                        {event.status === 'active' ? (
                                                            <span className="badge badge-active">受付中</span>
                                                        ) : event.status === 'scheduled' ? (
                                                            <span className="badge bg-blue-50 text-blue-700 border border-blue-200">予定</span>
                                                        ) : (
                                                            <span className="badge badge-inactive">終了</span>
                                                        )}
                                                    </td>
                                                    <td className="py-4 px-6 text-right">
                                                        <button
                                                            onClick={() => openHistoryDetail(event)}
                                                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                                        >
                                                            詳細を見る
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {events.length === 0 && (
                                                <tr><td colSpan="3" className="p-12 text-center text-gray-400 text-sm">履歴がありません</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- SETTINGS TAB --- */}
                    {activeTab === 'settings' && (
                        <div className="animate-fade-in space-y-8">
                            {/* Password Settings */}
                            <section className="bg-white border border-gray-200 rounded shadow-sm p-6">
                                <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Icons.Settings /> パスワード変更
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                    {/* User Password */}
                                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                                        <h4 className="text-xs font-bold text-gray-700 mb-2">一般ユーザー用</h4>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="border rounded px-2 py-1 flex-1 text-sm"
                                                placeholder="新しいパスワード"
                                                id="new-user-pwd"
                                            />
                                            <button
                                                onClick={() => changePassword('user', document.getElementById('new-user-pwd').value)}
                                                className="bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700"
                                            >更新</button>
                                        </div>
                                    </div>
                                    {/* Admin Password */}
                                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                                        <h4 className="text-xs font-bold text-gray-700 mb-2">管理者用</h4>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="border rounded px-2 py-1 flex-1 text-sm"
                                                placeholder="新しいパスワード"
                                                id="new-admin-pwd"
                                            />
                                            <button
                                                onClick={() => changePassword('admin', document.getElementById('new-admin-pwd').value)}
                                                className="bg-[#004d80] text-white text-xs px-3 py-1 rounded hover:bg-[#003d66]"
                                            >更新</button>
                                        </div>
                                    </div>
                                    {/* Scores Viewer Password */}
                                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                                        <h4 className="text-xs font-bold text-gray-700 mb-2">スコア閲覧用 (/scores)</h4>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="border rounded px-2 py-1 flex-1 text-sm"
                                                placeholder="新しいパスワード"
                                                id="new-scores-pwd"
                                            />
                                            <button
                                                onClick={() => changePassword('scores', document.getElementById('new-scores-pwd').value)}
                                                className="bg-emerald-600 text-white text-xs px-3 py-1 rounded hover:bg-emerald-700"
                                            >更新</button>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-2">初期値: scores（会員に共有する前に変更してください）</p>
                                    </div>
                                    {/* Finished-Event Edit Password */}
                                    <div className="bg-gray-50 p-4 rounded border border-gray-200">
                                        <h4 className="text-xs font-bold text-gray-700 mb-2">終了済みデータ編集用</h4>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="border rounded px-2 py-1 flex-1 text-sm"
                                                placeholder="新しいパスワード"
                                                id="new-edit-pwd"
                                            />
                                            <button
                                                onClick={() => changePassword('edit', document.getElementById('new-edit-pwd').value)}
                                                className="bg-orange-600 text-white text-xs px-3 py-1 rounded hover:bg-orange-700"
                                            >更新</button>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-2">初期値: edit（過去データ管理タブでの修正に必要。限られた人にのみ共有してください）</p>
                                    </div>
                                </div>
                            </section>

                            <section className="bg-white border border-gray-200 rounded shadow-sm">
                                <div className="px-6 py-4 border-b border-gray-200 bg-red-50/50">
                                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                        <Icons.Settings />
                                        データの初期化（取り消し不可）
                                    </h3>
                                </div>
                                <div className="p-8">
                                    <div className="mb-6 p-4 bg-red-50 text-red-800 text-sm rounded border border-red-100">
                                        <p className="font-bold mb-1">注意:</p>
                                        <p>ここで削除されたデータは完全に失われ、復元することはできません。慎重に操作してください。</p>
                                    </div>

                                    <div className="space-y-6 max-w-lg">
                                        {/* Member Data Reset */}
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                id="reset_members"
                                                checked={resetMemberData}
                                                onChange={(e) => setResetMemberData(e.target.checked)}
                                                className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                                            />
                                            <div>
                                                <label htmlFor="reset_members" className="text-sm font-bold text-gray-900 block">会員データ</label>
                                                <p className="text-xs text-gray-500 mt-1">全ての会員情報を削除します。</p>
                                            </div>
                                        </div>

                                        <div className="h-px bg-gray-200 my-4"></div>

                                        {/* Game Data Reset */}
                                        <div>
                                            <label className="text-sm font-bold text-gray-900 block mb-2">対局データ (年度選択)</label>
                                            <div className="space-y-2">
                                                {availableYears.map(year => (
                                                    <div key={year} className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            id={`reset_year_${year}`}
                                                            checked={!!resetYears[year]}
                                                            onChange={(e) => setResetYears({ ...resetYears, [year]: e.target.checked })}
                                                            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                                                        />
                                                        <label htmlFor={`reset_year_${year}`} className="text-sm text-gray-700">{year}年度</label>
                                                    </div>
                                                ))}
                                                {availableYears.length === 0 && (
                                                    <p className="text-sm text-gray-400">削除可能な対局データはありません</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-6">
                                            <button
                                                onClick={executeReset}
                                                className={`w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow transition-colors flex items-center justify-center gap-2 ${(loading || (!resetMemberData && Object.keys(resetYears).every(k => !resetYears[k]))) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                disabled={loading || (!resetMemberData && Object.keys(resetYears).every(k => !resetYears[k]))}
                                            >
                                                {loading ? '処理中...' : '初期化を実行する'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    )}

                    {/* --- HISTORY DETAIL MODAL --- */}
                    {selectedHistoryEvent && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
                            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900">
                                            {selectedHistoryEvent.date}
                                            {selectedHistoryEvent.name && <span className="text-gray-600 ml-2 text-sm">/ {selectedHistoryEvent.name}</span>}
                                        </h3>
                                        <p className="text-xs text-gray-500 mt-1">詳細レポート</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {editUnlocked ? (
                                            <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded flex items-center gap-1">🔓 編集ロック解除中</span>
                                        ) : (
                                            <span className="text-[10px] text-gray-400 flex items-center gap-1">🔒 編集はロック中</span>
                                        )}
                                        <button onClick={closeHistoryDetail} className="text-gray-400 hover:text-gray-600">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 overflow-y-auto custom-scrollbar bg-gray-50">
                                    {historyDetailLoading ? (
                                        <div className="flex justify-center p-12 text-gray-400">Loading...</div>
                                    ) : (
                                        <div className="space-y-8">
                                            {/* Ranking Section */}
                                            <div className="bg-white p-4 rounded border border-gray-200 shadow-sm">
                                                <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                                    <Icons.Chart /> 最終順位
                                                </h4>
                                                <RankingTable
                                                    data={calculateRanking(historyDetailScores)}
                                                    emptyMessage="対局データがありません。"
                                                />
                                            </div>

                                            {/* Log Section */}
                                            <div className="bg-white p-4 rounded border border-gray-200 shadow-sm">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                        <Icons.Dashboard /> 対局ログ
                                                    </h4>
                                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{historyDetailScores.length} 件</span>
                                                </div>
                                                <div className="overflow-x-auto border border-gray-100 rounded">
                                                    <table className="w-full text-left border-collapse text-sm">
                                                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                                            <tr>
                                                                <th className="p-3 font-semibold border-b border-gray-100">記録時刻</th>
                                                                <th className="p-3 font-semibold border-b border-gray-100">詳細</th>
                                                                <th className="p-3 font-semibold border-b border-gray-100 text-right w-20">操作</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {historyDetailScores.map(game => (
                                                                <tr key={game.id} className="hover:bg-gray-50">
                                                                    <td className="p-3 text-gray-400 font-mono w-32 whitespace-nowrap align-top">
                                                                        {formatSubmittedTime(game.submitted_at)}
                                                                    </td>
                                                                    <td className="p-3">
                                                                        {editingHistoryGameId === game.id ? (
                                                                            <div className="space-y-2">
                                                                                {editHistoryValues.map((p, idx) => (
                                                                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                                                                        <input
                                                                                            type="text"
                                                                                            value={p.name}
                                                                                            onChange={(e) => updateEditHistoryField(idx, 'name', e.target.value)}
                                                                                            className="border border-gray-300 rounded px-2 py-1 w-28"
                                                                                            placeholder="プレイヤー名"
                                                                                        />
                                                                                        <input
                                                                                            type="text"
                                                                                            inputMode="decimal"
                                                                                            value={p.raw_score}
                                                                                            onChange={(e) => {
                                                                                                const val = e.target.value;
                                                                                                if (val === '' || /^-?\d*$/.test(val)) updateEditHistoryField(idx, 'raw_score', val);
                                                                                            }}
                                                                                            className="border border-gray-300 rounded px-2 py-1 w-20 text-right font-mono"
                                                                                            placeholder="素点"
                                                                                        />
                                                                                        <span className="text-[10px] text-gray-400">🀄</span>
                                                                                        <input
                                                                                            type="number"
                                                                                            min="0"
                                                                                            value={p.yakuman}
                                                                                            onChange={(e) => updateEditHistoryField(idx, 'yakuman', parseInt(e.target.value, 10) || 0)}
                                                                                            className="border border-gray-300 rounded px-1 py-1 w-14 text-right"
                                                                                        />
                                                                                    </div>
                                                                                ))}
                                                                                <p className="text-[10px] text-gray-400">計算後スコアは素点から自動再計算されます（4人の素点合計は100,000点にしてください）</p>
                                                                            </div>
                                                                        ) : (
                                                                            <div className="flex flex-wrap gap-x-6 gap-y-2">
                                                                                {[1, 2, 3, 4].map(i => (
                                                                                    <div key={i} className="flex items-center gap-1 text-xs">
                                                                                        <span className="font-semibold text-gray-700">{game[`player_${i}_name`]}</span>
                                                                                        <span className={`ml-1 ${game[`player_${i}_score`] > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                                                            {game[`player_${i}_score`] > 0 ? '+' : ''}{game[`player_${i}_score`]}
                                                                                        </span>
                                                                                        {(game[`player_${i}_yakuman`] > 0) && (
                                                                                            <span className="ml-2 text-[10px] bg-red-100 text-red-800 px-1.5 rounded border border-red-200">
                                                                                                🀄 {game[`player_${i}_yakuman`]}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-3 text-right align-top">
                                                                        {editingHistoryGameId === game.id ? (
                                                                            <div className="flex flex-col gap-1">
                                                                                <button onClick={saveEditHistoryGame} className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded">保存</button>
                                                                                <button onClick={cancelEditHistoryGame} className="text-[10px] bg-gray-200 text-gray-700 px-2 py-1 rounded">中止</button>
                                                                            </div>
                                                                        ) : (
                                                                            <button onClick={() => startEditHistoryGame(game)} className="text-[10px] text-blue-600 hover:underline">
                                                                                編集
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            {historyDetailScores.length === 0 && (
                                                                <tr><td colSpan="3" className="p-8 text-center text-gray-400 text-xs">対局履歴なし</td></tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-right">
                                    <button onClick={closeHistoryDetail} className="btn-secondary">
                                        閉じる
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- EDIT UNLOCK PASSWORD MODAL --- */}
                    {editPasswordPrompt && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4 animate-fade-in">
                            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
                                <h3 className="text-sm font-bold text-gray-900 mb-1">編集ロックの解除</h3>
                                <p className="text-xs text-gray-500 mb-4">終了済みイベントのデータを修正するには、編集用パスワードが必要です。</p>
                                <form onSubmit={submitEditUnlock} className="space-y-3">
                                    <input
                                        type="password"
                                        autoFocus
                                        value={editPasswordInput}
                                        onChange={(e) => setEditPasswordInput(e.target.value)}
                                        className="input-field text-sm"
                                        placeholder="編集用パスワード"
                                    />
                                    {editPasswordError && <p className="text-red-500 text-xs">{editPasswordError}</p>}
                                    <div className="flex gap-2 justify-end pt-2">
                                        <button
                                            type="button"
                                            onClick={() => { setEditPasswordPrompt(false); setEditPasswordInput(''); setEditPasswordError(''); }}
                                            className="btn-secondary text-xs"
                                        >キャンセル</button>
                                        <button type="submit" className="btn-primary text-xs">解除する</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </main >
        </div >
    );
}
