import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, DocumentSnapshot,
  serverTimestamp, Timestamp, writeBatch, increment
} from 'firebase/firestore';
import { db } from './firebase';
import type { Product, Category, Order, User, QuoteRequest, OrderStatus } from '@/types';

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
    q = query(collection(db, 'products'), where('active', '==', true), where('categoryId', '==', categoryId));
  } else {
    q = query(collection(db, 'products'), where('active', '==', true));
  }
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    } as Product;
  });
}

export async function getAllProducts(): Promise<Product[]> {
  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return { id: d.id, ...data, createdAt: data.createdAt?.toDate?.() ?? new Date(), updatedAt: data.updatedAt?.toDate?.() ?? new Date() } as Product;
  });
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const q = query(collection(db, 'products'), where('active', '==', true), where('featured', '==', true), limit(8));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return { id: d.id, ...data, createdAt: data.createdAt?.toDate?.() ?? new Date(), updatedAt: data.updatedAt?.toDate?.() ?? new Date() } as Product;
  });
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const q = query(collection(db, 'products'), where('slug', '==', slug), where('active', '==', true));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const data = snap.docs[0].data();
  return { id: snap.docs[0].id, ...data, createdAt: data.createdAt?.toDate?.() ?? new Date(), updatedAt: data.updatedAt?.toDate?.() ?? new Date() } as Product;
}

export async function getProductById(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, 'products', id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { id: snap.id, ...data, createdAt: data.createdAt?.toDate?.() ?? new Date(), updatedAt: data.updatedAt?.toDate?.() ?? new Date() } as Product;
}

export async function createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'products'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

export async function updateProduct(id: string, data: Partial<Product>): Promise<void> {
  await updateDoc(doc(db, 'products', id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, 'products', id));
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function createOrder(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'orders'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

export async function getUserOrders(userId: string): Promise<Order[]> {
  const q = query(collection(db, 'orders'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return { id: d.id, ...data, createdAt: data.createdAt?.toDate?.() ?? new Date(), updatedAt: data.updatedAt?.toDate?.() ?? new Date() } as Order;
  });
}

export async function getAllOrders(): Promise<Order[]> {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return { id: d.id, ...data, createdAt: data.createdAt?.toDate?.() ?? new Date(), updatedAt: data.updatedAt?.toDate?.() ?? new Date() } as Order;
  });
}

export async function getOrderById(id: string): Promise<Order | null> {
  const snap = await getDoc(doc(db, 'orders', id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return { id: snap.id, ...data, createdAt: data.createdAt?.toDate?.() ?? new Date(), updatedAt: data.updatedAt?.toDate?.() ?? new Date() } as Order;
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<void> {
  await updateDoc(doc(db, 'orders', id), { status, updatedAt: serverTimestamp() });
}

// ─── Users ────────────────────────────────────────────────────────────────────

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
