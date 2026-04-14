'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { getUserOrders } from '@/lib/firestore';
import { formatPrice, formatDate, ORDER_STATUS_COLORS } from '@/lib/utils';
import type { Order } from '@/types';
import { Spinner, EmptyState, Badge } from '@/components/ui';
import { Package, ChevronRight } from 'lucide-react';

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) { router.push('/auth/login?redirect=/account/orders'); return; }
    if (user) {
      getUserOrders(user.uid).then(o => { setOrders(o); setOrdersLoading(false); });
    }
  }, [user, loading, router]);

  if (loading || ordersLoading) return <div className="min-h-screen flex items-center justify-center"><Spinner className="w-8 h-8" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/account" className="text-stone-500 hover:text-amber-600 transition">Account</Link>
        <ChevronRight className="w-4 h-4 text-stone-400" />
        <h1 className="text-2xl font-black text-stone-900">My Orders</h1>
      </div>

      {!orders.length ? (
        <EmptyState
          icon={<Package className="w-16 h-16" />}
          title="No orders yet"
          description="When you place an order, it will appear here."
          action={<Link href="/products" className="inline-flex items-center gap-2 bg-amber-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-amber-700 transition">Shop Now</Link>}
        />
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-4 p-5 border-b border-stone-50">
                <div>
                  <p className="text-xs text-stone-500 mb-0.5">Order ID</p>
                  <p className="font-bold text-stone-900 font-mono text-sm">#{order.id.slice(-8).toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 mb-0.5">Date</p>
                  <p className="text-sm font-medium text-stone-700">{formatDate(order.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 mb-0.5">Total</p>
                  <p className="text-sm font-black text-stone-900">{formatPrice(order.total)}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${ORDER_STATUS_COLORS[order.status]}`}>
                  {order.status}
                </span>
              </div>
              <div className="p-5">
                <div className="space-y-2">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-stone-100 rounded-lg flex items-center justify-center shrink-0">
                        <Package className="w-5 h-5 text-stone-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-stone-900 line-clamp-1">{item.productName}</p>
                        <p className="text-xs text-stone-500">{item.size} · {item.material} · Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-stone-700 shrink-0">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-stone-50 text-xs text-stone-500">
                  Shipping to: {order.shippingAddress.fullName}, {order.shippingAddress.city}, {order.shippingAddress.state}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
