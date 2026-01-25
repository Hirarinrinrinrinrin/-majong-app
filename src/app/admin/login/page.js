'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
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
                body: JSON.stringify({ type: 'admin', password })
            });

            if (res.ok) {
                router.push('/admin/dashboard');
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
        <div className="min-h-screen bg-[#004d80] flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded shadow-lg max-w-sm w-full">
                <div className="text-center mb-6">
                    <h1 className="text-xl font-bold text-gray-800">管理者ログイン</h1>
                    <p className="text-xs text-gray-500 mt-1">MJ Score Admin</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="password"
                            placeholder="管理者パスワード"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#004d80]"
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#004d80] text-white font-bold py-2 rounded hover:bg-[#003d66] transition disabled:opacity-50"
                    >
                        {loading ? '確認中...' : 'ログイン'}
                    </button>
                </form>
                <div className="mt-6 text-center">
                    <a href="/" className="text-xs text-gray-500 hover:text-gray-800">← ユーザー画面へ戻る</a>
                </div>
            </div>
        </div>
    );
}
