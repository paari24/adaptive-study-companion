'use client';

import { useState } from 'react';

interface UserIdentity {
  name: string;
  mobile: string;
}

interface Props {
  onIdentified: (identity: UserIdentity) => void;
}

export default function UserIdentityModal({ onIdentified }: Props) {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) { setError('Please enter your name.'); return; }
    if (!/^\d{10}$/.test(mobile.trim())) { setError('Enter a valid 10-digit mobile number.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), mobile: mobile.trim() }),
      });
      if (!res.ok) throw new Error('Registration failed');
      const data = await res.json();
      const identity: UserIdentity = { name: data.name, mobile: data.mobile };
      localStorage.setItem('user_identity', JSON.stringify(identity));
      onIdentified(identity);
    } catch {
      setError('Could not connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl">
        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-3xl mx-auto mb-6">
          🎓
        </div>

        <h2 className="text-2xl font-bold text-white text-center mb-1">Welcome!</h2>
        <p className="text-slate-400 text-sm text-center mb-8">
          Enter your details to personalise your learning experience and track your progress.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pavithra"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Mobile Number
            </label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit number"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm mt-2"
          >
            {loading ? 'Saving…' : 'Start Learning →'}
          </button>
        </form>

        <p className="text-xs text-slate-600 text-center mt-4">
          Your mobile number is used only to track your progress — nothing else.
        </p>
      </div>
    </div>
  );
}
