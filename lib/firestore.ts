import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, runTransaction, writeBatch, deleteField,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  CORE_PRODUCT_CATEGORY_SLUGS,
  PRODUCTION_CATEGORY_SLUG,
  isCoreProductCategorySlug,
  isProductionProductCategorySlug,
  normalizeCategorySlug,
} from './product-categories';
import { normalizePublicCategoryName, normalizePublicCategorySlug, resolveProductPublicCategory } from './public-product-categories';
import { getProductUnitForCategory } from './product-units';
import { slugify } from './utils';
import type {
  Address,
  BlogInternalLink,
  BlogPost,
  Product,
  Category,
  Order,
  OrderItem,
  AdminActivityLog,
  InventoryTransaction,
  InventoryTransactionSource,
  TeamAccessLog,
  TeamMember,
  User,
  QuoteRequest,
  OrderStatus,
  DeliveryChallan,
  DeliveryChallanStatus,
  CustomerListOptions,
  CustomerListResult,
  CustomerType,
  CustomerTypeFilter,
  CustomerSortField,
  Supplier,
  Purchase,
  PurchaseItem,
  StockTransaction,
} from '@/types';

const DEFAULT_INITIAL_STOCK_QUANTITY = 1;
const DEFAULT_LOW_STOCK_LIMIT = 1000;

type AdminActivityActor = {
  uid?: string;
  email?: string;
  name?: string;
};

type AdminActivityMetadata = Record<string, string | number | boolean | null>;

type ProductionConsumptionItemInput = {
  productId: string;
  productName: string;
  quantityKg: number;
};

type SaveProductionEntryInput = {
  productionDate: string;
  productId: string;
  quantityProducedBottles: number;
  notes?: string;
  rawMaterials: ProductionConsumptionItemInput[];
};

type CustomerSyncInput = {
  uid?: string;
  email?: string;
  phone?: string;
  displayName?: string;
  address?: Address;
  customerType: CustomerType;
};

type AdminActivityInput = {
  action: AdminActivityLog['action'];
  entity: AdminActivityLog['entity'];
  entityId: string;
  entityLabel: string;
  message: string;
  actor?: string | AdminActivityActor;
  metadata?: AdminActivityMetadata;
};

function resolveAdminActor(actor?: string | AdminActivityActor) {
  if (typeof actor === 'string') {
    const value = actor.trim();
    const looksLikeEmail = value.includes('@');
    return {
      actorId: looksLikeEmail ? '' : value,
      actorEmail: looksLikeEmail ? value : '',
      actorName: '',
    };
  }

  return {
    actorId: actor?.uid?.trim() || '',
    actorEmail: actor?.email?.trim() || '',
    actorName: actor?.name?.trim() || '',
  };
}

function sanitizeStockValue(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, value);
}

function sanitizeLowStockLimit(value: unknown, fallback = DEFAULT_LOW_STOCK_LIMIT): number {
  return Math.max(DEFAULT_LOW_STOCK_LIMIT, sanitizeStockValue(value, fallback));
}

function sanitizeOptionalText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeLongText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : '';
}

function sanitizePricingValue(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, value);
}

function sanitizeBottleWeightGram(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim();
    if (!normalizedValue) return null;

    const numericMatch = normalizedValue.match(/(\d+(?:\.\d+)?)/);
    if (!numericMatch) return null;

    const parsedValue = Number(numericMatch[1]);
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) return null;
    return Math.round(parsedValue);
  }

  return null;
}

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizePhone(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\D/g, '') : '';
}

function normalizeCustomerType(value: unknown): CustomerType {
  return value === 'manual' ? 'manual' : 'website';
}

function mergeAddresses(existing: unknown, incoming?: Address): Address[] {
  const current = Array.isArray(existing) ? (existing as Address[]) : [];
  if (!incoming) return current;

  const normalizedIncomingKey = JSON.stringify({
    fullName: incoming.fullName.trim(),
    phone: normalizePhone(incoming.phone),
    addressLine1: incoming.addressLine1.trim(),
    addressLine2: incoming.addressLine2?.trim() || '',
    city: incoming.city.trim(),
    state: incoming.state.trim(),
    pincode: incoming.pincode.trim(),
    country: incoming.country.trim(),
  });

  const alreadyExists = current.some((address) => JSON.stringify({
    fullName: address.fullName?.trim?.() || '',
    phone: normalizePhone(address.phone),
    addressLine1: address.addressLine1?.trim?.() || '',
    addressLine2: address.addressLine2?.trim?.() || '',
    city: address.city?.trim?.() || '',
    state: address.state?.trim?.() || '',
    pincode: address.pincode?.trim?.() || '',
    country: address.country?.trim?.() || '',
  }) === normalizedIncomingKey);

  return alreadyExists ? current : [...current, incoming];
}

export function calculateStockStatus(stockQuantity: number, lowStockLimit: number): Product['stockStatus'] {
  if (stockQuantity <= 0) return 'out_of_stock';
  if (stockQuantity < lowStockLimit) return 'low_stock';
  return 'in_stock';
}

const PRODUCTION_BOTTLE_WEIGHT_BY_NAME: Record<string, number> = {
  'rose water bottle': 250,
  'shampoo bottle': 500,
  'oil bottle': 1000,
};

function inferProductionBottleWeightGram(data: Record<string, unknown>): number | null {
  const explicitBottleWeight = sanitizeBottleWeightGram(data.bottle_weight_gram);
  if (explicitBottleWeight != null) return explicitBottleWeight;

  const legacyWeight = sanitizeBottleWeightGram(data.weight);
  if (legacyWeight != null) return legacyWeight;

  const legacyCapacity = sanitizeBottleWeightGram(data.capacity);
  if (legacyCapacity != null) return legacyCapacity;

  const normalizedName = sanitizeOptionalText(data.name).toLowerCase();
  return PRODUCTION_BOTTLE_WEIGHT_BY_NAME[normalizedName] ?? null;
}

function resolveProductBottleWeightGram(categoryId: string, value: unknown): number | null {
  if (!isProductionProductCategorySlug(categoryId)) return null;
  return sanitizeBottleWeightGram(value);
}

function assertValidProductBottleWeight(categoryId: string, bottleWeightGram: number | null) {
  if (isProductionProductCategorySlug(categoryId) && bottleWeightGram == null) {
    throw new Error('Bottle weight is required for production products.');
  }
}

function resolveProductStockFields(data: Partial<Product>, fallback?: Partial<Product>) {
  const stockQuantity = sanitizeStockValue(
    data.stockQuantity ?? fallback?.stockQuantity,
    DEFAULT_INITIAL_STOCK_QUANTITY,
  );
  const lowStockLimit = sanitizeLowStockLimit(
    data.lowStockLimit ?? fallback?.lowStockLimit,
    DEFAULT_LOW_STOCK_LIMIT,
  );

  return {
    stockQuantity,
    lowStockLimit,
    stockStatus: calculateStockStatus(stockQuantity, lowStockLimit),
  };
}

function normalizePricingTiers(data: Record<string, unknown>, legacyPrice?: number | null): Product['pricingTiers'] {
  const rawPricingTiers = Array.isArray(data.pricingTiers) ? data.pricingTiers : [];

  const normalizedPricingTiers = rawPricingTiers
    .map((tier): Product['pricingTiers'][number] | null => {
      const record = tier as Record<string, unknown>;
      const unitPrice = sanitizePricingValue(record.unitPrice);
      if (unitPrice == null) return null;

      const minQty = Math.max(1, Math.floor(sanitizeStockValue(record.minQty, 1)));
      const rawMaxQty = record.maxQty;
      if (typeof rawMaxQty !== 'number' || !Number.isFinite(rawMaxQty)) return null;
      const maxQty = Math.max(minQty, Math.floor(rawMaxQty));

      return {
        minQty,
        maxQty,
        unitPrice,
      };
    })
    .filter((tier): tier is Product['pricingTiers'][number] => tier !== null)
    .sort((left, right) => left.minQty - right.minQty)
    .filter((tier, index, tiers) => index === 0 || tier.minQty > tiers[index - 1].maxQty);

  if (normalizedPricingTiers.length > 0) {
    return normalizedPricingTiers;
  }

  if (legacyPrice != null) {
    return [{ minQty: 1, maxQty: 1, unitPrice: legacyPrice }];
  }

  return [];
}

function assertValidPricingTiers(pricingTiers: Product['pricingTiers']) {
  if (pricingTiers.length === 0) {
    throw new Error('At least one pricing tier is required.');
  }

  const sortedPricingTiers = [...pricingTiers].sort((left, right) => left.minQty - right.minQty);

  sortedPricingTiers.forEach((tier) => {
    if (!Number.isFinite(tier.minQty) || tier.minQty < 1) {
      throw new Error('Each pricing tier must have a valid minimum quantity.');
    }
    if (!Number.isFinite(tier.maxQty) || tier.maxQty < tier.minQty) {
      throw new Error('Each pricing tier must have a valid maximum quantity.');
    }
    if (!Number.isFinite(tier.unitPrice) || tier.unitPrice < 0) {
      throw new Error('Each pricing tier must have a valid unit price.');
    }
  });

  for (let index = 1; index < sortedPricingTiers.length; index += 1) {
    if (sortedPricingTiers[index].minQty <= sortedPricingTiers[index - 1].maxQty) {
      throw new Error('Pricing tier ranges cannot overlap.');
    }
  }
}

function getProductLabel(product: Pick<Product, 'capacity' | 'color'>): string {
  return [product.capacity, product.color].filter(Boolean).join(' / ');
}

function sanitizeProductWriteData(data: Partial<Product>) {
  const sanitizedCategoryId = typeof data.categoryId === 'string' ? sanitizeOptionalText(data.categoryId) : '';
  const sanitizedPublicCategoryName = typeof data.publicCategoryName === 'string'
    ? normalizePublicCategoryName(data.publicCategoryName)
    : '';
  const sanitizedPublicCategorySlug = typeof data.publicCategorySlug === 'string'
    ? normalizePublicCategorySlug(data.publicCategorySlug)
    : '';
  const resolvedUnit = sanitizedCategoryId ? getProductUnitForCategory(sanitizedCategoryId) : undefined;
  const bottleWeightGram = sanitizeBottleWeightGram(data.bottle_weight_gram);

  return {
    ...(typeof data.name === 'string' ? { name: sanitizeOptionalText(data.name) } : {}),
    ...(typeof data.slug === 'string' ? { slug: sanitizeOptionalText(data.slug) } : {}),
    ...(sanitizedCategoryId ? { categoryId: sanitizedCategoryId, category: sanitizedCategoryId } : {}),
    ...(sanitizedPublicCategoryName
      ? {
          publicCategoryName: sanitizedPublicCategoryName,
          publicCategorySlug: sanitizedPublicCategorySlug || normalizePublicCategorySlug(sanitizedPublicCategoryName),
        }
      : {}),
    ...(resolvedUnit ? { unit: resolvedUnit } : {}),
    ...(typeof data.shortDescription === 'string' ? { shortDescription: sanitizeOptionalText(data.shortDescription) } : {}),
    ...(typeof data.description === 'string' ? { description: sanitizeOptionalText(data.description) } : {}),
    ...(Array.isArray(data.images) ? { images: data.images.filter((image) => typeof image === 'string' && image.trim().length > 0).map((image) => image.trim()) } : {}),
    ...(Array.isArray(data.tags) ? { tags: data.tags.filter((tag) => typeof tag === 'string' && tag.trim().length > 0).map((tag) => tag.trim()) } : {}),
    ...(typeof data.sku === 'string' ? { sku: sanitizeOptionalText(data.sku) } : {}),
    ...(typeof data.capacity === 'string' ? { capacity: sanitizeOptionalText(data.capacity) } : {}),
    ...(typeof data.neckSize === 'string' ? { neckSize: sanitizeOptionalText(data.neckSize) } : {}),
    ...(typeof data.height === 'string' ? { height: sanitizeOptionalText(data.height) } : {}),
    ...(typeof data.weight === 'string' ? { weight: sanitizeOptionalText(data.weight) } : {}),
    ...(typeof data.material === 'string' ? { material: sanitizeOptionalText(data.material) } : {}),
    ...(typeof data.packagingSize === 'string' ? { packagingSize: sanitizeOptionalText(data.packagingSize) } : {}),
    ...(typeof data.color === 'string' ? { color: sanitizeOptionalText(data.color) } : {}),
    ...(typeof data.remark === 'string' ? { remark: sanitizeOptionalText(data.remark) } : {}),
    ...('bottle_weight_gram' in data && bottleWeightGram != null ? { bottle_weight_gram: bottleWeightGram } : {}),
    ...(Array.isArray(data.pricingTiers)
      ? {
          pricingTiers: data.pricingTiers
            .map((tier) => ({
              minQty: Math.max(1, Math.floor(sanitizeStockValue(tier.minQty, 1))),
              maxQty: Math.max(1, Math.floor(sanitizeStockValue(tier.maxQty, 1))),
              unitPrice: sanitizePricingValue(tier.unitPrice) ?? 0,
            }))
            .sort((left, right) => left.minQty - right.minQty),
        }
      : {}),
    ...(typeof data.featured === 'boolean' ? { featured: data.featured } : {}),
    ...(typeof data.active === 'boolean' ? { active: data.active } : {}),
  };
}

