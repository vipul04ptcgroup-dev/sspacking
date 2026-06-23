import {
  SITE_NAME,
  buildAbsoluteUrl,
  buildSchemaId,
  dedupeStrings,
  normalizeImages,
  toPlainText,
} from './organizationSchema';

const AVAILABILITY_MAP = {
  in_stock: 'https://schema.org/InStock',
  low_stock: 'https://schema.org/LimitedAvailability',
  out_of_stock: 'https://schema.org/OutOfStock',
};

export function buildProductSchema({ path, product, category, aggregateRating }) {
  if (!product) return null;

  const url = buildAbsoluteUrl(path);
  const images = normalizeImages(product.images || []);
  const pricingTiers = Array.isArray(product.pricingTiers) ? product.pricingTiers : [];
  const prices = pricingTiers
    .map((tier) => Number(tier?.unitPrice))
    .filter((price) => Number.isFinite(price));
  const lowPrice = prices.length > 0 ? Math.min(...prices) : null;
  const highPrice = prices.length > 0 ? Math.max(...prices) : null;
  const description = toPlainText(product.shortDescription || product.description);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': buildSchemaId(path, 'product'),
    url,
    name: product.name,
    description,
    image: images,
    sku: product.sku || undefined,
    category: category?.name || product.categoryId || undefined,
    keywords: dedupeStrings([
      ...(product.tags || []),
      product.material,
      product.color,
      product.capacity,
      category?.name,
    ]).join(', ') || undefined,
    brand: {
      '@type': 'Brand',
      name: SITE_NAME,
    },
    manufacturer: {
      '@id': buildSchemaId('/', 'organization'),
    },
    itemCondition: 'https://schema.org/NewCondition',
    offers:
      lowPrice != null
        ? prices.length > 1
          ? {
              '@type': 'AggregateOffer',
              url,
              priceCurrency: 'INR',
              lowPrice,
              highPrice,
              offerCount: prices.length,
              availability:
                AVAILABILITY_MAP[product.stockStatus] || 'https://schema.org/InStock',
              seller: {
                '@id': buildSchemaId('/', 'organization'),
              },
            }
          : {
              '@type': 'Offer',
              url,
              priceCurrency: 'INR',
              price: lowPrice,
              availability:
                AVAILABILITY_MAP[product.stockStatus] || 'https://schema.org/InStock',
              seller: {
                '@id': buildSchemaId('/', 'organization'),
              },
            }
        : undefined,
  };

  if (aggregateRating?.ratingValue && aggregateRating?.reviewCount) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: aggregateRating.ratingValue,
      reviewCount: aggregateRating.reviewCount,
    };
  }

  return schema;
}
