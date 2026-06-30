import { Suspense } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { FeaturesSection, IndustriesSection, WhyChooseSection } from '@/components/home/HeroSections';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import CategoryGrid from '@/components/home/CategoryGrid';
import FullWidthCTA from '@/components/home/FullWidthCTA';
import ProcessAboutSection from '@/components/home/ProcessAboutSection';
import ClientTrustSection from '@/components/home/ClientTrustSection';
import { getHomepageBannerSettingsServer } from '@/lib/homepage-banner-settings';
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

export default async function HomePage() {
  const homepageBanners = await getHomepageBannerSettingsServer();

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
          src={homepageBanners.desktopBanner}
          alt="SS Packaging banner"
          width={1600}
          height={700}
          priority
          className="hidden w-full h-auto md:block"
        />
        <Image
          src={homepageBanners.mobileBanner}
          alt="SS Packaging banner"
          width={900}
          height={1200}
          priority
          className="block w-full h-auto md:hidden"
        />
        <div className="absolute inset-0 flex items-start pt-5 md:items-center md:pt-0">
          <div className="w-full px-3 sm:px-6 lg:px-10 xl:px-14">
            <div className="relative min-h-[240px] sm:min-h-0 max-w-[205px] sm:max-w-md lg:max-w-[42rem] xl:max-w-[46rem]">
              
              <h1 className="text-[1.9rem] sm:text-5xl lg:text-6xl xl:text-7xl font-black uppercase leading-[0.88] tracking-[-0.04em] drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)]">
                <span className="block text-[#4a2f22]">Premium</span>
                <span className="block text-[#6d8429]">Packaging For</span>
                <span className="block text-[#4a2f22]">Every Need</span>
              </h1>
              <div className="my-2 h-[2px] w-24 sm:my-7 sm:w-24 bg-[#8a9b37]" />
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
      <FeaturesSection />
      <Suspense fallback={<div className="py-20 text-center text-stone-400">Loading...</div>}>
        <CategoryGrid />
      </Suspense>
      <WhyChooseSection />
      <Suspense fallback={<div className="py-20 text-center text-stone-400">Loading...</div>}>
        <FeaturedProducts />
      </Suspense>
      <IndustriesSection />
      <FullWidthCTA />
      <ProcessAboutSection />
      <ClientTrustSection />
    </>
  );
}
