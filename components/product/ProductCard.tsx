'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Eye } from 'lucide-react';
import { useState } from 'react';
import type { Product } from '@/types';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore(s => s.addItem);
  const [adding, setAdding] = useState(false);

  const lowestVariant = product.variants.reduce((min, v) =>
    v.price < min.price ? v : min, product.variants[0]
  );

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!lowestVariant) return;
    setAdding(true);
    addItem({
      productId: product.id,
      productName: product.name,
      productImage: product.images[0] || '',
      variantId: lowestVariant.id,
      size: lowestVariant.size,
      material: lowestVariant.material,
      price: lowestVariant.price,
      quantity: 1,
      slug: product.slug,
      categoryId: product.categoryId,
    });
    toast.success('Added to cart!');
    setTimeout(() => setAdding(false), 800);
  };

  return (
    <Link href={`/products/${product.categoryId}/${product.slug}`} className="group block">
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
        {/* Image */}
        <div className="relative aspect-square bg-stone-50 overflow-hidden">
          {product.images[0] ? (
            <Image
              src={product.images[0]}
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
          {/* Quick actions overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
            <div className="flex gap-2">
              <button
                onClick={handleAddToCart}
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition shadow-lg"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                {adding ? 'Added!' : 'Add to Cart'}
              </button>
              <div className="bg-white text-stone-700 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-lg">
                <Eye className="w-3.5 h-3.5" /> View
              </div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide mb-1">{product.categoryName}</p>
          <h3 className="text-sm font-bold text-stone-900 group-hover:text-amber-700 transition leading-snug line-clamp-2 mb-2">
            {product.name}
          </h3>
          <p className="text-xs text-stone-500 line-clamp-2 mb-3">{product.shortDescription}</p>

          <div className="flex items-center justify-between">
            <div>
              {lowestVariant && (
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-black text-stone-900">{formatPrice(lowestVariant.price)}</span>
                  {lowestVariant.comparePrice && (
                    <span className="text-xs text-stone-400 line-through">{formatPrice(lowestVariant.comparePrice)}</span>
                  )}
                </div>
              )}
              <p className="text-[10px] text-stone-400 mt-0.5">{product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}</p>
            </div>
            <div className={`w-2 h-2 rounded-full ${lowestVariant?.stock > 0 ? 'bg-green-400' : 'bg-red-400'}`} title={lowestVariant?.stock > 0 ? 'In Stock' : 'Out of Stock'} />
          </div>
        </div>
      </div>
    </Link>
  );
}
