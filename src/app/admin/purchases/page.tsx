'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Eye, Pencil, Plus, ReceiptText, Search, Trash2 } from 'lucide-react';
import { deletePurchase, getAllPurchases, getAllSuppliers } from '@/lib/firestore';
import { useAuth } from '@/context/auth-context';
import type { Purchase, Supplier } from '@/types';
import { formatDate } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { EmptyState, Spinner } from '@/components/ui';
import toast from 'react-hot-toast';

export default function AdminPurchasesPage() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const [purchaseData, supplierData] = await Promise.all([getAllPurchases(), getAllSuppliers()]);
    setPurchases(purchaseData);
    setSuppliers(supplierData);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const supplierMap = useMemo(
    () => new Map(suppliers.map((supplier) => [supplier.id, supplier.supplierName])),
    [suppliers],
  );

  const filteredPurchases = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return purchases;

    return purchases.filter((purchase) => {
      const supplierName = supplierMap.get(purchase.supplierId) || '';
      return (
        purchase.purchaseNumber.toLowerCase().includes(term) ||
        supplierName.toLowerCase().includes(term)
      );
    });
  }, [purchases, search, supplierMap]);

  const handleDelete = async (purchase: Purchase) => {
    if (!window.confirm(`Delete purchase ${purchase.purchaseNumber}? This will deduct its stock from inventory.`)) {
      return;
    }

    try {
      await deletePurchase(purchase.id, user?.email || user?.uid || 'admin');
      toast.success('Purchase deleted and stock adjusted');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete purchase');
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-stone-900">Purchases</h1>
          <p className="mt-1 text-stone-500">Record and review supplier purchase entries.</p>
        </div>
        <Link href="/admin/purchases/new">
          <Button>
            <Plus className="h-4 w-4" />
            Add Purchase
          </Button>
        </Link>
      </div>

      <div className="mb-5 max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by purchase number or supplier"
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : filteredPurchases.length === 0 ? (
        <EmptyState
          icon={<ReceiptText className="h-16 w-16" />}
          title={purchases.length === 0 ? 'No purchases yet' : 'No purchases match your search'}
          description={
            purchases.length === 0
              ? 'Create your first purchase entry to start recording procurement.'
              : 'Try a different search term.'
          }
          action={
            purchases.length === 0 ? (
              <Link href="/admin/purchases/new">
                <Button>Create Purchase</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Purchase Number</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Supplier</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Total Qty</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Created By</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filteredPurchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-stone-50 transition">
                    <td className="px-5 py-4 font-mono text-sm font-bold text-stone-900">{purchase.purchaseNumber}</td>
                    <td className="px-5 py-4 text-sm text-stone-600">{formatDate(purchase.purchaseDate)}</td>
                    <td className="px-5 py-4 text-sm text-stone-600">{supplierMap.get(purchase.supplierId) || '-'}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-stone-900">{purchase.totalQty}</td>
                    <td className="px-5 py-4 text-sm text-stone-600">{purchase.createdBy || '-'}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/purchases/${purchase.id}`}
                          className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                          title="View purchase"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/admin/purchases/${purchase.id}/edit`}
                          className="rounded-lg p-2 text-stone-400 transition hover:bg-amber-50 hover:text-amber-600"
                          title="Edit purchase"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleDelete(purchase)}
                          className="rounded-lg p-2 text-stone-400 transition hover:bg-red-50 hover:text-red-600"
                          title="Delete purchase"
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
