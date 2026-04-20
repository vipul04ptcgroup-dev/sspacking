'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, ChevronRight, Plus, Minus, Check, Package, MessageSquare } from 'lucide-react';
import { getProductBySlug } from '@/lib/firestore';
import type { Product, ProductVariant } from '@/types';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';

export default function ProductDetailPage({ params }: { params: Promise<{ category: string; slug: string }> }) {
  const { category, slug } = use(params);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const addItem = useCartStore(s => s.addItem);

  useEffect(() => {
    getProductBySlug(slug).then(p => {
      if (!p) { setNotFoundFlag(true); return; }
      setProduct(p);
      setSelectedVariant(p.variants[0] || null);
      setLoading(false);
    });
  }, [slug]);

  if (notFoundFlag) return notFound();
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-2 gap-12 animate-pulse">
          <div className="aspect-square bg-stone-100 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-4 bg-stone-100 rounded w-1/4" />
            <div className="h-8 bg-stone-100 rounded w-3/4" />
            <div className="h-4 bg-stone-100 rounded w-full" />
            <div className="h-12 bg-stone-100 rounded" />
          </div>
        </div>
      </div>
    );
  }
  if (!product) return null;

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    setAdding(true);
    addItem({
      productId: product.id, productName: product.name,
      productImage: product.images[0] || '', variantId: selectedVariant.id,
      size: selectedVariant.size, material: selectedVariant.material,
      price: selectedVariant.price, quantity, slug: product.slug, categoryId: product.categoryId,
    });
    toast.success(`${product.name} added to cart!`);
    setTimeout(() => setAdding(false), 800);
  };

  // Get unique sizes and materials for variant selector
  const sizes = [...new Set(product.variants.map(v => v.size))];
  const materials = [...new Set(product.variants.map(v => v.material))];

  const selectVariantByProps = (size: string, material: string) => {
    const v = product.variants.find(v => v.size === size && v.material === material);
    if (v) setSelectedVariant(v);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-stone-500 mb-8 flex-wrap">
        <Link href="/" className="hover:text-amber-600">Home</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href="/products" className="hover:text-amber-600">Products</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href={`/products/${category}`} className="hover:text-amber-600">{product.categoryName}</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-stone-900 font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* Images */}
        <div>
          <div className="relative aspect-square bg-stone-50 rounded-2xl overflow-hidden mb-4">
            {product.images[selectedImage] ? (
              <Image src={product.images[selectedImage]} alt={product.name} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-200">
                <Package className="w-24 h-24" />
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {product.images.map((img, i) => (
                <button key={i} onClick={() => setSelectedImage(i)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition ${i === selectedImage ? 'border-amber-500' : 'border-transparent hover:border-stone-300'}`}
                >
                  <Image src={img} alt="" width={80} height={80} className="object-cover w-full h-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product info */}
        <div>
          <p className="text-amber-600 font-semibold text-sm uppercase tracking-wide mb-2">{product.categoryName}</p>
          <h1 className="text-3xl font-black text-stone-900 mb-4 leading-tight">{product.name}</h1>
          {/* Short Description (just below title) */}
          {product.shortDescription && (
            <p className="text-stone-500 text-sm mb-4 leading-relaxed">
              {product.shortDescription}
            </p>
          )}

          {/* Price */}
          {selectedVariant && (
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-4xl font-black text-stone-900">{formatPrice(selectedVariant.price)}</span>
              {selectedVariant.comparePrice && (
                <span className="text-lg text-stone-400 line-through">{formatPrice(selectedVariant.comparePrice)}</span>
              )}
              {selectedVariant.comparePrice && (
                <span className="bg-green-100 text-green-700 text-sm font-bold px-2 py-0.5 rounded-full">
                  {Math.round((1 - selectedVariant.price / selectedVariant.comparePrice) * 100)}% OFF
                </span>
              )}
            </div>
          )}

          {/* Size selector */}
          {sizes.length > 1 && (
            <div className="mb-5">
              <p className="text-sm font-semibold text-stone-700 mb-2">Size</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map(size => (
                  <button
                    key={size}
                    onClick={() => selectVariantByProps(size, selectedVariant?.material || materials[0])}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition ${selectedVariant?.size === size ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-stone-200 text-stone-600 hover:border-amber-300'}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Material selector */}
          {materials.length > 1 && (
            <div className="mb-5">
              <p className="text-sm font-semibold text-stone-700 mb-2">Material</p>
              <div className="flex flex-wrap gap-2">
                {materials.map(mat => (
                  <button
                    key={mat}
                    onClick={() => selectVariantByProps(selectedVariant?.size || sizes[0], mat)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition ${selectedVariant?.material === mat ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-stone-200 text-stone-600 hover:border-amber-300'}`}
                  >
                    {mat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stock */}
          {selectedVariant && (
            <div className="flex items-center gap-2 mb-6">
              <div className={`w-2.5 h-2.5 rounded-full ${selectedVariant.stock > 0 ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className={`text-sm font-medium ${selectedVariant.stock > 0 ? 'text-green-700' : 'text-red-600'}`}>
                {selectedVariant.stock > 0 ? `In Stock (${selectedVariant.stock} available)` : 'Out of Stock'}
              </span>
            </div>
          )}

          {/* Quantity + Add to Cart */}
          {/* Quantity + Add to Cart + Get Quote */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden">
              <button disabled onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-4 py-3 hover:bg-stone-100 transition text-stone-600">
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-5 py-3 font-bold text-stone-900 min-w-[3rem] text-center">{quantity}</span>
              <button disabled onClick={() => setQuantity(q => q + 1)} className="px-4 py-3 hover:bg-stone-100 transition text-stone-600">
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <Button
              disabled
              onClick={handleAddToCart}
              loading={adding}
              // disabled={!selectedVariant || selectedVariant.stock === 0}
              size="lg"
              className="flex-1"
            >
              {adding ? <><Check className="w-4 h-4" /> Added!</> : <><ShoppingCart className="w-4 h-4" /> Add to Cart</>}
            </Button>
          </div>

          {/* Get Quote Button */}
          <Link
            href={`/contact#quote?product=${encodeURIComponent(product.name)}&size=${encodeURIComponent(selectedVariant?.size || '')}&material=${encodeURIComponent(selectedVariant?.material || '')}&quantity=${quantity}`}
            className="flex items-center justify-center gap-2 w-full border-2 border-amber-500 text-amber-600 font-bold py-3 rounded-xl hover:bg-amber-50 transition mb-6"
          >
            <MessageSquare className="w-4 h-4" />
            Get a Quote for This Product
          </Link>

          {/* SKU */}
          {selectedVariant?.sku && (
            <p className="text-xs text-stone-400">SKU: {selectedVariant.sku}</p>
          )}

          {/* Tags */}
          {product.tags.map((tag, index) => (
            <span key={`${tag}-${index}`} className="bg-stone-100 text-stone-600 text-xs px-3 py-1 rounded-full">
              {tag}
            </span>
          ))}

        </div>
      </div>


      {/* Full Description Section */}
      <div className="mt-10">
        <div className="bg-stone-50 rounded-2xl p-6 sm:p-10 border border-amber-200">

          {/* Heading */}
          <h2 className="text-2xl sm:text-3xl font-black text-amber-600 mb-6">
            Product Description
          </h2>

          {/* Content */}
          <div className="space-y-4 text-black leading-relaxed text-base">
            {product.description?.trim() ? (
              product.description.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))
            ) : (
              <p>No description available for this product.</p>
            )}
          </div>

        </div>
      </div>



    </div>
  );
}
