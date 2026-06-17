'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { createPurchase, generateNextPurchaseNumber, getAllProducts, getAllSuppliers } from '@/lib/firestore';
import { useAuth } from '@/context/auth-context';
import type { Product, Purchase, PurchaseItem, Supplier } from '@/types';
import PurchaseForm from '@/components/admin/PurchaseForm';
import { Spinner } from '@/components/ui';
import toast from 'react-hot-toast';

type PurchasePayload = Omit<Purchase, 'id' | 'createdAt' | 'updatedAt' | 'totalQty'> & {
  items: Array<Pick<PurchaseItem, 'productId' | 'quantity'>>;
};

export default function NewPurchasePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [purchaseNumber, setPurchaseNumber] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    Promise.all([
      generateNextPurchaseNumber(),
      getAllSuppliers(),
      getAllProducts(),
    ]).then(([nextNumber, supplierData, productData]) => {
      setPurchaseNumber(nextNumber);
      setSuppliers(supplierData.filter((supplier) => supplier.status));
      setProducts(productData.filter((product) => product.active));
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (data: PurchasePayload) => {
    await createPurchase(
      {
        ...data,
        createdBy: user?.email || user?.uid || 'admin',
      },
      user?.email || user?.uid || 'admin',
    );
    toast.success('Purchase created');
    router.push('/admin/purchases', { scroll: true });
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner /></div>;
  }

  return (
    <div>
      <nav className="mb-6 flex items-center gap-2 text-sm text-stone-500">
        <Link href="/admin/purchases" className="hover:text-amber-600">Purchases</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-stone-900">New Purchase</span>
      </nav>
      <h1 className="mb-8 text-3xl font-black text-stone-900">Create Purchase</h1>
      <PurchaseForm
        purchaseNumber={purchaseNumber}
        suppliers={suppliers}
        products={products}
        createdBy={user?.email || user?.uid || 'admin'}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
