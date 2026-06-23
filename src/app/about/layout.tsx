import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { buildWebPageSchema } from '@/src/seo/webpageSchema';
import { SchemaInjector } from '@/src/seo/schemaInjector';

export const metadata: Metadata = buildMetadata({
  title: 'About SS Packaging',
  description:
    'Learn about SS Packaging, our quality standards, eco-focused approach, and packaging supply network across India.',
  path: '/about',
  keywords: ['about SS Packaging', 'packaging company India', 'sustainable packaging supplier'],
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* WebPage schema for the company about page. */}
      <SchemaInjector
        schemas={[
          buildWebPageSchema({
            path: '/about',
            name: 'About SS Packaging',
            description:
              'Learn about SS Packaging, our quality standards, eco-focused approach, and packaging supply network across India.',
            keywords: ['about SS Packaging', 'packaging company India', 'sustainable packaging supplier'],
          }),
        ]}
      />
      {children}
    </>
  );
}
