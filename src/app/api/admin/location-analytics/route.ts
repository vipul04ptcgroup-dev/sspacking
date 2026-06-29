import { NextResponse } from 'next/server';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import {
  VISITOR_ANALYTICS_COLLECTION,
  buildVisitorAnalyticsGroups,
  buildVisitorAnalyticsSummary,
  filterVisitorAnalyticsEvents,
  normalizeVisitorAnalyticsEvent,
  shouldExcludeEventFromDisplay,
  type VisitorAnalyticsFilters,
} from '@/lib/location-analytics';
import { requireAdminRequest } from '@/lib/request-auth';

export const runtime = 'nodejs';

function readFilters(request: Request): VisitorAnalyticsFilters {
  const { searchParams } = new URL(request.url);
  return {
    dateFrom: searchParams.get('dateFrom') || undefined,
    dateTo: searchParams.get('dateTo') || undefined,
    eventType: (searchParams.get('eventType') as VisitorAnalyticsFilters['eventType']) || 'all',
    country: searchParams.get('country') || undefined,
    state: searchParams.get('state') || undefined,
    city: searchParams.get('city') || undefined,
    product: searchParams.get('product') || undefined,
  };
}

export async function GET(request: Request) {
  try {
    await requireAdminRequest(request);
    const { adminDb } = getFirebaseAdmin();
    const filters = readFilters(request);
    const snapshot = await adminDb.collection(VISITOR_ANALYTICS_COLLECTION).orderBy('createdAt', 'desc').get();
    const allEvents = snapshot.docs.map((doc) => normalizeVisitorAnalyticsEvent(doc.id, doc.data()));
    const displaySafeEvents = allEvents.filter((event) => !shouldExcludeEventFromDisplay(event));
    const filteredEvents = filterVisitorAnalyticsEvents(displaySafeEvents, filters);

    const countries = Array.from(new Set(displaySafeEvents.map((event) => event.country).filter(Boolean))).sort();
    const states = Array.from(new Set(displaySafeEvents.map((event) => event.state).filter(Boolean))).sort();
    const cities = Array.from(new Set(displaySafeEvents.map((event) => event.city).filter(Boolean))).sort();
    const products = Array.from(
      new Set(displaySafeEvents.map((event) => event.productName || event.productId).filter(Boolean)),
    ).sort();

    return NextResponse.json({
      filters,
      summary: buildVisitorAnalyticsSummary(filteredEvents),
      groups: buildVisitorAnalyticsGroups(filteredEvents),
      filterOptions: { countries, states, cities, products },
      events: filteredEvents.map((event) => ({
        ...event,
        createdAt: event.createdAt.toISOString(),
      })),
      totals: {
        storedEvents: allEvents.length,
        displayableEvents: displaySafeEvents.length,
        filteredEvents: filteredEvents.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load location analytics.' },
      { status: 500 },
    );
  }
}
