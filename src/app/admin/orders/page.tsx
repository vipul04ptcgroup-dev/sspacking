'use client';

import { useEffect, useState } from 'react';
import { getAllOrders, updateOrderStatus } from '@/lib/firestore';
import type { Order, OrderStatus } from '@/types';
import { formatPrice, formatDate, ORDER_STATUS_COLORS } from '@/lib/utils';
import { Spinner, EmptyState, Select } from '@/components/ui';
import { ShoppingBag, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = async () => {
    const o = await getAllOrders();
    setOrders(o);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    await updateOrderStatus(orderId, status);
    toast.success(`Order status updated to ${status}`);
    load();
  };

  const filtered = filterStatus ? orders.filter(o => o.status === filterStatus) : orders;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-stone-900">Orders</h1>
          <p className="text-stone-500 mt-1">{orders.length} total orders</p>
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="text-sm border border-stone-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<ShoppingBag className="w-16 h-16" />} title="No orders found" />
      ) : (
        <div className="space-y-3">
          {filtered.map(order => (
            <div key={order.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div
                className="flex flex-wrap items-center justify-between gap-4 p-5 cursor-pointer hover:bg-stone-50 transition"
                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-bold text-stone-900 font-mono text-sm">#{order.id.slice(-8).toUpperCase()}</p>
                    <p className="text-xs text-stone-500">{order.userEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="text-right">
                    <p className="text-xs text-stone-400">{formatDate(order.createdAt)}</p>
                    <p className="font-black text-stone-900">{formatPrice(order.total)}</p>
                  </div>
                  <div onClick={e => e.stopPropagation()}>
                    <select
                      value={order.status}
                      onChange={e => handleStatusChange(order.id, e.target.value as OrderStatus)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer ${ORDER_STATUS_COLORS[order.status]}`}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${expandedId === order.id ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {expandedId === order.id && (
                <div className="border-t border-stone-100 p-5 bg-stone-50/50">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-bold text-stone-700 mb-3">Items</h4>
                      <div className="space-y-2">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-stone-700">{item.productName} <span className="text-stone-400">({item.size}, {item.material}) ×{item.quantity}</span></span>
                            <span className="font-semibold">{formatPrice(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-stone-200 flex justify-between text-sm font-black">
                        <span>Total</span><span>{formatPrice(order.total)}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-stone-700 mb-3">Shipping Address</h4>
                      <div className="text-sm text-stone-600 space-y-0.5">
                        <p className="font-semibold text-stone-900">{order.shippingAddress.fullName}</p>
                        <p>{order.shippingAddress.phone}</p>
                        <p>{order.shippingAddress.addressLine1}</p>
                        {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                        <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
