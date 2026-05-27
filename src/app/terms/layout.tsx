import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Terms of Service',
  description: 'Read the Terms of Service for SS Packaging, including usage, orders, payments, and liability terms.',
  path: '/terms',
  keywords: ['terms of service', 'SS Packaging terms', 'website terms and conditions'],
});

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
