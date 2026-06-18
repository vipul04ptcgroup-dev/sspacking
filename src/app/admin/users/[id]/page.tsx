'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getUserById } from '@/lib/firestore';
import type { User } from '@/types';
import { formatDate } from '@/lib/utils';
import { Badge, EmptyState, Spinner } from '@/components/ui';
import { ArrowLeft, Mail, MapPin, Phone, UserRound, Users } from 'lucide-react';

function getCustomerTypeBadge(type: User['customerType']) {
  if (type === 'manual') {
    return <Badge variant="info">Manual</Badge>;
  }

  return <Badge variant="success">Website</Badge>;
}

function getCustomerSourceLabel(type: User['customerType']) {
  return type === 'manual' ? 'Manual Order' : 'Website Registration / Checkout';
}

export default function AdminCustomerDetailsPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;

    setLoading(true);
    getUserById(params.id)
      .then((user) => setCustomer(user))
      .finally(() => setLoading(false));
  }, [params?.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!customer) {
    return (
      <EmptyState
        icon={<Users className="h-16 w-16" />}
        title="Customer not found"
        description="The selected customer record could not be loaded."
        action={
          <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm font-semibold text-amber-600">
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm font-semibold text-amber-600">
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </Link>
          <h1 className="mt-3 text-3xl font-black text-stone-900">{customer.displayName || 'Customer Details'}</h1>
          <p className="mt-1 text-stone-500">Review customer profile information, origin, and saved addresses.</p>
        </div>
        {getCustomerTypeBadge(customer.customerType)}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-stone-900">Customer Summary</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-stone-100 bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Customer Type</p>
                <div className="mt-3">{getCustomerTypeBadge(customer.customerType)}</div>
              </div>
              <div className="rounded-xl border border-stone-100 bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Customer Source</p>
                <p className="mt-3 text-sm font-semibold text-stone-900">{getCustomerSourceLabel(customer.customerType)}</p>
              </div>
              <div className="rounded-xl border border-stone-100 bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Role</p>
                <p className="mt-3 text-sm font-semibold text-stone-900">{customer.role === 'admin' ? 'Admin' : 'Customer'}</p>
              </div>
              <div className="rounded-xl border border-stone-100 bg-stone-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Joined</p>
                <p className="mt-3 text-sm font-semibold text-stone-900">{formatDate(customer.createdAt)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-stone-900">Contact Information</h2>
            <div className="mt-5 space-y-4">
              <div className="flex items-start gap-3 rounded-xl border border-stone-100 bg-stone-50 p-4">
                <UserRound className="mt-0.5 h-5 w-5 text-stone-400" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Full Name</p>
                  <p className="mt-1 text-sm font-semibold text-stone-900">{customer.displayName || '—'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-stone-100 bg-stone-50 p-4">
                <Mail className="mt-0.5 h-5 w-5 text-stone-400" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Email</p>
                  <p className="mt-1 text-sm font-semibold text-stone-900">{customer.email || 'No email recorded'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-stone-100 bg-stone-50 p-4">
                <Phone className="mt-0.5 h-5 w-5 text-stone-400" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Phone</p>
                  <p className="mt-1 text-sm font-semibold text-stone-900">{customer.phone || 'No phone recorded'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-stone-900">Saved Addresses</h2>
          <p className="mt-1 text-sm text-stone-500">{customer.addresses.length} address record{customer.addresses.length === 1 ? '' : 's'}</p>

          {customer.addresses.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-stone-200 bg-stone-50 p-6 text-center text-sm text-stone-500">
              No addresses have been saved for this customer yet.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {customer.addresses.map((address, index) => (
                <div key={`${address.addressLine1}-${address.pincode}-${index}`} className="rounded-xl border border-stone-100 bg-stone-50 p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 text-stone-400" />
                    <div>
                      <p className="text-sm font-semibold text-stone-900">{address.fullName || customer.displayName || '—'}</p>
                      <p className="mt-1 text-sm text-stone-600">
                        {[
                          address.addressLine1,
                          address.addressLine2,
                          address.city,
                          address.state,
                          address.pincode,
                          address.country,
                        ].filter(Boolean).join(', ')}
                      </p>
                      <p className="mt-2 text-xs font-medium text-stone-500">Phone: {address.phone || customer.phone || 'No phone recorded'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
