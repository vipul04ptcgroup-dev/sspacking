'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Eye } from 'lucide-react';
import type { Product } from '@/types';
import { formatPrice } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const lowestVariant = product.variants
    .filter(v => typeof v.price === 'number')
    .reduce((min, v) => (v.price as number) < (min.price as number) ? v : min, product.variants.find(v => typeof v.price === 'number') || product.variants[0]);

  const previewImage = lowestVariant?.images?.[0] || product.images?.[0] || '';

  return (
    <Link href={`/products/${product.category}/${product.slug}`} className="group block">
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
        <div className="relative aspect-square bg-stone-50 overflow-hidden">
          {previewImage ? (
            <Image
              src={previewImage}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-200">
              <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
          )}
          {product.featured && (
            <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
              Featured
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
            <div className="bg-white text-stone-700 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-lg">
              <Eye className="w-3.5 h-3.5" /> View
            </div>
          </div>
        </div>

        <div className="p-4">
          <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide mb-1">{product.category}</p>
          <h3 className="text-sm font-bold text-stone-900 group-hover:text-amber-700 transition leading-snug line-clamp-2 mb-2">{product.name}</h3>
          <p className="text-xs text-stone-500 line-clamp-2 mb-3">{product.shortDescription}</p>

          <div className="flex items-center justify-between">
            <div>
              {lowestVariant?.price !== undefined && (
                <span className="text-base font-black text-stone-900">{formatPrice(lowestVariant.price)}</span>
              )}
              <p className="text-[10px] text-stone-400 mt-0.5">{product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
