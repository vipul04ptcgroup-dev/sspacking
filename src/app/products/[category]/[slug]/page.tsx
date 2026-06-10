'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { notFound, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Package, MessageSquare } from 'lucide-react';
import { getProductBySlug } from '@/lib/firestore';
import type { Product, ProductVariant } from '@/types';
import { formatPrice } from '@/lib/utils';

export default function ProductDetailPage({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const router = useRouter();
  const { category, slug } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    getProductBySlug(slug).then(p => {
      if (!p) { setNotFoundFlag(true); return; }
      setProduct(p);
      setSelectedVariantIndex(0);
      setLoading(false);
    });
  }, [slug]);

  if (notFoundFlag) return notFound();
  if (loading) return <div className="max-w-7xl mx-auto px-4 py-10" />;
  if (!product) return null;

  const selectedVariant: ProductVariant | null = product.variants[selectedVariantIndex] || null;
  const images = selectedVariant?.images?.length ? selectedVariant.images : (product.images || []);
  const hasSelectedVariantPrice = typeof selectedVariant?.price === 'number' && selectedVariant.price > 0;
  const isOutOfStock = product.stockQuantity <= 0;
  const productUrl = `/products/${category}/${slug}`;
  const enquiryUrl = `/contact?product=${encodeURIComponent(product.name)}&variant=${encodeURIComponent(selectedVariant?.capacity || '')}&variantId=${encodeURIComponent(selectedVariant?.id || '')}&productUrl=${encodeURIComponent(productUrl)}#quote`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-2 text-sm text-stone-500 mb-8 flex-wrap">
        <span>Home</span>
        <span>/</span>
        <span>Products</span>
        <span>/</span>
        <span>{product.category}</span>
        <span>/</span>
        <span className="text-stone-900 font-medium truncate max-w-[200px]">{product.name}</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        <div>
          <div className="relative aspect-square bg-stone-50 rounded-2xl overflow-hidden mb-4">
            {images[selectedImage] ? (
              <Image src={images[selectedImage]} alt={product.name} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-200"><Package className="w-24 h-24" /></div>
            )}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {images.map((img, i) => (
                <button key={i} onClick={() => setSelectedImage(i)} className={`aspect-square rounded-lg overflow-hidden border-2 transition ${i === selectedImage ? 'border-amber-500' : 'border-transparent hover:border-stone-300'}`}>
                  <Image src={img} alt="" width={80} height={80} className="object-cover w-full h-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm font-semibold text-stone-700 hover:text-amber-600 mb-4"
          >
            {'< Back'}
          </button>
          <p className="text-amber-600 font-semibold text-sm uppercase tracking-wide mb-2">{product.category}</p>
          <h1 className="text-3xl font-black text-stone-900 mb-4 leading-tight">{product.name}</h1>
          <p className="text-stone-500 text-sm mb-4 leading-relaxed">{product.shortDescription}</p>

          {product.variants.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {product.variants.map((variant, index) => (
                <button key={variant.id || index} onClick={() => { setSelectedVariantIndex(index); setSelectedImage(0); }} className={`px-3 py-2 rounded-lg text-sm border ${selectedVariantIndex === index ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-stone-200 text-stone-600'}`}>
                  {variant.capacity || 'Variant'}{variant.color ? ' · ' + variant.color : ''}
                </button>
              ))}
            </div>
          )}

          {hasSelectedVariantPrice && <p className="text-3xl font-black text-stone-900 mb-4">{formatPrice(selectedVariant!.price!)}</p>}

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
                  ? 'In stock'
                  : 'In stock'}
            </span>
            {isOutOfStock ? (
              <p className="mt-2 text-sm font-medium text-red-600">This product is out of stock, so checkout is unavailable right now.</p>
            ) : null}
          </div>

          {selectedVariant && (
            <div className="grid grid-cols-2 gap-3 text-sm text-stone-600 mb-6">
              <p><strong>Capacity:</strong> {selectedVariant.capacity}</p>
              <p><strong>Neck Size:</strong> {selectedVariant.neckSize || '-'}</p>
              <p><strong>Material:</strong> {selectedVariant.material || '-'}</p>
              <p><strong>Height:</strong> {selectedVariant.height || '-'}</p>
              <p><strong>Weight:</strong> {selectedVariant.weight || '-'}</p>
              <p><strong>Packaging Size:</strong> {selectedVariant.packagingSize || '-'}</p>
              <p><strong>Color:</strong> {selectedVariant.color || '-'}</p>
              <p><strong>SKU:</strong> {selectedVariant.sku || '-'}</p>
              {selectedVariant.remark && <p className="col-span-2"><strong>Remark:</strong> {selectedVariant.remark}</p>}
            </div>
          )}

          <Link
            href={enquiryUrl}
            className="flex items-center justify-center gap-2 w-full border-2 border-amber-500 text-amber-600 font-bold py-3 rounded-xl hover:bg-amber-50 transition mb-6"
          >
            <MessageSquare className="w-4 h-4" />
            Enquiry for This Product
          </Link>

          <div className="flex flex-wrap gap-2">
            {product.tags.map((tag, index) => (
              <span key={`${tag}-${index}`} className="bg-stone-100 text-stone-600 text-xs px-3 py-1 rounded-full">{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}




