'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { User, Package, LogOut, Settings } from 'lucide-react';
import { Spinner } from '@/components/ui';

export default function AccountPage() {
  const { user, userProfile, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login?redirect=/account');
  }, [user, loading, router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner className="w-8 h-8" /></div>;
  if (!user) return null;

  const menuItems = [
    { icon: Package, label: 'My Orders', desc: 'Track and view your orders', href: '/account/orders' },
    { icon: Settings, label: 'Account Settings', desc: 'Update your profile and addresses', href: '/account/settings' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Profile header */}
      <div className="bg-gradient-to-br from-amber-600 to-amber-800 rounded-3xl p-8 mb-8 text-white">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center">
            <span className="text-4xl font-black">
              {(user.displayName || user.email || 'U')[0].toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-black">{user.displayName || 'Customer'}</h1>
            <p className="text-amber-200">{user.email}</p>
            {userProfile?.role === 'admin' && (
              <span className="mt-2 inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                Admin
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Menu grid */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {menuItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 flex items-center gap-4 hover:border-amber-200 hover:shadow-md transition-all group"
          >
            <div className="w-12 h-12 bg-amber-50 group-hover:bg-amber-100 rounded-xl flex items-center justify-center transition">
              <item.icon className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-stone-900">{item.label}</p>
              <p className="text-sm text-stone-500">{item.desc}</p>
            </div>
          </Link>
        ))}

        {userProfile?.role === 'admin' && (
          <Link
            href="/admin"
            className="bg-stone-900 rounded-2xl p-6 flex items-center gap-4 hover:bg-stone-800 transition-all group sm:col-span-2"
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

      <button
        onClick={async () => { await logout(); router.push('/'); }}
        className="flex items-center gap-2 text-red-500 hover:text-red-700 font-medium text-sm transition"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );
}
