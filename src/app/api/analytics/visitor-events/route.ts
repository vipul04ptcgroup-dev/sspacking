import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import {
  getBlockedIpsFromEnv,
  isBlockedAnalyticsIp,
  VISITOR_ANALYTICS_COLLECTION,
  VISITOR_ANALYTICS_EVENT_TYPES,
  normalizeCity,
  normalizeCountry,
  normalizeIp,
  normalizeLocationLabel,
  normalizePageUrl,
  normalizePostalCode,
  normalizeState,
  parseForwardedIp,
  parseUserAgent,
  resolveLocationFromHeaders,
} from '@/lib/location-analytics';
import type { VisitorAnalyticsPayload } from '@/lib/location-analytics';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { adminDb } = getFirebaseAdmin();
    const body = await request.json() as VisitorAnalyticsPayload;

    if (!VISITOR_ANALYTICS_EVENT_TYPES.includes(body.eventType)) {
      return NextResponse.json({ error: 'Invalid event type.' }, { status: 400 });
    }

    const headers = request.headers;
    const userAgent = headers.get('user-agent') || '';
    const parsedAgent = parseUserAgent(userAgent);
    const requestIp = normalizeIp(
      parseForwardedIp(headers.get('x-forwarded-for'))
      || headers.get('x-real-ip')
      || headers.get('cf-connecting-ip')
      || headers.get('x-vercel-forwarded-for'),
    );
    const clientIp = normalizeIp(body.clientIp);
    const blockedIps = getBlockedIpsFromEnv();

    if (isBlockedAnalyticsIp(requestIp, blockedIps) || isBlockedAnalyticsIp(clientIp, blockedIps)) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const headerLocation = resolveLocationFromHeaders(headers);
    const country = normalizeCountry(body.country || headerLocation.country);
    const state = normalizeState(body.state || headerLocation.state, country);
    const city = normalizeCity(body.city || headerLocation.city);
    const postalCode = normalizePostalCode(body.postalCode || headerLocation.postalCode);
    const resolvedLocation = body.resolvedLocation?.trim()
      || normalizeLocationLabel({ city, state, country });
    const locationSource = body.locationSource?.trim() || headerLocation.locationSource;

    await adminDb.collection(VISITOR_ANALYTICS_COLLECTION).add({
      createdAt: FieldValue.serverTimestamp(),
      eventType: body.eventType,
      visitorId: body.visitorId?.trim() || '',
      sessionId: body.sessionId?.trim() || '',
      productId: body.productId?.trim() || '',
      productName: body.productName?.trim() || '',
      pageUrl: normalizePageUrl(body.pageUrl),
      quantity: typeof body.quantity === 'number' && Number.isFinite(body.quantity) ? body.quantity : null,
      price: typeof body.price === 'number' && Number.isFinite(body.price) ? body.price : null,
      device: body.device?.trim() || parsedAgent.device,
      browser: body.browser?.trim() || parsedAgent.browser,
      clientIp,
      requestIp,
      resolvedLocation,
      locationSource,
      country,
      state,
      city,
      postalCode,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to store visitor analytics event.' },
      { status: 500 },
    );
  }
}
