import type { Metadata } from 'next';
import { buildMetadata, prettifySlug } from '@/lib/seo';

type Props = {
  children: React.ReactNode;
  params: Promise<{ category: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, slug } = await params;
  const categoryName = prettifySlug(category);
  const productName = prettifySlug(slug);

  return buildMetadata({
    title: `${productName} | ${categoryName}`,
    description: `View specifications, pricing tiers, and enquiry details for ${productName} in ${categoryName} by SS Packaging.`,
    path: `/products/${category}/${slug}`,
    keywords: [productName, categoryName, 'packaging product', 'SS Packaging'],
  });
}

export default function ProductDetailLayout({ children }: Props) {
  return children;
}
