import { Suspense } from 'react';
import { HeroBanner, FeaturesSection, CTASection } from '@/components/home/HeroSections';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import CategoryGrid from '@/components/home/CategoryGrid';

export default function HomePage() {
  return (
    <>
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
