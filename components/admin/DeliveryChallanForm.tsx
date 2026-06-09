'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createDeliveryChallan, getAllOrders } from '@/lib/firestore';
import { useAuth } from '@/context/auth-context';
import type { Address, Order, OrderItem, TransportDetails } from '@/types';
import { deleteImage, uploadDeliveryChallanImage } from '@/lib/storage';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Spinner, Textarea } from '@/components/ui';
import { ChevronRight, CircleDot, Package2, Truck, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';

type AddressKey = 'billingAddress' | 'shippingAddress';

const emptyTransportDetails = (): TransportDetails => ({
  transporterName: '',
  vehicleNumber: '',
  driverName: '',
  driverPhone: '',
  lrNumber: '',
  trackingNumber: '',
  expectedDeliveryDate: '',
  notes: '',
});

const emptyAddress = (): Address => ({
  fullName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
});

const cloneAddress = (address?: Partial<Address>): Address => ({
  fullName: address?.fullName || '',
  phone: address?.phone || '',
  addressLine1: address?.addressLine1 || '',
  addressLine2: address?.addressLine2 || '',
  city: address?.city || '',
  state: address?.state || '',
  pincode: address?.pincode || '',
  country: address?.country || 'India',
});

export default function DeliveryChallanForm() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [billingAddress, setBillingAddress] = useState<Address>(emptyAddress());
  const [shippingAddress, setShippingAddress] = useState<Address>(emptyAddress());
  const [products, setProducts] = useState<OrderItem[]>([]);
  const [remarks, setRemarks] = useState('');
  const [transportDetails, setTransportDetails] = useState<TransportDetails>(emptyTransportDetails());
  const [dispatchDate, setDispatchDate] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [deliveredDateTime, setDeliveredDateTime] = useState('');
  const [deliveryRemarks, setDeliveryRemarks] = useState('');
  const [consignmentImages, setConsignmentImages] = useState<string[]>([]);
  const [proofOfDeliveryImages, setProofOfDeliveryImages] = useState<string[]>([]);
  const [uploadingConsignmentImages, setUploadingConsignmentImages] = useState(false);
  const [uploadingPodImages, setUploadingPodImages] = useState(false);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const data = await getAllOrders();
        setOrders(data);
      } finally {
        setLoadingOrders(false);
      }
    };

    void loadOrders();
  }, []);

  const orderOptions = useMemo(
    () =>
      orders.map((order) => ({
        value: order.id,
        label: `#${order.id.slice(-8).toUpperCase()} · ${order.shippingAddress.fullName} · ${order.userEmail}`,
      })),
    [orders],
  );

  const syncFromOrder = (orderId: string) => {
    setSelectedOrderId(orderId);

    const order = orders.find((item) => item.id === orderId);
    if (!order) {
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setBillingAddress(emptyAddress());
      setShippingAddress(emptyAddress());
      setProducts([]);
      setRemarks('');
      setTransportDetails(emptyTransportDetails());
      setDispatchDate('');
      setReceiverName('');
      setReceiverPhone('');
      setDeliveredDateTime('');
      setDeliveryRemarks('');
      setConsignmentImages([]);
      setProofOfDeliveryImages([]);
      return;
    }

    const baseAddress = cloneAddress(order.shippingAddress);
    setCustomerName(order.shippingAddress.fullName || '');
    setCustomerEmail(order.userEmail || '');
    setCustomerPhone(order.shippingAddress.phone || '');
    setBillingAddress(baseAddress);
    setShippingAddress(baseAddress);
    setProducts(order.items.map((item) => ({ ...item })));
    setRemarks(order.notes || '');
    setTransportDetails(emptyTransportDetails());
    setDispatchDate('');
    setReceiverName('');
    setReceiverPhone('');
    setDeliveredDateTime('');
    setDeliveryRemarks('');
    setConsignmentImages([]);
    setProofOfDeliveryImages([]);
  };

  const updateAddress = (addressKey: AddressKey, field: keyof Address, value: string) => {
    const setter = addressKey === 'billingAddress' ? setBillingAddress : setShippingAddress;
    setter((current) => ({ ...current, [field]: value }));
  };

  const updateProductQuantity = (index: number, quantity: number) => {
    setProducts((current) =>
      current.map((product, itemIndex) =>
        itemIndex === index ? { ...product, quantity: Math.max(1, quantity || 1) } : product,
      ),
    );
  };

  const updateTransportDetails = (field: keyof TransportDetails, value: string) => {
    setTransportDetails((current) => ({ ...current, [field]: value }));
  };

  const challanUploadRef = selectedOrderId || `draft_${Date.now()}`;

  const handleConsignmentImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploadingConsignmentImages(true);
    try {
      const urls = await Promise.all(
        files.map((file) => uploadDeliveryChallanImage(file, challanUploadRef, 'consignment')),
      );
      setConsignmentImages((current) => [...current, ...urls]);
      toast.success(`${urls.length} shipment image${urls.length > 1 ? 's' : ''} uploaded`);
    } catch {
      toast.error('Failed to upload shipment images.');
    } finally {
      setUploadingConsignmentImages(false);
      event.target.value = '';
    }
  };

  const handlePodImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploadingPodImages(true);
    try {
      const urls = await Promise.all(
        files.map((file) => uploadDeliveryChallanImage(file, challanUploadRef, 'pod')),
      );
      setProofOfDeliveryImages((current) => [...current, ...urls]);
      toast.success(`${urls.length} POD image${urls.length > 1 ? 's' : ''} uploaded`);
    } catch {
      toast.error('Failed to upload POD images.');
    } finally {
      setUploadingPodImages(false);
      event.target.value = '';
    }
  };

  const removeConsignmentImage = async (imageUrl: string) => {
    try {
      await deleteImage(imageUrl);
    } catch {
      // If storage cleanup fails, still allow removing it from the form state.
    }
    setConsignmentImages((current) => current.filter((url) => url !== imageUrl));
  };

  const removePodImage = async (imageUrl: string) => {
    try {
      await deleteImage(imageUrl);
    } catch {
      // If storage cleanup fails, still allow removing it from the form state.
    }
    setProofOfDeliveryImages((current) => current.filter((url) => url !== imageUrl));
  };

  const validateAddress = (address: Address, label: string) => {
    if (!address.addressLine1 || !address.city || !address.state || !address.pincode) {
      throw new Error(`${label} is incomplete.`);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedOrderId) {
      toast.error('Please select an existing order.');
      return;
    }
    if (!customerName || !customerEmail || !customerPhone) {
      toast.error('Please complete customer details.');
      return;
    }
    if (!products.length) {
      toast.error('At least one product is required.');
      return;
    }
    if (uploadingConsignmentImages || uploadingPodImages) {
      toast.error('Please wait for image uploads to finish.');
      return;
    }

    setSaving(true);
    try {
      validateAddress(billingAddress, 'Billing address');
      validateAddress(shippingAddress, 'Shipping address');

      const normalizedBillingAddress = {
        ...billingAddress,
        fullName: billingAddress.fullName || customerName,
        phone: billingAddress.phone || customerPhone,
      };
      const normalizedShippingAddress = {
        ...shippingAddress,
        fullName: shippingAddress.fullName || customerName,
        phone: shippingAddress.phone || customerPhone,
      };

      await createDeliveryChallan({
        orderId: selectedOrderId,
        customerName,
        customerEmail,
        customerPhone,
        billingAddress: normalizedBillingAddress,
        shippingAddress: normalizedShippingAddress,
        products,
        remarks: remarks.trim(),
        transportDetails: {
          ...transportDetails,
          notes: transportDetails.notes?.trim() || '',
        },
        consignmentImages,
        proofOfDeliveryImages,
        receiverName: receiverName.trim(),
        receiverPhone: receiverPhone.trim(),
        deliveryRemarks: deliveryRemarks.trim(),
        status: 'draft',
        createdBy: user?.uid || user?.email || 'admin',
        dispatchedAt: dispatchDate ? new Date(`${dispatchDate}T00:00:00`) : null,
        deliveredAt: deliveredDateTime ? new Date(deliveredDateTime) : null,
      });

      toast.success('Delivery challan created successfully.');
      router.push('/admin/delivery-challan', { scroll: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create delivery challan.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingOrders) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <nav className="mb-6 flex items-center gap-2 text-sm text-stone-500">
        <Link href="/admin/delivery-challan" className="hover:text-amber-600">
          Delivery Challan
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-stone-900">Add Challan</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-900">Add Delivery Challan</h1>
        <p className="mt-1 text-stone-500">
          Select an existing order to auto-fill customer details and product lines. Challan number is auto-generated on save.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-bold text-stone-900">Order Selection</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label htmlFor="orderId" className="text-sm font-medium text-stone-700">
                Select Existing Order
              </label>
              <select
                id="orderId"
                value={selectedOrderId}
                onChange={(event) => syncFromOrder(event.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-800 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Select an order</option>
                {orderOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-bold text-stone-900">Customer Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Customer Name"
              id="customerName"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Customer name"
            />
            <Input
              label="Customer Phone"
              id="customerPhone"
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              placeholder="+91 98765 43210"
            />
            <Input
              label="Customer Email"
              id="customerEmail"
              type="email"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
              placeholder="customer@example.com"
              className="sm:col-span-2"
            />
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-2">
          {([
            ['billingAddress', billingAddress, 'Billing Address'],
            ['shippingAddress', shippingAddress, 'Shipping Address'],
          ] as const).map(([addressKey, address, title]) => (
            <div key={addressKey} className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-lg font-bold text-stone-900">{title}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Full Name"
                  value={address.fullName}
                  onChange={(event) => updateAddress(addressKey, 'fullName', event.target.value)}
                />
                <Input
                  label="Phone"
                  value={address.phone}
                  onChange={(event) => updateAddress(addressKey, 'phone', event.target.value)}
                />
                <Input
                  label="Address Line 1"
                  value={address.addressLine1}
                  onChange={(event) => updateAddress(addressKey, 'addressLine1', event.target.value)}
                  className="sm:col-span-2"
                />
                <Input
                  label="Address Line 2"
                  value={address.addressLine2 || ''}
                  onChange={(event) => updateAddress(addressKey, 'addressLine2', event.target.value)}
                  className="sm:col-span-2"
                />
                <Input
                  label="City"
                  value={address.city}
                  onChange={(event) => updateAddress(addressKey, 'city', event.target.value)}
                />
                <Input
                  label="State"
                  value={address.state}
                  onChange={(event) => updateAddress(addressKey, 'state', event.target.value)}
                />
                <Input
                  label="Pincode"
                  value={address.pincode}
                  onChange={(event) => updateAddress(addressKey, 'pincode', event.target.value)}
                />
                <Input
                  label="Country"
                  value={address.country}
                  onChange={(event) => updateAddress(addressKey, 'country', event.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Package2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Product List</h2>
              <p className="text-sm text-stone-500">Quantities are auto-filled from the selected order and can be adjusted.</p>
            </div>
          </div>

          {!products.length ? (
            <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
              Select an order to load product lines.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px]">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Variant</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {products.map((product, index) => (
                    <tr key={`${product.productId}-${product.variantId}-${index}`} className="hover:bg-stone-50 transition">
                      <td className="px-4 py-3 text-sm font-semibold text-stone-900">{product.productName}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{product.variantLabel || '-'}</td>
                      <td className="px-4 py-3 text-sm text-stone-600">{product.sku || '-'}</td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={1}
                          value={product.quantity}
                          onChange={(event) => updateProductQuantity(index, Number(event.target.value))}
                          className="w-28 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Transportation Details</h2>
              <p className="text-sm text-stone-500">Capture logistics details for dispatch and handoff tracking.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Transporter Name"
              value={transportDetails.transporterName || ''}
              onChange={(event) => updateTransportDetails('transporterName', event.target.value)}
              placeholder="Transport company name"
            />
            <Input
              label="Vehicle Number"
              value={transportDetails.vehicleNumber || ''}
              onChange={(event) => updateTransportDetails('vehicleNumber', event.target.value)}
              placeholder="MH-04-AB-1234"
            />
            <Input
              label="Driver Name"
              value={transportDetails.driverName || ''}
              onChange={(event) => updateTransportDetails('driverName', event.target.value)}
              placeholder="Driver name"
            />
            <Input
              label="Driver Phone"
              value={transportDetails.driverPhone || ''}
              onChange={(event) => updateTransportDetails('driverPhone', event.target.value)}
              placeholder="+91 98765 43210"
            />
            <Input
              label="LR Number / Docket Number"
              value={transportDetails.lrNumber || ''}
              onChange={(event) => updateTransportDetails('lrNumber', event.target.value)}
              placeholder="LR / docket number"
            />
            <Input
              label="Dispatch Date"
              type="date"
              value={dispatchDate}
              onChange={(event) => setDispatchDate(event.target.value)}
            />
            <Input
              label="Expected Delivery Date"
              type="date"
              value={transportDetails.expectedDeliveryDate || ''}
              onChange={(event) => updateTransportDetails('expectedDeliveryDate', event.target.value)}
            />
            <Input
              label="Tracking Reference (Optional)"
              value={transportDetails.trackingNumber || ''}
              onChange={(event) => updateTransportDetails('trackingNumber', event.target.value)}
              placeholder="Tracking or reference number"
            />
            <div className="sm:col-span-2">
              <Textarea
                id="transportRemarks"
                label="Transport Remarks"
                value={transportDetails.notes || ''}
                onChange={(event) => updateTransportDetails('notes', event.target.value)}
                placeholder="Driver instructions, route notes, delivery timeline, or loading remarks..."
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Consignment / Shipment Images</h2>
              <p className="text-sm text-stone-500">Upload multiple shipment images and review them before saving the challan.</p>
            </div>
          </div>

          {consignmentImages.length > 0 ? (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {consignmentImages.map((imageUrl, index) => (
                <div
                  key={`${imageUrl}-${index}`}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-stone-200 bg-stone-50"
                >
                  <Image src={imageUrl} alt={`Shipment image ${index + 1}`} fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => void removeConsignmentImage(imageUrl)}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white opacity-0 transition group-hover:opacity-100"
                    aria-label="Remove shipment image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mb-4 rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
              No shipment images uploaded yet.
            </div>
          )}

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-400 hover:text-amber-600">
            <Upload className="h-4 w-4" />
            <span>{uploadingConsignmentImages ? 'Uploading...' : 'Upload Shipment Images'}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleConsignmentImageUpload}
              className="hidden"
              disabled={uploadingConsignmentImages}
            />
          </label>
        </div>

        <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <CircleDot className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Proof Of Delivery</h2>
              <p className="text-sm text-stone-500">Capture receiver details, delivered time, remarks, and POD images.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Receiver Name"
              value={receiverName}
              onChange={(event) => setReceiverName(event.target.value)}
              placeholder="Receiver full name"
            />
            <Input
              label="Receiver Phone"
              value={receiverPhone}
              onChange={(event) => setReceiverPhone(event.target.value)}
              placeholder="+91 98765 43210"
            />
            <Input
              label="Delivered Date / Time"
              type="datetime-local"
              value={deliveredDateTime}
              onChange={(event) => setDeliveredDateTime(event.target.value)}
              className="sm:col-span-2"
            />
            <div className="sm:col-span-2">
              <Textarea
                id="deliveryRemarks"
                label="Delivery Remarks"
                value={deliveryRemarks}
                onChange={(event) => setDeliveryRemarks(event.target.value)}
                placeholder="Receiver feedback, condition on arrival, or POD notes..."
              />
            </div>
          </div>

          {proofOfDeliveryImages.length > 0 ? (
            <div className="mt-5 mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {proofOfDeliveryImages.map((imageUrl, index) => (
                <div
                  key={`${imageUrl}-${index}`}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-stone-200 bg-stone-50"
                >
                  <Image src={imageUrl} alt={`POD image ${index + 1}`} fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => void removePodImage(imageUrl)}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white opacity-0 transition group-hover:opacity-100"
                    aria-label="Remove POD image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 mb-4 rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
              No POD images uploaded yet.
            </div>
          )}

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-400 hover:text-amber-600">
            <Upload className="h-4 w-4" />
            <span>{uploadingPodImages ? 'Uploading...' : 'Upload POD Images'}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePodImageUpload}
              className="hidden"
              disabled={uploadingPodImages}
            />
          </label>
        </div>

        <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-bold text-stone-900">Remarks</h2>
          <Textarea
            id="remarks"
            label="Remarks"
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder="Delivery notes, packaging remarks, or special handling instructions..."
          />
        </div>

        <div className="flex items-center gap-4">
          <Button type="submit" loading={saving} size="lg" disabled={uploadingConsignmentImages || uploadingPodImages}>
            {saving ? 'Creating...' : 'Create Delivery Challan'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push('/admin/delivery-challan', { scroll: true })}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
