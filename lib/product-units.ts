import type { ProductUnit } from '@/types';

const PRODUCT_UNIT_BY_CATEGORY: Record<string, ProductUnit> = {
  'raw-material': 'kg',
  production: 'gram',
  finished: 'gram',
};

export const DEFAULT_PRODUCT_UNIT: ProductUnit = 'gram';

export function getProductUnitForCategory(categoryId: string): ProductUnit {
  const normalizedCategoryId = categoryId.trim().toLowerCase();
  return PRODUCT_UNIT_BY_CATEGORY[normalizedCategoryId] || DEFAULT_PRODUCT_UNIT;
}

export function getProductUnitLabel(unit: ProductUnit): string {
  return unit === 'kg' ? 'KG' : 'GRAM';
}

export function formatQuantityWithUnit(quantity: number | string, unit: ProductUnit): string {
  return `${quantity} ${getProductUnitLabel(unit)}`;
}

export function formatMeasurementValue(value: string, unit: ProductUnit): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) return '';
  return /[a-zA-Z]/.test(trimmedValue) ? trimmedValue : `${trimmedValue} ${getProductUnitLabel(unit)}`;
}
