import { buildAbsoluteUrl, buildSchemaId, normalizeImages, toPlainText } from './organizationSchema';

export function buildArticleSchema({
  path,
  headline,
  description,
  image,
  datePublished,
  dateModified,
  authorName = 'SS Packaging',
}) {
  if (!headline || !path) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': buildSchemaId(path, 'article'),
    headline: toPlainText(headline),
    description: toPlainText(description),
    image: normalizeImages(Array.isArray(image) ? image : [image]),
    datePublished,
    dateModified: dateModified || datePublished,
    mainEntityOfPage: {
      '@id': buildSchemaId(path, 'webpage'),
    },
    author: {
      '@type': 'Organization',
      name: authorName,
    },
    publisher: {
      '@id': buildSchemaId('/', 'organization'),
    },
    url: buildAbsoluteUrl(path),
  };
}
