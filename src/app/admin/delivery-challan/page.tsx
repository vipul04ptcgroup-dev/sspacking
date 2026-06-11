'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import {
  deleteDeliveryChallan,
  getAllDeliveryChallans,
} from '@/lib/firestore';
import type { DeliveryChallan, DeliveryChallanStatus } from '@/types';
import { formatDate } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { EmptyState, Spinner } from '@/components/ui';
import {
  ClipboardList,
  Eye,
  FilePlus2,
  FileText,
  Pencil,
  Printer,
  Search,
  Trash2,
  Truck,
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS: { value: '' | DeliveryChallanStatus; label: string }[] = [
  { value: '', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'ready', label: 'Ready' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

const STATUS_STYLES: Record<DeliveryChallanStatus, string> = {
  draft: 'bg-stone-100 text-stone-700',
  ready: 'bg-blue-100 text-blue-700',
  dispatched: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function AdminDeliveryChallanPage() {
  const { user } = useAuth();
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | DeliveryChallanStatus>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    const data = await getAllDeliveryChallans();
    setChallans(data);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredChallans = useMemo(() => {
    const term = search.trim().toLowerCase();

    return challans.filter((challan) => {
      const matchesSearch =
        !term ||
        challan.challanNumber.toLowerCase().includes(term) ||
        challan.customerName.toLowerCase().includes(term) ||
        challan.orderId.toLowerCase().includes(term);

      const matchesStatus = !statusFilter || challan.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [challans, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: challans.length,
      dispatched: challans.filter((challan) => challan.status === 'dispatched').length,
      delivered: challans.filter((challan) => challan.status === 'delivered').length,
    };
  }, [challans]);

  const handleDelete = async (challan: DeliveryChallan) => {
    if (!window.confirm(`Delete challan ${challan.challanNumber}? This cannot be undone.`)) return;

    setDeletingId(challan.id);
    try {
      await deleteDeliveryChallan(challan.id, user?.email || user?.uid || 'admin');
      setChallans((current) => current.filter((item) => item.id !== challan.id));
      toast.success(`Deleted ${challan.challanNumber}`);
    } catch {
      toast.error('Failed to delete challan.');
    } finally {
      setDeletingId(null);
    }
  };

  const notifyAction = (label: string, challanNumber: string) => {
    toast(`${label} for ${challanNumber} will be connected next.`);
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-stone-900">Delivery Challan</h1>
          <p className="mt-1 text-stone-500">
            Search, filter, and manage dispatch records from the admin panel.
          </p>
        </div>
        <Link href="/admin/delivery-challan/new">
          <Button>
            <FilePlus2 className="h-4 w-4" />
            Create Challan
          </Button>
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div className="text-3xl font-black text-stone-900">{stats.total}</div>
          <p className="mt-1 text-sm text-stone-500">Total Challans</p>
        </div>
        <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <Truck className="h-5 w-5" />
          </div>
          <div className="text-3xl font-black text-stone-900">{stats.dispatched}</div>
          <p className="mt-1 text-sm text-stone-500">Dispatched</p>
        </div>
        <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-600">
            <FileText className="h-5 w-5" />
          </div>
          <div className="text-3xl font-black text-stone-900">{stats.delivered}</div>
          <p className="mt-1 text-sm text-stone-500">Delivered</p>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by challan number, customer, or order ID"
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as '' | DeliveryChallanStatus)}
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400 lg:w-56"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : filteredChallans.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-16 w-16" />}
          title={challans.length === 0 ? 'No delivery challans yet' : 'No challans match your filters'}
          description={
            challans.length === 0
              ? 'Create your first challan to start tracking dispatch records.'
              : 'Try a different search term or status filter.'
          }
          action={
            challans.length === 0 ? (
              <Link href="/admin/delivery-challan/new">
                <Button>Create Challan</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px]">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Challan Number</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Customer Name</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Linked Order ID</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Dispatch Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Vehicle Number</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filteredChallans.map((challan) => (
                  <tr key={challan.id} className="hover:bg-stone-50 transition">
                    <td className="px-5 py-4">
                      <p className="font-mono text-sm font-bold text-stone-900">{challan.challanNumber}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{challan.customerName}</p>
                        <p className="text-xs text-stone-500">{challan.customerEmail}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-stone-700">
                      {challan.orderId || '-'}
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-600">
                      {challan.dispatchedAt ? formatDate(challan.dispatchedAt) : '-'}
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-600">
                      {challan.transportDetails.vehicleNumber || '-'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${STATUS_STYLES[challan.status]}`}>
                        {challan.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/delivery-challan/${challan.id}`}
                          className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => notifyAction('Edit', challan.challanNumber)}
                          className="rounded-lg p-2 text-stone-400 transition hover:bg-amber-50 hover:text-amber-600"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => notifyAction('Print', challan.challanNumber)}
                          className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                          title="Print"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(challan)}
                          disabled={deletingId === challan.id}
                          className="rounded-lg p-2 text-stone-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          title="Delete"
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
