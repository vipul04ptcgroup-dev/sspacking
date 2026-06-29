import { getCategories, getProducts, getPublishedBlogPosts } from '@/lib/firestore';
import { SITE_URL } from '@/lib/seo';

export type SitemapEntry = {
  url: string;
  path: string;
  lastModified: Date;
  changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: number;
};

const publicStaticRoutes: Array<Omit<SitemapEntry, 'url' | 'lastModified'>> = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/categories', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/products', changeFrequency: 'weekly', priority: 0.95 },
  { path: '/blogs', changeFrequency: 'weekly', priority: 0.8 },
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
  return path === '/' ? SITE_URL : `${SITE_URL}${path}`;
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
    const [categories, products, blogs] = await Promise.all([getCategories(), getProducts(), getPublishedBlogPosts()]);

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
      .filter(p => Boolean(p?.slug) && Boolean(p?.publicCategorySlug))
      .map(p => {
        const path = `/products/${safeSegment(p.publicCategorySlug)}/${safeSegment(p.slug)}`;
        return {
          path,
          url: toAbsolute(path),
          lastModified: p.updatedAt || p.createdAt || now,
          changeFrequency: 'weekly',
          priority: 0.8,
        };
      });

    const blogEntries: SitemapEntry[] = blogs
      .filter((blog) => Boolean(blog?.slug))
      .map((blog) => {
        const path = `/blogs/${safeSegment(blog.slug)}`;
        return {
          path,
          url: toAbsolute(path),
          lastModified: blog.updatedAt || blog.publishedAt || blog.createdAt || now,
          changeFrequency: 'monthly',
          priority: blog.featured ? 0.78 : 0.72,
        } satisfies SitemapEntry;
      });

    const deduped = new Map<string, SitemapEntry>();
    [...staticEntries, ...categoryEntries, ...productEntries, ...blogEntries].forEach(entry => {
      deduped.set(entry.url, entry);
    });

    return Array.from(deduped.values());
  } catch {
    return staticEntries;
  }
}
