import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { serializeProductsForClient } from '@/lib/client-serialization';
import { getFeaturedProducts } from '@/lib/firestore';
import ProductCard from '@/components/product/ProductCard';

export default async function FeaturedProducts() {
  const products = await getFeaturedProducts().catch(() => []);
  const clientProducts = serializeProductsForClient(products);

  if (!clientProducts.length) return null;

  return (
    <section className="bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] py-10 sm:py-12 lg:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.24em] text-amber-600">Featured Products</p>
            <h2 className="text-3xl font-black text-stone-900 sm:text-4xl">Popular picks from our catalog</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-500">
              A quick look at highlighted packaging products currently featured on the site. Use these to start product discovery or request a quote faster.
            </p>
          </div>
          <Link href="/products" className="hidden items-center gap-2 text-sm font-semibold text-amber-600 transition-all hover:gap-3 sm:flex">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {clientProducts.map((p) => (
            <div
              key={p.id}
              className="min-w-[82%] snap-start sm:min-w-[48%] lg:min-w-[31%] xl:min-w-[23.5%]"
            >
              <ProductCard product={p} />
            </div>
          ))}
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
