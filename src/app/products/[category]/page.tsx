import { notFound } from 'next/navigation';
import { getCategoryBySlug, getProducts } from '@/lib/firestore';
import ProductGrid from '@/components/product/ProductGrid';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { buildCollectionSchema } from '@/src/seo/collectionSchema';
import { SchemaInjector } from '@/src/seo/schemaInjector';

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: categorySlug } = await params;
  const category = await getCategoryBySlug(categorySlug);

  if (!category) return notFound();

  const products = await getProducts(category.slug);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* CollectionPage schema for product category listings. */}
      <SchemaInjector
        schemas={[
          buildCollectionSchema({
            path: `/products/${category.slug}`,
            name: category.name,
            description: category.description || `Browse ${category.name} packaging products from SS Packaging.`,
            products,
          }),
        ]}
      />

      <nav className="flex items-center gap-2 text-sm text-stone-500 mb-8">
        <Link href="/" className="hover:text-amber-600">Home</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/products" className="hover:text-amber-600">Products</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-stone-900 font-medium">{category.name}</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-900">{category.name}</h1>
        {category.description && <p className="text-stone-500 mt-2 max-w-2xl">{category.description}</p>}
        <p className="text-stone-400 text-sm mt-2">{products.length} product{products.length !== 1 ? 's' : ''}</p>
      </div>

      <ProductGrid products={products} loading={false} />
    </div>
  );
}
