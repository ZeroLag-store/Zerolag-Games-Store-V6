
export interface ProductVariant {
  id: string;
  name: string; // e.g., "Primary 3", "Primary 4", "Secondary"
  price: number;
  discount: number;
  stockStatus: 'In Stock' | 'Out of Stock';
}

export interface TopUpPackage {
  id: string;
  name: string;
  amount?: number | string;
  price: number;
  stock?: number;
  bonus?: string;
  region?: string;
}

export interface PlatformEdition {
  id: string;
  name: string;
  platform?: string;
  price: number;
  stock: number;
  region?: string;
  type?: string;
}

export interface GamePlayStationConfig {
  enabled: boolean;
  ps5: {
    enabled: boolean;
    primary: {
      enabled: boolean;
      price: number;
      stock: number;
    };
    secondary: {
      enabled: boolean;
      price: number;
      stock: number;
    };
  };
  ps4: {
    enabled: boolean;
    primary: {
      enabled: boolean;
      price: number;
      stock: number;
    };
    secondary: {
      enabled: boolean;
      price: number;
      stock: number;
    };
  };
}

export interface GamePCConfig {
  enabled: boolean;
  editions: Array<{
    id: string;
    name: string;
    price: number;
    stock: number;
    region?: string;
    type?: string;
  }>;
}

export interface GameXboxConfig {
  enabled: boolean;
  editions: Array<{
    id: string;
    name: string;
    price: number;
    stock: number;
    generation?: string;
    type?: string;
  }>;
}

export interface GamePlatformsConfig {
  playstation?: GamePlayStationConfig;
  pc?: GamePCConfig;
  xbox?: GameXboxConfig;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  duration: string;
  price: number;
  stock: number;
  region?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  discount: number;
  category: string;
  platform: string;
  imageUrl: string;
  stockStatus: string;
  description: string;
  shortDescription?: string;
  genre?: string;
  tags?: string[];
  galleryImages?: string[];
  featured?: boolean;
  trending?: boolean;
  recommended?: boolean;
  isDeleted?: boolean;
  isHidden?: boolean;
  isArchived?: boolean;
  createdAt?: any;
  variants?: ProductVariant[];
  topUpPackages?: TopUpPackage[];
  subscriptionPlans?: SubscriptionPlan[];
  platformEditions?: PlatformEdition[];
  platformsConfig?: GamePlatformsConfig;
  hardwareConfig?: {
    condition?: 'New' | 'Open Box' | 'Refurbished';
    warranty?: string;
    specs?: string;
    stock: number;
    price: number;
  };
  customDeliveryInstructions?: string;
  subcategory?: string;
  pricePS4Primary?: number;
  pricePS5Primary?: number;
  priceSecondary?: number;
  ps4PrimaryStock?: number;
  ps5PrimaryStock?: number;
  secondaryStock?: number;
  slotsAvailable?: number;
}

export type SlotType = 'PS4_PRIMARY' | 'PS5_PRIMARY' | 'SECONDARY';
export type SlotStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'BLOCKED';

export interface AccountSlot {
  id: string;
  slotType: SlotType;
  status: SlotStatus;
  currentPrice: number;
  assignedCustomerId?: string;
  assignedCustomerName?: string;
  reservedUntil?: any;
}

export interface DigitalAccount {
  id: string;
  email: string;
  password?: string;
  recoveryEmail?: string;
  recoveryPhone?: string;
  productId: string;
  productName: string;
  region: string;
  notes?: string;
  slots: AccountSlot[];
  createdAt: any;
  updatedAt: any;
}

export interface Customer {
  id: string;
  fullName: string;
  phoneNumber: string;
  whatsApp: string;
  facebookProfile?: string;
  notes?: string;
  totalSpending: number;
  createdAt: any;
  orderCount?: number;
}

export type OrderStatus = 'Pending' | 'Completed' | 'Cancelled' | 'Refunded' | 'Pending Payment Verification' | 'Paid' | 'Delivered';

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  accountId: string;  // ID of the DigitalAccount
  accountEmail: string;
  slotId: string;    // ID of the slot inside DigitalAccount
  slotType: SlotType;
  price: number;
  status: OrderStatus;
  paymentMethod: string;
  createdAt: any;
  warrantyId?: string;

  // Online Web Order properties
  orderId?: string;
  finalPrice?: number;
  isWebOrder?: boolean;
  productName?: string;
  selectedVersion?: string;
  quantity?: number;
  paymentProofUrl?: string;
  customerEmail?: string;
  userEmail?: string;
  receiptText?: string;
  deliveredCredentials?: string;
  assignedAccountEmail?: string;
  assignedAccountPassword?: string;
  notificationSent?: boolean;
  notes?: string;
  hasHardware?: boolean;
  phoneNumber?: string;
  shippingAddress?: {
    fullAddress: string;
    city: string;
    governorate: string;
    postalCode: string;
    additionalNotes?: string;
  };
}

export interface Receipt {
  id: string;
  receiptCode: string; // e.g., ZLG-2026-000001
  date: any;
  orderId: string;
  customerId: string;
  customerName: string;
  productName: string;
  slotType: SlotType;
  price: number;
  warrantyDuration?: string;
  warrantyEndDate?: any;
}

export type WarrantyStatus = 'ACTIVE' | 'EXPIRED' | 'VOID';

export interface Warranty {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  productName: string;
  slotType: SlotType;
  startDate: any;
  endDate: any;
  status: WarrantyStatus;
}

export type ReservationStatus = 'ACTIVE' | 'EXPIRED' | 'COMPLETED' | 'CANCELLED';

export interface Reservation {
  id: string;
  customerId: string;
  customerName: string;
  digitalAccountId: string;
  slotId: string;
  productName: string;
  slotType: SlotType;
  reservedUntil: any;
  status: ReservationStatus;
  notes?: string;
}

export type StaffRole = 'OWNER' | 'MANAGER' | 'EMPLOYEE';

export interface StaffUser {
  id: string; // Firestore user UID
  email: string;
  displayName: string;
  role: StaffRole;
  createdAt: any;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'warranty' | 'reservation' | 'stock' | 'order' | 'info';
  date: any;
  read: boolean;
}

export interface AuditLog {
  id: string;
  user: string; // Email of the user who performed the action
  action: string;
  date: any;
  entity: string; // e.g. "Account", "Order", "Customer"
  details: string;
}

export interface FeaturedBanner {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  bgColor?: string;
  textColor?: string;
  priority: 'low' | 'medium' | 'high';
  displayOrder: number;
  isActive: boolean;
  isArchived?: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

