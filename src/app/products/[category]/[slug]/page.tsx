import { notFound } from 'next/navigation';
import { getCategoryBySlug, getProductBySlug } from '@/lib/firestore';
import ProductDetailPageClient from '@/components/product/ProductDetailPageClient';
import { buildProductSchema } from '@/src/seo/productSchema';
import { buildBreadcrumbSchema } from '@/src/seo/breadcrumbSchema';
import { buildWebPageSchema } from '@/src/seo/webpageSchema';
import { SchemaInjector } from '@/src/seo/schemaInjector';

type DescriptionBlock =
  | { type: 'paragraph'; content: string }
  | { type: 'list'; items: string[] };

function buildDescriptionBlocks(description: string): DescriptionBlock[] {
  return description
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const bulletItems = lines
        .map((line) => line.match(/^[-*•]\s+(.+)$/)?.[1]?.trim() || null);

      if (lines.length > 0 && bulletItems.every(Boolean)) {
        return {
          type: 'list',
          items: bulletItems.filter((item): item is string => Boolean(item)),
        };
      }

      return {
        type: 'paragraph',
        content: block,
      };
    });
}

void buildDescriptionBlocks;

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const [product, categoryData] = await Promise.all([
    getProductBySlug(slug),
    getCategoryBySlug(category),
  ]);

  if (!product) return notFound();

  return (
    <>
      {/* Product, breadcrumb, and page schemas for product detail pages. */}
      <SchemaInjector
        schemas={[
          buildWebPageSchema({
            path: `/products/${category}/${slug}`,
            name: product.name,
            description: product.shortDescription || product.description,
            keywords: [product.name, product.sku, ...(product.tags || [])],
          }),
          buildProductSchema({
            path: `/products/${category}/${slug}`,
            product,
            category: categoryData,
          }),
          buildBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Products', path: '/products' },
            ...(categoryData ? [{ name: categoryData.name, path: `/products/${categoryData.slug}` }] : []),
            { name: product.name, path: `/products/${category}/${slug}` },
          ]),
        ]}
      />
      <ProductDetailPageClient category={category} slug={slug} product={product} />
    </>
  );
}
