import type { Metadata } from 'next';

export const SITE_NAME = 'SS Packaging';
export const SITE_DESCRIPTION =
  "India's trusted source for bamboo, glass, plastic, and eco-friendly packaging products.";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://sspackaging.in';

function trimSlash(path: string): string {
  if (!path) return '/';
  if (path === '/') return '/';
  return path.endsWith('/') ? path.slice(0, -1) : path;
}

export function absoluteUrl(path = '/'): string {
  const normalizedPath = trimSlash(path);
  return normalizedPath === '/' ? SITE_URL : `${SITE_URL}${normalizedPath}`;
}

export function prettifySlug(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

type BuildSeoInput = {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
};

export function buildMetadata({
  title,
  description,
  path = '/',
  keywords,
  noIndex = false,
}: BuildSeoInput): Metadata {
  const url = absoluteUrl(path);

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: SITE_NAME,
      description,
      url,
      siteName: SITE_NAME,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: noIndex
      ? { index: false, follow: false, nocache: true }
      : { index: true, follow: true },
  };
}
