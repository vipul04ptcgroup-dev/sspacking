'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { updateUserProfile } from '@/lib/firestore';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Spinner } from '@/components/ui';
import { ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AccountSettingsPage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login?redirect=/account/settings');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    setDisplayName(userProfile?.displayName || user.displayName || '');
    setPhone(userProfile?.phone || '');
  }, [user, userProfile]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner className="w-8 h-8" /></div>;
  if (!user) return null;

  const onSave = async () => {
    const name = displayName.trim();
    if (!name) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      await updateUserProfile(user.uid, { displayName: name, phone: phone.trim() });
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/account" className="text-stone-500 hover:text-amber-600 transition">Account</Link>
        <ChevronRight className="w-4 h-4 text-stone-400" />
        <h1 className="text-2xl font-black text-stone-900">Account Settings</h1>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 sm:p-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input id="name" label="Full Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <Input
            id="phone"
            type="tel"
            autoComplete="off"
            inputMode="tel"
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 91208 79879"
          />
          <Input id="email" label="Email" value={user.email || ''} readOnly className="sm:col-span-2 bg-stone-50" />
        </div>
        <div className="mt-5">
          <Button onClick={onSave} loading={saving}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
