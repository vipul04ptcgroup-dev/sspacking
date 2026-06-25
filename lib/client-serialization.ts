import type { Category, Product } from '@/types';

export type ClientProduct = Omit<Product, 'createdAt' | 'updatedAt' | 'lastStockUpdatedAt'> & {
  createdAt: string;
  updatedAt: string;
  lastStockUpdatedAt: string | null;
};

export type ClientCategory = Category;

function toIsoString(value: Date | null | undefined): string | null {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  return value.toISOString();
}

export function serializeProductForClient(product: Product): ClientProduct {
  return {
    ...product,
    createdAt: toIsoString(product.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIsoString(product.updatedAt) ?? new Date(0).toISOString(),
    lastStockUpdatedAt: toIsoString(product.lastStockUpdatedAt),
  };
}

export function serializeProductsForClient(products: Product[]): ClientProduct[] {
  return products.map(serializeProductForClient);
}

export function serializeCategoryForClient(category: Category): ClientCategory {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.image,
    order: category.order,
    active: category.active,
  };
}

export function serializeCategoriesForClient(categories: Category[]): ClientCategory[] {
  return categories.map(serializeCategoryForClient);
}
