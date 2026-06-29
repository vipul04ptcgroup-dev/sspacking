'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  buildCurrentPageUrl,
  getSessionId,
  getVisitorId,
  isTrackablePath,
  trackVisitorEvent,
} from '@/lib/visitor-analytics-client';

export default function VisitorAnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedUrlRef = useRef('');

  useEffect(() => {
    getVisitorId();
    getSessionId();
  }, []);

  useEffect(() => {
    if (!pathname || !isTrackablePath(pathname)) return;

    const search = searchParams?.toString() || '';
    const pageUrl = buildCurrentPageUrl(pathname, search ? `?${search}` : '');
    if (lastTrackedUrlRef.current === pageUrl) return;

    lastTrackedUrlRef.current = pageUrl;
    trackVisitorEvent({ eventType: 'page_view', pageUrl });
  }, [pathname, searchParams]);

  return null;
}
