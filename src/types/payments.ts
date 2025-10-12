import { z } from 'zod';

// ===================================================================
// ENUMS & CONSTANTS
// ===================================================================

export type PaymentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';
export type OrderPaymentStatus = 'unpaid' | 'partial' | 'paid';
export type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export const CURRENCY = 'CLP' as const;

// ===================================================================
// DATABASE TYPES (matching verified schema)
// ===================================================================

/**
 * Order from the database (full schema)
 */
export interface Order {
  id: string;
  customer_id: string | null;
  user_id: string | null;
  team_id: string | null;
  status: OrderStatus;
  payment_status: OrderPaymentStatus;
  currency: string;

  // Pricing
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  shipping_cents: number;
  total_cents: number | null;
  total_amount_cents: number;

  // Shipping
  shipping_name: string | null;
  shipping_address1: string | null;
  shipping_address2: string | null;
  shipping_city: string | null;
  shipping_region: string | null;
  shipping_postal: string | null;
  shipping_country: string | null;
  shipping_address_id: string | null;
  shipping_recipient_name: string | null;
  shipping_street_address: string | null;
  shipping_commune: string | null;
  shipping_postal_code: string | null;
  delivery_instructions: string | null;

  // Tracking
  tracking_number: string | null;
  courier_name: string | null;
  carrier: string | null;

  // Dates
  production_start_date: string | null;
  estimated_delivery_date: string | null;
  estimated_delivery: string | null;
  status_updated_at: string | null;
  design_approved_at: string | null;
  production_started_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string | null;

  // Metadata
  current_stage: string | null;
  notes: string | null;
  customer_notes: string | null;
  internal_notes: string | null;
  admin_notes: string | null;
}

/**
 * Order Item with player assignment
 */
export interface OrderItem {
  id: string;
  order_id: string;
  product_id: number;
  product_name: string;
  collection: string | null;
  images: string[];

  // Pricing
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number | null;

  // Player Assignment
  player_id: string | null;
  player_name: string | null;
  jersey_number: string | null;

  // Customization
  customization: Record<string, any> | null;
  used_size_calculator: boolean | null;
  size_calculator_recommendation: string | null;
  notes: string | null;

  created_at: string;
}

/**
 * Payment Contribution (split payment by individual team member)
 */
export interface PaymentContribution {
  id: string;
  order_id: string;
  user_id: string;
  team_id: string | null;

  // Amount
  amount_cents: number;
  currency: string;

  // Status (two columns exist in DB - we prioritize payment_status)
  status: PaymentStatus;
  payment_status: PaymentStatus;

  // Mercado Pago
  mp_payment_id: string | null;
  mercadopago_payment_id: string | null; // Duplicate column
  mp_preference_id: string | null;
  external_reference: string | null;
  payment_method: string | null;
  raw_payment_data: Record<string, any> | null;

  // Dates
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Bulk Payment (manager pays for multiple orders)
 */
export interface BulkPayment {
  id: string;
  user_id: string;

  // Amount
  total_amount_cents: number;
  currency: string;

  // Status
  status: PaymentStatus;

  // Mercado Pago
  mp_payment_id: string | null;
  mp_preference_id: string | null;
  external_reference: string | null;
  raw_payment_data: Record<string, any> | null;

  // Dates
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Join table: Bulk Payment → Orders (many-to-many)
 */
export interface BulkPaymentOrder {
  bulk_payment_id: string;
  order_id: string;
}

/**
 * Player Info Submission
 */
export interface PlayerInfoSubmission {
  id: string;
  team_id: string;
  design_request_id: number | null;
  user_id: string | null;

  // Player Details
  player_name: string;
  jersey_number: string | null;
  size: string;
  position: string | null;
  additional_notes: string | null;

  // Metadata
  submitted_by_manager: boolean;
  submission_token: string | null;

