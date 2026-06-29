import { getFirebaseAdmin } from '@/lib/firebase-admin';
import {
  VISITOR_ANALYTICS_COLLECTION,
  buildVisitorAnalyticsCsv,
  normalizeVisitorAnalyticsEvent,
} from '@/lib/location-analytics';
import { requireAdminRequest } from '@/lib/request-auth';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  await requireAdminRequest(request);

  const { adminDb } = getFirebaseAdmin();
  const snapshot = await adminDb.collection(VISITOR_ANALYTICS_COLLECTION).orderBy('createdAt', 'desc').get();
  const events = snapshot.docs.map((doc) => normalizeVisitorAnalyticsEvent(doc.id, doc.data()));
  const csv = buildVisitorAnalyticsCsv(events);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="visitor-analytics-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
