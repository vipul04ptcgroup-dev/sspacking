'use client';

import { useRouter } from 'next/navigation';
import { createProduct } from '@/lib/firestore';
import ProductForm from '@/components/admin/ProductForm';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { Product } from '@/types';

type ProductPayload = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

export default function NewProductPage() {
  const router = useRouter();

  const handleSubmit = async (data: ProductPayload) => {
    await createProduct(data);
    toast.success('Product created!');
    router.push('/admin/products');
  };

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-stone-500 mb-6">
        <Link href="/admin/products" className="hover:text-amber-600">Products</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-stone-900 font-medium">New Product</span>
      </nav>
      <h1 className="text-3xl font-black text-stone-900 mb-8">Create Product</h1>
      <ProductForm onSubmit={handleSubmit} />
    </div>
  );
}
