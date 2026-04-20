'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getCategories } from '@/lib/firestore';
import { ArrowRight } from 'lucide-react';

type Category = {
  id: string;
  name: string;
  slug: string;
  image?: string;
};

export default function CategoryGrid() {
  const [categories, setCategories] = useState<Category[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Fetch categories on client
  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  // Drag logic
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    isDragging.current = true;
    scrollRef.current.classList.add('cursor-grabbing');
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
    scrollRef.current?.classList.remove('cursor-grabbing');
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    scrollRef.current?.classList.remove('cursor-grabbing');
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();

    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };

  if (!categories.length) return null;

  return (
    <section className="py-15 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-amber-600 font-semibold text-sm uppercase tracking-widest mb-2">
            Browse by Type
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-stone-900">
            Shop by Category
          </h2>
        </div>

        {/* Draggable Row */}
        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide cursor-grab snap-x"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/products/${cat.slug}`}
              className="group relative min-w-[190px] sm:min-w-[240px] lg:min-w-[260px] aspect-[1/1] rounded-2xl overflow-hidden bg-stone-100 hover:shadow-xl transition-all flex-shrink-0 snap-start"
            >
              {cat.image ? (
  <Image
    src={cat.image}
    alt={cat.name}
    fill
    className="object-cover group-hover:scale-105 transition-transform duration-500"
  />
) : (
  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-stone-200">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="w-10 h-10 text-stone-400"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16l4-4a3 3 0 014 0l4 4m-2-2l1-1a3 3 0 014 0l3 3M3 6h.01M21 6h.01M6 3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6a3 3 0 013-3z"
      />
    </svg>
  </div>
)}

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-white font-bold text-sm sm:text-base leading-tight">
                  {cat.name}
                </h3>
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