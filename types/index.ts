export interface ProductVariant {
  id?: string;
  images?: string[];
  capacity?: string;
  neckSize?: string;
  material?: string;
  height?: string;
  weight?: string;
  packagingSize?: string;
  color?: string;
  sku?: string;
  price?: number;
  remark?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  category: string;
  images?: string[];
  variants: ProductVariant[];
  tags: string[];
  featured: boolean;
  active: boolean;
  hasVariants: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  order: number;
  active: boolean;
}

export interface CartItem {
  productId: string;
  productName: string;
  productImage: string;
  variantId: string;
  variantLabel: string;
  sku: string;
  price: number;
  quantity: number;
  slug: string;
  category: string;
}

export interface Address {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  variantId: string;
  variantLabel: string;
  sku: string;
  price: number;
  quantity: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  items: OrderItem[];
  shippingAddress: Address;
  subtotal: number;
  shippingCost: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  phone?: string;
  role: 'customer' | 'admin';
  addresses: Address[];
  createdAt: Date;
}

export interface QuoteRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  productInterest: string;
  productUrl?: string;
  quantity: string;
  message: string;
  status: 'new' | 'contacted' | 'quoted' | 'closed';
  createdAt: Date;
}
