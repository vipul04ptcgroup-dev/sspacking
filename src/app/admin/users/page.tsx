'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getCustomerList } from '@/lib/firestore';
import type { CustomerListResult, CustomerTypeFilter, User } from '@/types';
import { formatDate } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { Badge, EmptyState, Spinner } from '@/components/ui';
import { ChevronLeft, ChevronRight, ExternalLink, Search, SlidersHorizontal, Users } from 'lucide-react';

const PAGE_SIZE = 10;

const FILTER_OPTIONS: Array<{ value: CustomerTypeFilter; label: string }> = [
  { value: 'all', label: 'All Customers' },
  { value: 'website', label: 'Website Customers' },
  { value: 'manual', label: 'Manual Customers' },
];

const SORT_OPTIONS = [
  { value: 'createdAt-desc', label: 'Newest First' },
  { value: 'createdAt-asc', label: 'Oldest First' },
  { value: 'displayName-asc', label: 'Name A-Z' },
  { value: 'displayName-desc', label: 'Name Z-A' },
  { value: 'email-asc', label: 'Email A-Z' },
  { value: 'customerType-asc', label: 'Type A-Z' },
] as const;

function getCustomerTypeBadge(type: User['customerType']) {
  if (type === 'manual') {
    return <Badge variant="info">Manual</Badge>;
  }

  return <Badge variant="success">Website</Badge>;
}

function getCustomerSourceLabel(type: User['customerType']) {
  return type === 'manual' ? 'Manual Order' : 'Website Registration / Checkout';
}

export default function AdminUsersPage() {
  const [result, setResult] = useState<CustomerListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<CustomerTypeFilter>('all');
  const [sortValue, setSortValue] = useState<(typeof SORT_OPTIONS)[number]['value']>('createdAt-desc');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [sortBy, sortDirection] = sortValue.split('-') as ['createdAt' | 'displayName' | 'email' | 'customerType', 'asc' | 'desc'];

  useEffect(() => {
    setLoading(true);
    getCustomerList({
      customerType: customerTypeFilter,
      search,
      sortBy,
      sortDirection,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((customerResult) => {
        setResult(customerResult);
        setSelectedIds((prev) => prev.filter((id) => customerResult.users.some((user) => user.id === id)));
      })
      .finally(() => setLoading(false));
  }, [customerTypeFilter, page, search, sortBy, sortDirection]);

  const users = result?.users || [];
  const totalCount = result?.totalCount || 0;
  const totalPages = result?.totalPages || 1;

  const allVisibleSelected = useMemo(
    () => users.length > 0 && users.every((user) => selectedIds.includes(user.id)),
    [selectedIds, users],
  );

  const selectedVisibleCount = useMemo(
    () => users.filter((user) => selectedIds.includes(user.id)).length,
    [selectedIds, users],
  );

  const handleFilterChange = (nextFilter: CustomerTypeFilter) => {
    setCustomerTypeFilter(nextFilter);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleSortChange = (value: (typeof SORT_OPTIONS)[number]['value']) => {
    setSortValue(value);
    setPage(1);
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]));
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      if (allVisibleSelected) {
        return prev.filter((id) => !users.some((user) => user.id === id));
      }

      const nextSelection = new Set(prev);
      users.forEach((user) => nextSelection.add(user.id));
      return Array.from(nextSelection);
    });
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-black text-stone-900">Customers</h1>
          <p className="mt-1 text-stone-500">{totalCount} customer record{totalCount === 1 ? '' : 's'}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
          {selectedIds.length > 0 ? (
            <Button type="button" variant="outline" onClick={() => setSelectedIds([])}>
              Clear Selection ({selectedIds.length})
            </Button>
          ) : null}
          <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-500">
            <SlidersHorizontal className="h-4 w-4 text-stone-400" />
            Selection stays scoped to the visible page.
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleFilterChange(option.value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                customerTypeFilter === option.value
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300 hover:bg-stone-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search by name, email, phone, type, or source"
              className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <select
            value={sortValue}
            onChange={(event) => handleSortChange(event.target.value as (typeof SORT_OPTIONS)[number]['value'])}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      ) : totalCount === 0 ? (
        <EmptyState
          icon={<Users className="h-16 w-16" />}
          title="No customers found"
          description="Try changing the customer type filter or search term."
        />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-2 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Page {result?.page || 1} of {totalPages}
            </p>
            <p>{selectedVisibleCount} selected on this page</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    <th className="px-5 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAllVisible}
                        aria-label="Select all visible customers"
                      />
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Customer</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Email</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Type</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Source</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Role</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Joined</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-stone-500">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {users.map((user) => (
                    <tr key={user.id} className="transition hover:bg-stone-50">
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(user.id)}
                          onChange={() => toggleSelectOne(user.id)}
                          aria-label={`Select ${user.displayName || user.email}`}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                            <span className="text-sm font-bold text-amber-700">
                              {(user.displayName || user.email || 'U')[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-stone-900">{user.displayName || '—'}</p>
                            <p className="text-xs text-stone-500">{user.phone || 'No phone added'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-stone-600">{user.email || '—'}</td>
                      <td className="px-5 py-4">{getCustomerTypeBadge(user.customerType)}</td>
                      <td className="px-5 py-4 text-sm text-stone-600">{getCustomerSourceLabel(user.customerType)}</td>
                      <td className="px-5 py-4">
                        <Badge variant={user.role === 'admin' ? 'warning' : 'default'}>
                          {user.role === 'admin' ? 'Admin' : 'Customer'}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-sm text-stone-500">{formatDate(user.createdAt)}</td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-amber-600 transition hover:bg-amber-50"
                        >
                          View
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-stone-100 lg:hidden">
              <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-4 py-3">
                <label className="flex items-center gap-2 text-sm font-medium text-stone-600">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    aria-label="Select all visible customers"
                  />
                  Select page
                </label>
                <span className="text-xs text-stone-500">{users.length} visible</span>
              </div>

              {users.map((user) => (
                <div key={user.id} className="space-y-4 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(user.id)}
                      onChange={() => toggleSelectOne(user.id)}
                      aria-label={`Select ${user.displayName || user.email}`}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-stone-900">{user.displayName || '—'}</p>
                          <p className="text-xs text-stone-500">{user.email || 'No email added'}</p>
                        </div>
                        {getCustomerTypeBadge(user.customerType)}
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-stone-600">
                        <p><span className="font-medium text-stone-800">Source:</span> {getCustomerSourceLabel(user.customerType)}</p>
                        <p><span className="font-medium text-stone-800">Phone:</span> {user.phone || 'No phone added'}</p>
                        <p><span className="font-medium text-stone-800">Joined:</span> {formatDate(user.createdAt)}</p>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <Badge variant={user.role === 'admin' ? 'warning' : 'default'}>
                          {user.role === 'admin' ? 'Admin' : 'Customer'}
                        </Badge>
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600"
                        >
                          View Details
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-stone-500">
              Showing {users.length} of {totalCount} customers
            </p>

            <div className="flex items-center gap-2 self-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
