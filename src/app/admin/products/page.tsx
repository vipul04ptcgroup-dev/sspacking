'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { backfillProductStockFields, getAllProducts, deleteProduct, updateProduct, getAllCategories } from '@/lib/firestore';
import { getProductUnitLabel } from '@/lib/product-units';
import { useAuth } from '@/context/auth-context';
import type { Product, Category } from '@/types';
import { formatPrice } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { Spinner, EmptyState } from '@/components/ui';
import { Plus, Pencil, Trash2, Package, Eye, EyeOff, Upload } from 'lucide-react';
import toast from 'react-hot-toast';

function getAdminProductsDisplayUnit(product: Pick<Product, 'unit' | 'categoryId'>): string {
  return product.unit === 'gram' ? 'PCS' : getProductUnitLabel(product.unit);
}

function formatAdminProductsStock(product: Pick<Product, 'stockQuantity' | 'unit' | 'categoryId'>): string {
  return `${product.stockQuantity} ${getAdminProductsDisplayUnit(product)}`;
}

export default function AdminProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [importing, setImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    await backfillProductStockFields();
    const [p, c] = await Promise.all([getAllProducts(), getAllCategories()]);
    setProducts(p);
    setCategories(c);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await deleteProduct(id, user?.email || user?.uid || 'admin');
    toast.success('Product deleted');
    setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
    load();
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        return prev.filter((id) => !visibleProductIds.includes(id));
      }
      const merged = new Set([...prev, ...visibleProductIds]);
      return Array.from(merged);
    });
  };

  const handleBulkDelete = async () => {
    const idsToDelete = selectedIds.filter((id) => visibleProductIds.includes(id));
    if (!idsToDelete.length) {
      toast.error('No products selected');
      return;
    }
    if (!confirm(`Delete ${idsToDelete.length} selected product(s)? This cannot be undone.`)) return;

    setBulkDeleting(true);
    try {
      await Promise.all(idsToDelete.map((id) => deleteProduct(id, user?.email || user?.uid || 'admin')));
      toast.success(`Deleted ${idsToDelete.length} product(s)`);
      setSelectedIds((prev) => prev.filter((id) => !idsToDelete.includes(id)));
      await load();
    } catch {
      toast.error('Failed to delete selected products');
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleActive = async (product: Product) => {
    await updateProduct(product.id, { active: !product.active }, user?.email || user?.uid || 'admin');
    toast.success(`Product ${product.active ? 'hidden' : 'shown'}`);
    load();
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.json')) {
      toast.error('Please select a .json file');
      event.target.value = '';
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('performedBy', user?.email || user?.uid || 'admin');

      const response = await fetch('/admin/import-products', {
        method: 'POST',
        body: formData,
      });

      const result = (await response.json()) as {
        error?: string;
        imported?: number;
        failed?: number;
        errors?: string[];
      };
      if (!response.ok) {
        const firstError = result?.errors?.[0];
        throw new Error(firstError || result?.error || 'Import failed');
      }

      const imported = Number(result?.imported || 0);
      const failed = Number(result?.failed || 0);
      const firstError = result?.errors?.[0];

      if (imported === 0) {
        throw new Error(firstError || 'Import failed. No products were saved.');
      }

      toast.success(`Imported ${imported} product(s)`);
      if (failed > 0) {
        toast.error(`Skipped ${failed} row(s). ${firstError || 'Check JSON data and permissions.'}`);
      }
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.categoryId.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || p.categoryId === categoryFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && p.active) ||
      (statusFilter === 'inactive' && !p.active);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const visibleProductIds = filtered.map((product) => product.id);
  const allVisibleSelected =
    visibleProductIds.length > 0 && visibleProductIds.every((id) => selectedIds.includes(id));

  const categoryOptions = Array.from(
    new Set([
      ...categories.map((category) => category.slug),
      ...products.map((product) => product.categoryId),
    ].filter(Boolean))
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-stone-900">Products</h1>
          <p className="text-stone-500 mt-1">{products.length} total products</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleBulkDelete}
            disabled={bulkDeleting || selectedIds.filter((id) => visibleProductIds.includes(id)).length === 0}
          >
            {bulkDeleting ? 'Deleting...' : `Delete Selected (${selectedIds.filter((id) => visibleProductIds.includes(id)).length})`}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
            disabled={importing}
          />
          <Button
            type="button"
            variant="outline"
            disabled={importing}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-4 h-4" /> {importing ? 'Importing...' : 'Upload JSON'}
          </Button>
          <Link href="/admin/products/new">
            <Button><Plus className="w-4 h-4" /> Add Product</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full md:max-w-sm px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full md:w-56 px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
        >
          <option value="all">All Categories</option>
          {categoryOptions.map((categoryValue) => {
            const matchedCategory = categories.find((category) => category.slug === categoryValue);
            return (
              <option key={categoryValue} value={categoryValue}>
                {matchedCategory?.name || categoryValue}
              </option>
            );
          })}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className="w-full md:w-48 px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Package className="w-16 h-16" />} title="No products found" action={<Link href="/admin/products/new"><Button>Add Your First Product</Button></Link>} />
      ) : (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="text-left px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      aria-label="Select all visible products"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Unit</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Stock</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Price From</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Pricing Tiers</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filtered.map(product => {
                  const minPrice = product.pricingTiers.length
                    ? Math.min(...product.pricingTiers.map((tier) => tier.unitPrice))
                    : 0;
                  const thumbnail = product.images?.[0];
                  return (
                    <tr key={product.id} className="hover:bg-stone-50 transition">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(product.id)}
                          onChange={() => toggleSelectOne(product.id)}
                          aria-label={`Select ${product.name}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                            {thumbnail ? (
                              <Image
                                src={thumbnail}
                                alt={product.name}
                                width={40}
                                height={40}
                                unoptimized
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-stone-300" /></div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-stone-900">{product.name}</p>
                            <p className="text-xs text-stone-400">{product.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-600">{product.categoryId}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{getAdminProductsDisplayUnit(product)}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{formatAdminProductsStock(product)}</td>
                      <td className="px-4 py-3 text-sm font-bold text-stone-900">{formatPrice(minPrice)}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{product.pricingTiers.length}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${product.active ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500'}`}>
                          {product.active ? 'Active' : 'Hidden'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => toggleActive(product)} title={product.active ? 'Hide' : 'Show'} className="p-2 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition">
                            {product.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <Link href={`/admin/products/${product.id}`} className="p-2 text-stone-400 hover:text-amber-600 rounded-lg hover:bg-amber-50 transition">
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <button onClick={() => handleDelete(product.id, product.name)} className="p-2 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
