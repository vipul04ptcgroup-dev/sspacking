import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { buildWebPageSchema } from '@/src/seo/webpageSchema';
import { SchemaInjector } from '@/src/seo/schemaInjector';

export const metadata: Metadata = buildMetadata({
  title: 'Privacy Policy',
  description: 'Read the privacy policy for SS Packaging, including how we collect, use, and protect your information.',
  path: '/privacy',
  keywords: ['privacy policy', 'SS Packaging privacy', 'data protection'],
});

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* WebPage schema for the privacy policy page. */}
      <SchemaInjector
        schemas={[
          buildWebPageSchema({
            path: '/privacy',
            name: 'Privacy Policy',
            description: 'Read the SS Packaging privacy policy for information on data collection, usage, and security.',
            keywords: ['privacy policy', 'SS Packaging privacy', 'data protection'],
          }),
        ]}
      />
      {children}
    </>
  );
}
