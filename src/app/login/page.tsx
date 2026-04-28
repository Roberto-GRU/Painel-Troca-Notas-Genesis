'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setError('Senha incorreta');
      setPassword('');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-green-900/30 border border-green-800 rounded-2xl mb-4">
            <Lock size={28} className="text-green-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Painel Troca Notas</h1>
          <p className="text-sm text-gray-500 mt-1">Genesis</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#1a1d27] border border-[#2a2d3e] rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 font-medium uppercase tracking-wide mb-1.5">
              Senha de acesso
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoFocus
              className="w-full px-3 py-2.5 bg-[#12141c] border border-[#2a2d3e] rounded-lg text-sm text-gray-200 focus:outline-none focus:border-green-600 placeholder-gray-700"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-2.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
