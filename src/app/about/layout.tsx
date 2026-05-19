import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'About SS Packaging',
  description:
    'Learn about SS Packaging, our quality standards, eco-focused approach, and packaging supply network across India.',
  path: '/about',
  keywords: ['about SS Packaging', 'packaging company India', 'sustainable packaging supplier'],
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
