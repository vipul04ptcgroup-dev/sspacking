'use client';

import { useEffect, useState } from 'react';
import { getAllTeamMembers } from '@/lib/firestore';
import { useAuth } from '@/context/auth-context';
import type { TeamMember } from '@/types';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { EmptyState, Spinner } from '@/components/ui';
import { ShieldUser, Trash2, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';

function formatDateTime(date?: Date | null): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function AdminTeamPage() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [lastCreatedCredentials, setLastCreatedCredentials] = useState<{
    displayName: string;
    email: string;
    password: string;
  } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setTeamMembers(await getAllTeamMembers());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const trimmedDisplayName = displayName.trim();
      const trimmedEmail = email.trim().toLowerCase();
      const plainPassword = password;
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/team-members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName: trimmedDisplayName, email: trimmedEmail, password: plainPassword }),
      });

      const result = await response.json() as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create team member.');
      }

      toast.success('Team member created. Password is saved in Firebase Authentication.');
      setLastCreatedCredentials({
        displayName: trimmedDisplayName,
        email: trimmedEmail,
        password: plainPassword,
      });
      setDisplayName('');
      setEmail('');
      setPassword('');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create team member.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (member: TeamMember) => {
    if (!user) return;
    if (!window.confirm(`Delete team member "${member.displayName}"?`)) return;

    setDeletingId(member.id);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/team-members/${member.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json() as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete team member.');
      }

      toast.success('Team member deleted.');
      setTeamMembers((current) => current.filter((item) => item.id !== member.id));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete team member.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-900">Team Members</h1>
        <p className="mt-1 text-stone-500">
          Create stock-checking team accounts with their own login credentials.
        </p>
      </div>

      <div className="mb-8 grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={handleCreate} className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Add Team Member</h2>
              <p className="text-sm text-stone-500">These accounts can only sign in to the team stock panel.</p>
            </div>
          </div>

          <div className="space-y-4">
            <Input
              id="teamDisplayName"
              label="Full Name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Warehouse staff name"
              required
            />
            <Input
              id="teamEmail"
              label="Login Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="team@sspackaging.in"
              required
            />
            <Input
              id="teamPassword"
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 6 characters"
              required
              minLength={6}
              helpText="Share this password with the team member. They will use it on the team login page."
            />
          </div>

          <div className="mt-6">
            <Button type="submit" loading={saving}>
              {saving ? 'Creating...' : 'Create Team Login'}
            </Button>
          </div>

          <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs text-amber-900">
            Passwords are not stored in Firestore. They are saved securely in Firebase Authentication and cannot be viewed later.
          </div>
        </form>

        <div className="space-y-6">
          <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <ShieldUser className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Latest Credentials</h2>
                <p className="text-sm text-stone-500">Shown once after team member creation.</p>
              </div>
            </div>

            {lastCreatedCredentials ? (
              <div className="space-y-3 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-stone-700">
                <p><span className="font-semibold text-stone-900">Name:</span> {lastCreatedCredentials.displayName}</p>
                <p><span className="font-semibold text-stone-900">Email:</span> {lastCreatedCredentials.email}</p>
                <p><span className="font-semibold text-stone-900">Password:</span> {lastCreatedCredentials.password}</p>
                <p className="text-xs text-stone-500">
                  Save this password now. For security, it is not visible in Firestore and will not be shown again after refresh.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl bg-stone-50 px-4 py-4 text-sm text-stone-500">
                No team member created in this session yet.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
              <ShieldUser className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Access Notes</h2>
              <p className="text-sm text-stone-500">Team users do not get admin panel access.</p>
            </div>
          </div>

          <div className="space-y-3 text-sm text-stone-600">
            <p>Team members sign in from the dedicated team login page, not the normal customer login.</p>
            <p>Inside the team panel they can only view stock information for products.</p>
            <p>Every login and logout is recorded in the Team Logs section for admin review.</p>
          </div>
        </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : teamMembers.length === 0 ? (
        <EmptyState
          icon={<ShieldUser className="h-16 w-16" />}
          title="No team members yet"
          description="Create the first team login to give stock visibility to your team."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px]">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Member</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Last Login</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Created</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {teamMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-stone-50 transition">
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{member.displayName}</p>
                        <p className="text-xs text-stone-500">{member.uid}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-600">{member.email}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${member.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {member.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-500">{formatDateTime(member.lastLoginAt)}</td>
                    <td className="px-5 py-4 text-sm text-stone-500">{formatDateTime(member.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => void handleDelete(member)}
                          disabled={deletingId === member.id}
                          className="rounded-lg p-2 text-stone-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="Delete team member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
