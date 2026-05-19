import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Contact SS Packaging',
  description: 'Contact SS Packaging for bulk orders, custom quotes, and packaging support across India.',
  path: '/contact',
  keywords: ['contact SS Packaging', 'packaging quote', 'bulk packaging orders India'],
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
