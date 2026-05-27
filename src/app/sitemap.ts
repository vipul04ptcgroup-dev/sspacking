import type { MetadataRoute } from 'next';
import { getAllSitemapEntries } from '@/lib/sitemap';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getAllSitemapEntries();
  return entries.map(entry => ({
    url: entry.url,
    lastModified: entry.lastModified,
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }));
}
