'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MessageSquare, Package } from 'lucide-react';
import type { ClientProduct } from '@/lib/client-serialization';
import { resolveProductPublicCategory } from '@/lib/public-product-categories';
import { formatMeasurementValue, getProductUnitLabel } from '@/lib/product-units';
import { formatPrice } from '@/lib/utils';

type DescriptionBlock =
  | { type: 'paragraph'; content: string }
  | { type: 'list'; items: string[] };

function buildDescriptionBlocks(description: string): DescriptionBlock[] {
  return description
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const bulletItems = lines
        .map((line) => line.match(/^[-*â€¢]\s+(.+)$/)?.[1]?.trim() || null);

      if (lines.length > 0 && bulletItems.every(Boolean)) {
        return {
          type: 'list',
          items: bulletItems.filter((item): item is string => Boolean(item)),
        };
      }

      return {
        type: 'paragraph',
        content: block,
      };
    });
}

export default function ProductDetailPageClient({
  slug,
  product,
}: {
  slug: string;
  product: ClientProduct;
}) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState<'description' | 'attributes'>('description');

  const images = product.images || [];
  const pricingTiers = [...product.pricingTiers].sort((left, right) => left.minQty - right.minQty);
  const startingPrice = pricingTiers.length > 0 ? Math.min(...pricingTiers.map((tier) => tier.unitPrice)) : null;
  const isOutOfStock = product.stockQuantity <= 0;
  const descriptionBlocks = buildDescriptionBlocks(product.description);
  const publicCategory = resolveProductPublicCategory(product);
  const productUrl = `/products/${publicCategory.slug}/${slug}`;
  const enquiryUrl = `/contact?product=${encodeURIComponent(product.name)}&productUrl=${encodeURIComponent(productUrl)}#quote`;
  const specRows = [
    ['Capacity', product.capacity],
    ['Neck Size', product.neckSize],
    ['Height', product.height],
    ['Weight', formatMeasurementValue(product.weight, product.unit)],
    ['Bottle Weight', product.bottle_weight_gram ? `${product.bottle_weight_gram} GRAM` : ''],
    ['Material', product.material],
    ['Packaging Size', product.packagingSize],
    ['Color', product.color],
    ['SKU', product.sku],
    ['Stock Unit', getProductUnitLabel(product.unit)],
  ].filter(([, value]) => value);
  const quickAttributes = [
    ['Color', product.color],
    ['Neck Size', product.neckSize],
    ['Material', product.material],
    ['Weight', formatMeasurementValue(product.weight, product.unit)],
    ['Height', product.height],
  ].filter(([, value]) => value);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <div className="relative mb-4 aspect-square overflow-hidden rounded-2xl bg-stone-50">
            {images[selectedImage] ? (
              <Image src={images[selectedImage]} alt={product.name} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-stone-200"><Package className="h-24 w-24" /></div>
            )}
          </div>
          {images.length > 1 ? (
            <div className="grid grid-cols-5 gap-2">
              {images.map((img, index) => (
                <button
                  key={`${img}-${index}`}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square overflow-hidden rounded-lg border-2 transition ${index === selectedImage ? 'border-amber-500' : 'border-transparent hover:border-stone-300'}`}
                >
                  <Image src={img} alt="" width={80} height={80} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-amber-600">{publicCategory.name}</p>
          <h1 className="mb-4 text-3xl font-black leading-tight text-stone-900">{product.name}</h1>
          <p className="mb-4 text-sm leading-relaxed text-stone-500">{product.shortDescription}</p>

          {startingPrice != null ? (
            <p className="mb-4 text-3xl font-black text-stone-900">{formatPrice(startingPrice)}</p>
          ) : null}

          <div className="mb-4">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
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
            </span>
            {isOutOfStock ? (
              <p className="mt-2 text-sm font-medium text-red-600">This product is out of stock, so checkout is unavailable right now.</p>
            ) : null}
          </div>

          {quickAttributes.length > 0 ? (
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {quickAttributes.map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{label}</p>
                  <p className="mt-1 text-sm font-medium text-stone-900">{value}</p>
                </div>
              ))}
            </div>
          ) : null}

          {pricingTiers.length > 0 ? (
            <div className="mb-6 overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
              <div className="border-b border-stone-100 bg-stone-50 px-4 py-3">
                <h2 className="text-sm font-bold text-stone-900">Pricing Tiers</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[360px]">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Min Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Max Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Unit Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {pricingTiers.map((tier, index) => (
                      <tr key={`${tier.minQty}-${tier.maxQty}-${index}`}>
                        <td className="px-4 py-3 text-sm text-stone-700">{tier.minQty}</td>
                        <td className="px-4 py-3 text-sm text-stone-700">{tier.maxQty}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-stone-900">{formatPrice(tier.unitPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <Link
            href={enquiryUrl}
            className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-500 py-3 font-bold text-amber-600 transition hover:bg-amber-50"
          >
            <MessageSquare className="h-4 w-4" />
            Enquiry for This Product
          </Link>

          <div className="flex flex-wrap gap-2">
            {product.tags.map((tag, index) => (
              <span key={`${tag}-${index}`} className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-12 overflow-hidden rounded-3xl border border-stone-100 bg-white shadow-sm">
        <div className="border-b border-stone-100 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('description')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'description'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Description
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('attributes')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'attributes'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Attributes
            </button>
          </div>
        </div>

        <div className="px-4 py-6 sm:px-6">
          {activeTab === 'description' ? (
            descriptionBlocks.length > 0 ? (
              <div className="space-y-4 text-sm leading-7 text-stone-600">
                {descriptionBlocks.map((block, index) =>
                  block.type === 'list' ? (
                    <ul key={`description-list-${index}`} className="list-disc space-y-2 pl-5">
                      {block.items.map((item, itemIndex) => (
                        <li key={`description-list-item-${index}-${itemIndex}`}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p key={`description-paragraph-${index}`} className="whitespace-pre-line">
                      {block.content}
                    </p>
                  ),
                )}
              </div>
            ) : (
              <p className="text-sm text-stone-500">No detailed description is available for this product yet.</p>
            )
          ) : specRows.length > 0 || product.remark ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {specRows.map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
                  <p className="mt-1 text-sm font-medium text-stone-900">{value}</p>
                </div>
              ))}
              {product.remark ? (
                <div className="rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3 sm:col-span-2 lg:col-span-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Remark</p>
                  <p className="mt-1 text-sm font-medium text-stone-900 whitespace-pre-line">{product.remark}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-stone-500">No product attributes are available for this product yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
