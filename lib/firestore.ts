import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, runTransaction, writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
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
  Material,
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
  return Math.max(0, Math.floor(value));
}

function sanitizeLowStockLimit(value: unknown, fallback = DEFAULT_LOW_STOCK_LIMIT): number {
  return Math.max(DEFAULT_LOW_STOCK_LIMIT, sanitizeStockValue(value, fallback));
}

export function calculateStockStatus(stockQuantity: number, lowStockLimit: number): Product['stockStatus'] {
  if (stockQuantity <= 0) return 'out_of_stock';
  if (stockQuantity < lowStockLimit) return 'low_stock';
  return 'in_stock';
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

function normalizeProduct(id: string, data: Record<string, unknown>): Product {
  const variants = (Array.isArray(data.variants) ? data.variants : []).map((v: any) => ({
    id: v?.id || Math.random().toString(36).slice(2),
    images: Array.isArray(v?.images) ? v.images : [],
    capacity: v?.capacity || v?.size || undefined,
    neckSize: v?.neckSize || undefined,
    material: v?.material || undefined,
    height: v?.height || undefined,
    weight: v?.weight || undefined,
    packagingSize: v?.packagingSize || undefined,
    color: v?.color || undefined,
    sku: v?.sku || undefined,
    price: typeof v?.price === 'number' ? v.price : undefined,
    remark: v?.remark || undefined,
  }));

  return {
    id,
    name: (data.name as string) || '',
    slug: (data.slug as string) || '',
    shortDescription: (data.shortDescription as string) || '',
    category: (data.category as string) || (data.categoryId as string) || '',
    images: Array.isArray(data.images) ? (data.images as string[]) : [],
    variants,
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    featured: Boolean(data.featured),
    active: Boolean(data.active),
    hasVariants: typeof data.hasVariants === 'boolean' ? data.hasVariants : variants.length > 0,
    stockQuantity: sanitizeStockValue(data.stockQuantity, DEFAULT_INITIAL_STOCK_QUANTITY),
    lowStockLimit: sanitizeLowStockLimit(data.lowStockLimit, DEFAULT_LOW_STOCK_LIMIT),
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
    quantity: sanitizeStockValue(data.quantity),
    previousStock: sanitizeStockValue(data.previousStock),
    newStock: sanitizeStockValue(data.newStock),
    note: (data.note as string) || '',
    createdAt: toDateOrNow(data.createdAt),
    createdBy: (data.createdBy as string) || '',
  };
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

function normalizeMaterial(id: string, data: Record<string, unknown>): Material {
  const rawName = data.name || data.materialName || data.title;

  return {
    id,
    name: typeof rawName === 'string' ? rawName.trim() : '',
    stock: sanitizeStockValue(data.stock),
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
    quantity: sanitizeStockValue(data.quantity),
    transactionType: (data.transactionType as StockTransaction['transactionType']) || 'IN',
    createdAt: toDateOrNow(data.createdAt),
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

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  const q = query(collection(db, 'categories'), where('active', '==', true), orderBy('order'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
}

export async function getAllCategories(): Promise<Category[]> {
  const q = query(collection(db, 'categories'), orderBy('order'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const q = query(collection(db, 'categories'), where('slug', '==', slug));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Category;
}

export async function createCategory(
  data: Omit<Category, 'id'>,
  actor?: string | AdminActivityActor,
): Promise<string> {
  const ref = await addDoc(collection(db, 'categories'), { ...data, createdAt: serverTimestamp() });
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
  await updateDoc(doc(db, 'categories', id), { ...data, updatedAt: serverTimestamp() });
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
  let q;
  if (categoryId) {
    q = query(collection(db, 'products'), where('active', '==', true), where('category', '==', categoryId));
  } else {
    q = query(collection(db, 'products'), where('active', '==', true));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => normalizeProduct(d.id, d.data()));
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
    const hasStockQuantity = typeof data.stockQuantity === 'number';
    const hasLowStockLimit = typeof data.lowStockLimit === 'number';
    const hasStockStatus = typeof data.stockStatus === 'string';
    const hasLastStockUpdatedAt = 'lastStockUpdatedAt' in data;
    const hasLastStockUpdatedBy = typeof data.lastStockUpdatedBy === 'string';
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

    if (
      hasStockQuantity &&
      hasLowStockLimit &&
      hasStockStatus &&
      hasLastStockUpdatedAt &&
      hasLastStockUpdatedBy &&
      !needsLowStockLimitUpgrade &&
      !needsStockStatusRefresh &&
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
  const stockFields = resolveProductStockFields(data);
  const ref = await addDoc(collection(db, 'products'), {
    ...data,
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
      category: data.category,
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
  const stockChanged =
    stockFields.stockQuantity !== existing.stockQuantity ||
    stockFields.lowStockLimit !== existing.lowStockLimit;

  await updateDoc(doc(db, 'products', id), {
    ...data,
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
          category: existing.category,
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

export async function getAllMaterials(): Promise<Material[]> {
  const q = query(collection(db, 'materials'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => normalizeMaterial(docSnap.id, docSnap.data()));
}

export async function getMaterialById(id: string): Promise<Material | null> {
  const snap = await getDoc(doc(db, 'materials', id));
  if (!snap.exists()) return null;
  return normalizeMaterial(snap.id, snap.data());
}

export async function createMaterial(
  data: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>,
  actor?: string | AdminActivityActor,
): Promise<string> {
  const materialName = data.name.trim();
  const ref = await addDoc(collection(db, 'materials'), {
    name: materialName,
    stock: sanitizeStockValue(data.stock),
    status: data.status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await logAdminActivity({
    action: 'create',
    entity: 'material',
    entityId: ref.id,
    entityLabel: materialName,
    message: `Created material "${materialName}"`,
    actor,
    metadata: {
      stock: sanitizeStockValue(data.stock),
      active: data.status,
    },
  });

  return ref.id;
}

export async function updateMaterial(
  id: string,
  data: Partial<Omit<Material, 'id' | 'createdAt' | 'updatedAt'>>,
  actor?: string | AdminActivityActor,
): Promise<void> {
  const existing = await getMaterialById(id);
  if (!existing) {
    throw new Error('Material not found.');
  }

  await updateDoc(doc(db, 'materials', id), {
    ...data,
    ...(typeof data.name === 'string' ? { name: data.name.trim() } : {}),
    ...(typeof data.stock === 'number' ? { stock: sanitizeStockValue(data.stock) } : {}),
    updatedAt: serverTimestamp(),
  });

  await logAdminActivity({
    action: 'update',
    entity: 'material',
    entityId: id,
    entityLabel: data.name?.trim() || existing.name,
    message: `Updated material "${data.name?.trim() || existing.name}"`,
    actor,
    metadata: {
      updatedFields: Object.keys(data).join(', ') || 'none',
      stock: typeof data.stock === 'number' ? sanitizeStockValue(data.stock) : null,
      active: typeof data.status === 'boolean' ? data.status : null,
    },
  });
}

export async function deleteMaterial(id: string, actor?: string | AdminActivityActor): Promise<void> {
  const existing = await getMaterialById(id);
  await deleteDoc(doc(db, 'materials', id));
  await logAdminActivity({
    action: 'delete',
    entity: 'material',
    entityId: id,
    entityLabel: existing?.name || id,
    message: `Deleted material "${existing?.name || id}"`,
    actor,
  });
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

export async function createOrder(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'orders'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

export async function createWebsiteOrderWithInventory(
  data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
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
    message: `Added ${quantity} unit(s) to "${product?.name || productId}"`,
    actor: createdBy,
    metadata: {
      quantity,
      note: note.trim() || null,
      newStock: product?.stockQuantity ?? null,
    },
  });
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
  items: Pick<OrderItem, 'productId' | 'productName' | 'quantity' | 'variantId'>[],
): Promise<Array<{
  productId: string;
  productName: string;
  variantId: string;
  requestedQuantity: number;
  stockQuantity: number;
  reason: 'missing_product' | 'out_of_stock' | 'insufficient_stock';
}>> {
  const products = await Promise.all(items.map((item) => getProductById(item.productId)));
  const issues: Array<{
    productId: string;
    productName: string;
    variantId: string;
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
        variantId: item.variantId,
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
        variantId: item.variantId,
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
        variantId: item.variantId,
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
  await addDoc(collection(db, 'users'), { uid, ...data, createdAt: serverTimestamp() });
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const q = query(collection(db, 'users'), where('uid', '==', uid));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const data = snap.docs[0].data();
  return { id: snap.docs[0].id, ...data, createdAt: data.createdAt?.toDate?.() ?? new Date() } as unknown as User;
}

export async function updateUserProfile(uid: string, data: Partial<User>): Promise<void> {
  const q = query(collection(db, 'users'), where('uid', '==', uid));
  const snap = await getDocs(q);
  if (!snap.empty) {
    await updateDoc(snap.docs[0].ref, data);
  }
}

export async function getAllUsers(): Promise<User[]> {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return { id: d.id, ...data, createdAt: data.createdAt?.toDate?.() ?? new Date() } as unknown as User;
  });
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
