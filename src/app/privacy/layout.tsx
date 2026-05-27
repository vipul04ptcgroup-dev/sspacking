import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Privacy Policy',
  description: 'Read the privacy policy for SS Packaging, including how we collect, use, and protect your information.',
  path: '/privacy',
  keywords: ['privacy policy', 'SS Packaging privacy', 'data protection'],
});

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
