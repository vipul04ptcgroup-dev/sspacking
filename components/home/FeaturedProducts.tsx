import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getFeaturedProducts } from '@/lib/firestore';
import ProductCard from '@/components/product/ProductCard';

export default async function FeaturedProducts() {
  const products = await getFeaturedProducts().catch(() => []);

  if (!products.length) return null;

  return (
    <section className="py-20 bg-stone-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-amber-600 font-semibold text-sm uppercase tracking-widest mb-2">Handpicked</p>
            <h2 className="text-3xl sm:text-4xl font-black text-stone-900">Featured Products</h2>
          </div>
          <Link href="/products" className="hidden sm:flex items-center gap-2 text-amber-600 font-semibold text-sm hover:gap-3 transition-all">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {products.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
        <div className="mt-8 text-center sm:hidden">
          <Link href="/products" className="inline-flex items-center gap-2 text-amber-600 font-semibold">
            View All Products <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
