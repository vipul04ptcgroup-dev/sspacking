import type { Metadata } from 'next';
import { buildMetadata, prettifySlug } from '@/lib/seo';

type Props = {
  children: React.ReactNode;
  params: Promise<{ category: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const categoryName = prettifySlug(category);

  return buildMetadata({
    title: `${categoryName} Packaging Products`,
    description: `Explore ${categoryName} packaging products from SS Packaging, including multiple sizes and variants.`,
    path: `/products/${category}`,
    keywords: [categoryName, `${categoryName} packaging`, 'packaging supplier India'],
  });
}

export default function CategoryLayout({ children }: Props) {
  return children;
}
