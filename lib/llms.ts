import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, prettifySlug } from '@/lib/seo';
import { getAllSitemapEntries, type SitemapEntry } from '@/lib/sitemap';

type LlmLinkSection = {
  title: string;
  links: SitemapEntry[];
};

function labelFromPath(path: string): string {
  if (path === '/') return 'Home';
  if (path === '/products') return 'Products';
  if (path === '/blogs') return 'Blogs';
  if (path === '/categories') return 'Categories';
  if (path === '/about') return 'About';
  if (path === '/contact') return 'Contact';
  if (path === '/privacy') return 'Privacy Policy';
  if (path === '/terms') return 'Terms & Conditions';
  if (path === '/shipping') return 'Shipping Policy';
  if (path === '/cart') return 'Cart';
  if (path === '/checkout') return 'Checkout';
  if (path === '/auth/login') return 'Login';
  if (path === '/auth/register') return 'Register';

  const segments = path.split('/').filter(Boolean);
  const lastSegment = segments[segments.length - 1] || '';
  return prettifySlug(decodeURIComponent(lastSegment));
}

function descriptionFromPath(path: string): string {
  if (path === '/') return 'Main storefront landing page for SS Packaging.';
  if (path === '/products') return 'Browse all published packaging products.';
  if (path === '/blogs') return 'Browse all published blog articles.';
  if (path === '/categories') return 'Browse the public category directory.';
  if (path.startsWith('/products/') && path.split('/').filter(Boolean).length === 2) {
    return 'Public product category listing page.';
  }
  if (path.startsWith('/products/') && path.split('/').filter(Boolean).length >= 3) {
    return 'Public product detail page.';
  }
  if (path.startsWith('/blogs/') && path.split('/').filter(Boolean).length >= 2) {
    return 'Public blog detail page.';
  }
  if (path === '/about') return 'Company overview and brand information.';
  if (path === '/contact') return 'Contact details and quote request page.';
  if (path === '/privacy') return 'Privacy policy.';
  if (path === '/terms') return 'Terms and conditions.';
  if (path === '/shipping') return 'Shipping policy.';
  if (path === '/cart') return 'Customer cart page.';
  if (path === '/checkout') return 'Customer checkout page.';
  if (path === '/auth/login') return 'Customer login page.';
  if (path === '/auth/register') return 'Customer registration page.';
  return 'Public site page.';
}

function buildSections(entries: SitemapEntry[]): LlmLinkSection[] {
  const mainPages = entries.filter((entry) =>
    ['/', '/products', '/blogs', '/categories', '/about', '/contact'].includes(entry.path),
  );
  const productCategories = entries.filter((entry) =>
    entry.path.startsWith('/products/') && entry.path.split('/').filter(Boolean).length === 2,
  );
  const products = entries.filter((entry) =>
    entry.path.startsWith('/products/') && entry.path.split('/').filter(Boolean).length >= 3,
  );
  const blogs = entries.filter((entry) =>
    entry.path.startsWith('/blogs/') && entry.path !== '/blogs',
  );
  const policies = entries.filter((entry) =>
    ['/privacy', '/terms', '/shipping'].includes(entry.path),
  );
  const account = entries.filter((entry) =>
    ['/cart', '/checkout', '/auth/login', '/auth/register'].includes(entry.path),
  );

  return [
    { title: 'Main Pages', links: mainPages },
    { title: 'Product Categories', links: productCategories },
    { title: 'Products', links: products },
    { title: 'Blogs', links: blogs },
    { title: 'Policies', links: policies },
    { title: 'Account & Commerce', links: account },
  ].filter((section) => section.links.length > 0);
}

export async function buildLlmsTxt(): Promise<string> {
  const entries = await getAllSitemapEntries();
  const sections = buildSections(entries);

  const lines: string[] = [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    `Base URL: ${SITE_URL}`,
    `Source of truth: ${SITE_URL}/sitemap.xml`,
    '',
    'This file is generated from the same route source used for the XML sitemap so it stays automatically in sync with published public pages.',
    '',
  ];

  sections.forEach((section) => {
    lines.push(`## ${section.title}`);
    lines.push('');
    section.links.forEach((entry) => {
      lines.push(`- [${labelFromPath(entry.path)}](${entry.url}): ${descriptionFromPath(entry.path)}`);
    });
    lines.push('');
  });

  return lines.join('\n').trim() + '\n';
}
