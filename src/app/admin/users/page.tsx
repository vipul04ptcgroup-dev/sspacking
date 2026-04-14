'use client';

import { useEffect, useState } from 'react';
import { getAllUsers } from '@/lib/firestore';
import type { User } from '@/types';
import { formatDate } from '@/lib/utils';
import { Spinner, EmptyState } from '@/components/ui';
import { Users } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getAllUsers().then(u => { setUsers(u); setLoading(false); }); }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-900">Customers</h1>
        <p className="text-stone-500 mt-1">{users.length} registered users</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : users.length === 0 ? (
        <EmptyState icon={<Users className="w-16 h-16" />} title="No users yet" />
      ) : (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">User</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-stone-50 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center">
                          <span className="text-amber-700 font-bold text-sm">
                            {(user.displayName || user.email || 'U')[0].toUpperCase()}
                          </span>
                        </div>
                        <span className="font-semibold text-stone-900 text-sm">{user.displayName || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-600">{user.email}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-500">{formatDate(user.createdAt)}</td>
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
