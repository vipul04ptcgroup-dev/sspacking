'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, PackageOpen, Pencil, ReceiptText, Trash2 } from 'lucide-react';
import { deletePurchase, getAllProducts, getAllSuppliers, getPurchaseById, getPurchaseItemsByPurchaseId } from '@/lib/firestore';
import { useAuth } from '@/context/auth-context';
import type { Product, Purchase, PurchaseItem, Supplier } from '@/types';
import { formatDate } from '@/lib/utils';
import { EmptyState, Spinner } from '@/components/ui';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

export default function ViewPurchasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPurchaseById(id),
      getPurchaseItemsByPurchaseId(id),
      getAllSuppliers(),
      getAllProducts(),
    ]).then(([purchaseData, itemData, supplierData, productData]) => {
      setPurchase(purchaseData);
      setItems(itemData);
      setSuppliers(supplierData);
      setProducts(productData);
      setLoading(false);
    });
  }, [id]);

  const supplierMap = useMemo(
    () => new Map(suppliers.map((supplier) => [supplier.id, supplier])),
    [suppliers],
  );
  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner /></div>;
  }

  if (!purchase) {
    return (
      <EmptyState
        icon={<ReceiptText className="h-16 w-16" />}
        title="Purchase not found"
        description="The selected purchase entry could not be loaded."
      />
    );
  }

  const supplier = supplierMap.get(purchase.supplierId);

  const handleDelete = async () => {
    if (!window.confirm(`Delete purchase ${purchase.purchaseNumber}? This will deduct its stock from inventory.`)) {
      return;
    }

    try {
      await deletePurchase(id, user?.email || user?.uid || 'admin');
      toast.success('Purchase deleted and stock adjusted');
      router.push('/admin/purchases', { scroll: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete purchase');
    }
  };

  return (
    <div>
      <nav className="mb-6 flex items-center gap-2 text-sm text-stone-500">
        <Link href="/admin/purchases" className="hover:text-amber-600">Purchases</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-stone-900">{purchase.purchaseNumber}</span>
      </nav>

      <div className="mb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-black text-stone-900">View Purchase</h1>
            <p className="mt-1 text-stone-500">Purchase details and product lines saved for this entry.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/admin/purchases/${id}/edit`}>
              <Button variant="outline">
                <Pencil className="h-4 w-4" />
                Edit Purchase
              </Button>
            </Link>
            <Button variant="danger" onClick={() => void handleDelete()}>
              <Trash2 className="h-4 w-4" />
              Delete Purchase
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-stone-500">Purchase Number</p>
          <p className="mt-2 font-mono text-xl font-black text-stone-900">{purchase.purchaseNumber}</p>
        </div>
        <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-stone-500">Purchase Date</p>
          <p className="mt-2 text-xl font-black text-stone-900">{formatDate(purchase.purchaseDate)}</p>
        </div>
        <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-stone-500">Supplier</p>
          <p className="mt-2 text-lg font-bold text-stone-900">{supplier?.supplierName || '-'}</p>
        </div>
        <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-stone-500">Total Quantity</p>
          <p className="mt-2 text-2xl font-black text-stone-900">{purchase.totalQty}</p>
        </div>
      </div>

      <div className="mb-8 rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-bold text-stone-900">Supplier Summary</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-500">Contact Person</p>
            <p className="mt-1 text-sm text-stone-700">{supplier?.contactPerson || '-'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-500">Mobile</p>
            <p className="mt-1 text-sm text-stone-700">{supplier?.mobile || '-'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-500">Email</p>
            <p className="mt-1 text-sm text-stone-700">{supplier?.email || '-'}</p>
          </div>
          <div className="sm:col-span-2 xl:col-span-3">
            <p className="text-xs uppercase tracking-wide text-stone-500">Address</p>
            <p className="mt-1 text-sm text-stone-700">{supplier?.address || '-'}</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
        <div className="border-b border-stone-100 bg-stone-50 px-5 py-4">
          <h2 className="text-lg font-bold text-stone-900">Purchased Products</h2>
        </div>
        {items.length === 0 ? (
          <EmptyState
            icon={<PackageOpen className="h-14 w-14" />}
            title="No purchase items found"
            description="This purchase does not have any saved line items."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Product</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Category</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {items.map((item) => {
                  const product = productMap.get(item.productId);
                  return (
                    <tr key={item.id} className="hover:bg-stone-50 transition">
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-stone-900">{product?.name || item.productId}</p>
                        <p className="text-xs text-stone-500">{item.productId}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-stone-600">{product?.category || '-'}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-stone-900">{item.quantity}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-stone-900">Remarks</h2>
        <p className="text-sm text-stone-600">{purchase.remarks || 'No remarks added.'}</p>
      </div>
    </div>
  );
}
