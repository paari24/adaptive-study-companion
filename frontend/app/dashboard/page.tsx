'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserSummary {
  mobile: string;
  name: string;
  createdAt: string | null;
  sessionCount: number;
  avgScore: number;
  maxFatigue: number;
  maxStruggle: number;
  maxBoredom: number;
  lastActive: string | null;
}

interface SessionRow {
  id: string;
  topicTitle: string;
  completedAt: string | null;
  completedSections: number;
  totalSections: number;
  overallScore: number;
  peakStruggle: number;
  peakBoredom: number;
  peakFatigue: number;
  finalState: string;
  totalTimeMs: number;
  userName?: string | null;
  userMobile?: string | null;
}

const STATE_COLORS: Record<string, string> = {
  engaged: 'text-green-400',
  struggling: 'text-amber-400',
  bored: 'text-blue-400',
  fatigued: 'text-red-400',
};
const STATE_BG: Record<string, string> = {
  engaged: 'bg-green-400/10 border-green-400/30',
  struggling: 'bg-amber-400/10 border-amber-400/30',
  bored: 'bg-blue-400/10 border-blue-400/30',
  fatigued: 'bg-red-400/10 border-red-400/30',
};

function fmt(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}
function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-800 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-6 text-right tabular-nums">{value}</span>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [allSessions, setAllSessions] = useState<SessionRow[]>([]);
  const [selected, setSelected] = useState<UserSummary | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/users').then(r => r.json()).catch(() => ({ users: [] })),
      fetch('/api/sessions').then(r => r.json()).catch(() => ({ sessions: [] })),
    ]).then(([usrData, sessData]) => {
      const userList: UserSummary[] = usrData.users ?? [];
      const sessList: SessionRow[] = sessData.sessions ?? [];
      setUsers(userList);
      setAllSessions(sessList);
      if (userList.length > 0) setSelected(userList[0]);
    }).finally(() => setLoading(false));
  }, []);

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) || u.mobile.includes(search)
  );

  // Sessions for selected user — include sessions linked to them AND unlinked (null) sessions
  const userSessions = selected
    ? allSessions.filter(s => s.userMobile === selected.mobile || s.userMobile == null)
    : allSessions;

  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const avgScore    = avg(userSessions.map(s => s.overallScore));
  const avgStruggle = avg(userSessions.map(s => s.peakStruggle));
  const avgBoredom  = avg(userSessions.map(s => s.peakBoredom));
  const avgFatigue  = avg(userSessions.map(s => s.peakFatigue));

  return (
    <div className="h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-900">
        <button onClick={() => router.push('/')} className="text-slate-400 hover:text-white text-sm transition-colors">
          ← Back
        </button>
        <h1 className="text-lg font-semibold">📊 Study Analytics Dashboard</h1>
        <div className="text-slate-500 text-sm">{users.length} students · {allSessions.length} sessions</div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Loading…</div>
      ) : (
        <div className="flex flex-1 min-h-0">

          {/* ── Sidebar ── */}
          <div className="w-72 flex-shrink-0 border-r border-slate-800 flex flex-col bg-slate-900/30">
            <div className="p-3 border-b border-slate-800">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name or mobile…"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-slate-600 text-sm px-4">
                  No students registered yet.<br />Students are registered when they enter their name on the home page.
                </div>
              ) : (
                filteredUsers.map(u => (
                  <button
                    key={u.mobile}
                    onClick={() => setSelected(u)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-800/50 transition-colors ${
                      selected?.mobile === u.mobile ? 'bg-indigo-600/10 border-l-2 border-l-indigo-500' : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-white text-sm">{u.name}</span>
                    </div>
                    <div className="text-xs text-slate-500 mb-2">{u.mobile}</div>
                    <div className="flex gap-3 text-xs">
                      <span className="text-green-400 font-medium">{u.avgScore}% avg</span>
                      <span className="text-amber-400">S {u.maxStruggle}</span>
                      <span className="text-blue-400">B {u.maxBoredom}</span>
                      <span className="text-red-400">F {u.maxFatigue}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ── Detail panel ── */}
          <div className="flex-1 overflow-y-auto p-6">
            {!selected ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-600">
                <div className="text-4xl mb-3">👈</div>
                <p className="text-sm">Select a student to view their report</p>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-5">

                {/* Profile card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selected.name}</h2>
                      <p className="text-slate-400 text-sm mt-0.5">{selected.mobile}</p>
                      <p className="text-slate-600 text-xs mt-1">Joined {fmtDate(selected.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-4xl font-bold ${avgScore >= 80 ? 'text-green-400' : avgScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                        {avgScore}%
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">avg score · {userSessions.length} session{userSessions.length !== 1 ? 's' : ''}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-5">
                    {[
                      { label: 'Avg Struggle', val: avgStruggle, color: 'bg-amber-500' },
                      { label: 'Avg Boredom',  val: avgBoredom,  color: 'bg-blue-500'  },
                      { label: 'Avg Fatigue',  val: avgFatigue,  color: 'bg-red-500'   },
                    ].map(({ label, val, color }) => (
                      <div key={label}>
                        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                          <span>{label}</span><span className="font-medium text-slate-300">{val}</span>
                        </div>
                        <Bar value={val} color={color} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sessions table */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="font-semibold text-white">Session History</h3>
                    <span className="text-xs text-slate-500">{userSessions.length} record{userSessions.length !== 1 ? 's' : ''}</span>
                  </div>

                  {userSessions.length === 0 ? (
                    <div className="text-center py-12 text-slate-600 text-sm">
                      No sessions yet — complete a topic to see data here.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-slate-500 border-b border-slate-800 bg-slate-900/60">
                          <th className="text-left px-5 py-3 font-medium">Topic</th>
                          <th className="text-center px-3 py-3 font-medium">Score</th>
                          <th className="text-left px-3 py-3 font-medium w-24">Struggle</th>
                          <th className="text-left px-3 py-3 font-medium w-24">Boredom</th>
                          <th className="text-left px-3 py-3 font-medium w-24">Fatigue</th>
                          <th className="text-center px-3 py-3 font-medium">State</th>
                          <th className="text-center px-3 py-3 font-medium">Sections</th>
                          <th className="text-center px-3 py-3 font-medium">Time</th>
                          <th className="text-right px-5 py-3 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userSessions.map((s, i) => (
                          <tr key={s.id} className={`border-b border-slate-800/40 ${i % 2 !== 0 ? 'bg-slate-800/20' : ''}`}>
                            <td className="px-5 py-3 text-white font-medium">{s.topicTitle}</td>
                            <td className="px-3 py-3 text-center">
                              <span className={`text-base font-bold ${s.overallScore >= 80 ? 'text-green-400' : s.overallScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                                {s.overallScore}%
                              </span>
                            </td>
                            <td className="px-3 py-3"><Bar value={s.peakStruggle} color="bg-amber-500" /></td>
                            <td className="px-3 py-3"><Bar value={s.peakBoredom}  color="bg-blue-500"  /></td>
                            <td className="px-3 py-3"><Bar value={s.peakFatigue}  color="bg-red-500"   /></td>
                            <td className="px-3 py-3 text-center">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${STATE_BG[s.finalState] ?? 'bg-slate-700 border-slate-600'} ${STATE_COLORS[s.finalState] ?? 'text-slate-300'}`}>
                                {s.finalState}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center text-slate-400 text-xs">
                              {s.completedSections}/{s.totalSections}
                            </td>
                            <td className="px-3 py-3 text-center text-slate-400 text-xs">{fmt(s.totalTimeMs)}</td>
                            <td className="px-5 py-3 text-right text-slate-500 text-xs whitespace-nowrap">{fmtDate(s.completedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
