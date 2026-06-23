import { Suspense } from 'react';
import type { Metadata } from 'next';
import { HeroBanner, FeaturesSection, CTASection } from '@/components/home/HeroSections';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import CategoryGrid from '@/components/home/CategoryGrid';
import { buildMetadata, SITE_DESCRIPTION } from '@/lib/seo';
import { buildWebPageSchema } from '@/src/seo/webpageSchema';
import { SchemaInjector } from '@/src/seo/schemaInjector';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = buildMetadata({
  title: 'SS Packaging',
  description: SITE_DESCRIPTION,
  path: '/',
  keywords: ['SS Packaging', 'packaging products', 'eco-friendly packaging', 'India packaging supplier'],
});

export default function HomePage() {
  return (
    <>
      {/* Homepage WebPage schema for the main marketing landing page. */}
      <SchemaInjector
        schemas={[
          buildWebPageSchema({
            path: '/',
            name: 'SS Packaging',
            description: SITE_DESCRIPTION,
            keywords: ['SS Packaging', 'packaging products', 'eco-friendly packaging', 'India packaging supplier'],
          }),
        ]}
      />
      <HeroBanner />
      <FeaturesSection />
      <Suspense fallback={<div className="py-20 text-center text-stone-400">Loading...</div>}>
        <CategoryGrid />
      </Suspense>
      <Suspense fallback={<div className="py-20 text-center text-stone-400">Loading...</div>}>
        <FeaturedProducts />
      </Suspense>
      <CTASection />
    </>
  );
}