  created_at: string;
  updated_at: string;
}

// ===================================================================
// EXTENDED TYPES (with relations)
// ===================================================================

/**
 * Order with items and payment info
 */
export interface OrderWithDetails extends Order {
  items: OrderItem[];
  payment_contributions?: PaymentContribution[];
  total_paid_cents?: number;
  total_pending_cents?: number;
  payment_progress_percentage?: number;
}

/**
 * Payment Contribution with user profile
 */
export interface PaymentContributionWithUser extends PaymentContribution {
  user?: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

/**
 * Bulk Payment with orders
 */
export interface BulkPaymentWithOrders extends BulkPayment {
  orders: Order[];
}

// ===================================================================
// API REQUEST/RESPONSE TYPES
// ===================================================================

/**
 * Create order from design request
 */
export interface CreateOrderFromDesignRequest {
  designRequestId: number;
  teamId: string;
}

export interface CreateOrderFromDesignResponse {
  orderId: string;
  orderItemsCount: number;
}

/**
 * Create split payment (individual member pays their share)
 */
export interface CreateSplitPaymentRequest {
  orderId: string;
  userId: string;
  amountCents?: number; // Optional - auto-calculated if not provided
}

export interface CreateSplitPaymentResponse {
  contributionId: string;
  initPoint: string; // Mercado Pago payment URL
  preferenceId: string;
}

/**
 * Create bulk payment (manager pays for multiple orders)
 */
export interface CreateBulkPaymentRequest {
  orderIds: string[];
  userId: string;
}

export interface CreateBulkPaymentResponse {
  bulkPaymentId: string;
  initPoint: string; // Mercado Pago payment URL
  preferenceId: string;
  totalAmountCents: number;
}

/**
 * Payment webhook from Mercado Pago
 */
export interface MercadoPagoWebhookPayload {
  action: string;
  api_version: string;
  data: {
    id: string;
  };
  date_created: string;
  id: number;
  live_mode: boolean;
  type: string;
  user_id: string;
}

/**
 * Team payment dashboard data
 */
export interface TeamPaymentDashboard {
  team: {
    id: string;
    name: string;
    slug: string;
  };
  orders: OrderWithDetails[];
  totalOrdersCount: number;
  totalAmountCents: number;
  totalPaidCents: number;
  totalPendingCents: number;
  paymentMode: 'split' | 'bulk';
}

// ===================================================================
// VALIDATION SCHEMAS
// ===================================================================

export const createOrderFromDesignSchema = z.object({
  designRequestId: z.number().int().positive(),
  teamId: z.string().uuid()
});

export const createSplitPaymentSchema = z.object({
  orderId: z.string().uuid(),
  userId: z.string().uuid(),
  amountCents: z.number().int().positive().optional()
});

export const createBulkPaymentSchema = z.object({
  orderIds: z.array(z.string().uuid()).min(1).max(50),
  userId: z.string().uuid()
});

// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

/**
 * Format Chilean Pesos (CLP)
 * NOTE: Chilean pesos don't have cents/decimals, so we store full peso amounts
 * in the database (e.g., 40000 = $40.000 CLP)
 */
export function formatCLP(amount: number): string {
  // Don't divide by 100 - Chilean pesos are already stored as full amounts
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Get payment status color
 */
export function getPaymentStatusColor(status: PaymentStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'approved':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'cancelled':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'refunded':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Get payment status label (Spanish)
 */
export function getPaymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case 'pending':
      return 'Pendiente';
    case 'approved':
      return 'Aprobado';
    case 'rejected':
      return 'Rechazado';
    case 'cancelled':
      return 'Cancelado';
    case 'refunded':
      return 'Reembolsado';
    default:
      return status;
  }
}

/**
 * Get order payment status color
 */
export function getOrderPaymentStatusColor(status: OrderPaymentStatus): string {
  switch (status) {
    case 'unpaid':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'partial':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'paid':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Get order payment status label (Spanish)
 */
export function getOrderPaymentStatusLabel(status: OrderPaymentStatus): string {
  switch (status) {
    case 'unpaid':
      return 'Sin Pagar';
    case 'partial':
      return 'Pago Parcial';
    case 'paid':
      return 'Pagado';
    default:
      return status;
  }
}

/**
 * Calculate payment progress
 */
export function calculatePaymentProgress(
  totalCents: number,
  paidCents: number
): {
  percentage: number;
  remainingCents: number;
  isPaid: boolean;
  isPartial: boolean;
} {
  const percentage = totalCents > 0 ? Math.round((paidCents / totalCents) * 100) : 0;
  const remainingCents = Math.max(0, totalCents - paidCents);
  const isPaid = paidCents >= totalCents && totalCents > 0;
  const isPartial = paidCents > 0 && paidCents < totalCents;

  return {
    percentage,
    remainingCents,
    isPaid,
    isPartial
  };
}
