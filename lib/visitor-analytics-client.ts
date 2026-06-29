import type { VisitorAnalyticsEventType } from '@/types';

const VISITOR_ID_KEY = 'ss-packaging-visitor-id';
const SESSION_ID_KEY = 'ss-packaging-session-id';

type TrackVisitorEventInput = {
  eventType: VisitorAnalyticsEventType;
  productId?: string;
  productName?: string;
  pageUrl?: string;
  quantity?: number | null;
  price?: number | null;
};

function canUseBrowserStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined' && typeof sessionStorage !== 'undefined';
}

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

export function getVisitorId(): string {
  if (!canUseBrowserStorage()) return '';

  let visitorId = localStorage.getItem(VISITOR_ID_KEY) || '';
  if (!visitorId) {
    visitorId = generateId('visitor');
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
}

export function getSessionId(): string {
  if (!canUseBrowserStorage()) return '';

  let sessionId = sessionStorage.getItem(SESSION_ID_KEY) || '';
  if (!sessionId) {
    sessionId = generateId('session');
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

export function isTrackablePath(pathname: string): boolean {
  return !(
    pathname.startsWith('/admin') ||
    pathname.startsWith('/team') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next')
  );
}

export function buildCurrentPageUrl(pathname?: string, search?: string): string {
  if (typeof window === 'undefined') return pathname || '';
  const url = new URL(window.location.href);
  if (pathname) url.pathname = pathname;
  url.search = search || url.search;
  return url.toString();
}

export function trackVisitorEvent(input: TrackVisitorEventInput): void {
  if (typeof window === 'undefined') return;

  const payload = {
    eventType: input.eventType,
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    productId: input.productId || '',
    productName: input.productName || '',
    pageUrl: input.pageUrl || buildCurrentPageUrl(),
    quantity: input.quantity ?? null,
    price: input.price ?? null,
  };

  const body = JSON.stringify(payload);

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: 'application/json' });
    navigator.sendBeacon('/api/analytics/visitor-events', blob);
    return;
  }

  void fetch('/api/analytics/visitor-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  });
}
