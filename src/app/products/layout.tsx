import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'All Products',
  description: 'Browse bamboo, glass, plastic, and sustainable packaging products by SS Packaging.',
  path: '/products',
  keywords: ['packaging products', 'bamboo bottles', 'glass jars', 'plastic containers'],
});

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
