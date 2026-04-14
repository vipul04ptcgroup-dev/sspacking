'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Shield, Leaf, Award, Truck } from 'lucide-react';

export function HeroBanner() {
  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Amber glow */}
      <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-amber-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm font-semibold px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            India's Premium Packaging Supplier
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] mb-6">
            <span className="text-amber-400">Attractive</span><br />
            Functional<br />
            <span className="text-amber-300">Durable</span><br />
            Safe
          </h1>
          <p className="text-stone-300 text-lg leading-relaxed mb-8 max-w-md">
            From bamboo to glass, from eco-friendly to industrial — discover packaging that protects, preserves, and impresses.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/products" className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-bold px-7 py-4 rounded-xl transition-all shadow-lg shadow-amber-900/30 hover:shadow-amber-900/50 hover:-translate-y-0.5">
              Explore Products <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/contact#quote" className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-7 py-4 rounded-xl transition-all backdrop-blur-sm">
              Get a Quote
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-12">
            {[
              { value: '500+', label: 'Products' },
              { value: '1000+', label: 'Happy Clients' },
              { value: '10+', label: 'Years Experience' },
            ].map(stat => (
              <div key={stat.label}>
                <div className="text-3xl font-black text-amber-400">{stat.value}</div>
                <div className="text-stone-400 text-sm mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right side hero image placeholder */}
        <div className="hidden lg:flex items-center justify-center">
          <div className="relative w-full max-w-lg aspect-square">
            <div className="absolute inset-0 bg-amber-600/20 rounded-3xl backdrop-blur-sm border border-amber-500/20 flex items-center justify-center">
              <div className="text-center text-amber-300/50">
                <svg className="w-32 h-32 mx-auto mb-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
                <p className="text-lg font-semibold">Add hero image</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FeaturesSection() {
  const features = [
    { icon: Shield, title: 'Quality Assured', desc: 'Every product passes rigorous quality checks before it reaches you.' },
    { icon: Leaf, title: 'Eco-Friendly', desc: 'Sustainable packaging options that are better for our planet.' },
    { icon: Award, title: 'Premium Materials', desc: 'Sourced from the finest suppliers — bamboo, glass, and beyond.' },
    { icon: Truck, title: 'Pan-India Delivery', desc: 'Fast and reliable shipping to every corner of India.' },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black text-stone-900">Why Choose SS Packaging?</h2>
          <p className="mt-3 text-stone-500 max-w-xl mx-auto">We combine design, durability, and sustainability to deliver packaging that works as hard as you do.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(f => (
            <div key={f.title} className="text-center p-6 rounded-2xl border border-stone-100 hover:border-amber-200 hover:shadow-lg transition-all group">
              <div className="w-14 h-14 bg-amber-50 group-hover:bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-colors">
                <f.icon className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-base font-bold text-stone-900 mb-2">{f.title}</h3>
              <p className="text-sm text-stone-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CTASection() {
  return (
    <section className="py-20 bg-amber-600">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">Need Custom Packaging?</h2>
        <p className="text-amber-100 text-lg mb-8 max-w-xl mx-auto">
          Whether you need 100 pieces or 100,000 — we handle bulk orders with custom branding, sizes, and materials.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/contact#quote" className="inline-flex items-center justify-center gap-2 bg-white text-amber-700 font-bold px-8 py-4 rounded-xl hover:bg-amber-50 transition shadow-lg">
            Request a Quote <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/products" className="inline-flex items-center justify-center gap-2 bg-amber-700 text-white font-semibold px-8 py-4 rounded-xl hover:bg-amber-800 transition">
            Browse Products
          </Link>
        </div>
      </div>
    </section>
  );
}
