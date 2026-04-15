'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCartStore } from '@/store/cart-store';
import { formatPrice } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { EmptyState } from '@/components/ui';

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, itemCount } = useCartStore();
  const cartTotal = total();
  const count = itemCount();
  const shippingCost = cartTotal >= 2000 ? 0 : 150;

  if (!count) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20">
        <EmptyState
          icon={<ShoppingBag className="w-20 h-20" />}
          title="Your cart is empty"
          description="Add some products to get started!"
          action={<Link href="/products"><Button size="lg">Browse Products</Button></Link>}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-black text-stone-900 mb-8">Shopping Cart ({count} items)</h1>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => (
            <div key={`${item.productId}-${item.variantId}`} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 flex gap-4">
              <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-stone-50 shrink-0">
                {item.productImage ? (
                  <Image src={item.productImage} alt={item.productName} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/products/${item.categoryId}/${item.slug}`} className="font-bold text-stone-900 hover:text-amber-700 text-sm leading-snug line-clamp-2">
                  {item.productName}
                </Link>
                <p className="text-xs text-stone-500 mt-0.5">{item.size} · {item.material}</p>
                <p className="text-base font-black text-stone-900 mt-1">{formatPrice(item.price)}</p>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center border border-stone-200 rounded-lg overflow-hidden">
                    <button onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)} className="px-3 py-1.5 hover:bg-stone-100 transition text-stone-600">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-4 py-1.5 text-sm font-bold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)} className="px-3 py-1.5 hover:bg-stone-100 transition text-stone-600">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-stone-900">{formatPrice(item.price * item.quantity)}</span>
                    <button onClick={() => removeItem(item.productId, item.variantId)} className="text-red-400 hover:text-red-600 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div>
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 sticky top-24">
            <h2 className="text-lg font-bold text-stone-900 mb-5">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-stone-600">
                <span>Subtotal ({count} items)</span>
                <span className="font-semibold">{formatPrice(cartTotal)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Shipping</span>
                <span className={`font-semibold ${shippingCost === 0 ? 'text-green-600' : ''}`}>
                  {shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}
                </span>
              </div>
              {shippingCost > 0 && (
                <p className="text-xs text-stone-400">Free shipping on orders above ₹2,000</p>
              )}
              <div className="pt-3 border-t border-stone-100 flex justify-between">
                <span className="text-base font-bold text-stone-900">Total</span>
                <span className="text-xl font-black text-stone-900">{formatPrice(cartTotal + shippingCost)}</span>
              </div>
            </div>
            <Link href="/checkout" className="block mt-6">
              <Button size="lg" className="w-full" disabled>
                Proceed to Checkout <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/products" className="block mt-3 text-center text-sm text-stone-500 hover:text-amber-600 transition">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
