'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getAllProducts, deleteProduct, updateProduct } from '@/lib/firestore';
import type { Product } from '@/types';
import { formatPrice } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { Spinner, EmptyState } from '@/components/ui';
import { Plus, Pencil, Trash2, Package, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    const p = await getAllProducts();
    setProducts(p);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await deleteProduct(id);
    toast.success('Product deleted');
    load();
  };

  const toggleActive = async (product: Product) => {
    await updateProduct(product.id, { active: !product.active });
    toast.success(`Product ${product.active ? 'hidden' : 'shown'}`);
    load();
  };

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.categoryName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-stone-900">Products</h1>
          <p className="text-stone-500 mt-1">{products.length} total products</p>
        </div>
        <Link href="/admin/products/new">
          <Button><Plus className="w-4 h-4" /> Add Product</Button>
        </Link>
      </div>

      {/* Search */}
      <div className="mb-5">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full max-w-sm px-4 py-2.5 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
        />
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Product</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Price From</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Variants</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filtered.map(product => {
                  const minPrice = Math.min(...product.variants.map(v => v.price));
                  return (
                    <tr key={product.id} className="hover:bg-stone-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 shrink-0">
                            {product.images[0] ? (
                              <Image src={product.images[0]} alt={product.name} width={40} height={40} className="object-cover w-full h-full" />
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
                      <td className="px-4 py-3 text-sm text-stone-600">{product.categoryName}</td>
                      <td className="px-4 py-3 text-sm font-bold text-stone-900">{formatPrice(minPrice)}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{product.variants.length}</td>
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
