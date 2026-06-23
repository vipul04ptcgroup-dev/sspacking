import {
  buildAbsoluteUrl,
  buildSchemaId,
  dedupeStrings,
  isNonEmptyString,
  normalizeImages,
  toPlainText,
} from './organizationSchema';

export function buildCollectionSchema({
  path,
  name,
  description,
  products = [],
}) {
  const url = buildAbsoluteUrl(path);
  const normalizedProducts = products.filter(Boolean);
  const itemListElement = normalizedProducts
    .filter((product) => isNonEmptyString(product.name) && isNonEmptyString(product.slug))
    .map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: buildAbsoluteUrl(`/products/${product.categoryId}/${product.slug}`),
      name: product.name,
      image: normalizeImages(product.images || [])[0],
    }));

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': buildSchemaId(path, 'collection-page'),
    url,
    name,
    description: toPlainText(description),
    isPartOf: {
      '@id': buildSchemaId('/', 'website'),
    },
    about: {
      '@id': buildSchemaId('/', 'organization'),
    },
    keywords: dedupeStrings(
      normalizedProducts.flatMap((product) => [product.categoryId, ...(product.tags || [])]),
    ).join(', ') || undefined,
    numberOfItems: normalizedProducts.length,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: normalizedProducts.length,
      itemListElement,
    },
  };
}
