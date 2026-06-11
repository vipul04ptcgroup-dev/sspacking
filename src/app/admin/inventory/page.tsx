'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import {
  addInventoryStock,
  backfillProductStockFields,
  getAllProducts,
  getInventoryTransactions,
} from '@/lib/firestore';
import type { InventoryTransaction, Product } from '@/types';
import { formatDate } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Badge, EmptyState, Spinner, Textarea } from '@/components/ui';
import {
  Boxes,
  History,
  PackageOpen,
  Search,
  TrendingDown,
  TriangleAlert,
} from 'lucide-react';
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

function getProductImage(product: Product): string {
  return (
    product.images?.[0] ||
    product.variants.find((variant) => Array.isArray(variant.images) && variant.images[0])?.images?.[0] ||
    ''
  );
}

export default function AdminInventoryPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [note, setNote] = useState('');

  const load = async () => {
    setLoading(true);
    await backfillProductStockFields();
    const [productData, transactionData] = await Promise.all([
      getAllProducts(),
      getInventoryTransactions(),
    ]);
    setProducts(productData);
    setTransactions(transactionData);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;

    return products.filter((product) => {
      const skuList = product.variants.map((variant) => variant.sku || '').join(' ');
      return (
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term) ||
        skuList.toLowerCase().includes(term)
      );
    });
  }, [products, search]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || null,
    [products, selectedProductId],
  );

  const stats = useMemo(() => {
    return {
      totalProducts: products.length,
      outOfStock: products.filter((product) => product.stockStatus === 'out_of_stock').length,
      lowStock: products.filter((product) => product.stockStatus === 'low_stock').length,
    };
  }, [products]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedQuantity = Number(quantity);
    if (!selectedProductId) {
      toast.error('Please select a product.');
      return;
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      toast.error('Quantity must be greater than 0.');
      return;
    }

    setSaving(true);
    try {
      await addInventoryStock(
        selectedProductId,
        parsedQuantity,
        note,
        user?.email || user?.uid || 'admin',
      );
      toast.success('Inventory updated successfully.');
      setQuantity('1');
      setNote('');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add inventory.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-stone-900">Inventory</h1>
          <p className="mt-1 text-stone-500">
            Track stock levels, add fresh inventory, and review stock movement history.
          </p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Boxes className="h-5 w-5" />
          </div>
          <div className="text-3xl font-black text-stone-900">{stats.totalProducts}</div>
          <p className="mt-1 text-sm text-stone-500">Tracked Products</p>
        </div>
        <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <TriangleAlert className="h-5 w-5" />
          </div>
          <div className="text-3xl font-black text-stone-900">{stats.lowStock}</div>
          <p className="mt-1 text-sm text-stone-500">Low Stock Products</p>
        </div>
        <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <TrendingDown className="h-5 w-5" />
          </div>
          <div className="text-3xl font-black text-stone-900">{stats.outOfStock}</div>
          <p className="mt-1 text-sm text-stone-500">Out Of Stock</p>
        </div>
      </div>

      <div className="mb-8 grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
              <PackageOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Stock In</h2>
              <p className="text-sm text-stone-500">Select a product and add fresh inventory.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-[42px] h-4 w-4 text-stone-400" />
              <Input
                id="inventorySearch"
                label="Search Product"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by product name, category, or SKU"
                className="pl-10"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="productId" className="text-sm font-medium text-stone-700">Select Product</label>
              <select
                id="productId"
                value={selectedProductId}
                onChange={(event) => setSelectedProductId(event.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-800 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Choose a product</option>
                {filteredProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.stockQuantity} in stock)
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct ? (
              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-white">
                    {getProductImage(selectedProduct) ? (
                      <Image src={getProductImage(selectedProduct)} alt={selectedProduct.name} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-stone-300">
                        <PackageOpen className="h-7 w-7" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-stone-900">{selectedProduct.name}</p>
                    <p className="text-xs text-stone-500">{selectedProduct.category}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          selectedProduct.stockStatus === 'out_of_stock'
                            ? 'danger'
                            : selectedProduct.stockStatus === 'low_stock'
                              ? 'warning'
                              : 'success'
                        }
                      >
                        {selectedProduct.stockStatus.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-stone-500">
                        Current stock: <span className="font-semibold text-stone-800">{selectedProduct.stockQuantity}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="quantity"
                label="Add Quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="Enter quantity"
              />
              <Input
                id="currentStock"
                label="Current Stock"
                value={selectedProduct ? String(selectedProduct.stockQuantity) : '-'}
                readOnly
                className="bg-stone-50"
              />
            </div>

            <Textarea
              id="inventoryNote"
              label="Note (Optional)"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Batch received, warehouse refill, purchase entry, or supplier note..."
            />

            <div className="flex items-center gap-3">
              <Button type="submit" loading={saving} disabled={loading}>
                {saving ? 'Saving...' : 'Add Stock'}
              </Button>
              <p className="text-xs text-stone-500">Inventory transactions are recorded automatically.</p>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Recent Stock Movements</h2>
              <p className="text-sm text-stone-500">Latest inventory updates recorded in Firebase.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState
              icon={<History className="h-14 w-14" />}
              title="No inventory transactions yet"
              description="Stock additions and website order deductions will appear here."
            />
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="rounded-xl border border-stone-100 bg-stone-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{transaction.productName}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        {transaction.source.replace(/_/g, ' ')} • {formatDateTime(transaction.createdAt)}
                      </p>
                    </div>
                    <Badge variant={transaction.type === 'IN' ? 'success' : 'danger'}>
                      {transaction.type}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-stone-500">Quantity</p>
                      <p className="font-semibold text-stone-900">{transaction.quantity}</p>
                    </div>
                    <div>
                      <p className="text-stone-500">Previous</p>
                      <p className="font-semibold text-stone-900">{transaction.previousStock}</p>
                    </div>
                    <div>
                      <p className="text-stone-500">New</p>
                      <p className="font-semibold text-stone-900">{transaction.newStock}</p>
                    </div>
                  </div>
                  {transaction.note ? (
                    <p className="mt-3 text-xs text-stone-600">{transaction.note}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-stone-100 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-stone-100 bg-stone-50 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Inventory Overview</h2>
            <p className="text-sm text-stone-500">All products with current stock levels and thresholds.</p>
          </div>
          <div className="text-sm text-stone-500">
            Showing {filteredProducts.length} of {products.length} products
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={<Boxes className="h-16 w-16" />}
            title="No products match your search"
            description="Try a different name, category, or SKU."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px]">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Product</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Current Stock</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Low Stock Limit</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Stock Status</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-stone-50 transition">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-stone-100">
                          {getProductImage(product) ? (
                            <Image src={getProductImage(product)} alt={product.name} fill className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-stone-300">
                              <PackageOpen className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-stone-900">{product.name}</p>
                          <p className="text-xs text-stone-500">{product.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-stone-900">{product.stockQuantity}</td>
                    <td className="px-5 py-4 text-sm text-stone-600">{product.lowStockLimit}</td>
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
                      {product.lastStockUpdatedAt ? formatDateTime(product.lastStockUpdatedAt) : formatDate(product.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-stone-100 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-stone-100 bg-stone-50 px-5 py-4">
          <h2 className="text-lg font-bold text-stone-900">Inventory Transaction History</h2>
          <p className="text-sm text-stone-500">Complete movement log for manual stock additions and website deductions.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={<History className="h-16 w-16" />}
            title="No inventory history yet"
            description="Transactions will appear here after stock changes."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px]">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Product</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Type</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Source</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Quantity</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Previous</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">New</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Created By</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-stone-50 transition">
                    <td className="px-5 py-4 text-sm text-stone-500">{formatDateTime(transaction.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{transaction.productName}</p>
                        <p className="text-xs text-stone-500">{transaction.productId}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={transaction.type === 'IN' ? 'success' : 'danger'}>
                        {transaction.type}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-sm text-stone-600">{transaction.source.replace(/_/g, ' ')}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-stone-900">{transaction.quantity}</td>
                    <td className="px-5 py-4 text-sm text-stone-600">{transaction.previousStock}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-stone-900">{transaction.newStock}</td>
                    <td className="px-5 py-4 text-sm text-stone-600">{transaction.createdBy || '-'}</td>
                    <td className="px-5 py-4 text-sm text-stone-600">{transaction.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
