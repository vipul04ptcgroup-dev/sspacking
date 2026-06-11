'use client';

import { useEffect, useMemo, useState } from 'react';
import { getTeamAccessLogs } from '@/lib/firestore';
import type { TeamAccessLog, TeamAccessLogType } from '@/types';
import { EmptyState, Spinner } from '@/components/ui';
import { ClipboardList } from 'lucide-react';

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function AdminTeamLogsPage() {
  const [logs, setLogs] = useState<TeamAccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TeamAccessLogType>('all');

  useEffect(() => {
    getTeamAccessLogs()
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = useMemo(() => {
    const term = search.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesSearch =
        !term ||
        log.displayName.toLowerCase().includes(term) ||
        log.email.toLowerCase().includes(term);
      const matchesType = typeFilter === 'all' || log.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [logs, search, typeFilter]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-900">Team Logs</h1>
        <p className="mt-1 text-stone-500">
          Review team member login and logout times.
        </p>
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by member name or email"
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 lg:max-w-md"
        />
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as 'all' | TeamAccessLogType)}
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 lg:w-48"
        >
          <option value="all">All Events</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-16 w-16" />}
          title={logs.length === 0 ? 'No team access logs yet' : 'No team logs match your filters'}
          description={
            logs.length === 0
              ? 'Login and logout activity will appear here once team members start using their panel.'
              : 'Try a different name or event type.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">When</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Member</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Event</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50 transition">
                    <td className="px-5 py-4 text-sm text-stone-500">{formatDateTime(log.createdAt)}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-stone-900">{log.displayName}</td>
                    <td className="px-5 py-4 text-sm text-stone-600">{log.email}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${log.type === 'login' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-700'}`}>
                        {log.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
