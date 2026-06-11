'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import {
  createManualSaleWithInventory,
  generateDeliveryChallanFromOrder,
  getAllProducts,
  getManualSales,
} from '@/lib/firestore';
import type { Order, OrderStatus, Product } from '@/types';
import { formatDate, formatPrice, ORDER_STATUS_COLORS } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { EmptyState, Spinner, Textarea } from '@/components/ui';
import {
  FileText,
  PackageOpen,
  ReceiptText,
  Search,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'dispatched',
  'shipped',
  'delivered',
  'cancelled',
];

const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Credit'];

function getProductImage(product: Product): string {
  return (
    product.images?.[0] ||
    product.variants.find((variant) => Array.isArray(variant.images) && variant.images[0])?.images?.[0] ||
    ''
  );
}

export default function AdminSalesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [manualSales, setManualSales] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingChallanId, setGeneratingChallanId] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [productPrice, setProductPrice] = useState('');
  const [discount, setDiscount] = useState('0');
  const [gst, setGst] = useState('0');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('confirmed');
  const [notes, setNotes] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [productData, saleData] = await Promise.all([
        getAllProducts(),
        getManualSales(),
      ]);
      setProducts(productData);
      setManualSales(saleData);
    } catch (error) {
      console.error('Failed to load sales page data:', error);
      toast.error('Failed to load sales data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return products;

    return products.filter((product) => {
      const variantText = product.variants
        .map((variant) => [variant.capacity, variant.color, variant.sku].filter(Boolean).join(' '))
        .join(' ');

      return (
        product.name.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term) ||
        variantText.toLowerCase().includes(term)
      );
    });
  }, [products, productSearch]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || null,
    [products, selectedProductId],
  );

  useEffect(() => {
    if (!selectedProduct) return;
    const pricedVariants = selectedProduct.variants.filter((variant) => typeof variant.price === 'number' && variant.price > 0);
    const defaultPrice = pricedVariants.length > 0
      ? Math.min(...pricedVariants.map((variant) => variant.price as number))
      : 0;
    setProductPrice(String(defaultPrice));
  }, [selectedProductId, selectedProduct]);

  const subtotal = useMemo(() => {
    const qty = Number(quantity) || 0;
    const price = Number(productPrice) || 0;
    return qty * price;
  }, [quantity, productPrice]);

  const totalAmount = useMemo(() => {
    const discountValue = Number(discount) || 0;
    const gstValue = Number(gst) || 0;
    return Math.max(0, subtotal - discountValue + gstValue);
  }, [subtotal, discount, gst]);

  const resetForm = () => {
    setCustomerName('');
    setPhone('');
    setEmail('');
    setFullAddress('');
    setCity('');
    setState('');
    setPincode('');
    setProductSearch('');
    setSelectedProductId('');
    setQuantity('1');
    setProductPrice('');
    setDiscount('0');
    setGst('0');
    setPaymentMode('Cash');
    setOrderStatus('confirmed');
    setNotes('');
  };

  const handleCreateSale = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedQuantity = Number(quantity);
    const parsedPrice = Number(productPrice);
    const parsedDiscount = Number(discount) || 0;
    const parsedGst = Number(gst) || 0;

    if (!customerName.trim() || !phone.trim() || !email.trim()) {
      toast.error('Please complete customer details.');
      return;
    }
    if (!fullAddress.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
      toast.error('Please complete address details.');
      return;
    }
    if (!selectedProduct) {
      toast.error('Please select a product.');
      return;
    }
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      toast.error('Quantity must be greater than 0.');
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      toast.error('Product price must be 0 or greater.');
      return;
    }
    if (selectedProduct.stockQuantity < parsedQuantity) {
      toast.error(`${selectedProduct.name} has only ${selectedProduct.stockQuantity} in stock.`);
      return;
    }

    setSaving(true);
    try {
      const chosenVariant = selectedProduct.variants.find((variant) => typeof variant.price === 'number') || selectedProduct.variants[0];
      const saleId = await createManualSaleWithInventory({
        userId: user?.uid || 'manual-sale',
        userEmail: email.trim(),
        items: [{
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          productImage: getProductImage(selectedProduct),
          variantId: chosenVariant?.id || '',
          variantLabel: [chosenVariant?.capacity, chosenVariant?.color].filter(Boolean).join(' / ') || 'Default',
          sku: chosenVariant?.sku || '',
          price: parsedPrice,
          quantity: parsedQuantity,
        }],
        shippingAddress: {
          fullName: customerName.trim(),
          phone: phone.trim(),
          addressLine1: fullAddress.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          country: 'India',
        },
        subtotal,
        discount: parsedDiscount,
        gst: parsedGst,
        shippingCost: 0,
        total: totalAmount,
        status: orderStatus,
        paymentStatus: paymentMode === 'Credit' ? 'pending' : 'paid',
        paymentMethod: paymentMode,
        notes: notes.trim(),
      }, user?.email || user?.uid || 'admin');

      toast.success(`Manual sale ${saleId.slice(-8).toUpperCase()} created.`);
      resetForm();
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create manual sale.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateChallan = async (order: Order) => {
    setGeneratingChallanId(order.id);
    try {
      const challanId = await generateDeliveryChallanFromOrder(order.id, user?.email || user?.uid || 'admin');
      toast.success('Delivery challan ready.');
      router.push(`/admin/delivery-challan/${challanId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate delivery challan.');
    } finally {
      setGeneratingChallanId(null);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-900">Sales</h1>
        <p className="mt-1 text-stone-500">Create manual sales, deduct stock once, and connect them to delivery challans.</p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <form onSubmit={handleCreateSale} className="space-y-8">
          <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <ReceiptText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Manual Sale</h2>
                <p className="text-sm text-stone-500">Create a direct order from the admin panel.</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Customer Name" value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
              <Input label="Phone Number" value={phone} onChange={(event) => setPhone(event.target.value)} />
              <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="sm:col-span-2" />
              <Input label="Full Address" value={fullAddress} onChange={(event) => setFullAddress(event.target.value)} className="sm:col-span-2" />
              <Input label="City" value={city} onChange={(event) => setCity(event.target.value)} />
              <Input label="State" value={state} onChange={(event) => setState(event.target.value)} />
              <Input label="Pincode" value={pincode} onChange={(event) => setPincode(event.target.value)} />
            </div>
          </div>

          <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
                <PackageOpen className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Product & Pricing</h2>
                <p className="text-sm text-stone-500">Choose a product and complete the pricing details.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-[42px] h-4 w-4 text-stone-400" />
                <Input
                  id="saleProductSearch"
                  label="Search Product"
                  value={productSearch}
                  onChange={(event) => setProductSearch(event.target.value)}
                  placeholder="Search by product name, category, or SKU"
                  className="pl-10"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="productId" className="text-sm font-medium text-stone-700">Select Product</label>
                <select
                  id="productId"
                  value={selectedProductId}
                  onChange={(event) => setSelectedProductId(event.target.value)}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-800 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Choose a product</option>
                  {filteredProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.stockQuantity} in stock)
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduct ? (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-white">
                      {getProductImage(selectedProduct) ? (
                        <Image src={getProductImage(selectedProduct)} alt={selectedProduct.name} fill className="object-cover" />
                      ) : null}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-stone-900">{selectedProduct.name}</p>
                      <p className="text-xs text-stone-500">Current stock: {selectedProduct.stockQuantity}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Quantity" type="number" min={1} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                <Input label="Product Price" type="number" min={0} value={productPrice} onChange={(event) => setProductPrice(event.target.value)} />
                <Input label="Discount" type="number" min={0} value={discount} onChange={(event) => setDiscount(event.target.value)} />
                <Input label="GST" type="number" min={0} value={gst} onChange={(event) => setGst(event.target.value)} />
                <div className="flex flex-col gap-1">
                  <label htmlFor="paymentMode" className="text-sm font-medium text-stone-700">Payment Mode</label>
                  <select
                    id="paymentMode"
                    value={paymentMode}
                    onChange={(event) => setPaymentMode(event.target.value)}
                    className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-800 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {PAYMENT_MODES.map((mode) => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="orderStatus" className="text-sm font-medium text-stone-700">Order Status</label>
                  <select
                    id="orderStatus"
                    value={orderStatus}
                    onChange={(event) => setOrderStatus(event.target.value as OrderStatus)}
                    className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-800 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-xl border border-stone-100 bg-stone-50 p-4 text-sm">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span className="font-semibold text-stone-900">{formatPrice(subtotal)}</span>
                </div>
                <div className="mt-2 flex justify-between text-stone-600">
                  <span>Discount</span>
                  <span className="font-semibold text-stone-900">{formatPrice(Number(discount) || 0)}</span>
                </div>
                <div className="mt-2 flex justify-between text-stone-600">
                  <span>GST</span>
                  <span className="font-semibold text-stone-900">{formatPrice(Number(gst) || 0)}</span>
                </div>
                <div className="mt-3 flex justify-between border-t border-stone-200 pt-3 font-bold text-stone-900">
                  <span>Total Amount</span>
                  <span>{formatPrice(totalAmount)}</span>
                </div>
              </div>

              <Textarea
                id="manualSaleNotes"
                label="Notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Special instructions, payment reference, or customer remarks..."
              />
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Button type="submit" loading={saving}>
                {saving ? 'Creating...' : 'Create Manual Sale'}
              </Button>
              <p className="text-xs text-stone-500">Stock is deducted at sale creation and will not be deducted again by challan generation.</p>
            </div>
          </div>
        </form>

        <div className="space-y-8">
          <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-stone-900">Recent Manual Sales</h2>
                <p className="text-sm text-stone-500">Generate a challan directly from any manual sale.</p>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <Spinner />
              </div>
            ) : manualSales.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag className="h-14 w-14" />}
                title="No manual sales yet"
                description="Create your first manual sale to start delivery challan generation."
              />
            ) : (
              <div className="space-y-3">
                {manualSales.slice(0, 5).map((order) => (
                  <div key={order.id} className="rounded-xl border border-stone-100 bg-stone-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-stone-900">#{(order.manualOrderId || order.id).slice(-8).toUpperCase()}</p>
                        <p className="mt-1 text-xs text-stone-500">{order.shippingAddress.fullName} • {formatDate(order.createdAt)}</p>
                        <p className="mt-1 text-xs text-stone-500">{order.items[0]?.productName || '-'} • Qty {order.items[0]?.quantity || 0}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${ORDER_STATUS_COLORS[order.status]}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-stone-500">Total</p>
                        <p className="text-sm font-black text-stone-900">{formatPrice(order.total)}</p>
                      </div>
                      <Button
                        type="button"
                        variant={order.challanId ? 'secondary' : 'outline'}
                        loading={generatingChallanId === order.id}
                        onClick={() => void handleGenerateChallan(order)}
                      >
                        <FileText className="h-4 w-4" />
                        {order.challanId ? 'Open Delivery Challan' : 'Generate Delivery Challan'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