function normalizeProduct(id: string, data: Record<string, unknown>): Product {
  const legacyVariants = Array.isArray(data.variants) ? data.variants : [];
  const firstVariant = (legacyVariants[0] || {}) as Record<string, unknown>;
  const legacyPrice = sanitizePricingValue(firstVariant.price ?? data.price);
  const categoryId = sanitizeOptionalText(data.categoryId) || sanitizeOptionalText(data.category);
  const unit = getProductUnitForCategory(categoryId);
  const images = Array.isArray(data.images) ? (data.images as string[]).filter(Boolean) : [];
  const migratedVariantImages = Array.isArray(firstVariant.images) ? (firstVariant.images as string[]).filter(Boolean) : [];
  const pricingTiers = normalizePricingTiers(data, legacyPrice);
  const bottleWeightGram = resolveProductBottleWeightGram(categoryId, inferProductionBottleWeightGram(data));
  const publicCategoryName = normalizePublicCategoryName(
    sanitizeOptionalText(data.publicCategoryName) ||
    sanitizeOptionalText(data.publicCategory) ||
    categoryId,
  ) || categoryId;
  const publicCategorySlug = normalizePublicCategorySlug(
    sanitizeOptionalText(data.publicCategorySlug) || publicCategoryName || categoryId,
  );

  return {
    id,
    name: sanitizeOptionalText(data.name),
    slug: sanitizeOptionalText(data.slug),
    categoryId,
    publicCategoryName,
    publicCategorySlug,
    shortDescription: sanitizeOptionalText(data.shortDescription),
    description: sanitizeOptionalText(data.description) || sanitizeOptionalText(data.shortDescription),
    images: images.length > 0 ? images : migratedVariantImages,
    tags: Array.isArray(data.tags) ? (data.tags as string[]).filter(Boolean) : [],
    sku: sanitizeOptionalText(data.sku) || sanitizeOptionalText(firstVariant.sku),
    unit,
    stockQuantity: sanitizeStockValue(data.stockQuantity, DEFAULT_INITIAL_STOCK_QUANTITY),
    lowStockLimit: sanitizeLowStockLimit(data.lowStockLimit, DEFAULT_LOW_STOCK_LIMIT),
    featured: Boolean(data.featured),
    active: Boolean(data.active),
    capacity: sanitizeOptionalText(data.capacity) || sanitizeOptionalText(firstVariant.capacity ?? firstVariant.size),
    neckSize: sanitizeOptionalText(data.neckSize) || sanitizeOptionalText(firstVariant.neckSize),
    height: sanitizeOptionalText(data.height) || sanitizeOptionalText(firstVariant.height),
    weight: sanitizeOptionalText(data.weight) || sanitizeOptionalText(firstVariant.weight),
    material: sanitizeOptionalText(data.material) || sanitizeOptionalText(firstVariant.material),
    packagingSize: sanitizeOptionalText(data.packagingSize) || sanitizeOptionalText(firstVariant.packagingSize),
    color: sanitizeOptionalText(data.color) || sanitizeOptionalText(firstVariant.color),
    remark: sanitizeOptionalText(data.remark) || sanitizeOptionalText(firstVariant.remark),
    bottle_weight_gram: bottleWeightGram,
    pricingTiers,
    stockStatus: calculateStockStatus(
      sanitizeStockValue(data.stockQuantity, DEFAULT_INITIAL_STOCK_QUANTITY),
      sanitizeLowStockLimit(data.lowStockLimit, DEFAULT_LOW_STOCK_LIMIT),
    ),
    lastStockUpdatedAt: (data.lastStockUpdatedAt as any)?.toDate?.() ?? null,
    lastStockUpdatedBy: (data.lastStockUpdatedBy as string) || '',
    createdAt: (data.createdAt as any)?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as any)?.toDate?.() ?? new Date(),
  };
}

function toDateOrNow(value: unknown): Date {
  return (value as any)?.toDate?.() ?? new Date();
}

function toDateOrNull(value: unknown): Date | null {
  return (value as any)?.toDate?.() ?? null;
}

function normalizeDeliveryChallan(id: string, data: Record<string, unknown>): DeliveryChallan {
  return {
    id,
    challanNumber: (data.challanNumber as string) || '',
    orderId: (data.orderId as string) || '',
    orderSource: (data.orderSource as DeliveryChallan['orderSource']) || 'website_order',
    manualOrderId: (data.manualOrderId as string) || '',
    customerName: (data.customerName as string) || '',
    customerEmail: (data.customerEmail as string) || '',
    customerPhone: (data.customerPhone as string) || '',
    shippingAddress: data.shippingAddress as DeliveryChallan['shippingAddress'],
    billingAddress: data.billingAddress as DeliveryChallan['billingAddress'],
    products: Array.isArray(data.products) ? (data.products as DeliveryChallan['products']) : [],
    subtotal: typeof data.subtotal === 'number' ? data.subtotal : 0,
    discount: typeof data.discount === 'number' ? data.discount : 0,
    gst: typeof data.gst === 'number' ? data.gst : 0,
    totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : 0,
    remarks: (data.remarks as string) || '',
    transportDetails:
      data.transportDetails && typeof data.transportDetails === 'object'
        ? (data.transportDetails as DeliveryChallan['transportDetails'])
        : {},
    consignmentImages: Array.isArray(data.consignmentImages) ? (data.consignmentImages as string[]) : [],
    proofOfDeliveryImages: Array.isArray(data.proofOfDeliveryImages) ? (data.proofOfDeliveryImages as string[]) : [],
    receiverName: (data.receiverName as string) || '',
    receiverPhone: (data.receiverPhone as string) || '',
    deliveryRemarks: (data.deliveryRemarks as string) || '',
    status: (data.status as DeliveryChallanStatus) || 'draft',
    createdBy: (data.createdBy as string) || '',
    createdAt: toDateOrNow(data.createdAt),
    updatedAt: toDateOrNow(data.updatedAt),
    dispatchedAt: toDateOrNull(data.dispatchedAt),
    deliveredAt: toDateOrNull(data.deliveredAt),
  };
}

function normalizeOrder(id: string, data: Record<string, unknown>): Order {
  return {
    id,
    ...data,
    customerId: (data.customerId as string) || undefined,
    source: (data.source as Order['source']) || 'website_order',
    manualOrderId: (data.manualOrderId as string) || undefined,
    discount: typeof data.discount === 'number' ? data.discount : 0,
    gst: typeof data.gst === 'number' ? data.gst : 0,
    status: (data.status as OrderStatus) || 'pending',
    challanId: (data.challanId as string) || undefined,
    stockRestoredOnCancel: Boolean(data.stockRestoredOnCancel),
    cancellationNote: (data.cancellationNote as string) || '',
    createdAt: (data.createdAt as any)?.toDate?.() ?? new Date(),
    updatedAt: (data.updatedAt as any)?.toDate?.() ?? new Date(),
  } as Order;
}

function normalizeInventoryTransaction(id: string, data: Record<string, unknown>): InventoryTransaction {
  return {
    id,
    productId: (data.productId as string) || '',
    productName: (data.productName as string) || '',
    type: (data.type as InventoryTransaction['type']) || 'IN',
    source: (data.source as InventoryTransaction['source']) || 'ADMIN_STOCK_ADD',
    orderId: (data.orderId as string) || undefined,
    manualOrderId: (data.manualOrderId as string) || undefined,
    productionBatchId: (data.productionBatchId as string) || undefined,
    unit: (data.unit as Product['unit']) || getProductUnitForCategory((data.categoryId as string) || ''),
    quantity: sanitizeStockValue(data.quantity),
    previousStock: sanitizeStockValue(data.previousStock),
    newStock: sanitizeStockValue(data.newStock),
    note: (data.note as string) || '',
    createdAt: toDateOrNow(data.createdAt),
    createdBy: (data.createdBy as string) || '',
  };
}

function normalizeUser(id: string, data: Record<string, unknown>): User {
  const customerType = normalizeCustomerType(data.customerType ?? data.customer_type);
  return {
    id,
    uid: (data.uid as string) || undefined,
    email: (data.email as string) || '',
    displayName: (data.displayName as string) || '',
    phone: (data.phone as string) || '',
    role: (data.role as User['role']) || 'customer',
    customerType,
    customer_type: customerType,
    addresses: Array.isArray(data.addresses) ? (data.addresses as Address[]) : [],
    createdAt: toDateOrNow(data.createdAt),
  };
}

function compareCustomers(a: User, b: User, sortBy: CustomerSortField, sortDirection: 'asc' | 'desc'): number {
  const direction = sortDirection === 'asc' ? 1 : -1;

  if (sortBy === 'createdAt') {
    return (a.createdAt.getTime() - b.createdAt.getTime()) * direction;
  }

  if (sortBy === 'customerType') {
    return a.customerType.localeCompare(b.customerType) * direction;
  }

  const left = (sortBy === 'displayName' ? a.displayName || a.email : a.email).toLowerCase();
  const right = (sortBy === 'displayName' ? b.displayName || b.email : b.email).toLowerCase();
  return left.localeCompare(right) * direction;
}

function normalizeSupplier(id: string, data: Record<string, unknown>): Supplier {
  return {
    id,
    supplierName: (data.supplierName as string) || '',
    contactPerson: (data.contactPerson as string) || '',
    mobile: (data.mobile as string) || '',
    email: (data.email as string) || '',
    address: (data.address as string) || '',
    gstNumber: (data.gstNumber as string) || '',
    status: typeof data.status === 'boolean' ? data.status : true,
    createdAt: toDateOrNow(data.createdAt),
    updatedAt: toDateOrNow(data.updatedAt),
  };
}

function normalizePurchase(id: string, data: Record<string, unknown>): Purchase {
  return {
    id,
    purchaseNumber: (data.purchaseNumber as string) || '',
    supplierId: (data.supplierId as string) || '',
    purchaseDate: toDateOrNow(data.purchaseDate),
    totalQty: typeof data.totalQty === 'number' ? data.totalQty : 0,
    remarks: (data.remarks as string) || '',
    createdBy: (data.createdBy as string) || '',
    itemCount: typeof data.itemCount === 'number' ? data.itemCount : undefined,
    createdAt: toDateOrNow(data.createdAt),
    updatedAt: toDateOrNow(data.updatedAt),
  };
}

function normalizePurchaseItem(id: string, data: Record<string, unknown>): PurchaseItem {
  return {
    id,
    purchaseId: (data.purchaseId as string) || '',
    productId: (data.productId as string) || '',
    quantity: typeof data.quantity === 'number' ? data.quantity : 0,
    createdAt: toDateOrNow(data.createdAt),
    updatedAt: toDateOrNow(data.updatedAt),
  };
}

function normalizeStockTransaction(id: string, data: Record<string, unknown>): StockTransaction {
  return {
    id,
    productId: (data.productId as string) || '',
    referenceType: (data.referenceType as StockTransaction['referenceType']) || 'purchase',
    referenceId: (data.referenceId as string) || '',
    unit: (data.unit as Product['unit']) || getProductUnitForCategory((data.categoryId as string) || ''),
    quantity: sanitizeStockValue(data.quantity),
    transactionType: (data.transactionType as StockTransaction['transactionType']) || 'IN',
    createdAt: toDateOrNow(data.createdAt),
  };
}

function normalizeBlogInternalLinks(value: unknown): BlogInternalLink[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const record = item as Record<string, unknown>;
      const label = sanitizeOptionalText(record.label);
      const href = sanitizeOptionalText(record.href);
      const type = sanitizeOptionalText(record.type) as BlogInternalLink['type'];

      if (!label || !href) return null;

      return {
        label,
        href,
        type: ['page', 'category', 'product', 'blog', 'custom'].includes(type) ? type : 'custom',
      } satisfies BlogInternalLink;
    })
    .filter((item): item is BlogInternalLink => item !== null);
}

function sanitizeBlogWriteData(data: Partial<BlogPost>) {
  const title = typeof data.title === 'string' ? sanitizeOptionalText(data.title) : '';
  const excerpt = typeof data.excerpt === 'string' ? sanitizeLongText(data.excerpt) : '';

  return {
    ...(title ? { title } : {}),
    ...(typeof data.slug === 'string'
      ? { slug: slugify(data.slug) || slugify(title) }
      : title
        ? { slug: slugify(title) }
        : {}),
    ...(typeof data.excerpt === 'string' ? { excerpt } : {}),
    ...(typeof data.content === 'string' ? { content: sanitizeLongText(data.content) } : {}),
    ...(typeof data.coverImage === 'string' ? { coverImage: sanitizeOptionalText(data.coverImage) } : {}),
    ...(Array.isArray(data.tags)
      ? {
          tags: data.tags
            .filter((tag) => typeof tag === 'string')
            .map((tag) => sanitizeOptionalText(tag))
            .filter(Boolean),
        }
      : {}),
    ...(typeof data.published === 'boolean' ? { published: data.published } : {}),
    ...(typeof data.featured === 'boolean' ? { featured: data.featured } : {}),
    ...(typeof data.authorName === 'string' ? { authorName: sanitizeOptionalText(data.authorName) } : {}),
    ...(typeof data.seoTitle === 'string' ? { seoTitle: sanitizeOptionalText(data.seoTitle) } : {}),
    ...(typeof data.seoDescription === 'string' ? { seoDescription: sanitizeLongText(data.seoDescription) } : {}),
    ...(Array.isArray(data.internalLinks) ? { internalLinks: normalizeBlogInternalLinks(data.internalLinks) } : {}),
    ...(typeof data.createdBy === 'string' ? { createdBy: sanitizeOptionalText(data.createdBy) } : {}),
    ...('publishedAt' in data
      ? {
          publishedAt: data.publishedAt ?? null,
        }
      : {}),
  };
}

function normalizeBlogPost(id: string, data: Record<string, unknown>): BlogPost {
  const title = sanitizeOptionalText(data.title);
  const excerpt = sanitizeLongText(data.excerpt);

  return {
    id,
    title,
    slug: sanitizeOptionalText(data.slug) || slugify(title),
    excerpt,
    content: sanitizeLongText(data.content),
    coverImage: sanitizeOptionalText(data.coverImage),
    tags: Array.isArray(data.tags) ? (data.tags as string[]).map((tag) => sanitizeOptionalText(tag)).filter(Boolean) : [],
    published: Boolean(data.published),
    featured: Boolean(data.featured),
    authorName: sanitizeOptionalText(data.authorName) || 'SS Packaging',
    seoTitle: sanitizeOptionalText(data.seoTitle) || title,
    seoDescription: sanitizeLongText(data.seoDescription) || excerpt,
    internalLinks: normalizeBlogInternalLinks(data.internalLinks),
    createdBy: sanitizeOptionalText(data.createdBy),
    createdAt: toDateOrNow(data.createdAt),
    updatedAt: toDateOrNow(data.updatedAt),
    publishedAt: toDateOrNull(data.publishedAt),
  };
}

