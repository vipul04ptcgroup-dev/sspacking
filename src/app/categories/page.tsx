import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import CategoryCardsGrid from '@/components/home/CategoryCardsGrid';
import { getCategories } from '@/lib/firestore';
import { buildMetadata } from '@/lib/seo';
import { buildWebPageSchema } from '@/src/seo/webpageSchema';
import { SchemaInjector } from '@/src/seo/schemaInjector';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
  title: 'All Categories',
  description: 'Browse all packaging categories offered by SS Packaging.',
  path: '/categories',
  keywords: ['packaging categories', 'product categories', 'SS Packaging categories'],
});

export default async function CategoriesPage() {
  const categories = await getCategories().catch(() => []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SchemaInjector
        schemas={[
          buildWebPageSchema({
            path: '/categories',
            name: 'All Categories',
            description: 'Browse all packaging categories offered by SS Packaging.',
            keywords: ['packaging categories', 'product categories', 'SS Packaging categories'],
          }),
        ]}
      />

      <nav className="mb-8 flex items-center gap-2 text-sm text-stone-500">
        <Link href="/" className="hover:text-amber-600">Home</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-stone-900">Categories</span>
      </nav>

      <div className="text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-600">
          Explore Our Range
        </p>
        <h1 className="text-3xl font-black text-stone-900 sm:text-4xl">
          Explore Packaging Categories
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-stone-500 sm:text-base">
          Browse every packaging category and jump into the products that fit your business.
        </p>
        <div className="mx-auto mt-3 h-[3px] w-16 rounded-full bg-amber-300" />
      </div>

      {categories.length > 0 ? (
        <CategoryCardsGrid categories={categories} />
      ) : (
        <p className="mt-10 text-center text-stone-500">
          No categories are available right now.
        </p>
      )}
    </div>
  );
}
