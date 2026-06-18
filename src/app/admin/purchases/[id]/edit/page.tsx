'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import {
  getAllProducts,
  getAllSuppliers,
  getPurchaseById,
  getPurchaseItemsByPurchaseId,
  updatePurchase,
} from '@/lib/firestore';
import { isPurchaseProductCategorySlug } from '@/lib/product-categories';
import { useAuth } from '@/context/auth-context';
import type { Product, Purchase, PurchaseItem, Supplier } from '@/types';
import PurchaseForm from '@/components/admin/PurchaseForm';
import { Spinner } from '@/components/ui';
import toast from 'react-hot-toast';

function isPurchaseProduct(product: Product) {
  return isPurchaseProductCategorySlug(product.categoryId);
}

type PurchasePayload = Omit<Purchase, 'id' | 'createdAt' | 'updatedAt' | 'totalQty'> & {
  items: Array<Pick<PurchaseItem, 'productId' | 'quantity'>>;
};

function toInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function EditPurchasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [purchase, setPurchase] = useState<Purchase | null>(null);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    Promise.all([
      getPurchaseById(id),
      getPurchaseItemsByPurchaseId(id),
      getAllSuppliers(),
      getAllProducts(),
    ]).then(([purchaseData, itemData, supplierData, productData]) => {
      setPurchase(purchaseData);
      setItems(itemData);
      setSuppliers(supplierData.filter((supplier) => supplier.status));
      setProducts(productData.filter((product) => product.active && isPurchaseProduct(product)));
      setLoading(false);
    });
  }, [id]);

  const handleSubmit = async (data: PurchasePayload) => {
    await updatePurchase(
      id,
      {
        ...data,
        createdBy: user?.email || user?.uid || 'admin',
      },
      user?.email || user?.uid || 'admin',
    );
    toast.success('Purchase updated and inventory rebalanced');
    router.push(`/admin/purchases/${id}`, { scroll: true });
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner /></div>;
  }

  if (!purchase) {
    return <div className="py-20 text-center text-stone-400">Purchase not found</div>;
  }

  return (
    <div>
      <nav className="mb-6 flex items-center gap-2 text-sm text-stone-500">
        <Link href="/admin/purchases" className="hover:text-amber-600">Purchases</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/admin/purchases/${id}`} className="hover:text-amber-600">{purchase.purchaseNumber}</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-stone-900">Edit</span>
      </nav>
      <h1 className="mb-8 text-3xl font-black text-stone-900">Edit Purchase</h1>
      <PurchaseForm
        purchaseNumber={purchase.purchaseNumber}
        suppliers={suppliers}
        products={products}
        createdBy={user?.email || user?.uid || 'admin'}
        initialData={{
          purchaseDate: toInputDate(purchase.purchaseDate),
          supplierId: purchase.supplierId,
          remarks: purchase.remarks,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }}
        submitLabel="Update Purchase"
        onSubmit={handleSubmit}
      />
    </div>
  );
}
