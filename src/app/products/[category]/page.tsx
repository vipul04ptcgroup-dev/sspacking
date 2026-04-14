'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { notFound } from 'next/navigation';
import { getCategoryBySlug, getProducts } from '@/lib/firestore';
import type { Product, Category } from '@/types';
import ProductGrid from '@/components/product/ProductGrid';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: categorySlug } = use(params);
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFoundFlag, setNotFoundFlag] = useState(false);

  useEffect(() => {
    getCategoryBySlug(categorySlug).then(async cat => {
      if (!cat) { setNotFoundFlag(true); return; }
      setCategory(cat);
      const prods = await getProducts(cat.id);
      setProducts(prods);
      setLoading(false);
    });
  }, [categorySlug]);

  if (notFoundFlag) return notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-stone-500 mb-8">
        <Link href="/" className="hover:text-amber-600">Home</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/products" className="hover:text-amber-600">Products</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-stone-900 font-medium">{category?.name || categorySlug}</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-900">{category?.name}</h1>
        {category?.description && <p className="text-stone-500 mt-2 max-w-2xl">{category.description}</p>}
        <p className="text-stone-400 text-sm mt-2">{products.length} product{products.length !== 1 ? 's' : ''}</p>
      </div>

      <ProductGrid products={products} loading={loading} />
    </div>
  );
}
