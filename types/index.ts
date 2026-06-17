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

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
export type InventoryTransactionType = 'IN' | 'OUT';
export type InventoryTransactionSource =
  | 'ADMIN_STOCK_ADD'
  | 'PURCHASE'
  | 'PURCHASE_EDIT'
  | 'PURCHASE_DELETE'
  | 'PRODUCTION'
  | 'WEBSITE_ORDER'
  | 'MANUAL_SALE'
  | 'ORDER_CANCELLATION'
  | 'ORDER_REACTIVATION';

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
  stockQuantity: number;
  lowStockLimit: number;
  stockStatus: StockStatus;
  lastStockUpdatedAt?: Date | null;
  lastStockUpdatedBy?: string;
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

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'dispatched' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type DeliveryChallanStatus = 'draft' | 'ready' | 'dispatched' | 'delivered' | 'cancelled';
export type OrderSource = 'website_order' | 'manual_sale';

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  source?: OrderSource;
  manualOrderId?: string;
  items: OrderItem[];
  shippingAddress: Address;
  subtotal: number;
  discount?: number;
  gst?: number;
  shippingCost: number;
  total: number;
  status: OrderStatus;
  challanId?: string;
  stockRestoredOnCancel?: boolean;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  notes?: string;
  cancellationNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransportDetails {
  transporterName?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverPhone?: string;
  lrNumber?: string;
  trackingNumber?: string;
  expectedDeliveryDate?: string;
  notes?: string;
}

export interface DeliveryChallan {
  id: string;
  challanNumber: string;
  orderId: string;
  orderSource?: OrderSource;
  manualOrderId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: Address;
  billingAddress: Address;
  products: OrderItem[];
  subtotal?: number;
  discount?: number;
  gst?: number;
  totalAmount?: number;
  remarks?: string;
  transportDetails: TransportDetails;
  consignmentImages: string[];
  proofOfDeliveryImages: string[];
  receiverName?: string;
  receiverPhone?: string;
  deliveryRemarks?: string;
  status: DeliveryChallanStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  dispatchedAt?: Date | null;
  deliveredAt?: Date | null;
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

export interface TeamMember {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  active: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date | null;
  lastLogoutAt?: Date | null;
}

export type TeamAccessLogType = 'login' | 'logout';

export interface TeamAccessLog {
  id: string;
  teamMemberId: string;
  uid: string;
  email: string;
  displayName: string;
  type: TeamAccessLogType;
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

export interface InventoryTransaction {
  id: string;
  productId: string;
  productName: string;
  type: InventoryTransactionType;
  source: InventoryTransactionSource;
  orderId?: string;
  manualOrderId?: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  note?: string;
  createdAt: Date;
  createdBy: string;
}

export interface Supplier {
  id: string;
  supplierName: string;
  contactPerson: string;
  mobile: string;
  email: string;
  address: string;
  gstNumber: string;
  status: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Material {
  id: string;
  name: string;
  stock: number;
  status: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  purchaseDate: Date;
  totalQty: number;
  remarks: string;
  createdBy: string;
  itemCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockTransaction {
  id: string;
  productId: string;
  referenceType: 'purchase';
  referenceId: string;
  quantity: number;
  transactionType: InventoryTransactionType;
  createdAt: Date;
}

export type AdminActivityAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'status_change'
  | 'stock_add'
  | 'import'
  | 'manual_sale';

export type AdminActivityEntity =
  | 'product'
  | 'category'
  | 'order'
  | 'inventory'
  | 'material'
  | 'supplier'
  | 'purchase'
  | 'delivery_challan'
  | 'quote'
  | 'manual_sale'
  | 'team_member';

export interface AdminActivityLog {
  id: string;
  action: AdminActivityAction;
  entity: AdminActivityEntity;
  entityId: string;
  entityLabel: string;
  message: string;
  actorId: string;
  actorEmail: string;
  actorName: string;
  createdAt: Date;
  metadata?: Record<string, string | number | boolean | null>;
}
