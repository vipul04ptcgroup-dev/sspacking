const FALLBACK_SITE_URL = 'https://www.sspackaging.co.in';

export const SITE_NAME = 'SS Packaging';
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_SITE_URL).replace(/\/$/, '');
export const SITE_DESCRIPTION =
  'SS Packaging is a manufacturer and supplier of glass bottles, amber glass bottles, clear glass bottles, cosmetic packaging bottles, serum bottles, lotion bottles, acrylic bottles, pharmaceutical bottles, jars, dropper bottles and packaging solutions in India.';

export const SITE_KEYWORDS = [
  'Glass Bottle Manufacturer',
  'Amber Glass Bottle Manufacturer',
  'Clear Glass Bottle Supplier',
  'Cosmetic Packaging Manufacturer',
  'Pharmaceutical Packaging Manufacturer',
  'Serum Bottle Manufacturer',
  'Dropper Bottle Supplier',
  'Lotion Bottle Manufacturer',
  'Acrylic Bottle Manufacturer',
  'Plastic Bottle Supplier',
  'Cosmetic Jar Manufacturer',
  'Essential Oil Bottle Manufacturer',
  'Packaging Bottle Manufacturer India',
];

export const BUSINESS_DETAILS = {
  phone: '+91 91208 79879',
  email: 'ptcvirar@gmail.com',
  officeAddress:
    'Office no. 201-202, Hirubhai Residency Besides Vedant Hospital, Virar (West) - 401303 Maharashtra, India.',
  factoryAddress:
    'Unit no. 13, Pragati Compound, Dongri Pada Road, near Jain Mandir, Poman, Vasai Bhiwandi Road, Vasai East, Palghar - 401208',
  areaServed: 'IN',
  priceRange: '$$',
};

export function buildAbsoluteUrl(path = '/') {
  if (!path || path === '/') return SITE_URL;
  return path.startsWith('http') ? path : `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildSchemaId(path, suffix) {
  return `${buildAbsoluteUrl(path)}#${suffix}`;
}

export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function toPlainText(value) {
  if (!isNonEmptyString(value)) return '';
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function dedupeStrings(values) {
  return Array.from(
    new Set(
      values
        .filter(isNonEmptyString)
        .map((value) => value.trim()),
    ),
  );
}

export function normalizeImages(images = []) {
  return dedupeStrings(
    images
      .filter(Boolean)
      .map((image) => buildAbsoluteUrl(image)),
  );
}

export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': buildSchemaId('/', 'organization'),
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    email: BUSINESS_DETAILS.email,
    telephone: BUSINESS_DETAILS.phone,
    areaServed: BUSINESS_DETAILS.areaServed,
    keywords: SITE_KEYWORDS.join(', '),
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        telephone: BUSINESS_DETAILS.phone,
        email: BUSINESS_DETAILS.email,
        areaServed: BUSINESS_DETAILS.areaServed,
        availableLanguage: ['en', 'hi'],
      },
    ],
  };
}
