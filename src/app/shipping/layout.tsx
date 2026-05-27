import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Shipping Policy',
  description: 'Read the shipping policy for SS Packaging, including processing times, delivery estimates, and shipping terms.',
  path: '/shipping',
  keywords: ['shipping policy', 'SS Packaging shipping', 'delivery policy'],
});

export default function ShippingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
