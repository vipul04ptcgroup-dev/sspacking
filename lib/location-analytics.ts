import type { VisitorAnalyticsEvent, VisitorAnalyticsEventType } from '@/types';

export const VISITOR_ANALYTICS_COLLECTION = 'visitorAnalytics';

export const VISITOR_ANALYTICS_EVENT_TYPES: VisitorAnalyticsEventType[] = [
  'page_view',
  'product_view',
  'add_to_cart',
  'checkout',
  'login',
];

export type VisitorAnalyticsFilters = {
  dateFrom?: string;
  dateTo?: string;
  eventType?: 'all' | VisitorAnalyticsEventType;
  country?: string;
  state?: string;
  city?: string;
  product?: string;
};

export type VisitorAnalyticsSummary = {
  totalVisitors: number;
  totalSessions: number;
  totalEvents: number;
  pageViews: number;
  productViews: number;
  addToCartEvents: number;
  checkoutEvents: number;
  loginEvents: number;
};

export type VisitorAnalyticsGroupRow = {
  label: string;
  visitors: number;
  events: number;
  addToCartEvents: number;
};

export type VisitorAnalyticsPayload = {
  eventType: VisitorAnalyticsEventType;
  visitorId?: string;
  sessionId?: string;
  productId?: string;
  productName?: string;
  pageUrl?: string;
  quantity?: number | null;
  price?: number | null;
  device?: string;
  browser?: string;
  clientIp?: string;
  requestIp?: string;
  resolvedLocation?: string;
  locationSource?: string;
  country?: string;
  state?: string;
  city?: string;
  postalCode?: string;
};

const COUNTRY_ALIASES: Record<string, string> = {
  in: 'India',
  india: 'India',
  us: 'United States',
  usa: 'United States',
  'united states': 'United States',
  uk: 'United Kingdom',
  'u.k.': 'United Kingdom',
  gb: 'United Kingdom',
};

const INDIA_STATE_CODES: Record<string, string> = {
  ap: 'Andhra Pradesh',
  ar: 'Arunachal Pradesh',
  as: 'Assam',
  br: 'Bihar',
  cg: 'Chhattisgarh',
  ch: 'Chandigarh',
  dd: 'Daman and Diu',
  dl: 'Delhi',
  ga: 'Goa',
  gj: 'Gujarat',
  hp: 'Himachal Pradesh',
  hr: 'Haryana',
  jh: 'Jharkhand',
  jk: 'Jammu and Kashmir',
  ka: 'Karnataka',
  kl: 'Kerala',
  la: 'Ladakh',
  ld: 'Lakshadweep',
  mh: 'Maharashtra',
  ml: 'Meghalaya',
  mn: 'Manipur',
  mp: 'Madhya Pradesh',
  mz: 'Mizoram',
  nl: 'Nagaland',
  od: 'Odisha',
  or: 'Odisha',
  pb: 'Punjab',
  py: 'Puducherry',
  rj: 'Rajasthan',
  sk: 'Sikkim',
  tn: 'Tamil Nadu',
  tr: 'Tripura',
  ts: 'Telangana',
  ukr: 'Uttarakhand',
  uk: 'Uttarakhand',
  up: 'Uttar Pradesh',
  wb: 'West Bengal',
};

function sanitizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function toDateOrNow(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

export function normalizeCountry(value: unknown): string {
  const text = sanitizeText(value);
  if (!text) return 'Unknown';
  const alias = COUNTRY_ALIASES[text.toLowerCase()];
  if (alias) return alias;
  if (text.length <= 3) return text.toUpperCase();
  return titleCase(text);
}

export function normalizeState(value: unknown, country?: unknown): string {
  const text = sanitizeText(value);
  if (!text) return 'Unknown';

  const normalizedCountry = normalizeCountry(country);
  if (normalizedCountry === 'India') {
    const alias = INDIA_STATE_CODES[text.toLowerCase()];
    if (alias) return alias;
  }

  if (text.length <= 3) return text.toUpperCase();
  return titleCase(text);
}

export function normalizeCity(value: unknown): string {
  const text = sanitizeText(value);
  return text ? titleCase(text) : 'Unknown';
}

export function normalizePostalCode(value: unknown): string {
  return sanitizeText(value);
}

export function normalizePageUrl(value: unknown): string {
  return sanitizeText(value);
}

export function normalizeLocationLabel(parts: {
  city?: unknown;
  state?: unknown;
  country?: unknown;
}): string {
  const city = normalizeCity(parts.city);
  const state = normalizeState(parts.state, parts.country);
  const country = normalizeCountry(parts.country);
  const values = [city, state, country].filter((value) => value && value !== 'Unknown');
  return values.length > 0 ? values.join(', ') : 'Unknown';
}

export function normalizeVisitorAnalyticsEvent(
  id: string,
  data: Record<string, unknown>,
): VisitorAnalyticsEvent {
  const country = normalizeCountry(data.country);
  const state = normalizeState(data.state, country);
  const city = normalizeCity(data.city);
  const postalCode = normalizePostalCode(data.postalCode);
  const resolvedLocation = sanitizeText(data.resolvedLocation) || normalizeLocationLabel({ city, state, country });

  return {
    id,
    createdAt: toDateOrNow(data.createdAt),
    eventType: VISITOR_ANALYTICS_EVENT_TYPES.includes(data.eventType as VisitorAnalyticsEventType)
      ? (data.eventType as VisitorAnalyticsEventType)
      : 'page_view',
    visitorId: sanitizeText(data.visitorId),
    sessionId: sanitizeText(data.sessionId),
    productId: sanitizeText(data.productId),
    productName: sanitizeText(data.productName),
    pageUrl: normalizePageUrl(data.pageUrl),
    quantity: sanitizeNumber(data.quantity),
    price: sanitizeNumber(data.price),
    device: sanitizeText(data.device) || 'Unknown',
    browser: sanitizeText(data.browser) || 'Unknown',
    clientIp: sanitizeText(data.clientIp),
    requestIp: sanitizeText(data.requestIp),
    resolvedLocation,
    locationSource: sanitizeText(data.locationSource) || 'unknown',
    country,
    state,
    city,
    postalCode,
  };
}

export function parseForwardedIp(value: string | null): string {
  if (!value) return '';
  return value
    .split(',')
    .map((part) => part.trim())
    .find(Boolean) || '';
}

export function normalizeIp(value: string | null | undefined): string {
  const text = sanitizeText(value);
  if (!text) return '';
  if (text === '::1') return '127.0.0.1';
  if (text.startsWith('::ffff:')) return text.slice('::ffff:'.length);
  return text;
}

export function isLocalhostUrl(pageUrl: string): boolean {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(pageUrl);
}

export function isPrivateIp(ip: string): boolean {
  if (!ip) return false;
  const normalized = normalizeIp(ip);

  if (normalized === '127.0.0.1') return true;
  if (normalized.startsWith('10.')) return true;
  if (normalized.startsWith('192.168.')) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)) return true;
  if (normalized.startsWith('169.254.')) return true;
  return normalized === '0.0.0.0';
}

export function getBlockedIpsFromEnv(): Set<string> {
  return new Set(
    (process.env.ANALYTICS_BLOCKED_IPS || '')
      .split(',')
      .map((value) => normalizeIp(value))
      .filter(Boolean),
  );
}

export function shouldExcludeEventFromDisplay(event: VisitorAnalyticsEvent, blockedIps = getBlockedIpsFromEnv()): boolean {
  if (isLocalhostUrl(event.pageUrl)) return true;

  const ips = [event.clientIp, event.requestIp].map((value) => normalizeIp(value)).filter(Boolean);
  if (ips.some((ip) => blockedIps.has(ip))) return true;
  if (ips.some((ip) => isPrivateIp(ip))) return true;

  return false;
}

