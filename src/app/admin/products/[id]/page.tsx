'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProductById, updateProduct } from '@/lib/firestore';
import type { Product } from '@/types';
import ProductForm from '@/components/admin/ProductForm';
import { Spinner } from '@/components/ui';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

type ProductPayload = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProductById(id).then(p => { setProduct(p); setLoading(false); });
  }, [id]);

  const handleSubmit = async (data: ProductPayload) => {
    await updateProduct(id, data);
    toast.success('Product updated!');
    router.push('/admin/products');
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
  if (!product) return <div className="text-center py-20 text-stone-400">Product not found</div>;

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-stone-500 mb-6">
        <Link href="/admin/products" className="hover:text-amber-600">Products</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-stone-900 font-medium">{product.name}</span>
      </nav>
      <h1 className="text-3xl font-black text-stone-900 mb-8">Edit Product</h1>
      <ProductForm initialData={product} onSubmit={handleSubmit} productId={id} />
    </div>
  );
}
