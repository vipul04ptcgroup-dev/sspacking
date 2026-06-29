import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getCategories } from '@/lib/firestore';
import CategoryCardsGrid from '@/components/home/CategoryCardsGrid';

export default async function CategoryGrid() {
  const categories = await getCategories().catch(() => []);
  const featuredCategories = categories.slice(0, 6);

  if (!featuredCategories.length) return null;

  return (
    <section className="bg-white py-10 sm:py-12 lg:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-600">
            Explore Our Range
          </p>
          <h2 className="text-3xl font-black text-stone-900 sm:text-4xl">
            Explore Packaging Categories
          </h2>
          <div className="mx-auto mt-3 h-[3px] w-16 rounded-full bg-amber-300" />
        </div>

        <CategoryCardsGrid categories={featuredCategories} />

        <div className="mt-8 flex justify-center">
          <Link
            href="/categories"
            className="inline-flex items-center justify-center gap-2 rounded-[4px] bg-[#08111f] px-6 py-3 text-[13px] font-bold uppercase tracking-[0.03em] text-white transition hover:bg-[#12243c]"
          >
            View All Categories <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
