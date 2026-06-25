import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  CheckCircle2,
  CircleDollarSign,
  Factory,
  MapPin,
  Palette,
  PhoneCall,
  Truck,
} from 'lucide-react';
import { COMPANY_DETAILS } from '@/lib/company';

export function HeroBanner() {
  return (
    <section className="relative min-h-[78vh] sm:min-h-[82vh] lg:min-h-[85vh] flex items-center overflow-hidden bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Amber glow */}
      <div className="absolute top-1/2 right-0 w-[320px] h-[320px] sm:w-[460px] sm:h-[460px] lg:w-[600px] lg:h-[600px] bg-amber-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
        <div className="text-center lg:text-left order-1">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-semibold px-3.5 sm:px-4 py-1.5 rounded-full mb-5 sm:mb-6">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            India's Premium Packaging Supplier
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.08] sm:leading-[1.05] mb-4 sm:mb-6">
            <span className="text-amber-400">Attractive</span><br />
            Functional<br />
            <span className="text-amber-300">Durable</span><br />
            Safe
          </h1>
          <p className="text-stone-300 text-sm sm:text-lg leading-relaxed mb-6 sm:mb-8 max-w-xl mx-auto lg:mx-0">
            From bamboo to glass, from eco-friendly to industrial - discover packaging that protects, preserves, and impresses.
          </p>
          <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center lg:justify-start gap-3 sm:gap-4">
            <Link href="/products" className="inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold px-6 sm:px-7 py-3.5 sm:py-4 rounded-xl transition-all shadow-lg shadow-amber-900/30 hover:shadow-amber-900/50 hover:-translate-y-0.5">
              Explore Products <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/contact#quote" className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-6 sm:px-7 py-3.5 sm:py-4 rounded-xl transition-all backdrop-blur-sm">
              Get a Quote
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-4 mt-8 sm:mt-12">
            {[
              { value: '500+', label: 'Products' },
              { value: '1000+', label: 'Happy Clients' },
              { value: '10+', label: 'Years Experience' },
            ].map(stat => (
              <div key={stat.label}>
                <div className="text-xl sm:text-3xl font-black text-amber-400">{stat.value}</div>
                <div className="text-stone-400 text-[11px] sm:text-sm mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side hero image placeholder */}
        <div className="hidden sm:flex items-center justify-center order-2">
          <div className="relative w-full max-w-[220px] sm:max-w-sm lg:max-w-lg aspect-square">
            <div className="absolute inset-0 bg-amber-600/20 rounded-3xl backdrop-blur-sm border border-amber-500/20 flex items-center justify-center">
              <div className="text-center text-amber-300/50">
                <svg
                  className="w-28 h-28 sm:w-36 sm:h-36 lg:w-48 lg:h-48 mx-auto mb-3 sm:mb-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  {/* Bottle silhouette with smoother curves */}
                  <path d="M11 2h2v2.2c0 .6.3 1.2.7 1.6l1 1c.4.4.6.9.6 1.5v9.8c0 2-1.5 3.5-3.5 3.5h-1.6C8.2 21.6 6.7 20 6.7 18V8.3c0-.6.2-1.1.6-1.5l1-1c.4-.4.7-1 .7-1.6V2h2z" />

                  {/* Inner subtle cut for premium depth */}
                  <path
                    d="M9.5 8.5v9.5c0 1.2.8 2 2 2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    opacity="0.25"
                  />
                </svg>
                {/* <p className="text-lg font-semibold">Add hero image</p> */}
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

export function FeaturesSection() {
  const highlightItems = [
    { icon: Boxes, title: '5000+', label: 'Packaging SKUs' },
    { icon: Factory, title: 'Bulk', label: 'Manufacturing Support' },
    { icon: MapPin, title: 'PAN India', label: 'Supply & dispatch' },
    { icon: Palette, title: 'Custom', label: 'Branding & finishes' },
    { icon: Truck, title: 'Fast', label: 'Reliable delivery' },
    { icon: BadgeCheck, title: 'OEM', label: 'Private label support' },
  ];

  return (
    <section className="bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_transparent_28%),linear-gradient(180deg,#fff_0%,#fffaf3_100%)] pt-6 sm:pt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative z-10 -mt-8 overflow-hidden rounded-[22px] border border-stone-200/80 bg-white shadow-[0_22px_55px_-32px_rgba(15,23,42,0.35)] sm:-mt-10 md:-mt-12">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            {highlightItems.map((item) => (
              <div
                key={item.label}
                className="flex min-h-[88px] items-center gap-3 border-b border-stone-200 px-4 py-4 transition hover:bg-stone-50/50 odd:border-r md:min-h-[104px] md:gap-4 md:px-6 md:py-5 md:odd:border-r-0 md:border-b-0 md:border-r last:border-b-0 xl:px-7"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-200/80 bg-amber-50 text-[#d3a24c] md:h-11 md:w-11">
                  <item.icon className="h-4 w-4 md:h-[18px] md:w-[18px]" />
                </div>
                <div>
                  <div className="text-[1.05rem] font-bold leading-[0.98] tracking-[-0.025em] text-stone-900 md:text-[1.3rem]">
                    {item.title}
                  </div>
                  <div className="mt-1 text-[10px] font-medium leading-[1.3] tracking-[0.01em] text-stone-500 md:mt-1.5 md:text-[12px]">
                    {item.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function WhyChooseSection() {
  const reasons = [
    'Premium Quality Materials',
    'Custom Sizes & Colors',
    'Leak Proof & Durable Products',
    'OEM Manufacturing Support',
    'Competitive Bulk Pricing',
    'Fast PAN India Delivery',
    'Large Inventory Availability',
  ];

  return (
    <section className="bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_transparent_28%),linear-gradient(180deg,#fff_0%,#fffaf3_100%)] pb-6 pt-6 sm:pb-8 lg:pb-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mt-10 grid gap-6 lg:mt-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="relative overflow-hidden rounded-[10px] border border-stone-200 bg-white shadow-[0_16px_40px_-34px_rgba(15,23,42,0.22)]">
            <div className="relative min-h-[240px] sm:min-h-[300px] lg:min-h-[320px]">
              <Image
                src="/HomeWhySS.png"
                alt="SS Packaging manufacturing and supply solutions"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 52vw"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.01)_0%,rgba(15,23,42,0.08)_100%)]" />
            </div>
          </div>

          <div className="bg-transparent px-0 py-1 sm:px-1 lg:px-2 lg:py-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-600">Why Choose Us</p>
            <h2 className="mt-2 max-w-[560px] text-[1.95rem] font-black leading-[1.08] tracking-[-0.03em] text-stone-950 sm:text-[2.15rem]">
              Why Industries Trust SS Packaging?
            </h2>

            <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 sm:gap-x-8 sm:grid-cols-2">
              {reasons.map((reason) => (
                <div key={reason} className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-amber-500">
                    <CheckCircle2 className="h-[11px] w-[11px]" />
                  </div>
                  <p className="text-[13px] font-medium leading-[1.45] text-stone-700 sm:text-[14px]">{reason}</p>
                </div>
              ))}
            </div>

            <div className="mt-7 flex justify-center sm:block">
              <Link
                href="/contact#quote"
                className="inline-flex items-center justify-center gap-2 rounded-[4px] bg-[#08111f] px-6 py-3 text-[13px] font-bold uppercase tracking-[0.03em] text-white transition hover:bg-[#12243c]"
              >
                Get Free Consultation <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

export function IndustriesSection() {
  const industries = [
    { image: '/Cosmetic.png', label: 'Cosmetics' },
    { image: '/Pharmaceuticals.png', label: 'Pharmaceuticals' },
    { image: '/food.png', label: 'Food & Beverage' },
    { image: '/chemical.png', label: 'Chemicals' },
    { image: '/industries.png', label: 'Industrial' },
    { image: '/export.png', label: 'Export Businesses' },
  ];

  return (
    <section className="bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.12),_transparent_28%),linear-gradient(180deg,#fff_0%,#fffaf3_100%)] pb-12 pt-2 sm:pb-16 lg:pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="sm:p-2">
          <h2 className="text-center text-[2.1rem] font-black leading-[1.08] tracking-[-0.03em] text-[#08111f] sm:text-[2.5rem]">
            Industries We Serve
          </h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {industries.map((industry) => (
              <div
                key={industry.label}
                className="group relative overflow-hidden rounded-[14px] border border-stone-200 shadow-[0_12px_30px_-28px_rgba(15,23,42,0.18)] transition hover:-translate-y-1 hover:shadow-[0_18px_36px_-28px_rgba(217,119,6,0.2)]"
              >
                <div className="relative h-44 w-full">
                  <Image
                    src={industry.image}
                    alt={industry.label}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#08111f]/80 via-[#08111f]/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <span className="text-lg font-bold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
                      {industry.label}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function CTASection() {
  const customServices = [
    'Logo Printing',
    'Color Customization',
    'Bottle Development',
    'Labeling Support',
    'OEM Manufacturing',
  ];

  const testimonials = [
    {
      quote: 'Excellent quality products and timely delivery. SS Packaging is our trusted packaging partner.',
      author: 'Rohit Sharma',
      role: 'Cosmetic Manufacturer',
    },
    {
      quote: 'Best supplier for cosmetic packaging. Wide range and great service with quick coordination.',
      author: 'Neha Verma',
      role: 'Personal Care Brand',
    },
    {
      quote: 'Reliable for bulk orders and their customization support is practical and responsive.',
      author: 'Amit Patel',
      role: 'Pharma Company',
    },
  ];

  const trustedBrands = ['Lotus', 'Himalaya', 'Patanjali', 'Zydus', 'Dabur', 'Wipro', 'Emami'];

  return (
    <section className="bg-white py-14 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[32px] bg-[linear-gradient(120deg,#050505_0%,#121212_44%,#27170b_100%)] text-white shadow-[0_35px_90px_-50px_rgba(0,0,0,0.85)]">
          <div className="grid gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.2fr_0.8fr] lg:px-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">Need Custom Packaging?</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight sm:text-4xl">
                From concept to production, we build packaging that fits your brand and your volume.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-300 sm:text-base">
                Whether you need specialized bottles, OEM support or branded packaging for launch-ready products, our team can help you move faster with practical manufacturing guidance.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/contact#quote"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3.5 font-bold text-stone-950 transition hover:bg-amber-400"
                >
                  Start Your Project <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/products"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10"
                >
                  Browse Products
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {customServices.map((service) => (
                <div
                  key={service}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm font-semibold text-stone-100"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300">
                    <CircleDollarSign className="h-5 w-5" />
                  </div>
                  <span>{service}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-start">
          <div className="rounded-[30px] border border-stone-200 bg-[linear-gradient(180deg,#fff_0%,#faf7f0_100%)] p-6 shadow-[0_25px_70px_-50px_rgba(15,23,42,0.35)] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-600">About SS Packaging</p>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-100 bg-white shadow-sm">
                <Image
                  src={COMPANY_DETAILS.logoPath}
                  alt={COMPANY_DETAILS.legalName}
                  width={46}
                  height={46}
                  className="h-auto w-auto"
                />
              </div>
              <div>
                <h3 className="text-3xl font-black text-stone-900">Packaging that protects, preserves and elevates.</h3>
              </div>
            </div>
            <p className="mt-5 text-sm leading-7 text-stone-600 sm:text-base">
              SS Packaging is a trusted manufacturer and supplier of premium packaging solutions for cosmetic, pharmaceutical, food, FMCG and industrial applications. We focus on consistent quality, flexible order support and dependable execution for Indian businesses.
            </p>
            <p className="mt-4 text-sm leading-7 text-stone-600 sm:text-base">
              Our team supports both growing brands and established buyers with practical recommendations, responsive communication and product options that are ready for scale.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/about"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-stone-950 px-6 py-3.5 font-semibold text-white transition hover:bg-stone-800"
              >
                About Us
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 px-6 py-3.5 font-semibold text-stone-700 transition hover:bg-stone-50"
              >
                Contact Team
              </Link>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-stone-200 bg-white p-6 shadow-[0_25px_70px_-50px_rgba(15,23,42,0.35)] sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-600">What Our Clients Say</p>
                  <h3 className="mt-2 text-2xl font-black text-stone-900">Trusted by repeat buyers and growing brands.</h3>
                </div>
                <div className="hidden rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700 sm:block">
                  4.9/5 Service Experience
                </div>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-3">
                {testimonials.map((item) => (
                  <div key={item.author} className="rounded-2xl border border-stone-100 bg-stone-50 p-5">
                    <div className="mb-3 flex text-amber-500">
                      {'★★★★★'.split('').map((star, index) => (
                        <span key={`${item.author}-${index}`}>{star}</span>
                      ))}
                    </div>
                    <p className="text-sm leading-6 text-stone-600">{item.quote}</p>
                    <div className="mt-4">
                      <div className="font-bold text-stone-900">{item.author}</div>
                      <div className="text-xs text-stone-500">{item.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-stone-200 bg-stone-950 px-6 py-8 text-white shadow-[0_30px_80px_-50px_rgba(0,0,0,0.75)] sm:px-8">
              <p className="text-center text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">Trusted by Leading Brands</p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
                {trustedBrands.map((brand) => (
                  <div
                    key={brand}
                    className="flex min-h-[68px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-center text-sm font-bold text-stone-100"
                  >
                    {brand}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
