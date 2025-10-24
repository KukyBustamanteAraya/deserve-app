import { z } from 'zod';

// ===================================================================
// ENUMS & CONSTANTS
// ===================================================================

export type PaymentStatus = 'pending' | 'approved' | 'completed' | 'rejected' | 'cancelled' | 'refunded';
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

  // Order Identification (Multi-Product Support)
  order_number: string | null; // Human-readable order ID (ORD-YYYYMMDD-XXXX)
  can_modify: boolean; // Whether products can still be added to this order
  locked_at: string | null; // When order was locked (shipped/in production)

  // Pricing (Chilean Pesos - stored as full pesos, not cents)
  subtotal_clp: number;
  discount_clp: number;
  tax_clp: number;
  shipping_clp: number;
  total_clp: number | null;
  total_amount_clp: number;

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
  design_id: string | null; // Link to designs table
  design_request_id: number | null; // Direct link to design_requests table

  // Pricing (Chilean Pesos - stored as full pesos, not cents)
  unit_price_clp: number;
  quantity: number;
  line_total_clp: number | null;

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

  // Amount (Chilean Pesos - stored as full pesos, not cents)
  amount_clp: number;
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

  // Amount (Chilean Pesos - stored as full pesos, not cents)
  total_amount_clp: number;
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
  contributions?: PaymentContribution[]; // Alias for compatibility
  payment_mode?: string | null;
  total_paid_clp?: number;
  total_pending_clp?: number;
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
  amountClp?: number; // Optional - auto-calculated if not provided
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
  totalAmountClp: number;
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
  totalAmountClp: number;
  totalPaidClp: number;
  totalPendingClp: number;
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
  amountClp: z.number().int().positive().optional()
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
  totalClp: number,
  paidClp: number
): {
  percentage: number;
  remainingClp: number;
  isPaid: boolean;
  isPartial: boolean;
} {
  const percentage = totalClp > 0 ? Math.round((paidClp / totalClp) * 100) : 0;
  const remainingClp = Math.max(0, totalClp - paidClp);
  const isPaid = paidClp >= totalClp && totalClp > 0;
  const isPartial = paidClp > 0 && paidClp < totalClp;

  return {
    percentage,
    remainingClp,
    isPaid,
    isPartial
  };
}

// ===================================================================
// ORDER OVERVIEW & LIFECYCLE TYPES
// ===================================================================

/**
 * Design Request Order Stage (lifecycle tracking)
 */
export type DesignRequestOrderStage =
  | 'design_phase'      // Design is being created/reviewed
  | 'pending_order'     // Approved, waiting to be added to order
  | 'in_order'          // Added to an order
  | 'order_locked';     // Order shipped/locked, no changes allowed

/**
 * Order Lifecycle Stage (high-level view)
 */
export type OrderLifecycleStage =
  | 'design_review'     // Designs being created/approved
  | 'order_assembly'    // Order created, products being added
  | 'payment_pending'   // Waiting for payment
  | 'in_production'     // Manufacturing
  | 'quality_check'     // QC stage
  | 'shipping'          // In transit
  | 'delivered';        // Complete

/**
 * Order Overview (from database view with aggregations)
 */
export interface OrderOverview {
  // Order Details
  id: string;
  order_number: string | null;
  team_id: string | null;
  status: OrderStatus;
  payment_status: OrderPaymentStatus;
  payment_mode: string | null;
  total_clp: number | null;
  total_amount_clp?: number | null; // Alias for compatibility with Order interface
  estimated_delivery?: string | null; // Estimated delivery date
  can_modify: boolean;
  locked_at: string | null;
  created_at: string;
  updated_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;

  // Aggregated Counts
  item_count: number;           // Total individual items
  product_count: number;        // Distinct products (design requests)
  design_request_count: number; // Total design requests linked

  // Team Info
  team_name: string | null;
  team_slug: string | null;
  team_logo_url: string | null;
}

/**
 * Multi-Product Order Group (for displaying multiple products in one order)
 */
export interface MultiProductOrderGroup {
  order_number: string;
  order_id: string;
  team_id: string;
  status: OrderStatus;
  payment_status: OrderPaymentStatus;

  // Products in this order
  products: {
    design_request_id: number;
    product_name: string;
    product_image: string | null;
    item_count: number;
    total_clp: number;
  }[];

  // Aggregated totals
  total_products: number;
  total_items: number;
  total_clp: number;
  total_paid_clp: number;

  // Order state
  can_modify: boolean;
  locked_at: string | null;
  created_at: string;
  updated_at: string | null;
}

/**
 * Design Request with Order Info (for tracking in Order Overview)
 */
export interface DesignRequestWithOrderInfo {
  id: number;
  team_id: string;
  product_name: string | null;
  product_slug: string | null;

  // Design status
  status: string;
  approval_status: string;

  // Order linkage
  order_id: string | null;
  order_stage: DesignRequestOrderStage;
  order_number: string | null;

  // Timestamps
  created_at: string;
  approved_at: string | null;

  // Mockups
  mockup_urls: string[];

  // Colors
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
}

/**
 * Order Pipeline Card Data (for compact display)
 */
export interface OrderPipelineCardData {
  order_number: string;
  order_id: string;
  stage: OrderLifecycleStage;
  product_count: number;
  total_items: number;
  total_clp: number;
  paid_clp: number;
  payment_percentage: number;
  can_add_products: boolean;
  status: OrderStatus;
  payment_status: OrderPaymentStatus;
  created_at: string;
  estimated_delivery: string | null;
}
