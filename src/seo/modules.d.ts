declare module '@/src/seo/schemaInjector' {
  import type { ReactNode } from 'react';

  export type StructuredData = Record<string, unknown>;

  export function SchemaInjector(props: {
    schemas?: Array<StructuredData | null | undefined>;
    children?: ReactNode;
  }): ReactNode;
}

declare module '@/src/seo/organizationSchema' {
  export const SITE_NAME: string;
  export const SITE_URL: string;
  export const SITE_DESCRIPTION: string;
  export const SITE_LOGO_PATH: string;
  export const SITE_BANNER_PATH: string;
  export const SITE_KEYWORDS: string[];
  export const BUSINESS_IMAGES: string[];
  export const BUSINESS_LOGO_URL: string;
  export const BUSINESS_DETAILS: {
    phone: string;
    email: string;
    officeAddress: string;
    factoryAddress: string;
    areaServed: string;
    priceRange: string;
  };
  export function buildAbsoluteUrl(path?: string): string;
  export function buildSchemaId(path: string, suffix: string): string;
  export function isNonEmptyString(value: unknown): boolean;
  export function toPlainText(value: unknown): string;
  export function dedupeStrings(values: string[]): string[];
  export function normalizeImages(images?: string[]): string[];
  export function buildOrganizationSchema(): Record<string, unknown>;
}

declare module '@/src/seo/websiteSchema' {
  export function buildWebsiteSchema(): Record<string, unknown>;
}

declare module '@/src/seo/localBusinessSchema' {
  export function buildLocalBusinessSchema(): Record<string, unknown>;
}

declare module '@/src/seo/webpageSchema' {
  export function buildWebPageSchema(input: {
    path: string;
    name: string;
    description: string;
    keywords?: string[];
  }): Record<string, unknown>;
}

declare module '@/src/seo/collectionSchema' {
  import type { Product } from '@/types';

  export function buildCollectionSchema(input: {
    path: string;
    name: string;
    description: string;
    products?: Product[];
  }): Record<string, unknown>;
}

declare module '@/src/seo/productSchema' {
  import type { Category, Product } from '@/types';

  export function buildProductSchema(input: {
    path: string;
    product: Product;
    category?: Category | null;
    aggregateRating?: {
      ratingValue: number;
      reviewCount: number;
    };
  }): Record<string, unknown> | null;
}

declare module '@/src/seo/breadcrumbSchema' {
  export function buildBreadcrumbSchema(items?: Array<{ name: string; path: string }>): Record<string, unknown> | null;
}

declare module '@/src/seo/faqSchema' {
  export function buildFaqSchema(input: {
    path: string;
    questions?: Array<{ question: string; answer: string }>;
  }): Record<string, unknown> | null;
}

declare module '@/src/seo/articleSchema' {
  export function buildArticleSchema(input: {
    path: string;
    headline: string;
    description: string;
    image?: string | string[];
    datePublished: string;
    dateModified?: string;
    authorName?: string;
  }): Record<string, unknown> | null;
}
