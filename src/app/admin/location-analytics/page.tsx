'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Filter, Globe2, MapPinned } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { EmptyState, Spinner } from '@/components/ui';
import { useAuth } from '@/context/auth-context';
import {
  VISITOR_ANALYTICS_EVENT_TYPES,
  formatDateInputValue,
  getDefaultAnalyticsDateRange,
} from '@/lib/location-analytics';
import type { VisitorAnalyticsEvent, VisitorAnalyticsEventType } from '@/types';

type GroupRow = {
  label: string;
  visitors: number;
  events: number;
  addToCartEvents: number;
};

type AnalyticsResponse = {
  summary: {
    totalVisitors: number;
    totalSessions: number;
    totalEvents: number;
    pageViews: number;
    productViews: number;
    addToCartEvents: number;
    checkoutEvents: number;
    loginEvents: number;
  };
  groups: {
    visitorsByCountry: GroupRow[];
    visitorsByState: GroupRow[];
    visitorsByCity: GroupRow[];
    activityByLocation: GroupRow[];
    addToCartActivityByLocation: GroupRow[];
  };
  filterOptions: {
    countries: string[];
    states: string[];
    cities: string[];
    products: string[];
  };
  events: Array<Omit<VisitorAnalyticsEvent, 'createdAt'> & { createdAt: string }>;
  totals: {
    storedEvents: number;
    displayableEvents: number;
    filteredEvents: number;
  };
};

type Filters = {
  dateFrom: string;
  dateTo: string;
  eventType: 'all' | VisitorAnalyticsEventType;
  country: string;
  state: string;
  city: string;
  product: string;
};

const DEFAULT_SUMMARY = {
  totalVisitors: 0,
  totalSessions: 0,
  totalEvents: 0,
  pageViews: 0,
  productViews: 0,
  addToCartEvents: 0,
  checkoutEvents: 0,
  loginEvents: 0,
};

const DEFAULT_GROUPS = {
  visitorsByCountry: [] as GroupRow[],
  visitorsByState: [] as GroupRow[],
  visitorsByCity: [] as GroupRow[],
  activityByLocation: [] as GroupRow[],
  addToCartActivityByLocation: [] as GroupRow[],
};

const DEFAULT_FILTER_OPTIONS = {
  countries: [] as string[],
  states: [] as string[],
  cities: [] as string[],
  products: [] as string[],
};

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatCurrency(value: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

function getCountryCode(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === 'unknown') return '-';
  if (normalized === 'india') return 'IN';
  if (normalized === 'united states') return 'US';
  if (normalized === 'united kingdom') return 'UK';
  return value.length <= 3 ? value.toUpperCase() : value.slice(0, 2).toUpperCase();
}

function formatLocationHeadline(event: AnalyticsResponse['events'][number]): string {
  const city = event.city && event.city !== 'Unknown' ? event.city : '';
  const postalCode = event.postalCode || '';
  const state = event.state && event.state !== 'Unknown' ? event.state : '';

  if (city && postalCode) return `${city} - ${postalCode}`;
  if (city) return city;
  if (state && postalCode) return `${state} - ${postalCode}`;
  if (postalCode) return postalCode;
  if (state) return state;
  return event.resolvedLocation || '-';
}

function formatClientLocation(event: AnalyticsResponse['events'][number]): string {
  const city = event.city && event.city !== 'Unknown' ? event.city : '';
  const postalCode = event.postalCode || '';
  if (city && postalCode) return `${city} ${postalCode}`;
  return city || postalCode || '-';
}

function formatLocationSource(source: string): string {
  if (!source) return '-';
  return source.replace(/-/g, ' ');
}

function buildDefaultFilters(): Filters {
  const { dateFrom, dateTo } = getDefaultAnalyticsDateRange();
  return {
    dateFrom,
    dateTo,
    eventType: 'all',
    country: '',
    state: '',
    city: '',
    product: '',
  };
}

function buildQueryString(filters: Filters): string {
  const params = new URLSearchParams();
  params.set('dateFrom', filters.dateFrom);
  params.set('dateTo', filters.dateTo);
  params.set('eventType', filters.eventType);
  if (filters.country) params.set('country', filters.country);
  if (filters.state) params.set('state', filters.state);
  if (filters.city) params.set('city', filters.city);
  if (filters.product) params.set('product', filters.product);
  return params.toString();
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{label}</p>
      <p className="mt-3 text-3xl font-black text-stone-900">{value}</p>
    </div>
  );
}

