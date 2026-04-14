'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCartStore } from '@/store/cart-store';
import { useAuth } from '@/context/auth-context';
import { createOrder } from '@/lib/firestore';
import { formatPrice } from '@/lib/utils';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { ShoppingBag, Lock } from 'lucide-react';
import Image from 'next/image';

const schema = z.object({
  fullName: z.string().min(2, 'Full name required'),
  phone: z.string().min(10, 'Valid phone number required'),
  email: z.string().email('Valid email required'),
  addressLine1: z.string().min(5, 'Address required'),
  addressLine2: z.string().optional(),
  city: z.string().min(2, 'City required'),
  state: z.string().min(2, 'State required'),
  pincode: z.string().min(6, 'Valid pincode required'),
});

type FormData = z.infer<typeof schema>;

export default function CheckoutPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { items, total, clearCart } = useCartStore();
  const [placing, setPlacing] = useState(false);
  const cartTotal = total();
  const shippingCost = cartTotal >= 2000 ? 0 : 150;

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: user?.email || '' },
  });

  if (!items.length) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ShoppingBag className="w-16 h-16 text-stone-200 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-stone-900 mb-2">Your cart is empty</h2>
        <Link href="/products"><Button>Shop Now</Button></Link>
      </div>
    );
  }

  const onSubmit = async (data: FormData) => {
    if (!user) { router.push('/auth/login?redirect=/checkout'); return; }
    setPlacing(true);
    try {
      const orderId = await createOrder({
        userId: user.uid,
        userEmail: data.email,
        items: items.map(i => ({
          productId: i.productId, productName: i.productName,
          productImage: i.productImage, variantId: i.variantId,
          size: i.size, material: i.material, price: i.price, quantity: i.quantity,
        })),
        shippingAddress: {
          fullName: data.fullName, phone: data.phone,
          addressLine1: data.addressLine1, addressLine2: data.addressLine2,
          city: data.city, state: data.state, pincode: data.pincode, country: 'India',
        },
        subtotal: cartTotal,
        shippingCost,
        total: cartTotal + shippingCost,
        status: 'pending',
        paymentStatus: 'pending',
        paymentMethod: 'COD',
      });
      clearCart();
      toast.success('Order placed successfully!');
      router.push(`/account/orders?new=${orderId}`);
    } catch (err) {
      toast.error('Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-3xl font-black text-stone-900 mb-8">Checkout</h1>
      {!user && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
          <Lock className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <Link href="/auth/login?redirect=/checkout" className="font-semibold underline">Login</Link> for a faster checkout experience and to track your orders.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid lg:grid-cols-3 gap-10">
          {/* Shipping form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-stone-900 mb-5">Shipping Information</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Full Name" id="fullName" placeholder="John Doe" error={errors.fullName?.message} {...register('fullName')} />
                <Input label="Phone Number" id="phone" placeholder="+91 98765 43210" error={errors.phone?.message} {...register('phone')} />
                <Input label="Email" id="email" type="email" placeholder="you@email.com" error={errors.email?.message} {...register('email')} className="sm:col-span-2" />
                <Input label="Address Line 1" id="addressLine1" placeholder="House/Flat No, Street, Area" error={errors.addressLine1?.message} {...register('addressLine1')} className="sm:col-span-2" />
                <Input label="Address Line 2 (Optional)" id="addressLine2" placeholder="Landmark, etc." {...register('addressLine2')} className="sm:col-span-2" />
                <Input label="City" id="city" placeholder="Mumbai" error={errors.city?.message} {...register('city')} />
                <Input label="State" id="state" placeholder="Maharashtra" error={errors.state?.message} {...register('state')} />
                <Input label="Pincode" id="pincode" placeholder="400001" error={errors.pincode?.message} {...register('pincode')} />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-stone-900 mb-4">Payment Method</h2>
              <div className="flex items-center gap-3 p-4 border-2 border-amber-400 rounded-xl bg-amber-50">
                <div className="w-4 h-4 rounded-full border-2 border-amber-500 flex items-center justify-center">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                </div>
                <div>
                  <p className="font-semibold text-stone-900 text-sm">Cash on Delivery</p>
                  <p className="text-xs text-stone-500">Pay when you receive your order</p>
                </div>
              </div>
            </div>
          </div>

          {/* Order summary */}
          <div>
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 sticky top-24">
              <h2 className="text-lg font-bold text-stone-900 mb-4">Order Summary</h2>
              <div className="space-y-3 mb-5">
                {items.map(item => (
                  <div key={`${item.productId}-${item.variantId}`} className="flex gap-3">
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-stone-50 shrink-0">
                      {item.productImage && <Image src={item.productImage} alt={item.productName} fill className="object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-stone-900 line-clamp-2">{item.productName}</p>
                      <p className="text-xs text-stone-500">{item.size} · {item.material}</p>
                      <p className="text-xs font-bold text-stone-900">{formatPrice(item.price)} × {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-stone-100 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span><span className="font-semibold">{formatPrice(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Shipping</span>
                  <span className={`font-semibold ${shippingCost === 0 ? 'text-green-600' : ''}`}>
                    {shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}
                  </span>
                </div>
                <div className="pt-2 border-t border-stone-100 flex justify-between">
                  <span className="font-bold text-stone-900">Total</span>
                  <span className="text-xl font-black text-stone-900">{formatPrice(cartTotal + shippingCost)}</span>
                </div>
              </div>
              <Button type="submit" loading={placing} size="lg" className="w-full mt-5">
                {placing ? 'Placing Order...' : 'Place Order'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
