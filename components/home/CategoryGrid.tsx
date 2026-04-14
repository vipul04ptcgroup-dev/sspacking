import Link from 'next/link';
import Image from 'next/image';
import { getCategories } from '@/lib/firestore';
import { ArrowRight } from 'lucide-react';

export default async function CategoryGrid() {
  const categories = await getCategories().catch(() => []);
  if (!categories.length) return null;

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-amber-600 font-semibold text-sm uppercase tracking-widest mb-2">Browse by Type</p>
          <h2 className="text-3xl sm:text-4xl font-black text-stone-900">Shop by Category</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map(cat => (
            <Link
              key={cat.id}
              href={`/products/${cat.slug}`}
              className="group relative aspect-square rounded-2xl overflow-hidden bg-stone-100 hover:shadow-xl transition-all"
            >
              {cat.image ? (
                <Image src={cat.image} alt={cat.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-100 to-stone-200" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-white font-bold text-sm sm:text-base leading-tight">{cat.name}</h3>
                <div className="flex items-center gap-1 text-amber-300 text-xs mt-1 group-hover:gap-2 transition-all">
                  Shop now <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
