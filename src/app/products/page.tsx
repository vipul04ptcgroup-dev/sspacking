import { getCategories, getProducts } from '@/lib/firestore';
import { serializeCategoriesForClient, serializeProductsForClient } from '@/lib/client-serialization';
import ProductsPageClient from '@/components/product/ProductsPageClient';
import { buildCollectionSchema } from '@/src/seo/collectionSchema';
import { SchemaInjector } from '@/src/seo/schemaInjector';

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const clientProducts = serializeProductsForClient(products);
  const clientCategories = serializeCategoriesForClient(categories);

  return (
    <>
      {/* CollectionPage schema for the all-products index page. */}
      <SchemaInjector
        schemas={[
          buildCollectionSchema({
            path: '/products',
            name: 'All Products',
            description: 'Browse bamboo, glass, plastic, and sustainable packaging products by SS Packaging.',
            products,
          }),
        ]}
      />
      <ProductsPageClient initialProducts={clientProducts} initialCategories={clientCategories} />
    </>
  );
}