export function filterVisitorAnalyticsEvents(
  events: VisitorAnalyticsEvent[],
  filters: VisitorAnalyticsFilters,
): VisitorAnalyticsEvent[] {
  const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
  const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`) : null;
  const productFilter = sanitizeText(filters.product).toLowerCase();
  const countryFilter = sanitizeText(filters.country).toLowerCase();
  const stateFilter = sanitizeText(filters.state).toLowerCase();
  const cityFilter = sanitizeText(filters.city).toLowerCase();

  return events.filter((event) => {
    if (from && event.createdAt < from) return false;
    if (to && event.createdAt > to) return false;
    if (filters.eventType && filters.eventType !== 'all' && event.eventType !== filters.eventType) return false;
    if (countryFilter && event.country.toLowerCase() !== countryFilter) return false;
    if (stateFilter && event.state.toLowerCase() !== stateFilter) return false;
    if (cityFilter && event.city.toLowerCase() !== cityFilter) return false;
    if (
      productFilter &&
      !event.productName.toLowerCase().includes(productFilter) &&
      !event.productId.toLowerCase().includes(productFilter)
    ) {
      return false;
    }
    return true;
  });
}

export function buildVisitorAnalyticsSummary(events: VisitorAnalyticsEvent[]): VisitorAnalyticsSummary {
  return {
    totalVisitors: new Set(events.map((event) => event.visitorId).filter(Boolean)).size,
    totalSessions: new Set(events.map((event) => event.sessionId).filter(Boolean)).size,
    totalEvents: events.length,
    pageViews: events.filter((event) => event.eventType === 'page_view').length,
    productViews: events.filter((event) => event.eventType === 'product_view').length,
    addToCartEvents: events.filter((event) => event.eventType === 'add_to_cart').length,
    checkoutEvents: events.filter((event) => event.eventType === 'checkout').length,
    loginEvents: events.filter((event) => event.eventType === 'login').length,
  };
}

function buildLocationKey(event: VisitorAnalyticsEvent, fields: Array<'country' | 'state' | 'city'>): string {
  const values = fields
    .map((field) => event[field])
    .filter((value) => value && value !== 'Unknown');
  return values.length > 0 ? values.join(', ') : 'Unknown';
}

function buildGroupedRows(
  events: VisitorAnalyticsEvent[],
  fields: Array<'country' | 'state' | 'city'>,
): VisitorAnalyticsGroupRow[] {
  const map = new Map<string, VisitorAnalyticsGroupRow & { visitorIds: Set<string> }>();

  events.forEach((event) => {
    const label = buildLocationKey(event, fields);
    const existing = map.get(label) || {
      label,
      visitors: 0,
      events: 0,
      addToCartEvents: 0,
      visitorIds: new Set<string>(),
    };

    existing.events += 1;
    if (event.eventType === 'add_to_cart') existing.addToCartEvents += 1;
    if (event.visitorId) existing.visitorIds.add(event.visitorId);
    existing.visitors = existing.visitorIds.size;
    map.set(label, existing);
  });

  return Array.from(map.values())
    .map(({ visitorIds: _visitorIds, ...row }) => row)
    .sort((left, right) => {
      if (right.visitors !== left.visitors) return right.visitors - left.visitors;
      if (right.events !== left.events) return right.events - left.events;
      return left.label.localeCompare(right.label);
    });
}

export function buildVisitorAnalyticsGroups(events: VisitorAnalyticsEvent[]) {
  return {
    visitorsByCountry: buildGroupedRows(events, ['country']),
    visitorsByState: buildGroupedRows(events, ['country', 'state']),
    visitorsByCity: buildGroupedRows(events, ['country', 'state', 'city']),
    activityByLocation: buildGroupedRows(events, ['country', 'state', 'city']),
    addToCartActivityByLocation: buildGroupedRows(
      events.filter((event) => event.eventType === 'add_to_cart'),
      ['country', 'state', 'city'],
    ),
  };
}

export function getDefaultAnalyticsDateRange(now = new Date()): { dateFrom: string; dateTo: string } {
  const end = new Date(now);
  const start = new Date(now);
  start.setMonth(start.getMonth() - 1);

  return {
    dateFrom: formatDateInputValue(start),
    dateTo: formatDateInputValue(end),
  };
}

export function formatDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildVisitorAnalyticsCsv(events: VisitorAnalyticsEvent[]): string {
  const header = [
    'id',
    'createdAt',
    'eventType',
    'visitorId',
    'sessionId',
    'productId',
    'productName',
    'pageUrl',
    'quantity',
    'price',
    'device',
    'browser',
    'clientIp',
    'requestIp',
    'resolvedLocation',
    'locationSource',
    'country',
    'state',
    'city',
    'postalCode',
  ];

  const rows = events.map((event) => [
    event.id,
    event.createdAt.toISOString(),
    event.eventType,
    event.visitorId,
    event.sessionId,
    event.productId,
    event.productName,
    event.pageUrl,
    event.quantity == null ? '' : String(event.quantity),
    event.price == null ? '' : String(event.price),
    event.device,
    event.browser,
    event.clientIp,
    event.requestIp,
    event.resolvedLocation,
    event.locationSource,
    event.country,
    event.state,
    event.city,
    event.postalCode,
  ]);

  return [header, ...rows]
    .map((row) =>
      row
        .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
        .join(','),
    )
    .join('\n');
}

export function parseUserAgent(userAgent: string): { device: string; browser: string } {
  const ua = userAgent.toLowerCase();

  const browser = ua.includes('edg/')
    ? 'Edge'
    : ua.includes('chrome/')
      ? 'Chrome'
      : ua.includes('safari/') && !ua.includes('chrome/')
        ? 'Safari'
        : ua.includes('firefox/')
          ? 'Firefox'
          : ua.includes('opr/') || ua.includes('opera')
            ? 'Opera'
            : 'Unknown';

  const device = /mobile|iphone|android(?!.*tablet)/.test(ua)
    ? 'Mobile'
    : /ipad|tablet/.test(ua)
      ? 'Tablet'
      : 'Desktop';

  return { device, browser };
}

export function resolveLocationFromHeaders(headers: Headers): {
  country: string;
  state: string;
  city: string;
  postalCode: string;
  resolvedLocation: string;
  locationSource: string;
} {
  const vercelCountry = sanitizeText(headers.get('x-vercel-ip-country'));
  const vercelState = sanitizeText(headers.get('x-vercel-ip-country-region'));
  const vercelCity = sanitizeText(headers.get('x-vercel-ip-city'));
  const vercelPostalCode = sanitizeText(headers.get('x-vercel-ip-postal-code'));

  if (vercelCountry || vercelState || vercelCity || vercelPostalCode) {
    const country = normalizeCountry(vercelCountry);
    const state = normalizeState(vercelState, country);
    const city = normalizeCity(vercelCity);
    const postalCode = normalizePostalCode(vercelPostalCode);
    return {
      country,
      state,
      city,
      postalCode,
      resolvedLocation: normalizeLocationLabel({ city, state, country }),
      locationSource: 'vercel-header',
    };
  }

  const cloudflareCountry = sanitizeText(headers.get('cf-ipcountry'));
  if (cloudflareCountry) {
    const country = normalizeCountry(cloudflareCountry);
    return {
      country,
      state: 'Unknown',
      city: 'Unknown',
      postalCode: '',
      resolvedLocation: normalizeLocationLabel({ country }),
      locationSource: 'cloudflare-header',
    };
  }

  return {
    country: 'Unknown',
    state: 'Unknown',
    city: 'Unknown',
    postalCode: '',
    resolvedLocation: 'Unknown',
    locationSource: 'unknown',
  };
}
