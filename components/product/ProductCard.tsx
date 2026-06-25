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
        <div className="relative aspect-[1/1] overflow-hidden bg-[linear-gradient(145deg,#f8f5ef_0%,#ffffff_52%,#eef2f6_100%)]">
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
            <div className="absolute left-3 top-3 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
              Featured
            </div>
          )}
          <div className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm ${
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

      <div className="space-y-4 p-4">
        <Link href={productUrl} className="block">
          <h3 className="text-base font-black leading-snug text-stone-900 transition group-hover:text-amber-700 line-clamp-2">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            {lowestTier ? (
              <p className="text-2xl font-black leading-none text-stone-950">{formatPrice(lowestTier.unitPrice)}</p>
            ) : (
              <p className="text-lg font-bold text-stone-500">Price on request</p>
            )}
          </div>
          <Link
            href={enquiryUrl}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#111827] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.04em] text-white transition hover:bg-[#1f2937]"
          >
            Enquiry <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
