export const CORE_PRODUCT_CATEGORIES = [
  { slug: 'raw-material', name: 'Raw Material' },
  { slug: 'production', name: 'Production' },
  { slug: 'finished', name: 'Finished' },
] as const;

export type CoreProductCategorySlug = (typeof CORE_PRODUCT_CATEGORIES)[number]['slug'];

export const CORE_PRODUCT_CATEGORY_SLUGS = new Set<CoreProductCategorySlug>(
  CORE_PRODUCT_CATEGORIES.map((category) => category.slug),
);

export const PRODUCTION_CATEGORY_SLUG: CoreProductCategorySlug = 'production';

export function normalizeCategorySlug(value: string): string {
  return value.trim().toLowerCase();
}

export function isCoreProductCategorySlug(value: string): value is CoreProductCategorySlug {
  return CORE_PRODUCT_CATEGORY_SLUGS.has(normalizeCategorySlug(value) as CoreProductCategorySlug);
}

export function isProductionProductCategorySlug(value: string): boolean {
  return normalizeCategorySlug(value) === PRODUCTION_CATEGORY_SLUG;
}

export function isPurchaseProductCategorySlug(value: string): boolean {
  const normalizedValue = normalizeCategorySlug(value);
  return normalizedValue === 'finished' || normalizedValue === 'raw-material';
}
