'use client';

import { useEffect, useMemo, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { backfillProductStockFields, getAllProducts } from '@/lib/firestore';
import { formatQuantityWithUnit, getProductUnitLabel } from '@/lib/product-units';
import { useAuth } from '@/context/auth-context';
import type { Product } from '@/types';
import { Badge, EmptyState, Spinner } from '@/components/ui';
import Button from '@/components/ui/Button';
import { Boxes, LogOut, PackageOpen, Search } from 'lucide-react';
import toast from 'react-hot-toast';

function formatDateTime(date?: Date | null): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function TeamStockPage() {
  const { user, teamProfile, logout } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await backfillProductStockFields();
        setProducts(await getAllProducts());
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;

    return products.filter((product) =>
      product.name.toLowerCase().includes(term) ||
      product.categoryId.toLowerCase().includes(term) ||
      product.slug.toLowerCase().includes(term),
    );
  }, [products, search]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        await fetch('/api/team/access-log', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ type: 'logout' }),
        });
      }
      await logout();
    } catch {
      await signOut(auth);
      toast.error('Logout log could not be saved, but you have been signed out.');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-600">Team Panel</p>
            <h1 className="mt-1 text-3xl font-black text-stone-900">Stock View Only</h1>
            <p className="mt-1 text-sm text-stone-500">
              Signed in as {teamProfile?.displayName || user?.email || 'Team member'}.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => void handleLogout()} loading={loggingOut}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Boxes className="h-5 w-5" />
            </div>
            <div className="text-3xl font-black text-stone-900">{products.length}</div>
            <p className="mt-1 text-sm text-stone-500">Products Visible</p>
          </div>
          <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <PackageOpen className="h-5 w-5" />
            </div>
            <div className="text-3xl font-black text-stone-900">{products.filter((product) => product.stockStatus === 'low_stock').length}</div>
            <p className="mt-1 text-sm text-stone-500">Low Stock</p>
          </div>
          <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Boxes className="h-5 w-5" />
            </div>
            <div className="text-3xl font-black text-stone-900">{products.filter((product) => product.stockStatus === 'out_of_stock').length}</div>
            <p className="mt-1 text-sm text-stone-500">Out Of Stock</p>
          </div>
        </div>

        <div className="mb-5">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search product, category, or slug"
              className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={<PackageOpen className="h-16 w-16" />}
            title={products.length === 0 ? 'No products available' : 'No products match your search'}
            description={products.length === 0 ? 'Ask admin to add products first.' : 'Try another product name or category.'}
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Product</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Category</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Stock</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Low Stock Limit</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Unit</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Last Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-stone-50 transition">
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-semibold text-stone-900">{product.name}</p>
                          <p className="text-xs text-stone-500">{product.slug}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-stone-600">{product.categoryId}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-stone-900">{formatQuantityWithUnit(product.stockQuantity, product.unit)}</td>
                      <td className="px-5 py-4 text-sm text-stone-600">{formatQuantityWithUnit(product.lowStockLimit, product.unit)}</td>
                      <td className="px-5 py-4 text-sm text-stone-600">{getProductUnitLabel(product.unit)}</td>
                      <td className="px-5 py-4">
                        <Badge
                          variant={
                            product.stockStatus === 'out_of_stock'
                              ? 'danger'
                              : product.stockStatus === 'low_stock'
                                ? 'warning'
                                : 'success'
                          }
                        >
                          {product.stockStatus.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-sm text-stone-500">
                        {formatDateTime(product.lastStockUpdatedAt || product.updatedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
