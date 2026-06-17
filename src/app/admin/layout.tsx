'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { Spinner } from '@/components/ui';
import {
  LayoutDashboard, Package, ShoppingBag, Tags, Users, MessageSquare,
  ArrowLeft, Menu, FileText, Boxes, ReceiptText, History, ShieldUser, ClipboardList, Building2, Factory, BarChart3, FlaskConical,
} from 'lucide-react';

const navSections = [
  {
    title: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
    ],
  },
  {
    title: 'Catalog',
    items: [
      { icon: Package, label: 'Products', href: '/admin/products' },
      { icon: Boxes, label: 'Inventory', href: '/admin/inventory' },
      { icon: Tags, label: 'Categories', href: '/admin/categories' },
    ],
  },
  {
    title: 'Sales',
    items: [
      { icon: ShoppingBag, label: 'Orders', href: '/admin/orders' },
      { icon: ReceiptText, label: 'Sales', href: '/admin/sales' },
      { icon: FileText, label: 'Delivery Challan', href: '/admin/delivery-challan' },
    ],
  },
  {
    title: 'Procurement',
    items: [
      { icon: Building2, label: 'Suppliers', href: '/admin/suppliers' },
      { icon: ClipboardList, label: 'Purchases', href: '/admin/purchases' },
      { icon: FlaskConical, label: 'Materials', href: '/admin/materials' },
      { icon: Factory, label: 'Production Entry', href: '/admin/production' },
      { icon: BarChart3, label: 'Production Reports', href: '/admin/production-reports' },
    ],
  },
  {
    title: 'Engagement',
    items: [
      { icon: MessageSquare, label: 'Quote Requests', href: '/admin/quotes' },
    ],
  },
  {
    title: 'Users',
    items: [
      { icon: Users, label: 'Customers', href: '/admin/users' },
      { icon: ShieldUser, label: 'Team Members', href: '/admin/team' },
    ],
  },
  {
    title: 'Systems',
    items: [
      { icon: History, label: 'Admin Logs', href: '/admin/logs' },
      { icon: ClipboardList, label: 'Team Logs', href: '/admin/team-logs' },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.push('/');
  }, [user, isAdmin, loading, router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner className="w-8 h-8" /></div>;
  if (!user || !isAdmin) return null;

  return (
    <div className="flex min-h-screen bg-stone-100">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="admin-mobile-overlay fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`admin-sidebar fixed top-0 left-0 z-30 flex h-screen w-64 flex-col overflow-hidden bg-stone-900 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="p-5 border-b border-stone-800">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-black">S</span>
            </div>
            <div>
              <div className="text-white font-black text-sm">SS Packaging</div>
              <div className="text-amber-400 text-[10px] font-semibold">Admin Panel</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="px-4 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                        active
                          ? 'bg-amber-600 text-white'
                          : 'text-stone-400 hover:bg-stone-800 hover:text-white'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-stone-800 p-3">
          <Link href="/" className="flex items-center gap-2 px-4 py-2.5 text-stone-500 hover:text-white text-sm transition rounded-xl hover:bg-stone-800">
            <ArrowLeft className="w-4 h-4" /> Back to Store
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 lg:ml-64">
        {/* Top bar (mobile) */}
        <div className="admin-mobile-bar lg:hidden sticky top-0 z-10 bg-white border-b border-stone-200 px-4 h-14 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-stone-900">Admin Panel</span>
        </div>
        <div className="admin-content-shell p-4 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
