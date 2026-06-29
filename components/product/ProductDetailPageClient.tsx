'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Check, MessageSquare, Package } from 'lucide-react';
import type { ClientProduct } from '@/lib/client-serialization';
import { resolveProductPublicCategory } from '@/lib/public-product-categories';
import { formatMeasurementValue, getProductUnitLabel } from '@/lib/product-units';
import { formatPrice } from '@/lib/utils';
import { trackVisitorEvent } from '@/lib/visitor-analytics-client';

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
  const hasMediaShowcase =
    Boolean(product.scanner3dImage) ||
    Boolean(product.compatibleClosuresImage) ||
    product.compatibleClosures.length > 0 ||
    Boolean(product.dimensionDiagramImage) ||
    product.suitableFor.length > 0 ||
    Boolean(product.customizationImage) ||
    product.customizationOptions.length > 0 ||
    product.applicationIndustries.length > 0;
  const hasDesktopSidebarMedia =
    Boolean(product.scanner3dImage) ||
    Boolean(product.compatibleClosuresImage) ||
    product.compatibleClosures.length > 0;
  const specRows = [
    ['Capacity', product.capacity],
    ['Neck Finish', product.neckSize],
    ['Height', product.height],
    ['Width', product.width],
    ['Length', product.length],
    ['Weight', formatMeasurementValue(product.weight, product.unit)],
    ['Bottle Weight', product.bottle_weight_gram ? `${product.bottle_weight_gram} GRAM` : ''],
    ['Material', product.material],
    ['Packaging', product.packagingSize],
    ['Color', product.color],
    ['Surface Finish', product.surfaceFinish],
    ['Suitable For', product.suitableForText],
    ['MOQ', product.moq],
    ['Country of Origin', product.countryOfOrigin],
    ['SKU', product.sku],
    ['Stock Unit', getProductUnitLabel(product.unit)],
  ].filter(([, value]) => value);

  useEffect(() => {
    trackVisitorEvent({
      eventType: 'product_view',
      productId: product.id,
      productName: product.name,
      pageUrl: typeof window !== 'undefined' ? window.location.href : productUrl,
      price: startingPrice,
    });
  }, [product.id, product.name, productUrl, startingPrice]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <div className="relative mb-4 aspect-square overflow-hidden rounded-2xl bg-stone-50">
            {images[selectedImage] ? (
              <Image src={images[selectedImage]} alt={product.name} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-stone-200">
                <Package className="h-24 w-24" />
              </div>
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

        <div className="min-w-0">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-amber-600">{publicCategory.name}</p>
          <h1 className="mb-4 break-words text-3xl font-black leading-tight text-stone-900">{product.name}</h1>
          <p className="mb-4 break-words text-sm leading-relaxed text-stone-500">{product.shortDescription}</p>

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

          {pricingTiers.length > 0 ? (
            <div className="mb-6 overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
              <div className="border-b border-stone-100 bg-stone-50 px-4 py-3">
                <h2 className="text-sm font-bold text-stone-900">Pricing Tiers</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-50">
                      <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-500 sm:px-4 sm:text-xs">Min Qty</th>
                      <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-500 sm:px-4 sm:text-xs">Max Qty</th>
                      <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-500 sm:px-4 sm:text-xs">Unit Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {pricingTiers.map((tier, index) => (
                      <tr key={`${tier.minQty}-${tier.maxQty}-${index}`}>
                        <td className="px-3 py-3 text-sm text-stone-700 sm:px-4">{tier.minQty}</td>
                        <td className="px-3 py-3 text-sm text-stone-700 sm:px-4">{tier.maxQty}</td>
                        <td className="px-3 py-3 text-sm font-semibold text-stone-900 sm:px-4">{formatPrice(tier.unitPrice)}</td>
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
              <span key={`${tag}-${index}`} className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {specRows.length > 0 || hasDesktopSidebarMedia ? (
        <div className="mt-12 grid gap-6 xl:grid-cols-[minmax(0,0.72fr)_minmax(420px,0.98fr)] xl:gap-8 xl:items-start">
          {specRows.length > 0 ? (
            <section className="overflow-hidden rounded-[30px] border border-stone-200/80 bg-white shadow-[0_24px_70px_-50px_rgba(15,23,42,0.24)]">
              <div className="border-b border-stone-100 bg-gradient-to-r from-stone-50 via-white to-stone-50 px-5 py-4 sm:px-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-600">Product Details</p>
                <h2 className="mt-1 text-lg font-black uppercase tracking-wide text-stone-900">Specifications</h2>
              </div>
              <div className="p-3 sm:p-4">
                <div className="overflow-hidden rounded-[24px] border border-stone-100 bg-white">
                  {specRows.map(([label, value], index) => (
                    <div
                      key={label}
                      className={`grid grid-cols-[minmax(0,0.95fr)_minmax(0,0.9fr)] border-b border-stone-100 last:border-b-0 ${
                        index % 2 === 0 ? 'bg-stone-50/70' : 'bg-white'
                      }`}
                    >
                      <div className="border-r border-stone-100 px-4 py-3 sm:px-5">
                        <p className="text-sm font-semibold tracking-[-0.01em] text-stone-700">{label}</p>
                      </div>
                      <div className="px-4 py-3 sm:px-5">
                        <p className="whitespace-pre-line text-sm font-semibold leading-6 text-stone-900">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {hasDesktopSidebarMedia ? (
            <div className="space-y-6 xl:w-full">
              {product.scanner3dImage ? (
                <section className="overflow-hidden rounded-[30px] border border-stone-200/80 bg-white shadow-[0_24px_70px_-50px_rgba(15,23,42,0.24)]">
                  <div className="border-b border-stone-100 bg-gradient-to-r from-stone-50 via-white to-stone-50 px-5 py-4 sm:px-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-600">Interactive Preview</p>
                    <h2 className="mt-1 text-lg font-black uppercase tracking-wide text-stone-900">360&deg; View</h2>
                  </div>
                  <div className="px-4 py-5 sm:px-6">
                    <div className="flex justify-center">
                      <div className="flex w-full flex-col items-center justify-center text-center">
                        <div className="relative aspect-square w-full max-w-[292px] overflow-hidden rounded-[30px] border border-stone-100 bg-stone-50 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.25)]">
                          <Image
                            src={product.scanner3dImage}
                            alt={`${product.name} 3D view scanner`}
                            fill
                            className="object-cover"
                            sizes="292px"
                          />
                        </div>
                        <p className="mt-4 max-w-[280px] text-xs leading-5 text-stone-600">Scan the QR code to open the 360-degree product model and inspect the package from every angle.</p>
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              {product.compatibleClosures.length > 0 || product.compatibleClosuresImage ? (
                <section className="overflow-hidden rounded-[30px] border border-stone-200/80 bg-white shadow-[0_24px_70px_-50px_rgba(15,23,42,0.24)]">
                  <div className="border-b border-stone-100 bg-gradient-to-r from-stone-50 via-white to-stone-50 px-5 py-4 sm:px-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-600">Accessories</p>
                    <h2 className="mt-1 text-lg font-black uppercase tracking-wide text-stone-900">Compatible Closures</h2>
                  </div>
                  <div className="p-4 sm:p-5">
                    {product.compatibleClosures.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {product.compatibleClosures.map((item, index) => (
                          <div key={`${item.name}-${index}`} className="rounded-[22px] border border-stone-100 bg-stone-50/70 p-3 text-center">
                            <div className="relative mx-auto aspect-square w-full max-w-[98px] overflow-hidden rounded-2xl bg-white">
                              <Image
                                src={item.imageUrl}
                                alt={item.name}
                                fill
                                className="object-contain p-2"
                                sizes="98px"
                              />
                            </div>
                            <p className="mt-2 text-[11px] font-semibold leading-4 text-stone-700">{item.name}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="relative aspect-[16/7.2] overflow-hidden rounded-[26px] border border-stone-100 bg-stone-50">
                        <Image
                          src={product.compatibleClosuresImage}
                          alt={`${product.name} compatible closures`}
                          fill
                          className="object-contain"
                          sizes="(max-width: 1279px) 100vw, 420px"
                        />
                      </div>
                    )}
                  </div>
                </section>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {hasMediaShowcase ? (
        <div className="mt-6 space-y-6">
          {product.suitableFor.length > 0 ? (
            <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-sm">
              <div className="px-5 py-4">
                <h2 className="text-lg font-black uppercase tracking-wide text-stone-900">Suitable For</h2>
              </div>
              <div className="grid gap-4 border-t border-stone-100 p-4 sm:grid-cols-2 sm:p-5">
                {product.suitableFor.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="rounded-2xl border border-stone-100 bg-stone-50 p-4 text-center">
                    <div className="relative mx-auto aspect-square w-16 overflow-hidden rounded-2xl bg-white sm:w-20">
                      <Image src={item.svgUrl} alt={item.name} fill className="object-contain p-3" sizes="80px" />
                    </div>
                    <p className="mt-3 text-sm font-medium leading-5 text-stone-900">{item.name}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
            {product.dimensionDiagramImage ? (
              <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-sm">
                <div className="px-5 py-4">
                  <h2 className="text-lg font-black uppercase tracking-wide text-stone-900">Dimension Diagram</h2>
                </div>
                <div className="border-t border-stone-100 p-4 sm:p-5">
                  <div className="relative aspect-[16/7] overflow-hidden rounded-2xl bg-stone-50">
                    <Image
                      src={product.dimensionDiagramImage}
                      alt={`${product.name} dimension diagram`}
                      fill
                      className="object-contain"
                      sizes="(max-width: 1279px) 100vw, 760px"
                    />
                  </div>
                </div>
              </section>
            ) : null}

            {product.customizationImage || product.customizationOptions.length > 0 || product.applicationIndustries.length > 0 ? (
              <div className="grid gap-6">
                {product.customizationImage || product.customizationOptions.length > 0 ? (
                  <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-sm">
                    <div className="px-5 py-4">
                      <h2 className="text-lg font-black uppercase tracking-wide text-stone-900">Customization Options</h2>
                    </div>
                    <div className="grid gap-6 border-t border-stone-100 p-4 sm:p-5 lg:grid-cols-[1fr_220px]">
                      {product.customizationOptions.length > 0 ? (
                        <div className="space-y-3">
                          {product.customizationOptions.map((option, index) => (
                            <div key={`${option}-${index}`} className="flex items-start gap-3">
                              <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-stone-900 text-white">
                                <Check className="h-3.5 w-3.5" />
                              </span>
                              <p className="text-sm text-stone-700">{option}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {product.customizationImage ? (
                        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-stone-50">
                          <Image
                            src={product.customizationImage}
                            alt={`${product.name} customization options`}
                            fill
                            className="object-contain"
                            sizes="220px"
                          />
                        </div>
                      ) : null}
                    </div>
                  </section>
                ) : null}

                {product.applicationIndustries.length > 0 ? (
                  <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-sm">
                    <div className="px-5 py-4">
                      <h2 className="text-lg font-black uppercase tracking-wide text-stone-900">Application Industries</h2>
                    </div>
                    <div className="space-y-3 border-t border-stone-100 p-4 sm:p-5">
                      {product.applicationIndustries.map((industry, index) => (
                        <div key={`${industry}-${index}`} className="flex items-start gap-3">
                          <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-stone-900 text-white">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                          <p className="text-sm text-stone-700">{industry}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

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
                  <p className="mt-1 whitespace-pre-line text-sm font-medium text-stone-900">{product.remark}</p>
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
