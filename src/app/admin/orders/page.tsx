'use client';

import { useEffect, useState } from 'react';
import { getAllOrders, updateOrderStatus } from '@/lib/firestore';
import { useAuth } from '@/context/auth-context';
import type { Order, OrderStatus } from '@/types';
import { formatPrice, formatDate, ORDER_STATUS_COLORS } from '@/lib/utils';
import { Spinner, EmptyState, Modal, Textarea } from '@/components/ui';
import Button from '@/components/ui/Button';
import { ShoppingBag, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelNote, setCancelNote] = useState('');

  const load = async () => {
    const o = await getAllOrders();
    setOrders(o);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const closeCancelModal = () => {
    setCancelModalOpen(false);
    setCancelTarget(null);
    setCancelNote('');
  };

  const applyStatusChange = async (orderId: string, status: OrderStatus, cancellationNote?: string) => {
    setStatusUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, status, user?.email || user?.uid || 'admin', cancellationNote);
      toast.success(`Order status updated to ${status}`);
      await load();
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleStatusChange = async (orderId: string, status: OrderStatus) => {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return;

    if (status === 'cancelled') {
      setCancelTarget(order);
      setCancelNote(order.cancellationNote || '');
      setCancelModalOpen(true);
      return;
    }

    await applyStatusChange(orderId, status);
  };

  const handleConfirmCancellation = async () => {
    if (!cancelTarget) return;
    await applyStatusChange(cancelTarget.id, 'cancelled', cancelNote.trim());
    closeCancelModal();
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
                      disabled={statusUpdatingId === order.id}
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
                            <span className="text-stone-700">{item.productName} <span className="text-stone-400">({item.variantLabel}) ×{item.quantity}</span></span>
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
                  {order.cancellationNote ? (
                    <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-red-700">Cancellation Note</p>
                      <p className="mt-2 text-sm text-red-900">{order.cancellationNote}</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <Modal
        open={cancelModalOpen}
        onClose={closeCancelModal}
        title={cancelTarget ? `Cancel Order #${cancelTarget.id.slice(-8).toUpperCase()}` : 'Cancel Order'}
      >
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            Add a cancellation note for this order. This note will be saved in Firebase and shown in the order details.
          </p>
          <Textarea
            id="orderCancellationNote"
            label="Cancellation Note"
            value={cancelNote}
            onChange={(event) => setCancelNote(event.target.value)}
            placeholder="Why was this order cancelled?"
          />
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="danger"
              onClick={() => void handleConfirmCancellation()}
              loading={statusUpdatingId === cancelTarget?.id}
            >
              Confirm Cancellation
            </Button>
            <Button type="button" variant="ghost" onClick={closeCancelModal}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
