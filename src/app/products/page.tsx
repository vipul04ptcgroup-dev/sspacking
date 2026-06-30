import { getCategories, getProducts } from '@/lib/firestore';
import { serializeCategoriesForClient, serializeProductsForClient } from '@/lib/client-serialization';
import ProductsPageClient from '@/components/product/ProductsPageClient';
import { buildCollectionSchema } from '@/src/seo/collectionSchema';
import { buildProductSchema } from '@/src/seo/productSchema';
import { buildBreadcrumbSchema } from '@/src/seo/breadcrumbSchema';
import { buildWebPageSchema } from '@/src/seo/webpageSchema';
import { SchemaInjector } from '@/src/seo/schemaInjector';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const clientProducts = serializeProductsForClient(products);
  const clientCategories = serializeCategoriesForClient(categories);
  const productSchemas = products.map((product) =>
    buildProductSchema({
      path: `/products/${product.publicCategorySlug || product.categoryId}/${product.slug}`,
      product,
    }),
  );

  return (
    <>
      {/* CollectionPage schema for the all-products index page. */}
      <SchemaInjector
        schemas={[
          buildWebPageSchema({
            path: '/products',
            name: 'All Products',
            description: 'Browse bamboo, glass, plastic, and sustainable packaging products by SS Packaging.',
            keywords: ['packaging products', 'bamboo bottles', 'glass jars', 'plastic containers'],
          }),
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Products', path: '/products' },
          ]),
          buildCollectionSchema({
            path: '/products',
            name: 'All Products',
            description: 'Browse bamboo, glass, plastic, and sustainable packaging products by SS Packaging.',
            products,
          }),
          ...productSchemas,
        ]}
      />
      <ProductsPageClient initialProducts={clientProducts} initialCategories={clientCategories} />
    </>
  );
}
