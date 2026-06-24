import {
  BUSINESS_IMAGES,
  BUSINESS_DETAILS,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  buildSchemaId,
} from './organizationSchema';

export function buildLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': buildSchemaId('/', 'local-business'),
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    image: BUSINESS_IMAGES,
    email: BUSINESS_DETAILS.email,
    telephone: BUSINESS_DETAILS.phone,
    priceRange: BUSINESS_DETAILS.priceRange,
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS_DETAILS.officeAddress,
      addressLocality: 'Virar',
      addressRegion: 'Maharashtra',
      postalCode: '401303',
      addressCountry: 'IN',
    },
    areaServed: {
      '@type': 'Country',
      name: 'India',
    },
    department: [
      {
        '@type': 'Place',
        name: 'Factory',
        address: {
          '@type': 'PostalAddress',
          streetAddress: BUSINESS_DETAILS.factoryAddress,
          addressLocality: 'Palghar',
          addressRegion: 'Maharashtra',
          postalCode: '401208',
          addressCountry: 'IN',
        },
      },
    ],
    parentOrganization: {
      '@id': buildSchemaId('/', 'organization'),
    },
  };
}
