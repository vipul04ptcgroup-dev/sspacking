'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { deleteSupplier, getAllSuppliers } from '@/lib/firestore';
import { useAuth } from '@/context/auth-context';
import type { Supplier } from '@/types';
import { formatDate } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { EmptyState, Spinner } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Building2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSuppliersPage() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setSuppliers(await getAllSuppliers());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredSuppliers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return suppliers;

    return suppliers.filter((supplier) =>
      supplier.supplierName.toLowerCase().includes(term) ||
      supplier.contactPerson.toLowerCase().includes(term) ||
      supplier.mobile.toLowerCase().includes(term) ||
      supplier.email.toLowerCase().includes(term) ||
      supplier.gstNumber.toLowerCase().includes(term),
    );
  }, [suppliers, search]);

  const handleDelete = async (supplier: Supplier) => {
    if (!window.confirm(`Delete supplier "${supplier.supplierName}"?`)) return;

    try {
      await deleteSupplier(supplier.id, user?.email || user?.uid || 'admin');
      toast.success('Supplier deleted');
      await load();
    } catch {
      toast.error('Failed to delete supplier');
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-stone-900">Suppliers</h1>
          <p className="mt-1 text-stone-500">Manage supplier contacts for purchase entries.</p>
        </div>
        <Link href="/admin/suppliers/new">
          <Button>
            <Plus className="h-4 w-4" />
            Add Supplier
          </Button>
        </Link>
      </div>

      <div className="mb-5 max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search suppliers by name, contact, mobile, email, or GST"
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-16 w-16" />}
          title={suppliers.length === 0 ? 'No suppliers yet' : 'No suppliers match your search'}
          description={
            suppliers.length === 0
              ? 'Create your first supplier to start recording purchases.'
              : 'Try a different search term.'
          }
          action={
            suppliers.length === 0 ? (
              <Link href="/admin/suppliers/new">
                <Button>Create Supplier</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Supplier</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Contact Person</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Mobile</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">GST Number</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Created</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-stone-50 transition">
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{supplier.supplierName}</p>
                        <p className="text-xs text-stone-500">{supplier.address || '-'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-600">{supplier.contactPerson || '-'}</td>
                    <td className="px-5 py-4 text-sm text-stone-600">{supplier.mobile || '-'}</td>
                    <td className="px-5 py-4 text-sm text-stone-600">{supplier.email || '-'}</td>
                    <td className="px-5 py-4 text-sm text-stone-600">{supplier.gstNumber || '-'}</td>
                    <td className="px-5 py-4">
                      <Badge variant={supplier.status ? 'success' : 'default'}>
                        {supplier.status ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-500">{formatDate(supplier.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/suppliers/${supplier.id}`}
                          className="rounded-lg p-2 text-stone-400 transition hover:bg-amber-50 hover:text-amber-600"
                          title="Edit supplier"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleDelete(supplier)}
                          className="rounded-lg p-2 text-stone-400 transition hover:bg-red-50 hover:text-red-600"
                          title="Delete supplier"
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
