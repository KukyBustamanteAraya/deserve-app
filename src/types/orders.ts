import { z } from 'zod';

// Enums
export type CartStatus = 'active' | 'converted' | 'abandoned';
export type OrderStatus = 'pending' | 'paid' | 'cancelled';

// Base types
export interface Cart {
  id: string;
  user_id: string;
  status: CartStatus;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  // Populated from joins
  product_name?: string;
  product_price_clp?: number;
  product_images?: string[];
  line_total_clp?: number;
}

export interface CartWithItems extends Cart {
  items: CartItem[];
  total_clp: number;
  total_items: number;
}

export interface Order {
  id: string;
  user_id: string;
  team_id: string | null;
  status: OrderStatus;
  currency: string;
  subtotal_clp: number;
  total_clp: number;
  notes: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  name: string; // Snapshot
  unit_price_clp: number;
  quantity: number;
  line_total_clp: number;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

// API Request/Response types
export interface AddToCartRequest {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface CheckoutRequest {
  cartId: string;
  notes?: string;
}

export interface CheckoutResponse {
  orderId: string;
}

export interface CartResponse {
  cart: CartWithItems;
}

export interface OrdersListResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}

export interface OrderDetailResponse {
  order: OrderWithItems;
}

// Validation schemas
export const addToCartSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50, 'Quantity cannot exceed 50')
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0, 'Quantity cannot be negative').max(50, 'Quantity cannot exceed 50')
});

export const checkoutSchema = z.object({
  cartId: z.string().uuid('Invalid cart ID'),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional()
});

export const ordersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
});

// Currency formatting utility
// NOTE: Chilean Pesos (CLP) don't have cents, so amounts are stored as full pesos
export function formatCurrency(clp: number, currency: string = 'CLP'): string {
  switch (currency) {
    case 'CLP':
      // CLP is stored as full pesos - no division needed
      return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(clp);
    case 'USD':
      // USD has cents - divide by 100
      const usdAmount = clp / 100;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(usdAmount);
    default:
      return `${currency} ${clp.toFixed(2)}`;
  }
}

// Order status utilities
export function getOrderStatusColor(status: OrderStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getOrderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'paid':
      return 'Pagado';
    case 'cancelled':
      return 'Cancelado';
    default:
      return status;
  }
}