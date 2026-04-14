'use client';

import { useEffect, useState } from 'react';
import { getAllProducts, getAllOrders, getAllUsers, getAllQuotes } from '@/lib/firestore';
import { formatPrice } from '@/lib/utils';
import { Package, ShoppingBag, Users, MessageSquare, TrendingUp, Clock } from 'lucide-react';
import { ORDER_STATUS_COLORS } from '@/lib/utils';
import Link from 'next/link';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ products: 0, orders: 0, users: 0, quotes: 0, revenue: 0, pending: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllProducts(), getAllOrders(), getAllUsers(), getAllQuotes()]).then(([products, orders, users, quotes]) => {
      const revenue = orders.filter(o => o.paymentStatus === 'paid').reduce((sum, o) => sum + o.total, 0);
      const pending = orders.filter(o => o.status === 'pending').length;
      setStats({ products: products.length, orders: orders.length, users: users.length, quotes: quotes.length, revenue, pending });
      setRecentOrders(orders.slice(0, 6));
      setLoading(false);
    });
  }, []);

  const cards = [
    { icon: Package, label: 'Total Products', value: stats.products, color: 'bg-blue-50 text-blue-600', href: '/admin/products' },
    { icon: ShoppingBag, label: 'Total Orders', value: stats.orders, color: 'bg-amber-50 text-amber-600', href: '/admin/orders' },
    { icon: TrendingUp, label: 'Total Revenue', value: formatPrice(stats.revenue), color: 'bg-green-50 text-green-600', href: '/admin/orders' },
    { icon: Clock, label: 'Pending Orders', value: stats.pending, color: 'bg-orange-50 text-orange-600', href: '/admin/orders' },
    { icon: Users, label: 'Customers', value: stats.users, color: 'bg-purple-50 text-purple-600', href: '/admin/users' },
    { icon: MessageSquare, label: 'Quote Requests', value: stats.quotes, color: 'bg-pink-50 text-pink-600', href: '/admin/quotes' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-900">Dashboard</h1>
        <p className="text-stone-500 mt-1">Welcome back! Here's what's happening.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {cards.map(card => (
          <Link key={card.label} href={card.href} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 hover:shadow-md transition group">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-stone-900">{loading ? '—' : card.value}</div>
            <div className="text-sm text-stone-500 mt-0.5">{card.label}</div>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-stone-50">
          <h2 className="text-lg font-bold text-stone-900">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm text-amber-600 font-semibold hover:underline">View All</Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-stone-400">Loading...</div>
        ) : recentOrders.length === 0 ? (
          <div className="p-8 text-center text-stone-400">No orders yet</div>
        ) : (
          <div className="divide-y divide-stone-50">
            {recentOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between p-4 hover:bg-stone-50 transition">
                <div>
                  <p className="font-semibold text-stone-900 text-sm font-mono">#{order.id.slice(-8).toUpperCase()}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{order.userEmail} · {order.items.length} item(s)</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-stone-900 text-sm">{formatPrice(order.total)}</span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${ORDER_STATUS_COLORS[order.status]}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