function normalizeAdminActivityLog(id: string, data: Record<string, unknown>): AdminActivityLog {
  const metadataValue = data.metadata;
  const safeMetadata =
    metadataValue && typeof metadataValue === 'object' && !Array.isArray(metadataValue)
      ? (metadataValue as AdminActivityMetadata)
      : undefined;

  return {
    id,
    action: (data.action as AdminActivityLog['action']) || 'update',
    entity: (data.entity as AdminActivityLog['entity']) || 'product',
    entityId: (data.entityId as string) || '',
    entityLabel: (data.entityLabel as string) || '',
    message: (data.message as string) || '',
    actorId: (data.actorId as string) || '',
    actorEmail: (data.actorEmail as string) || '',
    actorName: (data.actorName as string) || '',
    createdAt: toDateOrNow(data.createdAt),
    ...(safeMetadata ? { metadata: safeMetadata } : {}),
  };
}

function normalizeTeamMember(id: string, data: Record<string, unknown>): TeamMember {
  return {
    id,
    uid: (data.uid as string) || '',
    email: (data.email as string) || '',
    displayName: (data.displayName as string) || '',
    active: typeof data.active === 'boolean' ? data.active : true,
    createdBy: (data.createdBy as string) || '',
    createdAt: toDateOrNow(data.createdAt),
    updatedAt: toDateOrNow(data.updatedAt),
    lastLoginAt: toDateOrNull(data.lastLoginAt),
    lastLogoutAt: toDateOrNull(data.lastLogoutAt),
  };
}

function normalizeTeamAccessLog(id: string, data: Record<string, unknown>): TeamAccessLog {
  return {
    id,
    teamMemberId: (data.teamMemberId as string) || '',
    uid: (data.uid as string) || '',
    email: (data.email as string) || '',
    displayName: (data.displayName as string) || '',
    type: (data.type as TeamAccessLog['type']) || 'login',
    createdAt: toDateOrNow(data.createdAt),
  };
}

async function logAdminActivity({
  action,
  entity,
  entityId,
  entityLabel,
  message,
  actor,
  metadata,
}: AdminActivityInput): Promise<void> {
  const { actorId, actorEmail, actorName } = resolveAdminActor(actor);

  await addDoc(collection(db, 'adminActivityLogs'), {
    action,
    entity,
    entityId,
    entityLabel,
    message,
    actorId,
    actorEmail,
    actorName,
    ...(metadata ? { metadata } : {}),
    createdAt: serverTimestamp(),
  });
}

