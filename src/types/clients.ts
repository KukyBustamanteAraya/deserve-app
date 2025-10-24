// Client management types for admin panel
import type { MockupPreference, DesignRequestMockups } from './design-request';

export interface SizeBreakdown {
  varones: {
    xs: number;
    s: number;
    m: number;
    l: number;
    xl: number;
    xxl: number;
  };
  damas: {
    xs: number;
    s: number;
    m: number;
    l: number;
    xl: number;
    xxl: number;
  };
}

export interface OrderItemCustomization {
  fabric_type?: 'premium' | 'primer' | 'agile' | 'lit' | 'firm' | 'fly' | 'professional' | 'lightweight' | 'warm';
  age_group?: '4-7' | '8-11' | '12-14' | '15-18' | 'adults';
  size_breakdown?: SizeBreakdown;
  total_units?: number;
  player_name?: string;
  jersey_number?: string;
  size?: string;
}

export interface OrderItemWithBreakdown {
  id: string;
  order_id: string;
  product_id: number;
  product_name: string;
  product_type?: string;
  sport?: string;
  unit_price_clp: number;
  quantity: number;
  customization: OrderItemCustomization;
  line_total_clp: number;
  opted_out: boolean;
}

export interface PaymentContribution {
  id: string;
  user_id: string;
  amount_cents: number;
  status: string;
  created_at: string;
  profiles?: {
    email: string;
  };
}

export interface DesignRequestInfo {
  id: string;
  status: string;
  mockup_urls: string[];
  created_at: string;
}

export interface OrderWithDetails {
  id: string;
  team_id: string;
  user_id: string;
  status: string;
  payment_status: string;
  payment_mode: string;
  total_amount_cents: number;
  currency: string;
  created_at: string;
  estimated_delivery_date?: string;

  // Calculated progress stage
  progress_stage: 'design' | 'details' | 'payment' | 'delivery';

  // Related data
  items: OrderItemWithBreakdown[];
  design_request?: DesignRequestInfo;
  payments: PaymentContribution[];

  // Calculated totals
  total_units: number;
  paid_amount_cents: number;
}

export interface TeamMember {
  user_id: string;
  role: string;
  email?: string;
}

export interface ClientSummary {
  id: string;
  name: string;
  slug: string;
  sport: string;
  sport_name: string;
  sport_id?: number;
  colors: {
    primary?: string;
    secondary?: string;
    tertiary?: string;
  };
  logo_url?: string;
  created_at: string;
  manager_email?: string;
  member_count: number;

  // Aggregated stats
  total_orders: number;
  total_revenue_cents: number;
  pending_orders: number;
  active_orders: number;
  completed_orders: number;
  unpaid_amount_cents: number;

  // Critical admin alerts
  pending_design_requests: number;
  missing_player_info_count: number;
}

export interface DesignRequestDetail {
  id: string;
  order_id?: string | null;
  status: string;
  mockup_urls: string[];
  created_at: string;
  product_name?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  mockup_preference?: MockupPreference;
  mockups?: DesignRequestMockups;
  sub_team_id?: string;
  institution_sub_teams?: {
    name: string;
    coach_name?: string;
    gender_category?: 'male' | 'female' | 'both';
    sport_id?: number;
    division_group?: string;
    sports?: {
      name: string;
    };
  };
}

export interface ClientDetail extends ClientSummary {
  manager?: {
    id: string;
    email: string;
    name?: string;
  };
  members: TeamMember[];
  orders: OrderWithDetails[];
  design_requests: DesignRequestDetail[];
}

export type ProgressStage = 'design' | 'details' | 'payment' | 'delivery';

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'design_review'
  | 'design_approved'
  | 'design_changes'
  | 'production'
  | 'quality_check'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded';

// Helper function to calculate progress stage from order status
export function getProgressStage(status: OrderStatus): ProgressStage {
  if (['pending', 'design_review', 'design_approved'].includes(status)) {
    return 'design';
  }
  if (['design_changes', 'production', 'quality_check'].includes(status)) {
    return 'details';
  }
  if (status === 'paid') {
    return 'payment';
  }
  if (['shipped', 'delivered'].includes(status)) {
    return 'delivery';
  }
  return 'design';
}

// Helper function to calculate total units from size breakdown
export function calculateTotalUnits(sizeBreakdown?: SizeBreakdown): number {
  if (!sizeBreakdown) return 0;

  const varonesTotal = Object.values(sizeBreakdown.varones).reduce((sum, qty) => sum + qty, 0);
  const damasTotal = Object.values(sizeBreakdown.damas).reduce((sum, qty) => sum + qty, 0);

  return varonesTotal + damasTotal;
}
