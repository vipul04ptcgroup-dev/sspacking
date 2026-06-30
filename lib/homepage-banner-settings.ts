import 'server-only';

import type { HomepageBannerSettings } from '@/types';
import { DEFAULT_HOMEPAGE_BANNERS, HOMEPAGE_BANNER_SETTINGS_ID } from '@/lib/homepage-banner-constants';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

function sanitizeBannerPath(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export async function getHomepageBannerSettingsServer(): Promise<HomepageBannerSettings> {
  try {
    const { adminDb } = getFirebaseAdmin();
    const snap = await adminDb.collection('siteSettings').doc(HOMEPAGE_BANNER_SETTINGS_ID).get();
    const data = snap.data() || {};

    return {
      id: snap.id || HOMEPAGE_BANNER_SETTINGS_ID,
      desktopBanner: sanitizeBannerPath(data.desktopBanner) || DEFAULT_HOMEPAGE_BANNERS.desktopBanner,
      mobileBanner: sanitizeBannerPath(data.mobileBanner) || DEFAULT_HOMEPAGE_BANNERS.mobileBanner,
      updatedAt: data.updatedAt?.toDate?.() ?? null,
    };
  } catch {
    return {
      id: HOMEPAGE_BANNER_SETTINGS_ID,
      desktopBanner: DEFAULT_HOMEPAGE_BANNERS.desktopBanner,
      mobileBanner: DEFAULT_HOMEPAGE_BANNERS.mobileBanner,
      updatedAt: null,
    };
  }
}
