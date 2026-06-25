import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Package2 } from 'lucide-react';
import { getCategories } from '@/lib/firestore';

export default async function CategoryGrid() {
  const categories = await getCategories().catch(() => []);

  if (!categories.length) return null;

  return (
    <section className="bg-white py-10 sm:py-12 lg:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-600">
            Explore Our Range
          </p>
          <h2 className="text-3xl font-black text-stone-900 sm:text-4xl">
            Explore Packaging Categories
          </h2>
          <div className="mx-auto mt-3 h-[3px] w-16 rounded-full bg-amber-300" />
        </div>

        <div
          className="mt-8 flex gap-4 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/products/${cat.slug}`}
              className="group relative min-w-[280px] overflow-hidden rounded-[10px] border border-stone-200 bg-white shadow-[0_16px_40px_-34px_rgba(15,23,42,0.28)] transition-all duration-300 hover:-translate-y-1 hover:border-amber-200 hover:shadow-[0_24px_60px_-40px_rgba(217,119,6,0.22)] lg:min-w-0"
            >
              <div className="relative min-h-[220px] sm:min-h-[250px] lg:min-h-[285px] overflow-hidden bg-[linear-gradient(145deg,#f8f5ef_0%,#ffffff_52%,#eef2f6_100%)]">
                {cat.image ? (
                  <Image
                    src={cat.image}
                    alt={cat.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 1024px) 280px, 33vw"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="rounded-[2rem] border border-white/80 bg-white/80 px-10 py-8 shadow-sm backdrop-blur">
                      <Package2 className="h-16 w-16 text-stone-400" />
                    </div>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/88 to-transparent" />
              </div>

              <div className="absolute inset-x-4 bottom-4 flex items-center gap-2.5 rounded-[8px] border border-stone-200 bg-white px-3 py-2.5 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.25)]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0f172a] text-white">
                  <Package2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[13px] font-bold leading-tight text-stone-900 sm:text-sm">
                    {cat.name}
                  </h3>
                </div>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-amber-300 text-amber-500 transition group-hover:bg-amber-50">
                  <ArrowRight className="h-[13px] w-[13px]" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
