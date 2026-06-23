import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';
import { buildWebPageSchema } from '@/src/seo/webpageSchema';
import { SchemaInjector } from '@/src/seo/schemaInjector';

export const metadata: Metadata = buildMetadata({
  title: 'Shipping Policy',
  description: 'Read the shipping policy for SS Packaging, including processing times, delivery estimates, and shipping terms.',
  path: '/shipping',
  keywords: ['shipping policy', 'SS Packaging shipping', 'delivery policy'],
});

export default function ShippingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* WebPage schema for the shipping policy page. */}
      <SchemaInjector
        schemas={[
          buildWebPageSchema({
            path: '/shipping',
            name: 'Shipping Policy',
            description: 'Review SS Packaging shipping timelines, delivery coverage, charges, and shipment support details.',
            keywords: ['shipping policy', 'delivery policy', 'SS Packaging shipping'],
          }),
        ]}
      />
      {children}
    </>
  );
}
