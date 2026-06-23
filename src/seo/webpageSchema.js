import {
  buildAbsoluteUrl,
  buildSchemaId,
  dedupeStrings,
  toPlainText,
} from './organizationSchema';

export function buildWebPageSchema({
  path,
  name,
  description,
  keywords = [],
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': buildSchemaId(path, 'webpage'),
    url: buildAbsoluteUrl(path),
    name,
    description: toPlainText(description),
    keywords: dedupeStrings(keywords).join(', ') || undefined,
    isPartOf: {
      '@id': buildSchemaId('/', 'website'),
    },
    about: {
      '@id': buildSchemaId('/', 'organization'),
    },
  };
}
