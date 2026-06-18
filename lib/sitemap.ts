import { getCategories, getProducts } from '@/lib/firestore';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://sspackaging.in';

export type SitemapEntry = {
  url: string;
  path: string;
  lastModified: Date;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: number;
};

const publicStaticRoutes: Array<Omit<SitemapEntry, 'url' | 'lastModified'>> = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/products', changeFrequency: 'weekly', priority: 0.95 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/shipping', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/cart', changeFrequency: 'weekly', priority: 0.5 },
  { path: '/checkout', changeFrequency: 'weekly', priority: 0.5 },
  { path: '/auth/login', changeFrequency: 'monthly', priority: 0.3 },
  { path: '/auth/register', changeFrequency: 'monthly', priority: 0.3 },
];

function toAbsolute(path: string): string {
  return path === '/' ? siteUrl : `${siteUrl}${path}`;
}

function safeSegment(value: string): string {
  return encodeURIComponent((value || '').trim());
}

export async function getAllSitemapEntries(): Promise<SitemapEntry[]> {
  const now = new Date();
  const staticEntries: SitemapEntry[] = publicStaticRoutes.map(route => ({
    ...route,
    url: toAbsolute(route.path),
    lastModified: now,
  }));

  try {
    const [categories, products] = await Promise.all([getCategories(), getProducts()]);

    const categoryEntries: SitemapEntry[] = categories
      .filter(c => Boolean(c?.slug))
      .map(c => ({
        path: `/products/${safeSegment(c.slug)}`,
        url: toAbsolute(`/products/${safeSegment(c.slug)}`),
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.85,
      }));

    const productEntries: SitemapEntry[] = products
      .filter(p => Boolean(p?.slug) && Boolean(p?.categoryId))
      .map(p => {
        const path = `/products/${safeSegment(p.categoryId)}/${safeSegment(p.slug)}`;
        return {
          path,
          url: toAbsolute(path),
          lastModified: p.updatedAt || p.createdAt || now,
          changeFrequency: 'weekly',
          priority: 0.8,
        };
      });

    const deduped = new Map<string, SitemapEntry>();
    [...staticEntries, ...categoryEntries, ...productEntries].forEach(entry => {
      deduped.set(entry.url, entry);
    });

    return Array.from(deduped.values());
  } catch {
    return staticEntries;
  }
}
