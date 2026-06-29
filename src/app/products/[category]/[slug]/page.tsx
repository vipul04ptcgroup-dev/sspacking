import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { serializeProductForClient } from '@/lib/client-serialization';
import { getCategoryBySlug, getProductBySlug } from '@/lib/firestore';
import ProductDetailPageClient from '@/components/product/ProductDetailPageClient';
import { resolveProductPublicCategory } from '@/lib/public-product-categories';
import { absoluteUrl } from '@/lib/seo';
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}): Promise<Metadata> {
  const { category, slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product || resolveProductPublicCategory(product).slug !== category) {
    return {
      title: 'Product Not Found',
    };
  }

  const title = product.seoTitle || product.name;
  const description = product.seoDescription || product.shortDescription || product.description;
  const path = `/products/${category}/${slug}`;
  const image = product.images?.[0];

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(path),
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(path),
      type: 'website',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

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
  if (resolveProductPublicCategory(product).slug !== category) return notFound();
  const clientProduct = serializeProductForClient(product);
  const keywordList = [
    product.focusKeyword,
    ...product.secondaryKeywords,
    product.name,
    product.sku,
    ...(product.tags || []),
  ].filter(Boolean);

  return (
    <>
      {/* Product, breadcrumb, and page schemas for product detail pages. */}
      <SchemaInjector
        schemas={[
          buildWebPageSchema({
            path: `/products/${category}/${slug}`,
            name: product.seoTitle || product.name,
            description: product.seoDescription || product.shortDescription || product.description,
            keywords: keywordList,
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
      <ProductDetailPageClient slug={slug} product={clientProduct} />
    </>
  );
}
