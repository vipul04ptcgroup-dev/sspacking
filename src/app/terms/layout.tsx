import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { buildWebPageSchema } from '@/src/seo/webpageSchema';
import { SchemaInjector } from '@/src/seo/schemaInjector';

export const metadata: Metadata = buildMetadata({
  title: 'Terms of Service',
  description: 'Read the Terms of Service for SS Packaging, including usage, orders, payments, and liability terms.',
  path: '/terms',
  keywords: ['terms of service', 'SS Packaging terms', 'website terms and conditions'],
});

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* WebPage schema for the terms of service page. */}
      <SchemaInjector
        schemas={[
          buildWebPageSchema({
            path: '/terms',
            name: 'Terms of Service',
            description: 'Review the SS Packaging terms of service covering product enquiries, orders, and website usage.',
            keywords: ['terms of service', 'SS Packaging terms', 'website terms'],
          }),
        ]}
      />
      {children}
    </>
  );
}
