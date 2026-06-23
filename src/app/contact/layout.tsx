import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { buildWebPageSchema } from '@/src/seo/webpageSchema';
import { SchemaInjector } from '@/src/seo/schemaInjector';

export const metadata: Metadata = buildMetadata({
  title: 'Contact SS Packaging',
  description: 'Contact SS Packaging for bulk orders, custom quotes, and packaging support across India.',
  path: '/contact',
  keywords: ['contact SS Packaging', 'packaging quote', 'bulk packaging orders India'],
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* WebPage schema for the contact and quote request page. */}
      <SchemaInjector
        schemas={[
          buildWebPageSchema({
            path: '/contact',
            name: 'Contact SS Packaging',
            description: 'Contact SS Packaging for bulk orders, custom quotes, and packaging support across India.',
            keywords: ['contact SS Packaging', 'packaging quote', 'bulk packaging orders India'],
          }),
        ]}
      />
      {children}
    </>
  );
}
