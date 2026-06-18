'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getProducts, getCategories } from '@/lib/firestore';
import type { Product, Category } from '@/types';
import { SlidersHorizontal, X } from 'lucide-react';

const ProductGrid = dynamic(() => import('@/components/product/ProductGrid'), {
  loading: () => <ProductGridSkeleton />,
});

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-stone-100 overflow-hidden animate-pulse">
          <div className="aspect-square bg-stone-100" />
          <div className="p-4 space-y-2">
            <div className="h-3 bg-stone-100 rounded w-1/3" />
            <div className="h-4 bg-stone-100 rounded w-3/4" />
            <div className="h-3 bg-stone-100 rounded w-full" />
            <div className="h-5 bg-stone-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductsContent() {
  const INITIAL_PRODUCTS_TO_SHOW = 12;
  const PRODUCTS_BATCH_SIZE = 16;
  const LOAD_MORE_DELAY_MS = 120;
  const searchParams = useSearchParams();
  const q = searchParams?.get('q') || '';
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [showFilters, setShowFilters] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_PRODUCTS_TO_SHOW);
  const OTHER_CATEGORY_KEY = '__others__';

  useEffect(() => {
    let mounted = true;

    getProducts()
      .then(p => {
        if (!mounted) return;
        setProducts(p);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    getCategories().then(c => {
      if (!mounted) return;
      setCategories(c);
    });

    return () => {
      mounted = false;
    };
  }, []);

  let filtered = products;

  if (q) {
    const lq = q.toLowerCase();
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(lq) ||
      p.shortDescription.toLowerCase().includes(lq) ||
      p.tags.some(t => t.toLowerCase().includes(lq)) ||
      p.categoryId.toLowerCase().includes(lq) ||
      p.sku.toLowerCase().includes(lq)
    );
  }

  const normalizeCategory = (value: string) => value.trim().toLowerCase();
  const knownCategoryKeys = new Set(
    categories.flatMap(cat => [normalizeCategory(cat.slug), normalizeCategory(cat.name)])
  );

  if (selectedCategory) {
    if (selectedCategory === OTHER_CATEGORY_KEY) {
      filtered = filtered.filter(p => !knownCategoryKeys.has(normalizeCategory(p.categoryId || '')));
    } else {
      filtered = filtered.filter(p => normalizeCategory(p.categoryId || '') === normalizeCategory(selectedCategory));
    }
  }

  if (sortBy === 'price-asc') {
    filtered = [...filtered].sort((a, b) => {
      const left = Math.min(...a.pricingTiers.map((tier) => tier.unitPrice));
      const right = Math.min(...b.pricingTiers.map((tier) => tier.unitPrice));
      return left - right;
    });
  } else if (sortBy === 'price-desc') {
    filtered = [...filtered].sort((a, b) => {
      const left = Math.min(...a.pricingTiers.map((tier) => tier.unitPrice));
      const right = Math.min(...b.pricingTiers.map((tier) => tier.unitPrice));
      return right - left;
    });
  } else if (sortBy === 'name') {
    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }

  useEffect(() => {
    setVisibleCount(Math.min(INITIAL_PRODUCTS_TO_SHOW, filtered.length));
  }, [q, selectedCategory, sortBy, filtered.length]);

  useEffect(() => {
    if (loading || visibleCount >= filtered.length) return;

    const timer = window.setTimeout(() => {
      setVisibleCount(current => Math.min(current + PRODUCTS_BATCH_SIZE, filtered.length));
    }, LOAD_MORE_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [visibleCount, filtered.length, loading]);

  const visibleProducts = filtered.slice(0, visibleCount);
  const isProgressivelyLoading = !loading && visibleCount < filtered.length;

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
          aria-pressed={showFilters}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition ${
            showFilters
              ? 'border-amber-400 text-amber-700 bg-amber-50'
              : 'border-stone-200 text-stone-700 hover:border-amber-400 hover:text-amber-600'
          }`}
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
            onClick={() => setSelectedCategory(cat.slug === selectedCategory ? '' : cat.slug)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${selectedCategory === cat.slug ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-amber-50'}`}
          >
            {cat.name}
          </button>
        ))}
        <button
          onClick={() => setSelectedCategory(selectedCategory === OTHER_CATEGORY_KEY ? '' : OTHER_CATEGORY_KEY)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${selectedCategory === OTHER_CATEGORY_KEY ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-amber-50'}`}
        >
          Others
        </button>

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

      <ProductGrid products={visibleProducts} loading={loading} />
      {isProgressivelyLoading && (
        <p className="text-center text-xs text-stone-500 mt-5">
          Loading more products...
        </p>
      )}
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
