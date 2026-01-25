'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UserLogin() {
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
                body: JSON.stringify({ type: 'user', password })
            });

            if (res.ok) {
                router.push('/');
                router.refresh(); // Refresh to update middleware state visibility
            } else {
                const data = await res.json();
                setError('パスワードが間違っています');
            }
        } catch (err) {
            setError('エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded shadow-md max-w-sm w-full">
                <h1 className="text-xl font-bold text-center mb-6 text-gray-800">ユーザーログイン</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input
                            type="password"
                            placeholder="パスワードを入力"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        {loading ? '確認中...' : 'ログイン'}
                    </button>
                </form>
                <div className="mt-8 text-center">
                    <a href="/admin/login" className="text-xs text-gray-400 hover:text-gray-600">管理者はこちら</a>
                </div>
            </div>
        </div>
    );
}
