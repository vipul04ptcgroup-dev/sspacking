import type { Product } from '@/types';
import { slugify } from '@/lib/utils';

export const PUBLIC_PRODUCT_CATEGORY_OTHER_VALUE = '__other__';

export const PUBLIC_PRODUCT_CATEGORY_OPTIONS = [
  { slug: 'cosmetic-bottles', name: 'Cosmetic Bottles' },
  { slug: 'pet-jars', name: 'PET Jars' },
  { slug: 'hdpe-containers', name: 'HDPE Containers' },
  { slug: 'pumps-sprayers', name: 'Pumps & Sprayers' },
  { slug: 'caps-closures', name: 'Caps & Closures' },
  { slug: 'custom-packaging', name: 'Custom Packaging' },
  { slug: 'lotion-bottles', name: 'Lotion Bottles' },
  { slug: 'dropper-bottles', name: 'Dropper Bottles' },
  { slug: 'amber-bottles', name: 'Amber Bottles' },
  { slug: 'trigger-spray-bottles', name: 'Trigger Spray Bottles' },
  { slug: 'foaming-pump-bottles', name: 'Foaming Pump Bottles' },
] as const;

export function normalizePublicCategoryName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizePublicCategorySlug(value: string): string {
  return slugify(normalizePublicCategoryName(value));
}

export function findPublicCategoryOptionByName(value: string) {
  const normalizedValue = normalizePublicCategoryName(value).toLowerCase();
  return PUBLIC_PRODUCT_CATEGORY_OPTIONS.find(
    (option) => option.name.toLowerCase() === normalizedValue || option.slug === normalizePublicCategorySlug(value),
  );
}

export function resolveProductPublicCategory(product: Pick<Product, 'publicCategoryName' | 'publicCategorySlug' | 'categoryId'>) {
  const fallbackName = normalizePublicCategoryName(product.categoryId || 'Products') || 'Products';
  const name = normalizePublicCategoryName(product.publicCategoryName || fallbackName) || fallbackName;
  const slug = normalizePublicCategorySlug(product.publicCategorySlug || name || fallbackName);

  return {
    name,
    slug,
  };
}
