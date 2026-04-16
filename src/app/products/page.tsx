'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getProducts, getCategories } from '@/lib/firestore';
import type { Product, Category } from '@/types';
import ProductGrid from '@/components/product/ProductGrid';
import { SlidersHorizontal, X } from 'lucide-react';

function ProductsContent() {
  const searchParams = useSearchParams();
  const q = searchParams?.get('q') || '';
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    Promise.all([getProducts(), getCategories()]).then(([p, c]) => {
      setProducts(p);
      setCategories(c);
      setLoading(false);
    });
  }, []);

  let filtered = products;

  if (q) {
    const lq = q.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(lq) ||
      p.description.toLowerCase().includes(lq) ||
      p.tags.some(t => t.toLowerCase().includes(lq)) ||
      p.categoryName.toLowerCase().includes(lq)
    );
  }

  if (selectedCategory) {
    filtered = filtered.filter(p => p.categoryId === selectedCategory);
  }

  if (sortBy === 'price-asc') {
    filtered = [...filtered].sort((a, b) => Math.min(...a.variants.map(v => v.price)) - Math.min(...b.variants.map(v => v.price)));
  } else if (sortBy === 'price-desc') {
    filtered = [...filtered].sort((a, b) => Math.min(...b.variants.map(v => v.price)) - Math.min(...a.variants.map(v => v.price)));
  } else if (sortBy === 'name') {
    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-900">
          {q ? `Search: "${q}"` : 'All Products'}
        </h1>
        <p className="text-stone-500 mt-1">{filtered.length} product{filtered.length !== 1 ? 's' : ''} found</p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-8 pb-6 border-b border-stone-200">
        <button
          onClick={() => setShowFilters(v => !v)}
          className="flex items-center gap-2 px-4 py-2 border border-stone-200 rounded-lg text-sm font-medium text-stone-700 hover:border-amber-400 hover:text-amber-600 transition"
        >
          <SlidersHorizontal className="w-4 h-4" /> Filters
        </button>

        {/* Category pills */}
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${!selectedCategory ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-amber-50'}`}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id === selectedCategory ? '' : cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${selectedCategory === cat.id ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-amber-50'}`}
          >
            {cat.name}
          </button>
        ))}

        <div className="ml-auto">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
          >
            <option value="default">Sort: Default</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name">Name A-Z</option>
          </select>
        </div>

        {/* Active filters */}
        {(q || selectedCategory) && (
          <button
            onClick={() => { setSelectedCategory(''); }}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
          >
            <X className="w-3 h-3" /> Clear filters
          </button>
        )}
      </div>

      <ProductGrid products={filtered} loading={loading} />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" />}>
      <ProductsContent />
    </Suspense>
  );
}