function GroupTable({ title, rows }: { title: string; rows: GroupRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
      <div className="border-b border-stone-100 px-5 py-4">
        <h2 className="text-lg font-bold text-stone-900">{title}</h2>
      </div>
      {rows.length === 0 ? (
        <div className="px-5 py-10 text-sm text-stone-500">No matching data for this grouping.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Location</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Visitors</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Events</th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Add to Cart</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {rows.map((row) => (
                <tr key={row.label} className="transition hover:bg-stone-50">
                  <td className="px-5 py-4 text-sm font-semibold text-stone-900">{row.label}</td>
                  <td className="px-5 py-4 text-sm text-stone-600">{row.visitors}</td>
                  <td className="px-5 py-4 text-sm text-stone-600">{row.events}</td>
                  <td className="px-5 py-4 text-sm text-stone-600">{row.addToCartEvents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminLocationAnalyticsPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<Filters>(buildDefaultFilters);
  const [events, setEvents] = useState<AnalyticsResponse['events']>([]);
  const [summary, setSummary] = useState(DEFAULT_SUMMARY);
  const [groups, setGroups] = useState(DEFAULT_GROUPS);
  const [filterOptions, setFilterOptions] = useState(DEFAULT_FILTER_OPTIONS);
  const [totals, setTotals] = useState({ storedEvents: 0, displayableEvents: 0, filteredEvents: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const lastDefaultRangeRef = useRef(getDefaultAnalyticsDateRange());

  useEffect(() => {
    const interval = window.setInterval(() => {
      const nextDefaultRange = getDefaultAnalyticsDateRange();
      const previousDefaultRange = lastDefaultRangeRef.current;
      const defaultRangeChanged =
        nextDefaultRange.dateFrom !== previousDefaultRange.dateFrom ||
        nextDefaultRange.dateTo !== previousDefaultRange.dateTo;

      if (!defaultRangeChanged) return;

      setFilters((current) => {
        const isStillUsingDefaultRange =
          current.dateFrom === previousDefaultRange.dateFrom &&
          current.dateTo === previousDefaultRange.dateTo;

        lastDefaultRangeRef.current = nextDefaultRange;
        return isStillUsingDefaultRange
          ? { ...current, dateFrom: nextDefaultRange.dateFrom, dateTo: nextDefaultRange.dateTo }
          : current;
      });
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!user) return;

    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/admin/location-analytics?${buildQueryString(filters)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json() as AnalyticsResponse & { error?: string };
        if (!response.ok) {
          throw new Error(result.error || 'Failed to load location analytics.');
        }
        if (!active) return;

        setEvents(result.events);
        setSummary(result.summary);
        setGroups(result.groups);
        setFilterOptions(result.filterOptions);
        setTotals(result.totals);
      } catch (error) {
        if (active) toast.error(error instanceof Error ? error.message : 'Failed to load location analytics.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [filters, user]);

  const eventTypeOptions = useMemo(
    () => [
      { value: 'all', label: 'All Events' },
      ...VISITOR_ANALYTICS_EVENT_TYPES.map((value) => ({
        value,
        label: value.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
      })),
    ],
    [],
  );

  const handleFilterChange = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const handleResetFilters = () => {
    const nextFilters = buildDefaultFilters();
    lastDefaultRangeRef.current = {
      dateFrom: nextFilters.dateFrom,
      dateTo: nextFilters.dateTo,
    };
    setFilters(nextFilters);
  };

  const handleExport = async () => {
    if (!user) return;

    setExporting(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/location-analytics/export', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const result = await response.json() as { error?: string };
        throw new Error(result.error || 'Failed to export CSV.');
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `visitor-analytics-${formatDateInputValue(new Date())}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export CSV.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-3xl font-black text-stone-900">Location Analytics</h1>
          <p className="mt-1 text-stone-500">
            Anonymous visitor activity grouped by geography, session, and event type.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={handleExport} loading={exporting}>
          <Download className="h-4 w-4" />
          Export Full CSV
        </Button>
      </div>

      <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-stone-900">
          <Filter className="h-4 w-4 text-amber-600" />
          <h2 className="text-lg font-bold">Filters</h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm text-stone-600">
            <span className="font-medium text-stone-700">Date From</span>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => handleFilterChange('dateFrom', event.target.value)}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-stone-600">
            <span className="font-medium text-stone-700">Date To</span>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => handleFilterChange('dateTo', event.target.value)}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-stone-600">
            <span className="font-medium text-stone-700">Event Type</span>
            <select
              value={filters.eventType}
              onChange={(event) => handleFilterChange('eventType', event.target.value as Filters['eventType'])}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              {eventTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-stone-600">
            <span className="font-medium text-stone-700">Country</span>
            <select
              value={filters.country}
              onChange={(event) => handleFilterChange('country', event.target.value)}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">All Countries</option>
              {filterOptions.countries.map((country) => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-stone-600">
            <span className="font-medium text-stone-700">State</span>
            <select
              value={filters.state}
              onChange={(event) => handleFilterChange('state', event.target.value)}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">All States</option>
              {filterOptions.states.map((state) => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-stone-600">
            <span className="font-medium text-stone-700">City</span>
            <select
              value={filters.city}
              onChange={(event) => handleFilterChange('city', event.target.value)}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">All Cities</option>
              {filterOptions.cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-stone-600">
            <span className="font-medium text-stone-700">Product</span>
            <select
              value={filters.product}
              onChange={(event) => handleFilterChange('product', event.target.value)}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">All Products</option>
              {filterOptions.products.map((product) => (
                <option key={product} value={product}>{product}</option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <Button type="button" variant="ghost" className="w-full" onClick={handleResetFilters}>
              Reset to Last 30 Days
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 text-sm text-stone-500 md:grid-cols-3">
          <p>Stored events in Firebase: {totals.storedEvents}</p>
          <p>Display-safe events after exclusions: {totals.displayableEvents}</p>
          <p>Current filtered events: {totals.filteredEvents}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
            <SummaryCard label="Total Visitors" value={summary.totalVisitors} />
            <SummaryCard label="Total Sessions" value={summary.totalSessions} />
            <SummaryCard label="Page Views" value={summary.pageViews} />
            <SummaryCard label="Product Views" value={summary.productViews} />
            <SummaryCard label="Add to Cart" value={summary.addToCartEvents} />
            <SummaryCard label="Checkout" value={summary.checkoutEvents} />
            <SummaryCard label="Login" value={summary.loginEvents} />
          </div>

          <div className="mb-8 grid gap-6 xl:grid-cols-2">
            <GroupTable title="Visitors by Country" rows={groups.visitorsByCountry} />
            <GroupTable title="Visitors by State" rows={groups.visitorsByState} />
            <GroupTable title="Visitors by City" rows={groups.visitorsByCity} />
            <GroupTable title="Activity by Location" rows={groups.activityByLocation} />
            <GroupTable title="Add to Cart Activity by Location" rows={groups.addToCartActivityByLocation} />
          </div>

          <div className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-stone-900">Recent Visitors</h2>
                <p className="text-sm text-stone-500">All filtered events are shown below with no row cap.</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-stone-500">
                <Globe2 className="h-4 w-4 text-amber-600" />
                {events.length} event{events.length === 1 ? '' : 's'}
              </div>
            </div>

            {events.length === 0 ? (
              <EmptyState
                icon={<MapPinned className="h-16 w-16" />}
                title="No visitor events match these filters"
                description="Try a wider date range or clear one of the location filters."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1320px]">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-50">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Time</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Latest Event</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Visitor / Session</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Location</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Page</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Product</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Qty</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Price</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-stone-500">Device</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {events.map((event) => (
                      <tr key={event.id} className="align-top transition hover:bg-stone-50">
                        <td className="px-5 py-4 text-sm text-stone-500">{formatDateTime(event.createdAt)}</td>
                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                            {event.eventType.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-stone-600">
                          <p className="font-medium text-stone-900">{event.visitorId || '-'}</p>
                          <p className="mt-1 text-xs text-stone-500">{event.sessionId || '-'}</p>
                        </td>
                        <td className="px-5 py-4 text-sm text-stone-600">
                          <p className="font-medium text-stone-900">{formatLocationHeadline(event)}</p>
                          <p className="mt-1 text-xs text-stone-500">source: {formatLocationSource(event.locationSource)}</p>
                          <p className="mt-1 text-xs text-stone-500">clientIp: {event.clientIp || event.requestIp || '-'}</p>
                        </td>
                        <td className="px-5 py-4 text-sm text-stone-600 break-all">{event.pageUrl || '-'}</td>
                        <td className="px-5 py-4 text-sm text-stone-600">
                          <p className="font-medium text-stone-900">{event.productName || '-'}</p>
                          <p className="mt-1 text-xs text-stone-500">{event.productId || '-'}</p>
                        </td>
                        <td className="px-5 py-4 text-sm text-stone-600">{event.quantity ?? '-'}</td>
                        <td className="px-5 py-4 text-sm text-stone-600">{formatCurrency(event.price)}</td>
                        <td className="px-5 py-4 text-sm text-stone-600">
                          <p>{event.device || '-'}</p>
                          <p className="mt-1 text-xs text-stone-500">{event.browser || '-'}</p>
                          <p className="mt-1 text-xs text-stone-500">header: {getCountryCode(event.country)}</p>
                          <p className="mt-1 text-xs text-stone-500">client: {formatClientLocation(event)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
