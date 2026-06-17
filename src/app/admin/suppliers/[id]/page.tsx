'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { getSupplierById, updateSupplier } from '@/lib/firestore';
import { useAuth } from '@/context/auth-context';
import SupplierForm from '@/components/admin/SupplierForm';
import type { Supplier } from '@/types';
import { Spinner } from '@/components/ui';
import toast from 'react-hot-toast';

type SupplierPayload = Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>;

export default function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSupplierById(id).then((data) => {
      setSupplier(data);
      setLoading(false);
    });
  }, [id]);

  const handleSubmit = async (data: SupplierPayload) => {
    await updateSupplier(id, data, user?.email || user?.uid || 'admin');
    toast.success('Supplier updated');
    router.push('/admin/suppliers', { scroll: true });
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner /></div>;
  }

  if (!supplier) {
    return <div className="py-20 text-center text-stone-400">Supplier not found</div>;
  }

  return (
    <div>
      <nav className="mb-6 flex items-center gap-2 text-sm text-stone-500">
        <Link href="/admin/suppliers" className="hover:text-amber-600">Suppliers</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-stone-900">{supplier.supplierName}</span>
      </nav>
      <h1 className="mb-8 text-3xl font-black text-stone-900">Edit Supplier</h1>
      <SupplierForm initialData={supplier} onSubmit={handleSubmit} />
    </div>
  );
}
