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
  InventoryTransaction,
  User,
  QuoteRequest,
  OrderStatus,
  DeliveryChallan,
  DeliveryChallanStatus,
} from '@/types';

const DEFAULT_INITIAL_STOCK_QUANTITY = 1;

function sanitizeStockValue(value: unknown, fallback = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

export function calculateStockStatus(stockQuantity: number, lowStockLimit: number): Product['stockStatus'] {
  if (stockQuantity <= 0) return 'out_of_stock';
  if (stockQuantity <= lowStockLimit) return 'low_stock';
  return 'in_stock';
}

function resolveProductStockFields(data: Partial<Product>, fallback?: Partial<Product>) {
  const stockQuantity = sanitizeStockValue(
    data.stockQuantity ?? fallback?.stockQuantity,
    DEFAULT_INITIAL_STOCK_QUANTITY,
  );
  const lowStockLimit = sanitizeStockValue(data.lowStockLimit ?? fallback?.lowStockLimit);

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
    lowStockLimit: sanitizeStockValue(data.lowStockLimit),
    stockStatus: calculateStockStatus(
      sanitizeStockValue(data.stockQuantity, DEFAULT_INITIAL_STOCK_QUANTITY),
      sanitizeStockValue(data.lowStockLimit),
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

export async function createCategory(data: Omit<Category, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'categories'), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateCategory(id: string, data: Partial<Category>): Promise<void> {
  await updateDoc(doc(db, 'categories', id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, 'categories', id));
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
    const isLegacyAutoZeroedStock =
      hasStockQuantity &&
      sanitizeStockValue(data.stockQuantity) === 0 &&
      data.lastStockUpdatedAt == null &&
      ((data.lastStockUpdatedBy as string) || '') === '';

    if (
      hasStockQuantity &&
      hasLowStockLimit &&
      hasStockStatus &&
      hasLastStockUpdatedAt &&
      hasLastStockUpdatedBy &&
      !isLegacyAutoZeroedStock
    ) {
      return;
    }

    const stockFields = resolveProductStockFields({
      stockQuantity: isLegacyAutoZeroedStock
        ? DEFAULT_INITIAL_STOCK_QUANTITY
        : sanitizeStockValue(data.stockQuantity, DEFAULT_INITIAL_STOCK_QUANTITY),
      lowStockLimit: sanitizeStockValue(data.lowStockLimit),
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
  return ref.id;
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
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
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, 'products', id));
}

// ─── Orders ───────────────────────────────────────────────────────────────────

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
}

export async function getInventoryTransactions(): Promise<InventoryTransaction[]> {
  const q = query(collection(db, 'inventoryTransactions'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => normalizeInventoryTransaction(docSnap.id, docSnap.data()));
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

export async function updateOrderStatus(id: string, status: OrderStatus, updatedBy = 'admin'): Promise<void> {
  const orderRef = doc(db, 'orders', id);
  const inventoryCollectionRef = collection(db, 'inventoryTransactions');

  await runTransaction(db, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) {
      throw new Error('Order not found.');
    }

    const order = normalizeOrder(orderSnap.id, orderSnap.data() as Record<string, unknown>);
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
      ...(shouldRestoreStock ? { stockRestoredOnCancel: true } : {}),
      ...(shouldDeductStockAgain ? { stockRestoredOnCancel: false } : {}),
      updatedAt: serverTimestamp(),
    });
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
  }
): Promise<string> {
  const challanNumber = data.challanNumber || await generateNextDeliveryChallanNumber();
  const ref = await addDoc(collection(db, 'deliveryChallans'), {
    ...data,
    challanNumber,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
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

export async function markDeliveryChallanAsDispatched(id: string): Promise<Date> {
  const now = new Date();

  await runTransaction(db, async (transaction) => {
    const challanRef = doc(db, 'deliveryChallans', id);
    const challanSnap = await transaction.get(challanRef);

    if (!challanSnap.exists()) {
      throw new Error('Delivery challan not found.');
    }

    const challan = challanSnap.data() as Record<string, unknown>;
    const orderId = typeof challan.orderId === 'string' ? challan.orderId : '';

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

  return now;
}

export async function markDeliveryChallanAsDelivered(
  id: string,
  podDetails: Pick<DeliveryChallan, 'receiverName' | 'receiverPhone' | 'deliveryRemarks' | 'proofOfDeliveryImages'>
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

  await runTransaction(db, async (transaction) => {
    const challanRef = doc(db, 'deliveryChallans', id);
    const challanSnap = await transaction.get(challanRef);

    if (!challanSnap.exists()) {
      throw new Error('Delivery challan not found.');
    }

    const challan = challanSnap.data() as Record<string, unknown>;
    const orderId = typeof challan.orderId === 'string' ? challan.orderId : '';

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

  return now;
}

export async function deleteDeliveryChallan(id: string): Promise<void> {
  await deleteDoc(doc(db, 'deliveryChallans', id));
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

export async function deleteQuoteRequest(id: string): Promise<void> {
  await deleteDoc(doc(db, 'quotes', id));
}
