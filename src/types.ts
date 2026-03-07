export type UserRole = 'client' | 'delivery' | 'business' | 'admin';

export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'picked_up' | 'on_the_way' | 'delivered' | 'cancelled';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  whatsapp: string;
  phone?: string;
  password?: string;
  status?: 'active' | 'inactive';
  createdAt?: string;
  businessId?: string;
  uid?: string;
}

export interface Application {
  id: string;
  type: 'delivery' | 'business';
  name: string;
  email: string;
  whatsapp: string;
  status: 'pending' | 'approved' | 'rejected';
  details?: string;
  createdAt: number;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  deliveryTime: string;
  image: string;
  location: [number, number];
  menu?: MenuItem[];
}

export interface Business {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  category: string;
  rating?: number;
  address: string;
  image: string;
  status: 'pending' | 'active' | 'inactive';
  menu?: MenuItem[];
  createdAt: string;
  totalOrders?: number;
  totalRevenue?: number;
}

export interface DeliveryPerson {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  status: 'active' | 'inactive' | 'busy';
  currentOrderId?: string;
  rating?: number;
  completedOrders?: number;
  createdAt: string;
  plateNumber?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category?: string;
  image?: string;
  available?: boolean;
}

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientWhatsapp?: string;
  businessId: string;
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  deliveryId?: string;
  deliveryName?: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  paymentMethod: string;
  deliveryAddress: string;
  deliveryInstructions: string;
  createdAt: string;
  clientLocation?: [number, number];
  businessLocation?: [number, number];
  deliveryLocation?: [number, number];
  eta?: string;
  distance?: string;
  rejectionReason?: string;
  tracking?: {
    status: string;
    timestamp?: number;
    location?: [number, number];
  };
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export type View = 'home' | 'restaurant' | 'tracking' | 'orders' | 'profile' | 'addresses' | 'favorites' | 'history' | 'settings' | 'business';
