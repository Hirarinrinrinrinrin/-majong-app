'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ScoresLogin() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'scores', password })
            });

            if (res.ok) {
                router.push('/scores');
                router.refresh();
            } else {
                setError('パスワードが間違っています');
            }
        } catch (err) {
            setError('エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4 font-sans">
            <div className="glass-panel p-8 max-w-sm w-full">
                <h1 className="text-xl font-bold text-center mb-2 text-gray-900">スコア閲覧</h1>
                <p className="text-xs text-gray-500 text-center mb-6">閲覧用パスワードを入力してください</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="password"
                        placeholder="パスワードを入力"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-field"
                        autoFocus
                    />
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <button type="submit" disabled={loading} className="btn-primary w-full">
                        {loading ? '確認中...' : 'ログイン'}
                    </button>
                </form>
            </div>
        </div>
    );
}
