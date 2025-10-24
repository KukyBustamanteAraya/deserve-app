// Auto-generated database types
// Generated: 2025-10-09T10:46:01.914Z
// Note: This is a basic structure. Run 'npm run generate:types' with proper DB access for full types.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          role: 'customer' | 'admin'
          team_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          role?: 'customer' | 'admin'
          team_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          role?: 'customer' | 'admin'
          team_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          slug: string
          sport_id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          team_type: 'single_team' | 'institution' | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          sport_id: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          team_type?: 'single_team' | 'institution' | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          sport_id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          team_type?: 'single_team' | 'institution' | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      sports: {
        Row: {
          id: string
          slug: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          sport_id: string | null
          sport_ids: number[] | null
          category: string
          name: string
          slug: string
          description: string | null
          price_clp: number
          base_price_clp: number | null
          retail_price_clp: number | null
          product_type_slug: string | null
          hero_path: string | null
          status: string
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sport_id?: string | null
          sport_ids?: number[] | null
          category: string
          name: string
          slug: string
          description?: string | null
          price_clp: number
          base_price_clp?: number | null
          retail_price_clp?: number | null
          product_type_slug?: string | null
          hero_path?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sport_id?: string | null
          sport_ids?: number[] | null
          category?: string
          name?: string
          slug?: string
          description?: string | null
          price_clp?: number
          base_price_clp?: number | null
          retail_price_clp?: number | null
          product_type_slug?: string | null
          hero_path?: string | null
          status?: string
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      design_requests: {
        Row: {
          id: string
          team_id: string
          requested_by: string
          user_id: string | null
          user_type: 'player' | 'manager' | 'coach' | null
          sport_slug: string | null
          design_id: string | null
          primary_color: string | null
          secondary_color: string | null
          accent_color: string | null
          status: string
          approval_status: 'pending_review' | 'approved' | 'changes_requested' | 'revision_ready' | null
          brief: string | null
          mockup_urls: string[] | null
          feedback: string | null
          order_id: string | null
          order_stage: 'design_phase' | 'pending_order' | 'in_order' | 'order_locked' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          requested_by: string
          user_id?: string | null
          user_type?: 'player' | 'manager' | 'coach' | null
          sport_slug?: string | null
          design_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          accent_color?: string | null
          status?: string
          approval_status?: 'pending_review' | 'approved' | 'changes_requested' | 'revision_ready' | null
          brief?: string | null
          mockup_urls?: string[] | null
          feedback?: string | null
          order_id?: string | null
          order_stage?: 'design_phase' | 'pending_order' | 'in_order' | 'order_locked' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          requested_by?: string
          user_id?: string | null
          user_type?: 'player' | 'manager' | 'coach' | null
          sport_slug?: string | null
          design_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          accent_color?: string | null
          status?: string
          approval_status?: 'pending_review' | 'approved' | 'changes_requested' | 'revision_ready' | null
          brief?: string | null
          mockup_urls?: string[] | null
          feedback?: string | null
          order_id?: string | null
          order_stage?: 'design_phase' | 'pending_order' | 'in_order' | 'order_locked' | null
          created_at?: string
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string | null
          user_id: string
          team_id: string | null
          status: string
          payment_status: 'unpaid' | 'partial' | 'paid' | 'refunded' | null
          payment_mode: 'individual' | 'manager_pays_all' | null
          currency: string
          subtotal_clp: number
          discount_clp: number
          tax_clp: number
          shipping_clp: number
          total_clp: number
          total_amount_clp: number
          can_modify: boolean | null
          locked_at: string | null
          notes: string | null
          shipped_at: string | null
          delivered_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number?: string | null
          user_id: string
          team_id?: string | null
          status?: string
          payment_status?: 'unpaid' | 'partial' | 'paid' | 'refunded' | null
          payment_mode?: 'individual' | 'manager_pays_all' | null
          currency?: string
          subtotal_clp: number
          discount_clp?: number
          tax_clp?: number
          shipping_clp?: number
          total_amount_clp: number
          can_modify?: boolean | null
          locked_at?: string | null
          notes?: string | null
          shipped_at?: string | null
          delivered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string | null
          user_id?: string
          team_id?: string | null
          status?: string
          payment_status?: 'unpaid' | 'partial' | 'paid' | 'refunded' | null
          payment_mode?: 'individual' | 'manager_pays_all' | null
          currency?: string
          subtotal_clp?: number
          discount_clp?: number
          tax_clp?: number
          shipping_clp?: number
          total_amount_clp?: number
          can_modify?: boolean | null
          locked_at?: string | null
          notes?: string | null
          shipped_at?: string | null
          delivered_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      teams_with_details: {
        Row: {
          id: string
          name: string
          slug: string
          sport_id: string
          sport_name: string
          sport_slug: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          team_type: string | null
          created_by: string
          member_count: number
          created_at: string
          updated_at: string
        }
      }
    }
    Functions: {}
    Enums: {
      user_role: 'customer' | 'admin'
      order_status: 'draft' | 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
      design_status: 'open' | 'in_review' | 'approved' | 'rejected' | 'complete'
    }
  }
}

// Helper types for working with the database
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Views<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row']
