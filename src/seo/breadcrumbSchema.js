import { buildAbsoluteUrl, buildSchemaId, isNonEmptyString } from './organizationSchema';

export function buildBreadcrumbSchema(items = []) {
  const normalizedItems = items
    .filter((item) => item && isNonEmptyString(item.name) && isNonEmptyString(item.path))
    .map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name.trim(),
      item: buildAbsoluteUrl(item.path),
    }));

  if (normalizedItems.length === 0) return null;

  const lastItem = normalizedItems[normalizedItems.length - 1];

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': buildSchemaId(lastItem.item, 'breadcrumb'),
    itemListElement: normalizedItems,
  };
}
