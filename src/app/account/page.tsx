'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { getUserOrders, updateUserProfile } from '@/lib/firestore';
import { formatDate, formatPrice } from '@/lib/utils';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { Package, LogOut, Settings, ShoppingBag, MapPin, ShieldCheck, ArrowRight } from 'lucide-react';
import { Spinner } from '@/components/ui';
import type { Order } from '@/types';

export default function AccountPage() {
  const { user, userProfile, loading, logout, isTeamMember } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login?redirect=/account');
    if (!loading && user && isTeamMember) router.push('/team');
    }, [user, loading, router, isTeamMember]);

    useEffect(() => {
      if (!user) return;
      setDisplayName(userProfile?.displayName || user.displayName || '');
      setPhone(userProfile?.phone || '');
    }, [user, userProfile]);

    useEffect(() => {
      if (!user) return;
    setOrdersLoading(true);
    getUserOrders(user.uid)
      .then(setOrders)
      .finally(() => setOrdersLoading(false));
  }, [user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner className="w-8 h-8" /></div>;
  if (isTeamMember) return null;
  if (!user) return null;

  const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);
  const lastOrderDate = orders[0]?.createdAt;
  const addressesCount = userProfile?.addresses?.length ?? 0;

  const quickLinks = [
    { icon: Package, label: 'My Orders', desc: 'Track and view your orders', href: '/account/orders' },
    { icon: Settings, label: 'Account Settings', desc: 'Manage profile details and addresses', href: '/account/settings' },
  ];

  const handleSaveProfile = async () => {
    const trimmedName = displayName.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName) {
      toast.error('Name is required');
      return;
    }
    setSaving(true);
    try {
      await updateUserProfile(user.uid, { displayName: trimmedName, phone: trimmedPhone });
      toast.success('Profile updated');
      setEditMode(false);
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const statItems = [
    { icon: ShoppingBag, label: ordersLoading ? '...' : String(orders.length), desc: 'Total Orders' },
    { icon: MapPin, label: String(addressesCount), desc: 'Saved Addresses' },
    { icon: ShieldCheck, label: userProfile?.role === 'admin' ? 'Admin' : 'Customer', desc: 'Account Role' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Profile header */}
      <div className="bg-gradient-to-br from-amber-600 via-amber-700 to-stone-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 mb-6 sm:mb-8 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-2xl flex items-center justify-center">
            <span className="text-3xl sm:text-4xl font-black">
              {(user.displayName || user.email || 'U')[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-black truncate">{displayName || user.displayName || 'Customer'}</h1>
            <p className="text-amber-100 text-sm sm:text-base truncate">{user.email}</p>
            {phone && <p className="text-amber-100/90 text-sm mt-1">{phone}</p>}
            {userProfile?.role === 'admin' && (
              <span className="mt-2 inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                Admin
              </span>
            )}
          </div>
          <Button
            variant="outline"
            className="border-white/50 bg-white/10 text-white hover:bg-amber-100 hover:text-amber-900 hover:border-amber-100"
            onClick={() => setEditMode(v => !v)}
          >
            {editMode ? 'Cancel' : 'Edit Profile'}
          </Button>
        </div>
      </div>

      {editMode && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 sm:p-6 mb-6">
          <h2 className="text-lg font-black text-stone-900 mb-4">Update Profile</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input id="displayName" label="Full Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
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
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={handleSaveProfile} loading={saving}>Save Changes</Button>
            <Button variant="ghost" onClick={() => setEditMode(false)}>Close</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6">
        {statItems.map(item => (
          <div key={item.desc} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
              <item.icon className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-xl font-black text-stone-900">{item.label}</p>
            <p className="text-xs sm:text-sm text-stone-500">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        {quickLinks.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 flex items-center gap-4 hover:border-amber-200 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 bg-amber-50 group-hover:bg-amber-100 rounded-xl flex items-center justify-center transition">
              <item.icon className="w-6 h-6 text-amber-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-stone-900">{item.label}</p>
              <p className="text-sm text-stone-500 line-clamp-2">{item.desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-amber-600 transition" />
          </Link>
        ))}

        {userProfile?.role === 'admin' && (
          <Link
            href="/admin"
            className="bg-stone-900 rounded-2xl p-5 flex items-center gap-4 hover:bg-stone-800 transition-all group lg:col-span-1"
          >
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <Settings className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="font-bold text-white">Admin Dashboard</p>
              <p className="text-sm text-stone-400">Manage products, orders, and more</p>
            </div>
          </Link>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 sm:p-6 mb-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg sm:text-xl font-black text-stone-900">Recent Activity</h2>
          <Link href="/account/orders" className="text-sm font-semibold text-amber-600 hover:text-amber-700 transition">View all</Link>
        </div>
        {ordersLoading ? (
          <div className="py-8 flex justify-center"><Spinner className="w-6 h-6" /></div>
        ) : !orders.length ? (
          <p className="text-sm text-stone-500">No orders yet. Your recent orders will appear here.</p>
        ) : (
          <div className="space-y-3">
            {orders.slice(0, 3).map(order => (
              <div key={order.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-stone-100">
                <div className="min-w-0">
                  <p className="font-semibold text-stone-900 text-sm">#{order.id.slice(-8).toUpperCase()}</p>
                  <p className="text-xs text-stone-500">{formatDate(order.createdAt)}</p>
                </div>
                <p className="text-sm font-bold text-stone-800">{formatPrice(order.total)}</p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 pt-4 border-t border-stone-100 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-stone-500">Total Spent</p>
            <p className="font-black text-stone-900">{formatPrice(totalSpent)}</p>
          </div>
          <div>
            <p className="text-stone-500">Last Order</p>
            <p className="font-semibold text-stone-900">{lastOrderDate ? formatDate(lastOrderDate) : 'N/A'}</p>
          </div>
        </div>
      </div>

      <button
        onClick={async () => { await logout(); router.push('/'); }}
        className="flex items-center gap-2 text-red-500 hover:text-red-700 font-medium text-sm transition"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );
}
