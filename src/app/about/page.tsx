import Link from 'next/link';
import { Award, Users, Leaf, Globe } from 'lucide-react';

export default function AboutPage() {
  const stats = [
    { value: '10+', label: 'Years in Business' },
    { value: '500+', label: 'Product Varieties' },
    { value: '1000+', label: 'Happy Clients' },
    { value: '50+', label: 'Cities Served' },
  ];

  const values = [
    { icon: Award, title: 'Uncompromising Quality', desc: 'Every product is rigorously tested before it leaves our warehouse. We partner only with certified, trusted manufacturers.' },
    { icon: Leaf, title: 'Eco Commitment', desc: 'We prioritize sustainable materials and processes. Our bamboo and recycled packaging lines help reduce environmental impact.' },
    { icon: Users, title: 'Customer First', desc: 'From pre-sales consultation to after-sales support, we\'re with you every step of the way.' },
    { icon: Globe, title: 'Pan-India Reach', desc: 'We deliver premium packaging to businesses of all sizes, from startups to large enterprises, across all of India.' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-stone-900 to-amber-950 text-white py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl sm:text-6xl font-black mb-6">
            About <span className="text-amber-400">SS Packaging</span>
          </h1>
          <p className="text-stone-300 text-xl leading-relaxed max-w-2xl mx-auto">
            For over a decade, we've been India's go-to partner for premium, functional, and eco-conscious packaging solutions.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map(s => (
              <div key={s.label} className="text-center">
                <div className="text-5xl font-black text-amber-600 mb-2">{s.value}</div>
                <div className="text-stone-500 text-sm font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 bg-stone-50">
        <div className="max-w-5xl mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-amber-600 font-semibold text-sm uppercase tracking-widest mb-3">Our Story</p>
            <h2 className="text-4xl font-black text-stone-900 mb-5">Built on a Passion for Better Packaging</h2>
            <p className="text-stone-600 leading-relaxed mb-4">
              SS Packaging was founded with a simple belief: great packaging should be accessible to every business, regardless of size. We started in Mumbai's industrial heartland with a small warehouse and a big dream — to connect Indian businesses with world-class packaging.
            </p>
            <p className="text-stone-600 leading-relaxed mb-6">
              Today, we source from the finest manufacturers across Asia and distribute across India. Whether you need 50 bamboo bottles for a boutique skincare brand or 50,000 corrugated boxes for a large logistics firm — we've got you covered.
            </p>
            <Link href="/contact#quote" className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-3 rounded-xl transition">
              Work With Us
            </Link>
          </div>
          <div className="bg-gradient-to-br from-amber-100 to-stone-200 rounded-3xl aspect-square flex items-center justify-center">
            <div className="text-center text-amber-400/60">
              <svg className="w-32 h-32 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              </svg>
              <p className="text-lg font-semibold mt-2">Add about image</p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-stone-900">Our Core Values</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map(v => (
              <div key={v.title} className="p-6 rounded-2xl border border-stone-100 hover:border-amber-200 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4">
                  <v.icon className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="font-bold text-stone-900 mb-2">{v.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
