'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  getDeliveryChallanById,
  markDeliveryChallanAsDelivered,
  markDeliveryChallanAsDispatched,
} from '@/lib/firestore';
import { deleteImage, uploadDeliveryChallanImage } from '@/lib/storage';
import type { DeliveryChallan, DeliveryChallanStatus } from '@/types';
import { formatDate, formatPrice } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { EmptyState, Spinner, Textarea } from '@/components/ui';
import {
  CalendarDays,
  ChevronRight,
  CircleDot,
  Eye,
  FileText,
  Image as ImageIcon,
  MapPin,
  Package2,
  Pencil,
  Printer,
  Truck,
  User,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_STYLES: Record<DeliveryChallanStatus, string> = {
  draft: 'bg-stone-100 text-stone-700',
  ready: 'bg-blue-100 text-blue-700',
  dispatched: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

function formatDateTime(date?: Date | null): string {
  if (!date) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function AddressBlock({
  title,
  address,
}: {
  title: string;
  address: DeliveryChallan['billingAddress'] | DeliveryChallan['shippingAddress'];
}) {
  return (
    <div className="rounded-xl border border-stone-100 bg-stone-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{title}</p>
      <div className="mt-2 space-y-1 text-sm text-stone-700">
        <p className="font-semibold text-stone-900">{address.fullName || '-'}</p>
        <p>{address.phone || '-'}</p>
        <p>{address.addressLine1 || '-'}</p>
        {address.addressLine2 ? <p>{address.addressLine2}</p> : null}
        <p>
          {address.city || '-'}, {address.state || '-'} - {address.pincode || '-'}
        </p>
        <p>{address.country || '-'}</p>
      </div>
    </div>
  );
}

export default function DeliveryChallanDetailPage() {
  const params = useParams<{ id: string }>();
  const [challan, setChallan] = useState<DeliveryChallan | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState<DeliveryChallanStatus | null>(null);
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [deliveryRemarks, setDeliveryRemarks] = useState('');
  const [proofOfDeliveryImages, setProofOfDeliveryImages] = useState<string[]>([]);
  const [uploadingPodImages, setUploadingPodImages] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!params?.id) return;
      const data = await getDeliveryChallanById(params.id);
      setChallan(data);
      setReceiverName(data?.receiverName || '');
      setReceiverPhone(data?.receiverPhone || '');
      setDeliveryRemarks(data?.deliveryRemarks || '');
      setProofOfDeliveryImages(data?.proofOfDeliveryImages || []);
      setLoading(false);
    };

    void load();
  }, [params?.id]);

  const timeline = useMemo(() => {
    if (!challan) return [];

    return [
      {
        key: 'created',
        title: 'Challan Created',
        date: challan.createdAt,
        active: true,
        tone: 'bg-stone-900',
      },
      {
        key: 'dispatched',
        title: 'Marked As Dispatched',
        date: challan.dispatchedAt,
        active: Boolean(challan.dispatchedAt),
        tone: 'bg-orange-500',
      },
      {
        key: 'delivered',
        title: 'Marked As Delivered',
        date: challan.deliveredAt,
        active: Boolean(challan.deliveredAt),
        tone: 'bg-green-500',
      },
      {
        key: 'updated',
        title: 'Last Updated',
        date: challan.updatedAt,
        active: true,
        tone: 'bg-amber-500',
      },
    ];
  }, [challan]);

  const handlePrint = () => {
    window.print();
  };

  const handleEdit = () => {
    if (!challan) return;
    toast(`Edit for ${challan.challanNumber} will be connected next.`);
  };

  const handlePodImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!challan) return;

    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setUploadingPodImages(true);
    try {
      const urls = await Promise.all(
        files.map((file) => uploadDeliveryChallanImage(file, challan.id, 'pod')),
      );
      setProofOfDeliveryImages((current) => [...current, ...urls]);
      toast.success(`${urls.length} POD image${urls.length > 1 ? 's' : ''} uploaded.`);
    } catch {
      toast.error('Failed to upload POD images.');
    } finally {
      setUploadingPodImages(false);
      event.target.value = '';
    }
  };

  const removePodImage = async (imageUrl: string) => {
    try {
      await deleteImage(imageUrl);
    } catch {
      // Allow UI cleanup even if storage delete fails.
    }

    setProofOfDeliveryImages((current) => current.filter((url) => url !== imageUrl));
  };

  const handleStatusUpdate = async (nextStatus: DeliveryChallanStatus) => {
    if (!challan) return;

    setStatusUpdating(nextStatus);
    try {
      if (nextStatus === 'delivered') {
        if (uploadingPodImages) {
          throw new Error('Please wait for POD image uploads to finish.');
        }

        const now = await markDeliveryChallanAsDelivered(challan.id, {
          receiverName,
          receiverPhone,
          deliveryRemarks,
          proofOfDeliveryImages,
        });

        setChallan((current) =>
          current
            ? {
                ...current,
                status: 'delivered',
                updatedAt: now,
                dispatchedAt: current.dispatchedAt || now,
                deliveredAt: now,
                receiverName: receiverName.trim(),
                receiverPhone: receiverPhone.trim(),
                deliveryRemarks: deliveryRemarks.trim(),
                proofOfDeliveryImages,
              }
            : current,
        );
        toast.success('Challan marked as delivered.');
        return;
      }

      const now =
        nextStatus === 'dispatched'
          ? await markDeliveryChallanAsDispatched(challan.id)
          : new Date();

      setChallan((current) =>
        current
          ? {
              ...current,
              status: nextStatus,
              updatedAt: now,
              dispatchedAt: nextStatus === 'dispatched' ? now : current.dispatchedAt,
              deliveredAt: current.deliveredAt,
            }
          : current,
      );
      toast.success(`Challan marked as ${nextStatus}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to mark challan as ${nextStatus}.`);
    } finally {
      setStatusUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!challan) {
    return (
      <EmptyState
        icon={<FileText className="h-16 w-16" />}
        title="Delivery challan not found"
        description="The requested challan could not be loaded."
        action={
          <Link href="/admin/delivery-challan">
            <Button>Back To Challans</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <div className="delivery-challan-screen">
        <nav className="mb-6 flex items-center gap-2 text-sm text-stone-500">
          <Link href="/admin/delivery-challan" className="hover:text-amber-600">
            Delivery Challan
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-stone-900">{challan.challanNumber}</span>
        </nav>

        <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-3xl font-black text-stone-900">{challan.challanNumber}</h1>
            <p className="mt-1 text-stone-500">
              Linked Order ID: {challan.orderId || '-'} · Created on {formatDate(challan.createdAt)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${STATUS_STYLES[challan.status]}`}>
              {challan.status}
            </span>
            <Button type="button" variant="outline" onClick={handleEdit}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button type="button" variant="secondary" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleStatusUpdate('dispatched')}
              loading={statusUpdating === 'dispatched'}
              disabled={challan.status === 'dispatched' || challan.status === 'delivered'}
            >
              <Truck className="h-4 w-4" />
              Mark as Dispatched
            </Button>
            <Button
              type="button"
              onClick={() => void handleStatusUpdate('delivered')}
              loading={statusUpdating === 'delivered'}
              disabled={challan.status === 'delivered' || uploadingPodImages}
            >
              <CircleDot className="h-4 w-4" />
              Mark as Delivered
            </Button>
          </div>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Customer Name</p>
            <p className="mt-2 text-sm font-semibold text-stone-900">{challan.customerName || '-'}</p>
          </div>
          <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Customer Email</p>
            <p className="mt-2 text-sm font-semibold text-stone-900">{challan.customerEmail || '-'}</p>
          </div>
          <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Customer Phone</p>
            <p className="mt-2 text-sm font-semibold text-stone-900">{challan.customerPhone || '-'}</p>
          </div>
          <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Dispatch Date</p>
            <p className="mt-2 text-sm font-semibold text-stone-900">
              {challan.dispatchedAt ? formatDate(challan.dispatchedAt) : '-'}
            </p>
          </div>
        </div>

        <div className="mb-8 grid gap-8 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-8">
            <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Challan Details</h2>
                  <p className="text-sm text-stone-500">Core challan references and remarks.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Challan Number</p>
                  <p className="mt-1 text-sm text-stone-800">{challan.challanNumber}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Linked Order ID</p>
                  <p className="mt-1 text-sm text-stone-800">{challan.orderId || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Created By</p>
                  <p className="mt-1 text-sm text-stone-800">{challan.createdBy || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Created At</p>
                  <p className="mt-1 text-sm text-stone-800">{formatDateTime(challan.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Updated At</p>
                  <p className="mt-1 text-sm text-stone-800">{formatDateTime(challan.updatedAt)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Delivered At</p>
                  <p className="mt-1 text-sm text-stone-800">{formatDateTime(challan.deliveredAt)}</p>
                </div>
              </div>

              {challan.remarks ? (
                <div className="mt-5 rounded-xl border border-stone-100 bg-stone-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Remarks</p>
                  <p className="mt-2 text-sm leading-6 text-stone-700">{challan.remarks}</p>
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Customer Details</h2>
                  <p className="text-sm text-stone-500">Primary customer and address information for this challan.</p>
                </div>
              </div>

              <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Customer Name</p>
                  <p className="mt-1 text-sm text-stone-800">{challan.customerName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Customer Email</p>
                  <p className="mt-1 text-sm text-stone-800">{challan.customerEmail || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Customer Phone</p>
                  <p className="mt-1 text-sm text-stone-800">{challan.customerPhone || '-'}</p>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <AddressBlock title="Billing Address" address={challan.billingAddress} />
                <AddressBlock title="Shipping Address" address={challan.shippingAddress} />
              </div>
            </div>

            <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Package2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Product Details</h2>
                  <p className="text-sm text-stone-500">Products and quantities included in this challan.</p>
                </div>
              </div>

              {challan.products.length === 0 ? (
                <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
                  No products available on this challan.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px]">
                    <thead>
                      <tr className="border-b border-stone-100 bg-stone-50">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Variant</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">SKU</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Qty</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Unit Price</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-500">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {challan.products.map((product, index) => (
                        <tr key={`${product.productId}-${product.variantId}-${index}`} className="hover:bg-stone-50 transition">
                          <td className="px-4 py-3 text-sm font-semibold text-stone-900">{product.productName}</td>
                          <td className="px-4 py-3 text-sm text-stone-600">{product.variantLabel || '-'}</td>
                          <td className="px-4 py-3 text-sm text-stone-600">{product.sku || '-'}</td>
                          <td className="px-4 py-3 text-sm text-stone-600">{product.quantity}</td>
                          <td className="px-4 py-3 text-sm text-stone-600">{formatPrice(product.price || 0)}</td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-stone-900">
                            {formatPrice((product.price || 0) * product.quantity)}
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
                  <p className="text-sm text-stone-500">Saved logistics information for this delivery challan.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Transporter Name</p>
                  <p className="mt-1 text-sm text-stone-800">{challan.transportDetails.transporterName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Vehicle Number</p>
                  <p className="mt-1 text-sm text-stone-800">{challan.transportDetails.vehicleNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Driver Name</p>
                  <p className="mt-1 text-sm text-stone-800">{challan.transportDetails.driverName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Driver Phone</p>
                  <p className="mt-1 text-sm text-stone-800">{challan.transportDetails.driverPhone || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">LR / Docket Number</p>
                  <p className="mt-1 text-sm text-stone-800">{challan.transportDetails.lrNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Expected Delivery Date</p>
                  <p className="mt-1 text-sm text-stone-800">{challan.transportDetails.expectedDeliveryDate || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Tracking Reference</p>
                  <p className="mt-1 text-sm text-stone-800">{challan.transportDetails.trackingNumber || '-'}</p>
                </div>
                <div className="sm:col-span-2 xl:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Transport Remarks</p>
                  <p className="mt-1 text-sm leading-6 text-stone-800">{challan.transportDetails.notes || '-'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <ImageIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Consignment Images</h2>
                  <p className="text-sm text-stone-500">Uploaded shipment images saved with this challan.</p>
                </div>
              </div>

              {challan.consignmentImages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-10 text-center text-sm text-stone-500">
                  No consignment images uploaded for this challan.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {challan.consignmentImages.map((imageUrl, index) => (
                    <div key={`${imageUrl}-${index}`} className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
                      <div className="relative aspect-[4/3]">
                        <Image
                          src={imageUrl}
                          alt={`Consignment image ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                  <CircleDot className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Proof Of Delivery</h2>
                  <p className="text-sm text-stone-500">Receiver details, delivered timestamp, POD notes, and supporting images.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Input
                  label="Receiver Name"
                  value={receiverName}
                  onChange={(event) => setReceiverName(event.target.value)}
                  placeholder="Receiver full name"
                  disabled={challan.status === 'delivered'}
                />
                <Input
                  label="Receiver Phone"
                  value={receiverPhone}
                  onChange={(event) => setReceiverPhone(event.target.value)}
                  placeholder="+91 98765 43210"
                  disabled={challan.status === 'delivered'}
                />
                <div className="rounded-xl border border-stone-100 bg-stone-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Delivered Date / Time</p>
                  <p className="mt-2 text-sm font-semibold text-stone-900">{formatDateTime(challan.deliveredAt)}</p>
                </div>
                <div className="sm:col-span-2 xl:col-span-3">
                  <Textarea
                    id="deliveryRemarks"
                    label="Delivery Remarks"
                    value={deliveryRemarks}
                    onChange={(event) => setDeliveryRemarks(event.target.value)}
                    placeholder="Receiver feedback, arrival condition, or POD notes..."
                    disabled={challan.status === 'delivered'}
                  />
                </div>
              </div>

              {proofOfDeliveryImages.length === 0 ? (
                <div className="mt-5 rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-10 text-center text-sm text-stone-500">
                  No POD images uploaded for this challan.
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {proofOfDeliveryImages.map((imageUrl, index) => (
                    <div key={`${imageUrl}-${index}`} className="group overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
                      <div className="relative aspect-[4/3]">
                        <Image
                          src={imageUrl}
                          alt={`POD image ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => void removePodImage(imageUrl)}
                          disabled={challan.status === 'delivered'}
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white opacity-0 transition group-hover:opacity-100"
                          aria-label="Remove POD image"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-400 hover:text-amber-600">
                  <ImageIcon className="h-4 w-4" />
                  <span>{uploadingPodImages ? 'Uploading...' : 'Upload POD Images'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePodImageUpload}
                    className="hidden"
                    disabled={uploadingPodImages || challan.status === 'delivered'}
                  />
                </label>
              <p className="text-xs text-stone-500">Receiver name or at least one POD image is required to mark delivered.</p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Status Timeline</h2>
                  <p className="text-sm text-stone-500">Track dispatch progress and delivery milestones.</p>
                </div>
              </div>

              <div className="space-y-4">
                {timeline.map((item, index) => (
                  <div key={item.key} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`mt-1 h-3 w-3 rounded-full ${item.active ? item.tone : 'bg-stone-200'}`} />
                      {index < timeline.length - 1 ? <span className="mt-2 h-full w-px bg-stone-200" /> : null}
                    </div>
                    <div className="pb-3">
                      <p className="text-sm font-semibold text-stone-900">{item.title}</p>
                      <p className="mt-1 text-xs text-stone-500">{formatDateTime(item.date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Quick View</h2>
                  <p className="text-sm text-stone-500">Key dispatch info at a glance.</p>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Vehicle Number</p>
                  <p className="mt-1 text-stone-800">{challan.transportDetails.vehicleNumber || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Dispatch Date</p>
                  <p className="mt-1 text-stone-800">{formatDateTime(challan.dispatchedAt)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Expected Delivery</p>
                  <p className="mt-1 text-stone-800">{challan.transportDetails.expectedDeliveryDate || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Delivered At</p>
                  <p className="mt-1 text-stone-800">{formatDateTime(challan.deliveredAt)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Receiver Name</p>
                  <p className="mt-1 text-stone-800">{challan.receiverName || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Receiver Phone</p>
                  <p className="mt-1 text-stone-800">{challan.receiverPhone || '-'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-700">
                  <Eye className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-stone-900">Actions</h2>
                  <p className="text-sm text-stone-500">Operational actions for this challan.</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button type="button" variant="outline" onClick={handleEdit} className="w-full justify-start">
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <Button type="button" variant="secondary" onClick={handlePrint} className="w-full justify-start">
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleStatusUpdate('dispatched')}
                  loading={statusUpdating === 'dispatched'}
                  disabled={challan.status === 'dispatched' || challan.status === 'delivered'}
                  className="w-full justify-start"
                >
                  <Truck className="h-4 w-4" />
                  Mark as Dispatched
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleStatusUpdate('delivered')}
                  loading={statusUpdating === 'delivered'}
                  disabled={challan.status === 'delivered' || uploadingPodImages}
                  className="w-full justify-start"
                >
                  <CircleDot className="h-4 w-4" />
                  Mark as Delivered
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="delivery-challan-print">
        <div className="print-sheet">
          <header className="print-header">
            <div className="print-brand">
              <Image src="/Logo.png" alt="SS Packaging logo" width={72} height={72} className="print-logo" />
              <div>
                <p className="print-company-name">SS Packaging</p>
                <p className="print-company-subtitle">Delivery Challan</p>
              </div>
            </div>

            <div className="print-challan-meta">
              <div>
                <span>Challan No.</span>
                <strong>{challan.challanNumber}</strong>
              </div>
              <div>
                <span>Date</span>
                <strong>{formatDate(challan.dispatchedAt || challan.createdAt)}</strong>
              </div>
              <div>
                <span>Order ID</span>
                <strong>{challan.orderId || '-'}</strong>
              </div>
            </div>
          </header>

          <section className="print-address-bar">
            <div>
              <p className="print-section-caption">Office Address</p>
              <p>Office no. 201-202, Hirubhai Residency, Besides Vedant Hospital, Virar (West) - 401303, Maharashtra, India.</p>
            </div>
            <div>
              <p className="print-section-caption">Factory Address</p>
              <p>Unit no. 13, Pragati Compound, Dongri Pada Road, near Jain Mandir, Poman, Vasai Bhiwandi Road, Vasai East, Palghar - 401208.</p>
            </div>
          </section>

          <section className="print-grid print-grid-two">
            <div className="print-card">
              <p className="print-section-title">Customer Details</p>
              <div className="print-detail-list">
                <p><strong>Name:</strong> {challan.customerName || '-'}</p>
                <p><strong>Email:</strong> {challan.customerEmail || '-'}</p>
                <p><strong>Phone:</strong> {challan.customerPhone || '-'}</p>
              </div>
            </div>

            <div className="print-card">
              <p className="print-section-title">Shipping Address</p>
              <div className="print-detail-list">
                <p>{challan.shippingAddress.fullName || challan.customerName || '-'}</p>
                <p>{challan.shippingAddress.phone || challan.customerPhone || '-'}</p>
                <p>{challan.shippingAddress.addressLine1 || '-'}</p>
                {challan.shippingAddress.addressLine2 ? <p>{challan.shippingAddress.addressLine2}</p> : null}
                <p>
                  {challan.shippingAddress.city || '-'}, {challan.shippingAddress.state || '-'} - {challan.shippingAddress.pincode || '-'}
                </p>
                <p>{challan.shippingAddress.country || '-'}</p>
              </div>
            </div>
          </section>

          <section className="print-card print-products-card">
            <div className="print-section-row">
              <p className="print-section-title">Product Details</p>
              <p className="print-section-note">Dispatch copy</p>
            </div>

            <table className="print-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Variant / SKU</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {challan.products.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="print-empty">No products added to this challan.</td>
                  </tr>
                ) : (
                  challan.products.map((product, index) => (
                    <tr key={`${product.productId}-${product.variantId}-${index}`}>
                      <td>{index + 1}</td>
                      <td>{product.productName}</td>
                      <td>{[product.variantLabel, product.sku].filter(Boolean).join(' / ') || '-'}</td>
                      <td>{product.quantity}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <section className="print-grid print-grid-two">
            <div className="print-card">
              <p className="print-section-title">Transportation Details</p>
              <div className="print-detail-list">
                <p><strong>Transporter Name:</strong> {challan.transportDetails.transporterName || '-'}</p>
                <p><strong>Vehicle Number:</strong> {challan.transportDetails.vehicleNumber || '-'}</p>
                <p><strong>Driver Name:</strong> {challan.transportDetails.driverName || '-'}</p>
                <p><strong>Driver Phone:</strong> {challan.transportDetails.driverPhone || '-'}</p>
                <p><strong>LR / Docket Number:</strong> {challan.transportDetails.lrNumber || '-'}</p>
              </div>
            </div>

            <div className="print-card">
              <p className="print-section-title">Remarks</p>
              <div className="print-detail-list">
                <p>{challan.remarks || challan.transportDetails.notes || '-'}</p>
              </div>
            </div>
          </section>

          <footer className="print-signatures">
            <div className="print-signature-box">
              <span>Authorized Signature</span>
            </div>
            <div className="print-signature-box">
              <span>Receiver Signature</span>
            </div>
          </footer>
        </div>
      </div>

      <style jsx global>{`
        .delivery-challan-print {
          display: none;
        }

        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          html,
          body {
            background: #ffffff !important;
            color: #171717;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .admin-sidebar,
          .admin-mobile-bar,
          .admin-mobile-overlay,
          .delivery-challan-screen {
            display: none !important;
          }

          .admin-content-shell {
            padding: 0 !important;
          }

          .delivery-challan-print {
            display: block !important;
          }

          .print-sheet {
            width: 100%;
            min-height: 273mm;
            margin: 0 auto;
            color: #1c1917;
            font-size: 12px;
            line-height: 1.45;
          }

          .print-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 24px;
            border-bottom: 2px solid #f59e0b;
            padding-bottom: 16px;
          }

          .print-brand {
            display: flex;
            align-items: center;
            gap: 14px;
          }

          .print-company-name {
            margin: 0;
            font-size: 28px;
            font-weight: 800;
            letter-spacing: 0.02em;
            color: #111827;
          }

          .print-company-subtitle {
            margin: 4px 0 0;
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: #d97706;
          }

          .print-challan-meta {
            min-width: 220px;
            border: 1px solid #d6d3d1;
          }

          .print-challan-meta div {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 8px 10px;
            border-bottom: 1px solid #e7e5e4;
          }

          .print-challan-meta div:last-child {
            border-bottom: none;
          }

          .print-challan-meta span {
            color: #57534e;
            font-weight: 600;
          }

          .print-challan-meta strong {
            color: #111827;
            font-weight: 700;
          }

          .print-address-bar,
          .print-grid {
            margin-top: 18px;
          }

          .print-address-bar {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            padding: 12px 14px;
            background: #fffbeb;
            border: 1px solid #fcd34d;
          }

          .print-section-caption {
            margin: 0 0 4px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #b45309;
          }

          .print-grid-two {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }

          .print-card {
            border: 1px solid #d6d3d1;
            padding: 14px;
            break-inside: avoid;
          }

          .print-products-card {
            margin-top: 18px;
          }

          .print-section-title {
            margin: 0 0 10px;
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #111827;
          }

          .print-section-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }

          .print-section-note {
            margin: 0;
            color: #78716c;
            font-size: 11px;
            font-weight: 600;
          }

          .print-detail-list p {
            margin: 0 0 6px;
          }

          .print-table {
            width: 100%;
            border-collapse: collapse;
          }

          .print-table th,
          .print-table td {
            border: 1px solid #d6d3d1;
            padding: 9px 10px;
            text-align: left;
            vertical-align: top;
          }

          .print-table thead th {
            background: #1c1917;
            color: #ffffff;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
          }

          .print-empty {
            text-align: center;
            color: #78716c;
          }

          .print-signatures {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-top: 36px;
            padding-top: 22px;
          }

          .print-signature-box {
            min-height: 88px;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            border-top: 1px solid #1c1917;
            padding-top: 8px;
            font-weight: 700;
          }
        }
      `}</style>
    </div>
  );
}
