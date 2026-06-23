import { Suspense } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { FeaturesSection, CTASection } from '@/components/home/HeroSections';
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
      <section className="relative">
        <Image
          src="/banner.png"
          alt="SS Packaging banner"
          width={1600}
          height={700}
          priority
          className="hidden w-full h-auto md:block"
        />
        <Image
          src="/bannermobile.png"
          alt="SS Packaging banner"
          width={900}
          height={1200}
          priority
          className="block w-full h-auto md:hidden"
        />
        <div className="absolute inset-0 flex items-start pt-5 md:items-center md:pt-0">
          <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-14">
            <div className="relative min-h-[240px] sm:min-h-0 max-w-[205px] sm:max-w-md lg:max-w-[42rem] xl:max-w-[46rem]">
              <div className="mb-2 h-[2px] w-12 sm:mb-5 sm:w-20 bg-[#8a9b37]" />
              <h1 className="text-[1.9rem] sm:text-5xl lg:text-6xl xl:text-7xl font-black uppercase leading-[0.88] tracking-[-0.04em] drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)]">
                <span className="block text-[#4a2f22]">Preimunm</span>
                <span className="block text-[#6d8429]">Packaging For</span>
                <span className="block text-[#4a2f22]">Every Nedd</span>
              </h1>
              <p className="hidden sm:mt-5 sm:block sm:max-w-md sm:text-lg lg:max-w-xl lg:text-2xl font-medium leading-[1.35] tracking-[0.01em] text-stone-700/90">
                Hight Quality Jars, bottles for every industry
              </p>
            </div>
          </div>
          <p className="absolute bottom-6 right-3 max-w-[185px] text-right text-[0.8rem] font-medium leading-[1.25] tracking-[-0.01em] text-stone-700/90 sm:hidden">
            Hight Quality Jars, bottles for every industry
          </p>
        </div>
      </section>
      <section className="bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
          <div className="grid grid-cols-3 overflow-hidden rounded-2xl border border-stone-200 bg-stone-50/50">
            {[
              { value: '500+', label: 'Products' },
              { value: '1000+', label: 'Happy Clients' },
              { value: '10+', label: 'Years Experience' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex min-h-[92px] sm:min-h-[120px] flex-col items-center justify-center px-3 py-4 text-center border-r border-stone-200 last:border-r-0"
              >
                <div className="text-2xl sm:text-4xl font-black tracking-tight text-amber-500">{item.value}</div>
                <div className="mt-1.5 text-[0.75rem] sm:text-base font-medium text-stone-600">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
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
