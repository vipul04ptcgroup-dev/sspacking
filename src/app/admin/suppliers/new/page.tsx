'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { createSupplier } from '@/lib/firestore';
import { useAuth } from '@/context/auth-context';
import SupplierForm from '@/components/admin/SupplierForm';
import type { Supplier } from '@/types';
import toast from 'react-hot-toast';

type SupplierPayload = Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>;

export default function NewSupplierPage() {
  const router = useRouter();
  const { user } = useAuth();

  const handleSubmit = async (data: SupplierPayload) => {
    await createSupplier(data, user?.email || user?.uid || 'admin');
    toast.success('Supplier created');
    router.push('/admin/suppliers', { scroll: true });
  };

  return (
    <div>
      <nav className="mb-6 flex items-center gap-2 text-sm text-stone-500">
        <Link href="/admin/suppliers" className="hover:text-amber-600">Suppliers</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-stone-900">New Supplier</span>
      </nav>
      <h1 className="mb-8 text-3xl font-black text-stone-900">Create Supplier</h1>
      <SupplierForm onSubmit={handleSubmit} />
    </div>
  );
}
