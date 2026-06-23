import { SITE_NAME, SITE_URL, buildSchemaId } from './organizationSchema';

export function buildWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': buildSchemaId('/', 'website'),
    url: SITE_URL,
    name: SITE_NAME,
    publisher: {
      '@id': buildSchemaId('/', 'organization'),
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/products?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}
