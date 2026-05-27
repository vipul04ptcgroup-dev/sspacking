import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllSitemapEntries } from '@/lib/sitemap';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'HTML Sitemap',
  description: 'Browse all public pages, product categories, and product pages on SS Packaging.',
  path: '/sitemap.html',
});

function labelFromPath(path: string): string {
  if (path === '/') return 'Home';
  return path
    .replace(/^\//, '')
    .split('/')
    .map(part => decodeURIComponent(part))
    .map(part =>
      part
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    )
    .join(' / ');
}

export default async function HtmlSitemapPage() {
  const entries = await getAllSitemapEntries();

  const staticRoutes = entries.filter(e => !e.path.startsWith('/products/'));
  const productCategoryRoutes = entries.filter(
    e => e.path.startsWith('/products/') && e.path.split('/').filter(Boolean).length === 2
  );
  const productRoutes = entries.filter(
    e => e.path.startsWith('/products/') && e.path.split('/').filter(Boolean).length >= 3
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl sm:text-4xl font-black text-stone-900 mb-3">HTML Sitemap</h1>
      <p className="text-stone-500 mb-10">All public pages, categories, and product pages.</p>

      <div className="grid md:grid-cols-3 gap-8">
        <section>
          <h2 className="text-lg font-bold text-stone-900 mb-4">Public Pages</h2>
          <ul className="space-y-2">
            {staticRoutes.map(route => (
              <li key={route.path}>
                <Link href={route.path} className="text-stone-700 hover:text-amber-600">
                  {labelFromPath(route.path)}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900 mb-4">Categories</h2>
          <ul className="space-y-2">
            {productCategoryRoutes.map(route => (
              <li key={route.path}>
                <Link href={route.path} className="text-stone-700 hover:text-amber-600">
                  {labelFromPath(route.path)}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-stone-900 mb-4">Products</h2>
          <ul className="space-y-2 max-h-[60vh] overflow-auto pr-1">
            {productRoutes.map(route => (
              <li key={route.path}>
                <Link href={route.path} className="text-stone-700 hover:text-amber-600">
                  {labelFromPath(route.path)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