function parseDeliveryChallanSequence(challanNumber: string | undefined): number {
  if (!challanNumber) return 0;
  const match = challanNumber.match(/^DC-(\d+)$/i);
  if (!match) return 0;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDeliveryChallanNumber(sequence: number): string {
  return `DC-${String(sequence).padStart(4, '0')}`;
}

async function getLatestDeliveryChallanSequence(): Promise<number> {
  const q = query(collection(db, 'deliveryChallans'), orderBy('createdAt', 'desc'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return 0;
  const latest = snap.docs[0].data();
  return parseDeliveryChallanSequence(latest.challanNumber as string | undefined);
}

function parsePurchaseSequence(purchaseNumber: string | undefined): number {
  if (!purchaseNumber) return 0;
  const match = purchaseNumber.match(/^PUR-(\d+)$/i);
  if (!match) return 0;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPurchaseNumber(sequence: number): string {
  return `PUR-${String(sequence).padStart(4, '0')}`;
}

async function getLatestPurchaseSequence(): Promise<number> {
  const q = query(collection(db, 'purchases'), orderBy('createdAt', 'desc'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return 0;
  const latest = snap.docs[0].data();
  return parsePurchaseSequence(latest.purchaseNumber as string | undefined);
}

function sanitizePurchaseItems(
  items: Array<Pick<PurchaseItem, 'productId' | 'quantity'>>,
): Array<Pick<PurchaseItem, 'productId' | 'quantity'>> {
  return items
    .map((item) => ({
      productId: item.productId,
      quantity: sanitizeStockValue(item.quantity),
    }))
    .filter((item) => item.productId && item.quantity > 0);
}

function aggregatePurchaseItems(
  items: Array<Pick<PurchaseItem, 'productId' | 'quantity'>>,
): Array<Pick<PurchaseItem, 'productId' | 'quantity'>> {
  const aggregated = new Map<string, number>();

  items.forEach((item) => {
    aggregated.set(item.productId, (aggregated.get(item.productId) || 0) + sanitizeStockValue(item.quantity));
  });

  return Array.from(aggregated.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

function getPurchaseEmbeddedItems(data: Record<string, unknown>): Array<Pick<PurchaseItem, 'productId' | 'quantity'>> {
  if (!Array.isArray(data.items)) return [];
  return sanitizePurchaseItems(
    data.items.map((item) => ({
      productId: (item as Record<string, unknown>).productId as string,
      quantity: ((item as Record<string, unknown>).quantity as number) || 0,
    })),
  );
}

function isManagedCategory(category: Pick<Category, 'slug'>): boolean {
  return isCoreProductCategorySlug(category.slug);
}

function isPublicCategory(category: Pick<Category, 'slug'>): boolean {
  return !isCoreProductCategorySlug(category.slug);
}

function normalizeCategory(id: string, data: Record<string, unknown>): Category {
  return {
    id,
    name: sanitizeOptionalText(data.name),
    slug: sanitizeOptionalText(data.slug),
    description: sanitizeOptionalText(data.description),
    image: sanitizeOptionalText(data.image),
    order: typeof data.order === 'number' && Number.isFinite(data.order) ? data.order : 0,
    active: Boolean(data.active),
  };
}

function assertManagedCategorySlug(slug: string): void {
  if (!isCoreProductCategorySlug(slug)) {
    throw new Error('Only raw-material, production, and finished categories are allowed.');
  }
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const q = query(collection(db, 'categories'), where('active', '==', true), orderBy('order'));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => normalizeCategory(d.id, d.data()))
    .filter(isPublicCategory);
}

export async function getAllCategories(): Promise<Category[]> {
  const q = query(collection(db, 'categories'), orderBy('order'));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => normalizeCategory(d.id, d.data()))
    .filter(isPublicCategory);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const normalizedSlug = normalizePublicCategorySlug(slug);
  const q = query(collection(db, 'categories'), where('slug', '==', normalizedSlug), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const category = normalizeCategory(snap.docs[0].id, snap.docs[0].data());
  return isPublicCategory(category) ? category : null;
}

export async function createCategory(
  data: Omit<Category, 'id'>,
  actor?: string | AdminActivityActor,
): Promise<string> {
  const normalizedSlug = normalizeCategorySlug(data.slug);
  if (isCoreProductCategorySlug(normalizedSlug)) {
    throw new Error('This slug is reserved for admin categories.');
  }
  const ref = await addDoc(collection(db, 'categories'), { ...data, slug: normalizedSlug, createdAt: serverTimestamp() });
  await logAdminActivity({
    action: 'create',
    entity: 'category',
    entityId: ref.id,
    entityLabel: data.name,
    message: `Created category "${data.name}"`,
    actor,
    metadata: {
      slug: data.slug,
      active: data.active,
    },
  });
  return ref.id;
}

export async function updateCategory(
  id: string,
  data: Partial<Category>,
  actor?: string | AdminActivityActor,
): Promise<void> {
  if (typeof data.slug === 'string') {
    const normalizedSlug = normalizeCategorySlug(data.slug);
    if (isCoreProductCategorySlug(normalizedSlug)) {
      throw new Error('This slug is reserved for admin categories.');
    }
  }
  await updateDoc(doc(db, 'categories', id), {
    ...data,
    ...(typeof data.slug === 'string' ? { slug: normalizeCategorySlug(data.slug) } : {}),
    updatedAt: serverTimestamp(),
  });
  await logAdminActivity({
    action: 'update',
    entity: 'category',
    entityId: id,
    entityLabel: data.name || id,
    message: `Updated category "${data.name || id}"`,
    actor,
    metadata: {
      updatedFields: Object.keys(data).join(', ') || 'none',
    },
  });
}

export async function deleteCategory(id: string, actor?: string | AdminActivityActor): Promise<void> {
  const existing = await getDoc(doc(db, 'categories', id));
  const categoryName = existing.exists() ? ((existing.data().name as string) || id) : id;
  const categorySlug = existing.exists() ? normalizeCategorySlug((existing.data().slug as string) || '') : '';
  if (categorySlug && CORE_PRODUCT_CATEGORY_SLUGS.has(categorySlug as any)) {
    throw new Error('Core product categories cannot be deleted.');
  }
  await deleteDoc(doc(db, 'categories', id));
  await logAdminActivity({
    action: 'delete',
    entity: 'category',
    entityId: id,
    entityLabel: categoryName,
    message: `Deleted category "${categoryName}"`,
    actor,
  });
}

// ─── Products ─────────────────────────────────────────────────────────────────

export async function getProducts(categoryId?: string): Promise<Product[]> {
  const q = query(collection(db, 'products'), where('active', '==', true));
  const snap = await getDocs(q);
  const products = snap.docs.map(d => normalizeProduct(d.id, d.data()));
  if (!categoryId) return products;
  return products.filter((product) => product.categoryId === categoryId);
}

export async function getProductsByPublicCategory(publicCategorySlug: string): Promise<Product[]> {
  const normalizedSlug = normalizePublicCategorySlug(publicCategorySlug);
  const products = await getProducts();
  return products.filter((product) => product.publicCategorySlug === normalizedSlug);
}

export async function getAllProducts(): Promise<Product[]> {
  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => normalizeProduct(d.id, d.data()));
}

export async function backfillProductStockFields(): Promise<number> {
  const snap = await getDocs(collection(db, 'products'));
  const batch = writeBatch(db);
  let updates = 0;

  snap.docs.forEach((productDoc) => {
    const data = productDoc.data() as Record<string, unknown>;
    const normalizedProduct = normalizeProduct(productDoc.id, data);
    const currentCategoryId = normalizeCategorySlug(normalizedProduct.categoryId);
    const hasStockQuantity = typeof data.stockQuantity === 'number';
    const hasLowStockLimit = typeof data.lowStockLimit === 'number';
    const hasStockStatus = typeof data.stockStatus === 'string';
    const hasLastStockUpdatedAt = 'lastStockUpdatedAt' in data;
    const hasLastStockUpdatedBy = typeof data.lastStockUpdatedBy === 'string';
    const hasValidUnit = typeof data.unit === 'string' && data.unit === getProductUnitForCategory(normalizedProduct.categoryId);
    const currentBottleWeightGram = sanitizeBottleWeightGram(data.bottle_weight_gram);
    const nextBottleWeightGram = currentCategoryId === PRODUCTION_CATEGORY_SLUG
      ? inferProductionBottleWeightGram(data)
      : null;
    const hasSingleProductFields =
      typeof data.categoryId === 'string' &&
      typeof data.description === 'string' &&
      Array.isArray(data.pricingTiers) &&
      !('variants' in data) &&
      !('hasVariants' in data);
    const currentLowStockLimit = sanitizeLowStockLimit(data.lowStockLimit, DEFAULT_LOW_STOCK_LIMIT);
    const currentStockQuantity = sanitizeStockValue(
      data.stockQuantity,
      DEFAULT_INITIAL_STOCK_QUANTITY,
    );
    const currentStockStatus = calculateStockStatus(currentStockQuantity, currentLowStockLimit);
    const isLegacyAutoZeroedStock =
      hasStockQuantity &&
      sanitizeStockValue(data.stockQuantity) === 0 &&
      data.lastStockUpdatedAt == null &&
      ((data.lastStockUpdatedBy as string) || '') === '';
    const needsLowStockLimitUpgrade =
      !hasLowStockLimit || sanitizeStockValue(data.lowStockLimit) < DEFAULT_LOW_STOCK_LIMIT;
    const needsStockStatusRefresh =
      !hasStockStatus || (data.stockStatus as string) !== currentStockStatus;
    const needsBottleWeightRefresh =
      currentCategoryId === PRODUCTION_CATEGORY_SLUG
        ? nextBottleWeightGram !== currentBottleWeightGram
        : 'bottle_weight_gram' in data;

    if (
      hasStockQuantity &&
      hasLowStockLimit &&
      hasStockStatus &&
      hasLastStockUpdatedAt &&
      hasLastStockUpdatedBy &&
      hasValidUnit &&
      hasSingleProductFields &&
      !needsLowStockLimitUpgrade &&
      !needsStockStatusRefresh &&
      !needsBottleWeightRefresh &&
      !isLegacyAutoZeroedStock
    ) {
      return;
    }

    const stockFields = resolveProductStockFields({
      stockQuantity: isLegacyAutoZeroedStock
        ? DEFAULT_INITIAL_STOCK_QUANTITY
        : sanitizeStockValue(data.stockQuantity, DEFAULT_INITIAL_STOCK_QUANTITY),
      lowStockLimit: sanitizeLowStockLimit(data.lowStockLimit, DEFAULT_LOW_STOCK_LIMIT),
    });

    batch.update(productDoc.ref, {
      categoryId: normalizedProduct.categoryId,
      category: normalizedProduct.categoryId,
      publicCategoryName: normalizedProduct.publicCategoryName,
      publicCategorySlug: normalizedProduct.publicCategorySlug,
      unit: normalizedProduct.unit,
      description: normalizedProduct.description,
      images: normalizedProduct.images,
      sku: normalizedProduct.sku,
      capacity: normalizedProduct.capacity,
      neckSize: normalizedProduct.neckSize,
      height: normalizedProduct.height,
      weight: normalizedProduct.weight,
      material: normalizedProduct.material,
      packagingSize: normalizedProduct.packagingSize,
      color: normalizedProduct.color,
      remark: normalizedProduct.remark,
      ...(currentCategoryId === PRODUCTION_CATEGORY_SLUG && nextBottleWeightGram != null
        ? { bottle_weight_gram: nextBottleWeightGram }
        : { bottle_weight_gram: deleteField() }),
      pricingTiers: normalizedProduct.pricingTiers,
      ...stockFields,
      lastStockUpdatedAt:
        isLegacyAutoZeroedStock
          ? serverTimestamp()
          : hasLastStockUpdatedAt
            ? data.lastStockUpdatedAt
            : null,
      lastStockUpdatedBy:
        isLegacyAutoZeroedStock
          ? 'system_init'
          : hasLastStockUpdatedBy
            ? data.lastStockUpdatedBy
            : '',
      variants: [],
      hasVariants: false,
      updatedAt: serverTimestamp(),
    });
    updates += 1;
  });

  if (updates > 0) {
    await batch.commit();
  }

  return updates;
}

export async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const q = query(
      collection(db, 'products'),
      where('active', '==', true),
      where('featured', '==', true),
      limit(8)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => normalizeProduct(d.id, d.data()));
  } catch {
    // Fallback for cases where the compound Firestore index is missing.
    const activeQ = query(collection(db, 'products'), where('active', '==', true), limit(50));
    const snap = await getDocs(activeQ);
    return snap.docs
      .map(d => normalizeProduct(d.id, d.data()))
      .filter(p => p.featured)
      .slice(0, 8);
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const q = query(collection(db, 'products'), where('slug', '==', slug), where('active', '==', true));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return normalizeProduct(snap.docs[0].id, snap.docs[0].data());
}

export async function getProductById(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, 'products', id));
  if (!snap.exists()) return null;
  return normalizeProduct(snap.id, snap.data());
}

export async function createProduct(
  data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'stockStatus'> & {
    stockStatus?: Product['stockStatus'];
  },
  actor?: string | AdminActivityActor,
): Promise<string> {
  const sanitizedData = sanitizeProductWriteData(data);
  assertValidPricingTiers((sanitizedData.pricingTiers as Product['pricingTiers']) || []);
  const resolvedCategoryId = (sanitizedData.categoryId as string) || data.categoryId;
  const bottleWeightGram = resolveProductBottleWeightGram(
    resolvedCategoryId,
    sanitizedData.bottle_weight_gram ?? data.bottle_weight_gram,
  );
  assertValidProductBottleWeight(resolvedCategoryId, bottleWeightGram);
  const stockFields = resolveProductStockFields(data);
  const { bottle_weight_gram: _unusedBottleWeight, ...restData } = data;
  const ref = await addDoc(collection(db, 'products'), {
    ...restData,
    ...sanitizedData,
    unit: getProductUnitForCategory(resolvedCategoryId),
    ...(bottleWeightGram != null ? { bottle_weight_gram: bottleWeightGram } : {}),
    ...stockFields,
    lastStockUpdatedAt: data.lastStockUpdatedAt ?? new Date(),
    lastStockUpdatedBy: data.lastStockUpdatedBy || 'admin',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await logAdminActivity({
    action: 'create',
    entity: 'product',
    entityId: ref.id,
    entityLabel: data.name,
    message: `Created product "${data.name}"`,
    actor: actor || data.lastStockUpdatedBy,
    metadata: {
      categoryId: data.categoryId,
      stockQuantity: stockFields.stockQuantity,
      active: data.active,
    },
  });
  return ref.id;
}

export async function updateProduct(
  id: string,
  data: Partial<Product>,
  actor?: string | AdminActivityActor,
): Promise<void> {
  const existing = await getProductById(id);
  if (!existing) {
    throw new Error('Product not found.');
  }

  const stockFields = resolveProductStockFields(data, existing);
  const sanitizedData = sanitizeProductWriteData(data);
  const resolvedCategoryId = (sanitizedData.categoryId as string) || existing.categoryId;
  const nextPricingTiers = (sanitizedData.pricingTiers as Product['pricingTiers']) || existing.pricingTiers;
  const nextBottleWeightGram = resolveProductBottleWeightGram(
    resolvedCategoryId,
    sanitizedData.bottle_weight_gram ?? data.bottle_weight_gram ?? existing.bottle_weight_gram,
  );
  if (
    isProductionProductCategorySlug(resolvedCategoryId) &&
    (resolvedCategoryId !== existing.categoryId || 'categoryId' in data || 'bottle_weight_gram' in data)
  ) {
    assertValidProductBottleWeight(resolvedCategoryId, nextBottleWeightGram);
  }
  assertValidPricingTiers(nextPricingTiers);
  const stockChanged =
    stockFields.stockQuantity !== existing.stockQuantity ||
    stockFields.lowStockLimit !== existing.lowStockLimit;

  await updateDoc(doc(db, 'products', id), {
    ...data,
    ...sanitizedData,
    unit: getProductUnitForCategory(resolvedCategoryId),
    ...(isProductionProductCategorySlug(resolvedCategoryId)
      ? { bottle_weight_gram: nextBottleWeightGram }
      : { bottle_weight_gram: deleteField() }),
    ...stockFields,
    lastStockUpdatedAt: stockChanged ? new Date() : existing.lastStockUpdatedAt ?? null,
    lastStockUpdatedBy: stockChanged ? data.lastStockUpdatedBy || existing.lastStockUpdatedBy || 'admin' : existing.lastStockUpdatedBy || '',
    updatedAt: serverTimestamp(),
  });
  await logAdminActivity({
    action: 'update',
    entity: 'product',
    entityId: id,
    entityLabel: data.name || existing.name,
    message: `Updated product "${data.name || existing.name}"`,
    actor: actor || data.lastStockUpdatedBy,
    metadata: {
        updatedFields: Object.keys(data).join(', ') || 'none',
        stockChanged,
        previousStock: existing.stockQuantity,
        newStock: stockFields.stockQuantity,
        active: typeof data.active === 'boolean' ? data.active : existing.active,
    },
  });
}

export async function deleteProduct(id: string, actor?: string | AdminActivityActor): Promise<void> {
  const existing = await getProductById(id);
  await deleteDoc(doc(db, 'products', id));
  await logAdminActivity({
    action: 'delete',
    entity: 'product',
    entityId: id,
    entityLabel: existing?.name || id,
    message: `Deleted product "${existing?.name || id}"`,
    actor,
    metadata: existing
      ? {
          categoryId: existing.categoryId,
          active: existing.active,
        }
      : undefined,
  });
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function getAllSuppliers(): Promise<Supplier[]> {
  const q = query(collection(db, 'suppliers'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => normalizeSupplier(docSnap.id, docSnap.data()));
}

export async function getSupplierById(id: string): Promise<Supplier | null> {
  const snap = await getDoc(doc(db, 'suppliers', id));
  if (!snap.exists()) return null;
  return normalizeSupplier(snap.id, snap.data());
}

export async function createSupplier(
  data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>,
  actor?: string | AdminActivityActor,
): Promise<string> {
  const ref = await addDoc(collection(db, 'suppliers'), {
    ...data,
    supplierName: data.supplierName.trim(),
    contactPerson: data.contactPerson.trim(),
    mobile: data.mobile.trim(),
    email: data.email.trim(),
    address: data.address.trim(),
    gstNumber: data.gstNumber.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await logAdminActivity({
    action: 'create',
    entity: 'supplier',
    entityId: ref.id,
    entityLabel: data.supplierName,
    message: `Created supplier "${data.supplierName}"`,
    actor,
    metadata: {
      active: data.status,
      mobile: data.mobile.trim() || null,
      email: data.email.trim() || null,
    },
  });

  return ref.id;
}

export async function updateSupplier(
  id: string,
  data: Partial<Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>>,
  actor?: string | AdminActivityActor,
): Promise<void> {
  const existing = await getSupplierById(id);
  if (!existing) {
    throw new Error('Supplier not found.');
  }

  await updateDoc(doc(db, 'suppliers', id), {
    ...data,
    ...(typeof data.supplierName === 'string' ? { supplierName: data.supplierName.trim() } : {}),
    ...(typeof data.contactPerson === 'string' ? { contactPerson: data.contactPerson.trim() } : {}),
    ...(typeof data.mobile === 'string' ? { mobile: data.mobile.trim() } : {}),
    ...(typeof data.email === 'string' ? { email: data.email.trim() } : {}),
    ...(typeof data.address === 'string' ? { address: data.address.trim() } : {}),
    ...(typeof data.gstNumber === 'string' ? { gstNumber: data.gstNumber.trim() } : {}),
    updatedAt: serverTimestamp(),
  });

  await logAdminActivity({
    action: 'update',
    entity: 'supplier',
    entityId: id,
    entityLabel: data.supplierName || existing.supplierName,
    message: `Updated supplier "${data.supplierName || existing.supplierName}"`,
    actor,
    metadata: {
      updatedFields: Object.keys(data).join(', ') || 'none',
    },
  });
}

export async function deleteSupplier(id: string, actor?: string | AdminActivityActor): Promise<void> {
  const existing = await getSupplierById(id);
  await deleteDoc(doc(db, 'suppliers', id));
  await logAdminActivity({
    action: 'delete',
    entity: 'supplier',
    entityId: id,
    entityLabel: existing?.supplierName || id,
    message: `Deleted supplier "${existing?.supplierName || id}"`,
    actor,
  });
}

export async function generateNextPurchaseNumber(): Promise<string> {
  const latestSequence = await getLatestPurchaseSequence();
  return formatPurchaseNumber(latestSequence + 1);
}

export async function getAllPurchases(): Promise<Purchase[]> {
  const q = query(collection(db, 'purchases'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => normalizePurchase(docSnap.id, docSnap.data()));
}

export async function getPurchaseById(id: string): Promise<Purchase | null> {
  const snap = await getDoc(doc(db, 'purchases', id));
  if (!snap.exists()) return null;
  return normalizePurchase(snap.id, snap.data());
}

export async function getPurchaseItemsByPurchaseId(purchaseId: string): Promise<PurchaseItem[]> {
  const q = query(collection(db, 'purchaseItems'), where('purchaseId', '==', purchaseId));
  const snap = await getDocs(q);
  return snap.docs
    .map((docSnap) => normalizePurchaseItem(docSnap.id, docSnap.data()))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export async function getStockTransactionsByReferenceId(referenceId: string): Promise<StockTransaction[]> {
  const q = query(collection(db, 'stockTransactions'), where('referenceId', '==', referenceId));
  const snap = await getDocs(q);
  return snap.docs
    .map((docSnap) => normalizeStockTransaction(docSnap.id, docSnap.data()))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export async function createPurchase(
  data: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt' | 'totalQty'> & {
    items: Array<Pick<PurchaseItem, 'productId' | 'quantity'>>;
  },
  actor?: string | AdminActivityActor,
): Promise<string> {
  const items = sanitizePurchaseItems(data.items);

  if (!data.supplierId) {
    throw new Error('Supplier is required.');
  }

  if (items.length === 0) {
    throw new Error('At least one purchase item is required.');
  }

  const aggregatedItems = aggregatePurchaseItems(items);
  const purchaseRef = doc(collection(db, 'purchases'));
  const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
  const purchaseNumber = data.purchaseNumber.trim();
  const purchaseLockRef = doc(db, 'purchaseLocks', purchaseNumber);
  const inventoryCollectionRef = collection(db, 'inventoryTransactions');
  const stockTransactionCollectionRef = collection(db, 'stockTransactions');

  await runTransaction(db, async (transaction) => {
    const purchaseLockSnap = await transaction.get(purchaseLockRef);
    if (purchaseLockSnap.exists()) {
      throw new Error(`Purchase ${purchaseNumber} has already been saved.`);
    }

    for (const aggregatedItem of aggregatedItems) {
      const productRef = doc(db, 'products', aggregatedItem.productId);
      const productSnap = await transaction.get(productRef);

      if (!productSnap.exists()) {
        throw new Error('One of the selected products no longer exists.');
      }

      const product = normalizeProduct(productSnap.id, productSnap.data() as Record<string, unknown>);
      const previousStock = product.stockQuantity;
      const newStock = previousStock + aggregatedItem.quantity;
      const nextStockFields = resolveProductStockFields({
        stockQuantity: newStock,
        lowStockLimit: product.lowStockLimit,
      });

      transaction.update(productRef, {
        ...nextStockFields,
        lastStockUpdatedAt: serverTimestamp(),
        lastStockUpdatedBy: data.createdBy,
        updatedAt: serverTimestamp(),
      });

      transaction.set(doc(inventoryCollectionRef), {
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        type: 'IN',
        source: 'PURCHASE',
        quantity: aggregatedItem.quantity,
        previousStock,
        newStock,
        note: `Purchase ${purchaseNumber}`,
        createdAt: serverTimestamp(),
        createdBy: data.createdBy,
      });

      transaction.set(doc(stockTransactionCollectionRef), {
        productId: product.id,
        referenceType: 'purchase',
        referenceId: purchaseRef.id,
        unit: product.unit,
        quantity: aggregatedItem.quantity,
        transactionType: 'IN',
        createdAt: serverTimestamp(),
      });
    }

    transaction.set(purchaseRef, {
      purchaseNumber,
      supplierId: data.supplierId,
      purchaseDate: data.purchaseDate,
      totalQty,
      remarks: data.remarks.trim(),
      createdBy: data.createdBy,
      itemCount: items.length,
      items,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    items.forEach((item) => {
      const itemRef = doc(collection(db, 'purchaseItems'));
      transaction.set(itemRef, {
        purchaseId: purchaseRef.id,
        productId: item.productId,
        quantity: item.quantity,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    transaction.set(purchaseLockRef, {
      purchaseId: purchaseRef.id,
      createdAt: serverTimestamp(),
    });
  });

  await logAdminActivity({
    action: 'create',
    entity: 'purchase',
    entityId: purchaseRef.id,
    entityLabel: data.purchaseNumber,
    message: `Created purchase "${data.purchaseNumber}"`,
    actor,
    metadata: {
      supplierId: data.supplierId,
      totalQty,
      items: items.length,
    },
  });

  return purchaseRef.id;
}

export async function updatePurchase(
  id: string,
  data: Omit<Purchase, 'id' | 'createdAt' | 'updatedAt' | 'totalQty'> & {
    items: Array<Pick<PurchaseItem, 'productId' | 'quantity'>>;
  },
  actor?: string | AdminActivityActor,
): Promise<void> {
  const purchaseRef = doc(db, 'purchases', id);
  const purchaseItemsRef = collection(db, 'purchaseItems');
  const inventoryCollectionRef = collection(db, 'inventoryTransactions');
  const stockTransactionCollectionRef = collection(db, 'stockTransactions');
  const sanitizedNewItems = sanitizePurchaseItems(data.items);

  if (!data.supplierId) {
    throw new Error('Supplier is required.');
  }

  if (sanitizedNewItems.length === 0) {
    throw new Error('At least one purchase item is required.');
  }

  const existingItems = await getPurchaseItemsByPurchaseId(id);
  let didChange = false;

  await runTransaction(db, async (transaction) => {
    const purchaseSnap = await transaction.get(purchaseRef);
    if (!purchaseSnap.exists()) {
      throw new Error('Purchase not found.');
    }

    const purchaseData = purchaseSnap.data() as Record<string, unknown>;
    const currentItems = existingItems.length > 0
      ? existingItems.map((item) => ({ productId: item.productId, quantity: item.quantity }))
      : getPurchaseEmbeddedItems(purchaseData);
    const normalizedCurrentItems = sanitizePurchaseItems(currentItems);
    const unchanged =
      ((purchaseData.purchaseNumber as string) || '') === data.purchaseNumber.trim() &&
      ((purchaseData.supplierId as string) || '') === data.supplierId &&
      (((purchaseData.remarks as string) || '') === data.remarks.trim()) &&
      toDateOrNow(purchaseData.purchaseDate).getTime() === data.purchaseDate.getTime() &&
      normalizedCurrentItems.length === sanitizedNewItems.length &&
      normalizedCurrentItems.every((item, index) =>
        item.productId === sanitizedNewItems[index]?.productId &&
        item.quantity === sanitizedNewItems[index]?.quantity,
      );

    if (unchanged) {
      return;
    }

    didChange = true;
    const aggregatedCurrentItems = aggregatePurchaseItems(currentItems);
    const aggregatedNewItems = aggregatePurchaseItems(sanitizedNewItems);
    const affectedProductIds = Array.from(new Set([
      ...aggregatedCurrentItems.map((item) => item.productId),
      ...aggregatedNewItems.map((item) => item.productId),
    ]));

    const stockState = new Map<string, { product: Product; currentStock: number }>();

    for (const productId of affectedProductIds) {
      const productRef = doc(db, 'products', productId);
      const productSnap = await transaction.get(productRef);

      if (!productSnap.exists()) {
        throw new Error('One of the selected products no longer exists.');
      }

      const product = normalizeProduct(productSnap.id, productSnap.data() as Record<string, unknown>);
      stockState.set(productId, { product, currentStock: product.stockQuantity });
    }

    const applyAdjustment = (
      productId: string,
      quantity: number,
      transactionType: StockTransaction['transactionType'],
      source: InventoryTransactionSource,
      note: string,
    ) => {
      const state = stockState.get(productId);
      if (!state) {
        throw new Error('Failed to load product stock state.');
      }

      const previousStock = state.currentStock;
      const newStock = transactionType === 'IN'
        ? previousStock + quantity
        : previousStock - quantity;

      if (newStock < 0) {
        throw new Error(`${state.product.name} does not have enough stock to reverse this purchase.`);
      }

      state.currentStock = newStock;

      transaction.set(doc(inventoryCollectionRef), {
        productId: state.product.id,
        productName: state.product.name,
        unit: state.product.unit,
        type: transactionType,
        source,
        quantity,
        previousStock,
        newStock,
        note,
        createdAt: serverTimestamp(),
        createdBy: data.createdBy,
      });

      transaction.set(doc(stockTransactionCollectionRef), {
        productId: state.product.id,
        referenceType: 'purchase',
        referenceId: id,
        unit: state.product.unit,
        quantity,
        transactionType,
        createdAt: serverTimestamp(),
      });
    };

    aggregatedCurrentItems.forEach((item) => {
      applyAdjustment(
        item.productId,
        item.quantity,
        'OUT',
        'PURCHASE_EDIT',
        `Purchase ${purchaseData.purchaseNumber || id} reversal`,
      );
    });

    aggregatedNewItems.forEach((item) => {
      applyAdjustment(
        item.productId,
        item.quantity,
        'IN',
        'PURCHASE_EDIT',
        `Purchase ${data.purchaseNumber.trim()} reapplied`,
      );
    });

    for (const [productId, state] of stockState.entries()) {
      const productRef = doc(db, 'products', productId);
      const nextStockFields = resolveProductStockFields({
        stockQuantity: state.currentStock,
        lowStockLimit: state.product.lowStockLimit,
      });

      transaction.update(productRef, {
        ...nextStockFields,
        lastStockUpdatedAt: serverTimestamp(),
        lastStockUpdatedBy: data.createdBy,
        updatedAt: serverTimestamp(),
      });
    }

    existingItems.forEach((item) => {
      transaction.delete(doc(db, 'purchaseItems', item.id));
    });

    sanitizedNewItems.forEach((item) => {
      const itemRef = doc(purchaseItemsRef);
      transaction.set(itemRef, {
        purchaseId: id,
        productId: item.productId,
        quantity: item.quantity,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    transaction.update(purchaseRef, {
      purchaseNumber: data.purchaseNumber.trim(),
      supplierId: data.supplierId,
      purchaseDate: data.purchaseDate,
      totalQty: sanitizedNewItems.reduce((sum, item) => sum + item.quantity, 0),
      remarks: data.remarks.trim(),
      createdBy: data.createdBy,
      itemCount: sanitizedNewItems.length,
      items: sanitizedNewItems,
      updatedAt: serverTimestamp(),
    });
  });

  if (!didChange) {
    return;
  }

  await logAdminActivity({
    action: 'update',
    entity: 'purchase',
    entityId: id,
    entityLabel: data.purchaseNumber,
    message: `Updated purchase "${data.purchaseNumber}"`,
    actor,
    metadata: {
      supplierId: data.supplierId,
      totalQty: sanitizedNewItems.reduce((sum, item) => sum + item.quantity, 0),
      items: sanitizedNewItems.length,
    },
  });
}

export async function deletePurchase(id: string, actor?: string | AdminActivityActor): Promise<void> {
  const purchaseRef = doc(db, 'purchases', id);
  const inventoryCollectionRef = collection(db, 'inventoryTransactions');
  const stockTransactionCollectionRef = collection(db, 'stockTransactions');
  const existingItems = await getPurchaseItemsByPurchaseId(id);
  let purchaseNumber = id;

  await runTransaction(db, async (transaction) => {
    const purchaseSnap = await transaction.get(purchaseRef);
    if (!purchaseSnap.exists()) {
      throw new Error('Purchase not found.');
    }

    const purchaseData = purchaseSnap.data() as Record<string, unknown>;
    purchaseNumber = (purchaseData.purchaseNumber as string) || id;
    const currentItems = existingItems.length > 0
      ? existingItems.map((item) => ({ productId: item.productId, quantity: item.quantity }))
      : getPurchaseEmbeddedItems(purchaseData);
    const aggregatedCurrentItems = aggregatePurchaseItems(currentItems);

    for (const aggregatedItem of aggregatedCurrentItems) {
      const productRef = doc(db, 'products', aggregatedItem.productId);
      const productSnap = await transaction.get(productRef);

      if (!productSnap.exists()) {
        throw new Error('One of the selected products no longer exists.');
      }

      const product = normalizeProduct(productSnap.id, productSnap.data() as Record<string, unknown>);
      const previousStock = product.stockQuantity;
      const newStock = previousStock - aggregatedItem.quantity;

      if (newStock < 0) {
        throw new Error(`${product.name} does not have enough stock to remove this purchase.`);
      }

      const nextStockFields = resolveProductStockFields({
        stockQuantity: newStock,
        lowStockLimit: product.lowStockLimit,
      });

      transaction.update(productRef, {
        ...nextStockFields,
        lastStockUpdatedAt: serverTimestamp(),
        lastStockUpdatedBy: typeof actor === 'string' ? actor : actor?.email || actor?.uid || 'admin',
        updatedAt: serverTimestamp(),
      });

      transaction.set(doc(inventoryCollectionRef), {
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        type: 'OUT',
        source: 'PURCHASE_DELETE',
        quantity: aggregatedItem.quantity,
        previousStock,
        newStock,
        note: `Purchase ${purchaseNumber} deleted`,
        createdAt: serverTimestamp(),
        createdBy: typeof actor === 'string' ? actor : actor?.email || actor?.uid || 'admin',
      });

      transaction.set(doc(stockTransactionCollectionRef), {
        productId: product.id,
        referenceType: 'purchase',
        referenceId: id,
        unit: product.unit,
        quantity: aggregatedItem.quantity,
        transactionType: 'OUT',
        createdAt: serverTimestamp(),
      });
    }

    existingItems.forEach((item) => {
      transaction.delete(doc(db, 'purchaseItems', item.id));
    });

    transaction.delete(purchaseRef);
  });

  await logAdminActivity({
    action: 'delete',
    entity: 'purchase',
    entityId: id,
    entityLabel: purchaseNumber,
    message: `Deleted purchase "${purchaseNumber}"`,
    actor,
  });
}

async function updateLegacyCustomerType(docId: string, currentType: unknown): Promise<void> {
  if (currentType === 'website' || currentType === 'manual') return;
  await updateDoc(doc(db, 'users', docId), {
    customerType: 'website',
    customer_type: 'website',
  });
}

async function migrateLegacyCustomersCustomerType(
  docs: Array<{ id: string; data: () => Record<string, unknown> }>
): Promise<void> {
  const docsToUpdate = docs.filter((docSnap) => {
    const currentType = docSnap.data().customerType;
    return currentType !== 'website' && currentType !== 'manual';
  });

  if (docsToUpdate.length === 0) return;

  const batch = writeBatch(db);
  docsToUpdate.forEach((docSnap) => {
    batch.update(doc(db, 'users', docSnap.id), {
      customerType: 'website',
      customer_type: 'website',
    });
  });
  await batch.commit();
}

async function findCustomerProfile(
  email?: string,
  phone?: string,
): Promise<{ user: User; matchedBy: 'email' | 'phone' } | null> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);

  if (normalizedEmail) {
    const emailQuery = query(collection(db, 'users'), where('email', '==', normalizedEmail), limit(1));
    const emailSnap = await getDocs(emailQuery);
    if (!emailSnap.empty) {
      const docSnap = emailSnap.docs[0];
      await updateLegacyCustomerType(docSnap.id, docSnap.data().customerType);
      return {
        user: normalizeUser(docSnap.id, docSnap.data() as Record<string, unknown>),
        matchedBy: 'email',
      };
    }
  }

  if (normalizedPhone) {
    const phoneQuery = query(collection(db, 'users'), where('phone', '==', normalizedPhone), limit(1));
    const phoneSnap = await getDocs(phoneQuery);
    if (!phoneSnap.empty) {
      const docSnap = phoneSnap.docs[0];
      await updateLegacyCustomerType(docSnap.id, docSnap.data().customerType);
      return {
        user: normalizeUser(docSnap.id, docSnap.data() as Record<string, unknown>),
        matchedBy: 'phone',
      };
    }
  }

  if (normalizedEmail || normalizedPhone) {
    const allUsersSnap = await getDocs(collection(db, 'users'));
    const matchedDoc = allUsersSnap.docs.find((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>;
      return (
        (normalizedEmail && normalizeEmail(data.email) === normalizedEmail) ||
        (normalizedPhone && normalizePhone(data.phone) === normalizedPhone)
      );
    });

    if (matchedDoc) {
      await updateLegacyCustomerType(matchedDoc.id, matchedDoc.data().customerType);
      return {
        user: normalizeUser(matchedDoc.id, matchedDoc.data() as Record<string, unknown>),
        matchedBy:
          normalizedEmail && normalizeEmail(matchedDoc.data().email) === normalizedEmail ? 'email' : 'phone',
      };
    }
  }

  return null;
}

async function syncCustomerProfile(input: CustomerSyncInput): Promise<User> {
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = normalizePhone(input.phone);
  const trimmedName = input.displayName?.trim() || '';
  const trimmedUid = input.uid?.trim() || '';
  const customerType = input.customerType;

  let existingUser: User | null = null;
  let matchedBy: 'uid' | 'email' | 'phone' | null = null;

  if (trimmedUid) {
    const uidQuery = query(collection(db, 'users'), where('uid', '==', trimmedUid), limit(1));
    const uidSnap = await getDocs(uidQuery);
    if (!uidSnap.empty) {
      const docSnap = uidSnap.docs[0];
      await updateLegacyCustomerType(docSnap.id, docSnap.data().customerType);
      existingUser = normalizeUser(docSnap.id, docSnap.data() as Record<string, unknown>);
      matchedBy = 'uid';
    }
  }

  if (!existingUser) {
    const matchedCustomer = await findCustomerProfile(normalizedEmail, normalizedPhone);
    existingUser = matchedCustomer?.user || null;
    matchedBy = matchedCustomer?.matchedBy || null;
  }

  const nextCustomerType: CustomerType =
    existingUser?.customerType === 'website' || customerType === 'website' ? 'website' : 'manual';
  const nextAddresses = mergeAddresses(existingUser?.addresses, input.address);

  if (existingUser) {
    const payload: Record<string, unknown> = {
      customerType: nextCustomerType,
      customer_type: nextCustomerType,
      addresses: nextAddresses,
    };

    if (trimmedUid && existingUser.uid !== trimmedUid) payload.uid = trimmedUid;
    if (
      normalizedEmail &&
      existingUser.email !== normalizedEmail &&
      (matchedBy === 'uid' || matchedBy === 'email' || !existingUser.email)
    ) {
      payload.email = normalizedEmail;
    }
    if (normalizedPhone && existingUser.phone !== normalizedPhone) payload.phone = normalizedPhone;
    if (trimmedName && existingUser.displayName !== trimmedName) payload.displayName = trimmedName;

    if (Object.keys(payload).length > 0) {
      await updateDoc(doc(db, 'users', existingUser.id), payload);
    }

    return {
      ...existingUser,
      uid: trimmedUid || existingUser.uid,
      email:
        normalizedEmail && (matchedBy === 'uid' || matchedBy === 'email' || !existingUser.email)
          ? normalizedEmail
          : existingUser.email,
      phone: normalizedPhone || existingUser.phone,
      displayName: trimmedName || existingUser.displayName,
      customerType: nextCustomerType,
      addresses: nextAddresses,
    };
  }

  const newUser = {
    ...(trimmedUid ? { uid: trimmedUid } : {}),
    email: normalizedEmail,
    displayName: trimmedName,
    ...(normalizedPhone ? { phone: normalizedPhone } : {}),
    role: 'customer' as const,
    customerType,
    customer_type: customerType,
    addresses: nextAddresses,
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, 'users'), newUser);
  return {
    id: ref.id,
    uid: trimmedUid || undefined,
    email: normalizedEmail,
    displayName: trimmedName,
    phone: normalizedPhone || '',
    role: 'customer',
    customerType,
    customer_type: customerType,
    addresses: nextAddresses,
    createdAt: new Date(),
  };
}

export async function createOrder(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'orders'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

export async function createWebsiteOrderWithInventory(
  data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const customer = await syncCustomerProfile({
    uid: data.userId,
    email: data.userEmail,
    phone: data.shippingAddress.phone,
    displayName: data.shippingAddress.fullName,
    address: data.shippingAddress,
    customerType: 'website',
  });
  const orderRef = doc(collection(db, 'orders'));
  const inventoryCollectionRef = collection(db, 'inventoryTransactions');

  await runTransaction(db, async (transaction) => {
    const aggregatedItems = data.items.reduce<Map<string, {
      productId: string;
      productName: string;
      quantity: number;
    }>>((acc, item) => {
      const existing = acc.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
        return acc;
      }

      acc.set(item.productId, {
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
      });
      return acc;
    }, new Map());

    for (const aggregatedItem of aggregatedItems.values()) {
      const productRef = doc(db, 'products', aggregatedItem.productId);
      const productSnap = await transaction.get(productRef);

      if (!productSnap.exists()) {
        throw new Error(`${aggregatedItem.productName} is no longer available.`);
      }

      const product = normalizeProduct(productSnap.id, productSnap.data() as Record<string, unknown>);
      const previousStock = product.stockQuantity;

      if (previousStock <= 0) {
        throw new Error(`${product.name} is out of stock.`);
      }

      if (aggregatedItem.quantity > previousStock) {
        throw new Error(`${product.name} has only ${previousStock} in stock.`);
      }

      const newStock = previousStock - aggregatedItem.quantity;
      const nextStockFields = resolveProductStockFields({
        stockQuantity: newStock,
        lowStockLimit: product.lowStockLimit,
      });

      transaction.update(productRef, {
        ...nextStockFields,
        lastStockUpdatedAt: serverTimestamp(),
        lastStockUpdatedBy: 'system',
        updatedAt: serverTimestamp(),
      });

      const inventoryRef = doc(inventoryCollectionRef);
      transaction.set(inventoryRef, {
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        type: 'OUT',
        source: 'WEBSITE_ORDER',
        orderId: orderRef.id,
        quantity: aggregatedItem.quantity,
        previousStock,
        newStock,
        createdAt: serverTimestamp(),
        createdBy: 'system',
      });
    }

    transaction.set(orderRef, {
      ...data,
      customerId: customer.id,
      source: data.source || 'website_order',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  return orderRef.id;
}

export async function createManualSaleWithInventory(
  data: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'source' | 'manualOrderId' | 'challanId'>,
  createdBy: string,
): Promise<string> {
  const customer = await syncCustomerProfile({
    email: data.userEmail,
    phone: data.shippingAddress.phone,
    displayName: data.shippingAddress.fullName,
    address: data.shippingAddress,
    customerType: 'manual',
  });
  const orderRef = doc(collection(db, 'orders'));
  const inventoryCollectionRef = collection(db, 'inventoryTransactions');

  await runTransaction(db, async (transaction) => {
    const aggregatedItems = data.items.reduce<Map<string, {
      productId: string;
      productName: string;
      quantity: number;
    }>>((acc, item) => {
      const existing = acc.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
        return acc;
      }

      acc.set(item.productId, {
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
      });
      return acc;
    }, new Map());

    for (const aggregatedItem of aggregatedItems.values()) {
      const productRef = doc(db, 'products', aggregatedItem.productId);
      const productSnap = await transaction.get(productRef);

      if (!productSnap.exists()) {
        throw new Error(`${aggregatedItem.productName} is no longer available.`);
      }

      const product = normalizeProduct(productSnap.id, productSnap.data() as Record<string, unknown>);
      const previousStock = product.stockQuantity;

      if (previousStock <= 0) {
        throw new Error(`${product.name} is out of stock.`);
      }

      if (aggregatedItem.quantity > previousStock) {
        throw new Error(`${product.name} has only ${previousStock} in stock.`);
      }

      const newStock = previousStock - aggregatedItem.quantity;
      const nextStockFields = resolveProductStockFields({
        stockQuantity: newStock,
        lowStockLimit: product.lowStockLimit,
      });

      transaction.update(productRef, {
        ...nextStockFields,
        lastStockUpdatedAt: serverTimestamp(),
        lastStockUpdatedBy: createdBy,
        updatedAt: serverTimestamp(),
      });

      const inventoryRef = doc(inventoryCollectionRef);
      transaction.set(inventoryRef, {
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        type: 'OUT',
        source: 'MANUAL_SALE',
        manualOrderId: orderRef.id,
        quantity: aggregatedItem.quantity,
        previousStock,
        newStock,
        createdAt: serverTimestamp(),
        createdBy,
      });
    }

    transaction.set(orderRef, {
      ...data,
      customerId: customer.id,
      source: 'manual_sale',
      manualOrderId: orderRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  const saleLabel = data.shippingAddress.fullName || data.userEmail || orderRef.id;
  await logAdminActivity({
    action: 'manual_sale',
    entity: 'manual_sale',
    entityId: orderRef.id,
    entityLabel: saleLabel,
    message: `Created manual sale for "${saleLabel}"`,
    actor: createdBy,
    metadata: {
      total: data.total,
      items: data.items.length,
      status: data.status,
      paymentMethod: data.paymentMethod,
    },
  });

  return orderRef.id;
}

export async function addInventoryStock(
  productId: string,
  quantity: number,
  note: string,
  createdBy: string,
): Promise<void> {
  const safeQuantity = sanitizeStockValue(quantity);
  if (safeQuantity <= 0) {
    throw new Error('Quantity must be greater than 0.');
  }

  const productRef = doc(db, 'products', productId);
  const inventoryRef = doc(collection(db, 'inventoryTransactions'));

  await runTransaction(db, async (transaction) => {
    const productSnap = await transaction.get(productRef);

    if (!productSnap.exists()) {
      throw new Error('Product not found.');
    }

    const product = normalizeProduct(productSnap.id, productSnap.data() as Record<string, unknown>);
    const previousStock = product.stockQuantity;
    const newStock = previousStock + safeQuantity;
    const nextStockFields = resolveProductStockFields({
      stockQuantity: newStock,
      lowStockLimit: product.lowStockLimit,
    });

    transaction.update(productRef, {
      ...nextStockFields,
      lastStockUpdatedAt: serverTimestamp(),
      lastStockUpdatedBy: createdBy,
      updatedAt: serverTimestamp(),
    });

    transaction.set(inventoryRef, {
      productId: product.id,
      productName: product.name,
      unit: product.unit,
      type: 'IN',
      source: 'ADMIN_STOCK_ADD',
      quantity: safeQuantity,
      previousStock,
      newStock,
      note: note.trim(),
      createdAt: serverTimestamp(),
      createdBy,
    });
  });

  const product = await getProductById(productId);
  await logAdminActivity({
    action: 'stock_add',
    entity: 'inventory',
    entityId: productId,
    entityLabel: product?.name || productId,
    message: `Added ${quantity} ${(product?.unit || 'gram').toUpperCase()} to "${product?.name || productId}"`,
    actor: createdBy,
    metadata: {
      quantity,
      note: note.trim() || null,
      newStock: product?.stockQuantity ?? null,
    },
  });
}

export async function saveProductionEntryWithInventory(
  data: SaveProductionEntryInput,
  createdBy: string,
): Promise<{
  productionId: string;
  productId: string;
  productName: string;
  finishedInventoryTransactionId: string;
  rawMaterialInventoryTransactionIds: string[];
  productionWeightGrams: number;
  productionWeightKg: number;
  quantityProducedBottles: number;
}> {
  const safeBottleCount = Math.max(0, Math.floor(sanitizeStockValue(data.quantityProducedBottles)));
  if (safeBottleCount <= 0) {
    throw new Error('Quantity produced must be greater than 0.');
  }

  const normalizedRawMaterials = data.rawMaterials
    .map((item) => ({
      productId: item.productId.trim(),
      productName: item.productName.trim(),
      quantityKg: sanitizeStockValue(item.quantityKg),
    }))
    .filter((item) => item.productId && item.quantityKg > 0);

  if (normalizedRawMaterials.length === 0) {
    throw new Error('Add at least one raw material.');
  }

  const aggregatedRawMaterials = Array.from(
    normalizedRawMaterials.reduce<Map<string, ProductionConsumptionItemInput>>((map, item) => {
      const existing = map.get(item.productId);
      if (existing) {
        existing.quantityKg += item.quantityKg;
        return map;
      }

      map.set(item.productId, { ...item });
      return map;
    }, new Map()).values(),
  );

  const productionRef = doc(collection(db, 'production'));
  const finishedInventoryRef = doc(collection(db, 'inventoryTransactions'));
  const rawMaterialInventoryRefs = aggregatedRawMaterials.map((item) => ({
    item,
    ref: doc(collection(db, 'inventoryTransactions')),
  }));

  let savedProductName = '';
  let productionWeightGrams = 0;
  let productionWeightKg = 0;
  const rawMaterialInventoryTransactionIds = rawMaterialInventoryRefs.map((entry) => entry.ref.id);

  await runTransaction(db, async (transaction) => {
    const productRef = doc(db, 'products', data.productId);
    const productSnap = await transaction.get(productRef);

    if (!productSnap.exists()) {
      throw new Error('Selected production product could not be found.');
    }

    const product = normalizeProduct(productSnap.id, productSnap.data() as Record<string, unknown>);
    savedProductName = product.name;

    if (!isProductionProductCategorySlug(product.categoryId)) {
      throw new Error('Selected product is not a production product.');
    }

    const bottleWeightGram = sanitizeBottleWeightGram(product.bottle_weight_gram);
    if (!bottleWeightGram || bottleWeightGram <= 0) {
      throw new Error('Selected production product does not have a valid bottle weight.');
    }

    productionWeightGrams = safeBottleCount * bottleWeightGram;
    productionWeightKg = productionWeightGrams / 1000;

    const currentProductStock = sanitizeStockValue(product.stockQuantity);
    const newProductStock = currentProductStock + productionWeightGrams;

    const rawMaterialSnapshots = await Promise.all(
      aggregatedRawMaterials.map(async (item) => {
        const rawMaterialRef = doc(db, 'products', item.productId);
        const rawMaterialSnap = await transaction.get(rawMaterialRef);

        if (!rawMaterialSnap.exists()) {
          throw new Error('One of the selected raw materials could not be found.');
        }

        const rawMaterialProduct = normalizeProduct(rawMaterialSnap.id, rawMaterialSnap.data() as Record<string, unknown>);
        if (!isCoreProductCategorySlug(rawMaterialProduct.categoryId) || rawMaterialProduct.categoryId !== 'raw-material') {
          throw new Error('One of the selected items is not a raw material product.');
        }

        const currentStock = sanitizeStockValue(rawMaterialProduct.stockQuantity);
        const requiredStock = sanitizeStockValue(item.quantityKg);

        if (currentStock < requiredStock) {
          throw new Error('Insufficient raw material stock.');
        }

        return {
          item,
          rawMaterialProduct,
          rawMaterialRef,
          currentStock,
          requiredStock,
        };
      }),
    );

    rawMaterialSnapshots.forEach(({ item, rawMaterialProduct, rawMaterialRef, currentStock, requiredStock }) => {
      const newStock = currentStock - requiredStock;
      if (newStock < 0) {
        throw new Error('Insufficient raw material stock.');
      }

      transaction.update(rawMaterialRef, {
        ...resolveProductStockFields({
          stockQuantity: newStock,
          lowStockLimit: rawMaterialProduct.lowStockLimit,
        }),
        lastStockUpdatedAt: serverTimestamp(),
        lastStockUpdatedBy: createdBy,
        updatedAt: serverTimestamp(),
      });

      const inventoryRef = rawMaterialInventoryRefs.find((entry) => entry.item.productId === item.productId)?.ref;
      if (inventoryRef) {
        transaction.set(inventoryRef, {
          productId: rawMaterialProduct.id,
          productName: rawMaterialProduct.name,
          productionBatchId: productionRef.id,
          unit: 'kg',
          type: 'OUT',
          source: 'PRODUCTION_CONSUMPTION',
          quantity: requiredStock,
          previousStock: currentStock,
          newStock,
          note: `Consumed in production batch ${productionRef.id} (${data.productionDate})`,
          createdAt: serverTimestamp(),
          createdBy,
        });
      }
    });

    transaction.update(productRef, {
      ...resolveProductStockFields({
        stockQuantity: newProductStock,
        lowStockLimit: product.lowStockLimit,
      }),
      lastStockUpdatedAt: serverTimestamp(),
      lastStockUpdatedBy: createdBy,
      updatedAt: serverTimestamp(),
    });

    transaction.set(productionRef, {
      productId: product.id,
      productName: product.name,
      productionQty: safeBottleCount,
      quantityProducedBottles: safeBottleCount,
      bottleWeightGram,
      productionWeightGrams,
      productionWeightKg,
      productionDate: data.productionDate,
      notes: data.notes?.trim() || '',
      rawMaterials: aggregatedRawMaterials.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        qty: item.quantityKg,
      })),
      rawMaterialConsumption: aggregatedRawMaterials.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        qty: item.quantityKg,
      })),
      finishedInventoryTransactionId: finishedInventoryRef.id,
      rawMaterialInventoryTransactionIds,
      createdBy,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.set(finishedInventoryRef, {
      productId: product.id,
      productName: product.name,
      productionBatchId: productionRef.id,
      unit: 'gram',
      type: 'IN',
      source: 'PRODUCTION',
      quantity: productionWeightGrams,
      previousStock: currentProductStock,
      newStock: newProductStock,
      note: `Production batch ${productionRef.id} (${data.productionDate})`,
      createdAt: serverTimestamp(),
      createdBy,
    });
  });

  await logAdminActivity({
    action: 'stock_add',
    entity: 'inventory',
    entityId: productionRef.id,
    entityLabel: savedProductName || data.productId,
    message: `Recorded production stock movement for "${savedProductName || data.productId}"`,
    actor: createdBy,
    metadata: {
      productId: data.productId,
      quantityProducedBottles: safeBottleCount,
      productionWeightGrams,
      productionWeightKg,
      rawMaterialLines: aggregatedRawMaterials.length,
    },
  });

  return {
    productionId: productionRef.id,
    productId: data.productId,
    productName: savedProductName,
    finishedInventoryTransactionId: finishedInventoryRef.id,
    rawMaterialInventoryTransactionIds,
    productionWeightGrams,
    productionWeightKg,
    quantityProducedBottles: safeBottleCount,
  };
}

export async function getInventoryTransactions(): Promise<InventoryTransaction[]> {
  const q = query(collection(db, 'inventoryTransactions'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => normalizeInventoryTransaction(docSnap.id, docSnap.data()));
}

export async function getAdminActivityLogs(maxEntries = 100): Promise<AdminActivityLog[]> {
  const q = query(collection(db, 'adminActivityLogs'), orderBy('createdAt', 'desc'), limit(maxEntries));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => normalizeAdminActivityLog(docSnap.id, docSnap.data()));
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  try {
    const q = query(collection(db, 'orders'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => normalizeOrder(d.id, d.data()));
  } catch {
    const fallbackQ = query(collection(db, 'orders'), where('userId', '==', userId));
    const snap = await getDocs(fallbackQ);
    return snap.docs
      .map((d) => normalizeOrder(d.id, d.data()))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export async function getAllOrders(): Promise<Order[]> {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => normalizeOrder(d.id, d.data()));
}

export async function getManualSales(): Promise<Order[]> {
  try {
    const q = query(collection(db, 'orders'), where('source', '==', 'manual_sale'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => normalizeOrder(d.id, d.data()));
  } catch {
    const fallbackQ = query(collection(db, 'orders'), where('source', '==', 'manual_sale'));
    const snap = await getDocs(fallbackQ);
    return snap.docs
      .map((d) => normalizeOrder(d.id, d.data()))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export async function getOrderById(id: string): Promise<Order | null> {
  const snap = await getDoc(doc(db, 'orders', id));
  if (!snap.exists()) return null;
  return normalizeOrder(snap.id, snap.data());
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  updatedBy = 'admin',
  cancellationNote?: string,
): Promise<void> {
  const orderRef = doc(db, 'orders', id);
  const inventoryCollectionRef = collection(db, 'inventoryTransactions');
  let previousStatus: OrderStatus | null = null;
  let orderLabel = id;
  let orderTotal = 0;
  const sanitizedCancellationNote = cancellationNote?.trim() || '';

  await runTransaction(db, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) {
      throw new Error('Order not found.');
    }

    const order = normalizeOrder(orderSnap.id, orderSnap.data() as Record<string, unknown>);
    previousStatus = order.status;
    orderLabel = order.manualOrderId || order.id;
    orderTotal = order.total;
    const shouldRestoreStock = status === 'cancelled' && !order.stockRestoredOnCancel;
    const shouldDeductStockAgain = status !== 'cancelled' && order.status === 'cancelled' && order.stockRestoredOnCancel;
    const aggregatedItems = order.items.reduce<Map<string, {
      productId: string;
      productName: string;
      quantity: number;
    }>>((acc, item) => {
      const existing = acc.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
        return acc;
      }

      acc.set(item.productId, {
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
      });
      return acc;
    }, new Map());

    if (shouldRestoreStock) {
      for (const aggregatedItem of aggregatedItems.values()) {
        const productRef = doc(db, 'products', aggregatedItem.productId);
        const productSnap = await transaction.get(productRef);

        if (!productSnap.exists()) {
          continue;
        }

        const product = normalizeProduct(productSnap.id, productSnap.data() as Record<string, unknown>);
        const previousStock = product.stockQuantity;
        const newStock = previousStock + aggregatedItem.quantity;
        const nextStockFields = resolveProductStockFields({
          stockQuantity: newStock,
          lowStockLimit: product.lowStockLimit,
        });

        transaction.update(productRef, {
          ...nextStockFields,
          lastStockUpdatedAt: serverTimestamp(),
          lastStockUpdatedBy: updatedBy,
          updatedAt: serverTimestamp(),
        });

        const inventoryRef = doc(inventoryCollectionRef);
        transaction.set(inventoryRef, {
          productId: product.id,
          productName: product.name,
          unit: product.unit,
          type: 'IN',
          source: 'ORDER_CANCELLATION',
          orderId: order.id,
          ...(order.manualOrderId ? { manualOrderId: order.manualOrderId } : {}),
          quantity: aggregatedItem.quantity,
          previousStock,
          newStock,
          note: `Stock restored after order cancellation (${order.manualOrderId || order.id})`,
          createdAt: serverTimestamp(),
          createdBy: updatedBy,
        });
      }
    }

    if (shouldDeductStockAgain) {
      for (const aggregatedItem of aggregatedItems.values()) {
        const productRef = doc(db, 'products', aggregatedItem.productId);
        const productSnap = await transaction.get(productRef);

        if (!productSnap.exists()) {
          throw new Error(`${aggregatedItem.productName} is no longer available.`);
        }

        const product = normalizeProduct(productSnap.id, productSnap.data() as Record<string, unknown>);
        const previousStock = product.stockQuantity;

        if (aggregatedItem.quantity > previousStock) {
          throw new Error(`${product.name} has only ${previousStock} in stock.`);
        }

        const newStock = previousStock - aggregatedItem.quantity;
        const nextStockFields = resolveProductStockFields({
          stockQuantity: newStock,
          lowStockLimit: product.lowStockLimit,
        });

        transaction.update(productRef, {
          ...nextStockFields,
          lastStockUpdatedAt: serverTimestamp(),
          lastStockUpdatedBy: updatedBy,
          updatedAt: serverTimestamp(),
        });

        const inventoryRef = doc(inventoryCollectionRef);
        transaction.set(inventoryRef, {
          productId: product.id,
          productName: product.name,
          unit: product.unit,
          type: 'OUT',
          source: 'ORDER_REACTIVATION',
          orderId: order.id,
          ...(order.manualOrderId ? { manualOrderId: order.manualOrderId } : {}),
          quantity: aggregatedItem.quantity,
          previousStock,
          newStock,
          note: `Stock deducted after order reactivation (${order.manualOrderId || order.id})`,
          createdAt: serverTimestamp(),
          createdBy: updatedBy,
        });
      }
    }

    transaction.update(orderRef, {
      status,
      ...(status === 'cancelled' ? { cancellationNote: sanitizedCancellationNote } : {}),
      ...(shouldRestoreStock ? { stockRestoredOnCancel: true } : {}),
      ...(shouldDeductStockAgain ? { stockRestoredOnCancel: false } : {}),
      updatedAt: serverTimestamp(),
    });
  });

  await logAdminActivity({
    action: 'status_change',
    entity: 'order',
    entityId: id,
    entityLabel: orderLabel,
    message: `Changed order "${orderLabel}" status from ${previousStatus || 'unknown'} to ${status}`,
    actor: updatedBy,
    metadata: {
      previousStatus: previousStatus || 'unknown',
      newStatus: status,
      total: orderTotal,
      cancellationNote: status === 'cancelled' ? (sanitizedCancellationNote || null) : null,
    },
  });
}

export async function generateDeliveryChallanFromOrder(orderId: string, createdBy: string): Promise<string> {
  const existing = await getDeliveryChallansByOrderId(orderId);
  if (existing.length > 0) {
    return existing[0].id;
  }

  const order = await getOrderById(orderId);
  if (!order) {
    throw new Error('Order not found.');
  }

  const shippingAddress = {
    ...order.shippingAddress,
    country: order.shippingAddress.country || 'India',
  };

  const challanId = await createDeliveryChallan({
    orderId: order.id,
    orderSource: order.source || 'website_order',
    manualOrderId: order.manualOrderId || order.id,
    customerName: order.shippingAddress.fullName || '',
    customerEmail: order.userEmail || '',
    customerPhone: order.shippingAddress.phone || '',
    billingAddress: shippingAddress,
    shippingAddress,
    products: order.items.map((item) => ({ ...item })),
    subtotal: order.subtotal,
    discount: order.discount || 0,
    gst: order.gst || 0,
    totalAmount: order.total,
    remarks: order.notes || '',
    transportDetails: {},
    consignmentImages: [],
    proofOfDeliveryImages: [],
    receiverName: '',
    receiverPhone: '',
    deliveryRemarks: '',
    status: 'draft',
    createdBy,
    dispatchedAt: null,
    deliveredAt: null,
  });

  await updateDoc(doc(db, 'orders', order.id), {
    challanId,
    updatedAt: serverTimestamp(),
  });

  await logAdminActivity({
    action: 'create',
    entity: 'delivery_challan',
    entityId: challanId,
    entityLabel: order.manualOrderId || order.id,
    message: `Generated delivery challan for order "${order.manualOrderId || order.id}"`,
    actor: createdBy,
    metadata: {
      orderId: order.id,
      source: order.source || 'website_order',
    },
  });

  return challanId;
}

export async function getOrderItemStockIssues(
  items: Pick<OrderItem, 'productId' | 'productName' | 'quantity'>[],
): Promise<Array<{
  productId: string;
  productName: string;
  requestedQuantity: number;
  stockQuantity: number;
  reason: 'missing_product' | 'out_of_stock' | 'insufficient_stock';
}>> {
  const products = await Promise.all(items.map((item) => getProductById(item.productId)));
  const issues: Array<{
    productId: string;
    productName: string;
    requestedQuantity: number;
    stockQuantity: number;
    reason: 'missing_product' | 'out_of_stock' | 'insufficient_stock';
  }> = [];

  items.forEach((item, index) => {
    const product = products[index];

    if (!product) {
      issues.push({
        productId: item.productId,
        productName: item.productName,
        requestedQuantity: item.quantity,
        stockQuantity: 0,
        reason: 'missing_product',
      });
      return;
    }

    if (product.stockQuantity <= 0) {
      issues.push({
        productId: item.productId,
        productName: item.productName,
        requestedQuantity: item.quantity,
        stockQuantity: product.stockQuantity,
        reason: 'out_of_stock',
      });
      return;
    }

    if (item.quantity > product.stockQuantity) {
      issues.push({
        productId: item.productId,
        productName: item.productName,
        requestedQuantity: item.quantity,
        stockQuantity: product.stockQuantity,
        reason: 'insufficient_stock',
      });
    }
  });

  return issues;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function generateNextDeliveryChallanNumber(): Promise<string> {
  const counterRef = doc(db, 'appMeta', 'deliveryChallanCounter');
  const latestSequence = await getLatestDeliveryChallanSequence();

  const nextSequence = await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    const currentSequence = counterSnap.exists()
      ? Number(counterSnap.data().lastSequence || 0)
      : latestSequence;
    const safeCurrentSequence = Number.isFinite(currentSequence) ? currentSequence : latestSequence;
    const newSequence = Math.max(safeCurrentSequence, latestSequence) + 1;

    transaction.set(counterRef, {
      lastSequence: newSequence,
      updatedAt: serverTimestamp(),
    });

    return newSequence;
  });

  return formatDeliveryChallanNumber(nextSequence);
}

export async function createDeliveryChallan(
  data: Omit<DeliveryChallan, 'id' | 'createdAt' | 'updatedAt' | 'challanNumber'> & {
    challanNumber?: string;
  },
  actor?: string | AdminActivityActor,
): Promise<string> {
  const challanNumber = data.challanNumber || await generateNextDeliveryChallanNumber();
  const ref = await addDoc(collection(db, 'deliveryChallans'), {
    ...data,
    challanNumber,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await logAdminActivity({
    action: 'create',
    entity: 'delivery_challan',
    entityId: ref.id,
    entityLabel: challanNumber,
    message: `Created delivery challan "${challanNumber}"`,
    actor: actor || data.createdBy,
    metadata: {
      orderId: data.orderId,
      source: data.orderSource || 'website_order',
      status: data.status,
    },
  });
  return ref.id;
}

export async function getAllDeliveryChallans(): Promise<DeliveryChallan[]> {
  const q = query(collection(db, 'deliveryChallans'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => normalizeDeliveryChallan(d.id, d.data()));
}

export async function getDeliveryChallanById(id: string): Promise<DeliveryChallan | null> {
  const snap = await getDoc(doc(db, 'deliveryChallans', id));
  if (!snap.exists()) return null;
  return normalizeDeliveryChallan(snap.id, snap.data());
}

export async function getDeliveryChallansByOrderId(orderId: string): Promise<DeliveryChallan[]> {
  try {
    const q = query(collection(db, 'deliveryChallans'), where('orderId', '==', orderId), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => normalizeDeliveryChallan(d.id, d.data()));
  } catch {
    const fallbackQ = query(collection(db, 'deliveryChallans'), where('orderId', '==', orderId));
    const snap = await getDocs(fallbackQ);
    return snap.docs
      .map((d) => normalizeDeliveryChallan(d.id, d.data()))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export async function updateDeliveryChallan(id: string, data: Partial<DeliveryChallan>): Promise<void> {
  await updateDoc(doc(db, 'deliveryChallans', id), { ...data, updatedAt: serverTimestamp() });
}

export async function updateDeliveryChallanStatus(
  id: string,
  status: DeliveryChallanStatus,
  extra?: Partial<Pick<DeliveryChallan, 'dispatchedAt' | 'deliveredAt'>>
): Promise<void> {
  await updateDoc(doc(db, 'deliveryChallans', id), {
    status,
    ...extra,
    updatedAt: serverTimestamp(),
  });
}

export async function markDeliveryChallanAsDispatched(id: string, updatedBy = 'admin'): Promise<Date> {
  const now = new Date();
  let challanNumber = id;
  let orderId = '';

  await runTransaction(db, async (transaction) => {
    const challanRef = doc(db, 'deliveryChallans', id);
    const challanSnap = await transaction.get(challanRef);

    if (!challanSnap.exists()) {
      throw new Error('Delivery challan not found.');
    }

    const challan = challanSnap.data() as Record<string, unknown>;
    challanNumber = (challan.challanNumber as string) || id;
    orderId = typeof challan.orderId === 'string' ? challan.orderId : '';

    transaction.update(challanRef, {
      status: 'dispatched',
      dispatchedAt: challan.dispatchedAt ?? now,
      updatedAt: serverTimestamp(),
    });

    if (!orderId) {
      throw new Error('Linked order not found for this challan.');
    }

    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await transaction.get(orderRef);

    if (!orderSnap.exists()) {
      throw new Error('Linked order could not be loaded.');
    }

    // Stock is intentionally not touched here because sale completion owns deduction.
    transaction.update(orderRef, {
      status: 'dispatched',
      challanId: id,
      updatedAt: serverTimestamp(),
    });
  });

  await logAdminActivity({
    action: 'status_change',
    entity: 'delivery_challan',
    entityId: id,
    entityLabel: challanNumber,
    message: `Marked delivery challan "${challanNumber}" as dispatched`,
    actor: updatedBy,
    metadata: {
      orderId: orderId || null,
      newStatus: 'dispatched',
    },
  });

  return now;
}

export async function markDeliveryChallanAsDelivered(
  id: string,
  podDetails: Pick<DeliveryChallan, 'receiverName' | 'receiverPhone' | 'deliveryRemarks' | 'proofOfDeliveryImages'>,
  updatedBy = 'admin',
): Promise<Date> {
  const now = new Date();
  const receiverName = podDetails.receiverName?.trim() || '';
  const receiverPhone = podDetails.receiverPhone?.trim() || '';
  const deliveryRemarks = podDetails.deliveryRemarks?.trim() || '';
  const proofOfDeliveryImages = Array.isArray(podDetails.proofOfDeliveryImages)
    ? podDetails.proofOfDeliveryImages
    : [];

  if (!receiverName && proofOfDeliveryImages.length === 0) {
    throw new Error('Receiver name or at least one POD image is required.');
  }

  let challanNumber = id;
  let orderId = '';

  await runTransaction(db, async (transaction) => {
    const challanRef = doc(db, 'deliveryChallans', id);
    const challanSnap = await transaction.get(challanRef);

    if (!challanSnap.exists()) {
      throw new Error('Delivery challan not found.');
    }

    const challan = challanSnap.data() as Record<string, unknown>;
    challanNumber = (challan.challanNumber as string) || id;
    orderId = typeof challan.orderId === 'string' ? challan.orderId : '';

    transaction.update(challanRef, {
      status: 'delivered',
      dispatchedAt: challan.dispatchedAt ?? now,
      deliveredAt: now,
      receiverName,
      receiverPhone,
      deliveryRemarks,
      proofOfDeliveryImages,
      updatedAt: serverTimestamp(),
    });

    if (!orderId) {
      throw new Error('Linked order not found for this challan.');
    }

    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await transaction.get(orderRef);

    if (!orderSnap.exists()) {
      throw new Error('Linked order could not be loaded.');
    }

    transaction.update(orderRef, {
      status: 'delivered',
      challanId: id,
      updatedAt: serverTimestamp(),
    });
  });

  await logAdminActivity({
    action: 'status_change',
    entity: 'delivery_challan',
    entityId: id,
    entityLabel: challanNumber,
    message: `Marked delivery challan "${challanNumber}" as delivered`,
    actor: updatedBy,
    metadata: {
      orderId: orderId || null,
      newStatus: 'delivered',
      receiverName: receiverName || null,
      podImages: proofOfDeliveryImages.length,
    },
  });

  return now;
}

export async function deleteDeliveryChallan(id: string, actor?: string | AdminActivityActor): Promise<void> {
  const existing = await getDeliveryChallanById(id);
  await deleteDoc(doc(db, 'deliveryChallans', id));
  await logAdminActivity({
    action: 'delete',
    entity: 'delivery_challan',
    entityId: id,
    entityLabel: existing?.challanNumber || id,
    message: `Deleted delivery challan "${existing?.challanNumber || id}"`,
    actor,
    metadata: existing
      ? {
          orderId: existing.orderId,
          status: existing.status,
        }
      : undefined,
  });
}

export async function createUserProfile(uid: string, data: Omit<User, 'id' | 'createdAt'>): Promise<void> {
  await addDoc(collection(db, 'users'), {
    uid,
    ...data,
    email: normalizeEmail(data.email),
    phone: normalizePhone(data.phone),
    customerType: data.customerType || 'website',
    customer_type: data.customerType || data.customer_type || 'website',
    createdAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const q = query(collection(db, 'users'), where('uid', '==', uid));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  await updateLegacyCustomerType(docSnap.id, docSnap.data().customerType);
  return normalizeUser(docSnap.id, docSnap.data() as Record<string, unknown>);
}

export async function getUserById(id: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', id));
  if (!snap.exists()) return null;
  await updateLegacyCustomerType(snap.id, snap.data().customerType);
  return normalizeUser(snap.id, snap.data() as Record<string, unknown>);
}

export async function updateUserProfile(uid: string, data: Partial<User>): Promise<void> {
  const q = query(collection(db, 'users'), where('uid', '==', uid));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const payload: Record<string, unknown> = {
      ...data,
      customerType: data.customerType || 'website',
      customer_type: data.customerType || data.customer_type || 'website',
    };
    if (typeof data.email === 'string') payload.email = normalizeEmail(data.email);
    if (typeof data.phone === 'string') payload.phone = normalizePhone(data.phone);
    await updateDoc(snap.docs[0].ref, payload);
  }
}

export async function getAllUsers(filter: CustomerTypeFilter = 'all'): Promise<User[]> {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  await migrateLegacyCustomersCustomerType(snap.docs as any[]);

  const users = snap.docs.map((docSnap) => normalizeUser(docSnap.id, docSnap.data() as Record<string, unknown>));
  if (filter === 'all') return users;
  return users.filter((user) => user.customerType === filter);
}

export async function getCustomerList(options: CustomerListOptions = {}): Promise<CustomerListResult> {
  const {
    customerType = 'all',
    search = '',
    sortBy = 'createdAt',
    sortDirection = 'desc',
    page = 1,
    pageSize = 10,
  } = options;

  const users = await getAllUsers(customerType);
  const normalizedSearch = search.trim().toLowerCase();

  const filteredUsers = normalizedSearch
    ? users.filter((user) => {
        const sourceLabel = user.customerType === 'manual' ? 'manual order' : 'website registration checkout';
        return [
          user.displayName,
          user.email,
          user.phone || '',
          user.customerType,
          sourceLabel,
        ].some((value) => value.toLowerCase().includes(normalizedSearch));
      })
    : users;

  const sortedUsers = [...filteredUsers].sort((left, right) =>
    compareCustomers(left, right, sortBy, sortDirection),
  );

  const safePageSize = Math.max(1, pageSize);
  const totalCount = sortedUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / safePageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * safePageSize;
  const pagedUsers = sortedUsers.slice(startIndex, startIndex + safePageSize);

  return {
    users: pagedUsers,
    totalCount,
    totalPages,
    page: safePage,
    pageSize: safePageSize,
  };
}

export async function getTeamMemberProfile(uid: string): Promise<TeamMember | null> {
  const q = query(collection(db, 'teamMembers'), where('uid', '==', uid), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return normalizeTeamMember(snap.docs[0].id, snap.docs[0].data());
}

export async function getAllTeamMembers(): Promise<TeamMember[]> {
  const q = query(collection(db, 'teamMembers'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => normalizeTeamMember(docSnap.id, docSnap.data()));
}

export async function getTeamAccessLogs(maxEntries = 200): Promise<TeamAccessLog[]> {
  const q = query(collection(db, 'teamAccessLogs'), orderBy('createdAt', 'desc'), limit(maxEntries));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => normalizeTeamAccessLog(docSnap.id, docSnap.data()));
}

// ─── Blogs ────────────────────────────────────────────────────────────────────

export async function getPublishedBlogPosts(): Promise<BlogPost[]> {
  const q = query(collection(db, 'blogs'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs
    .map((docSnap) => normalizeBlogPost(docSnap.id, docSnap.data()))
    .filter((post) => post.published)
    .sort((left, right) => {
      const leftTime = (left.publishedAt || left.createdAt).getTime();
      const rightTime = (right.publishedAt || right.createdAt).getTime();
      return rightTime - leftTime;
    });
}

export async function getFeaturedBlogPosts(maxEntries = 3): Promise<BlogPost[]> {
  const posts = await getPublishedBlogPosts();
  return posts.filter((post) => post.featured).slice(0, maxEntries);
}

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  const q = query(collection(db, 'blogs'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs
    .map((docSnap) => normalizeBlogPost(docSnap.id, docSnap.data()))
    .sort((left, right) => {
      const leftTime = (left.publishedAt || left.createdAt).getTime();
      const rightTime = (right.publishedAt || right.createdAt).getTime();
      return rightTime - leftTime;
    });
}

export async function getBlogPostById(id: string): Promise<BlogPost | null> {
  const snap = await getDoc(doc(db, 'blogs', id));
  if (!snap.exists()) return null;
  return normalizeBlogPost(snap.id, snap.data() as Record<string, unknown>);
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const normalizedSlug = slugify(slug);
  const q = query(collection(db, 'blogs'), where('slug', '==', normalizedSlug), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return normalizeBlogPost(snap.docs[0].id, snap.docs[0].data());
}

export async function createBlogPost(
  data: Omit<BlogPost, 'id' | 'createdAt' | 'updatedAt'>,
  actor?: string | AdminActivityActor,
): Promise<string> {
  const payload = sanitizeBlogWriteData(data);
  const title = payload.title || 'Untitled blog';
  const publishedAt = payload.published ? payload.publishedAt || serverTimestamp() : null;

  const ref = await addDoc(collection(db, 'blogs'), {
    ...payload,
    title,
    slug: payload.slug || slugify(title),
    excerpt: payload.excerpt || '',
    content: payload.content || '',
    coverImage: payload.coverImage || '',
    tags: payload.tags || [],
    featured: payload.featured || false,
    published: payload.published || false,
    authorName: payload.authorName || 'SS Packaging',
    seoTitle: payload.seoTitle || title,
    seoDescription: payload.seoDescription || payload.excerpt || '',
    internalLinks: payload.internalLinks || [],
    createdBy: payload.createdBy || (typeof actor === 'string' ? actor : actor?.email || actor?.uid || 'admin'),
    publishedAt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await logAdminActivity({
    action: 'create',
    entity: 'blog',
    entityId: ref.id,
    entityLabel: title,
    message: `Created blog "${title}"`,
    actor,
    metadata: {
      slug: payload.slug || slugify(title),
      published: Boolean(payload.published),
    },
  });

  return ref.id;
}

export async function updateBlogPost(
  id: string,
  data: Partial<BlogPost>,
  actor?: string | AdminActivityActor,
): Promise<void> {
  const payload = sanitizeBlogWriteData(data);
  const existing = await getBlogPostById(id);
  const shouldSetPublishedAt = typeof data.published === 'boolean' && data.published && !existing?.publishedAt;
  const shouldClearPublishedAt = typeof data.published === 'boolean' && !data.published;

  await updateDoc(doc(db, 'blogs', id), {
    ...payload,
    ...(shouldSetPublishedAt ? { publishedAt: serverTimestamp() } : {}),
    ...(shouldClearPublishedAt ? { publishedAt: null } : {}),
    updatedAt: serverTimestamp(),
  });

  await logAdminActivity({
    action: 'update',
    entity: 'blog',
    entityId: id,
    entityLabel: data.title || existing?.title || id,
    message: `Updated blog "${data.title || existing?.title || id}"`,
    actor,
    metadata: {
      updatedFields: Object.keys(data).join(', ') || 'none',
      published: typeof data.published === 'boolean' ? data.published : existing?.published ?? false,
    },
  });
}

export async function deleteBlogPost(id: string, actor?: string | AdminActivityActor): Promise<void> {
  const existing = await getDoc(doc(db, 'blogs', id));
  const postTitle = existing.exists() ? sanitizeOptionalText(existing.data().title) || id : id;
  await deleteDoc(doc(db, 'blogs', id));

  await logAdminActivity({
    action: 'delete',
    entity: 'blog',
    entityId: id,
    entityLabel: postTitle,
    message: `Deleted blog "${postTitle}"`,
    actor,
  });
}

// ─── Quotes ───────────────────────────────────────────────────────────────────

export async function createQuoteRequest(data: Omit<QuoteRequest, 'id' | 'createdAt' | 'status'>): Promise<string> {
  const ref = await addDoc(collection(db, 'quotes'), { ...data, status: 'new', createdAt: serverTimestamp() });
  return ref.id;
}

export async function getAllQuotes(): Promise<QuoteRequest[]> {
  const q = query(collection(db, 'quotes'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return { id: d.id, ...data, createdAt: data.createdAt?.toDate?.() ?? new Date() } as QuoteRequest;
  });
}

export async function deleteQuoteRequest(id: string, actor?: string | AdminActivityActor): Promise<void> {
  const existing = await getDoc(doc(db, 'quotes', id));
  const quoteData = existing.exists() ? (existing.data() as Record<string, unknown>) : null;
  await deleteDoc(doc(db, 'quotes', id));
  await logAdminActivity({
    action: 'delete',
    entity: 'quote',
    entityId: id,
    entityLabel: (quoteData?.name as string) || id,
    message: `Deleted quote request from "${(quoteData?.name as string) || id}"`,
    actor,
    metadata: quoteData
      ? {
          email: (quoteData.email as string) || '',
          productInterest: (quoteData.productInterest as string) || '',
        }
      : undefined,
  });
}
