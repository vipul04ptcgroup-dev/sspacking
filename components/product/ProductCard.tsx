'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import type { ClientProduct } from '@/lib/client-serialization';
import { resolveProductPublicCategory } from '@/lib/public-product-categories';
import { formatPrice } from '@/lib/utils';

interface ProductCardProps {
  product: ClientProduct;
}

export default function ProductCard({ product }: ProductCardProps) {
  const pricingTiers = [...product.pricingTiers].sort((left, right) => left.minQty - right.minQty);
  const lowestTier = pricingTiers.reduce<ClientProduct['pricingTiers'][number] | null>((lowest, tier) => {
    if (!lowest || tier.unitPrice < lowest.unitPrice) return tier;
    return lowest;
  }, null);

  const previewImage = product.images?.[0] || '';
  const publicCategory = resolveProductPublicCategory(product);
  const productUrl = `/products/${publicCategory.slug}/${product.slug}`;
  const enquiryUrl = `/contact?product=${encodeURIComponent(product.name)}&productUrl=${encodeURIComponent(productUrl)}#quote`;

  return (
    <div className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_18px_40px_-30px_rgba(15,23,42,0.28)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_-38px_rgba(217,119,6,0.24)]">
      <Link href={productUrl} className="block">
        <div className="relative aspect-[1.08/1] overflow-hidden bg-[linear-gradient(145deg,#f8f5ef_0%,#ffffff_52%,#eef2f6_100%)] sm:aspect-[1/1]">
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
              <svg className="h-14 w-14 sm:h-16 sm:w-16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
          )}
          {product.featured && (
            <div className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-white shadow-sm sm:left-3 sm:top-3 sm:px-2.5 sm:text-[10px]">
              Featured
            </div>
          )}
          <div className={`absolute right-2 top-2 rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide shadow-sm sm:right-3 sm:top-3 sm:px-2.5 sm:text-[10px] ${
            product.stockStatus === 'out_of_stock'
              ? 'bg-red-100 text-red-700'
              : product.stockStatus === 'low_stock'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-green-100 text-green-700'
          }`}>
            {product.stockStatus === 'out_of_stock'
              ? 'Out of stock'
              : product.stockStatus === 'low_stock'
                ? 'Low stock'
                : 'In stock'}
          </div>
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white/85 to-transparent" />
        </div>
      </Link>

      <div className="space-y-3 p-3.5 sm:space-y-4 sm:p-4">
        <Link href={productUrl} className="block">
          <h3 className="line-clamp-2 text-[15px] font-black leading-snug text-stone-900 transition group-hover:text-amber-700 sm:text-base">
            {product.name}
          </h3>
        </Link>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {lowestTier ? (
              <p className="text-[1.7rem] font-black leading-none text-stone-950 sm:text-2xl">{formatPrice(lowestTier.unitPrice)}</p>
            ) : (
              <p className="text-base font-bold text-stone-500 sm:text-lg">Price on request</p>
            )}
          </div>
          <Link
            href={enquiryUrl}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#111827] px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.04em] text-white transition hover:bg-[#1f2937] sm:w-auto sm:shrink-0 sm:text-xs"
          >
            Enquiry <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
