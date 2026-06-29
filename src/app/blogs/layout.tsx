import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
  title: 'Blogs',
  description: 'Read packaging insights, product guidance, and industry updates from SS Packaging.',
  path: '/blogs',
  keywords: ['packaging blog', 'SS Packaging blog', 'packaging insights India'],
});

export default function BlogsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
