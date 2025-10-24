// Design request and approval types with Zod schemas

import { z } from 'zod';

export interface DesignRequest {
  id: number;
  team_id: string;
  requested_by: string;
  brief: string | null;
  status: 'pending' | 'rendering' | 'ready' | 'cancelled' | 'in_review' | 'changes_requested' | 'approved' | 'rejected' | 'design_ready' | 'open' | 'voting';
  selected_candidate_id: number | null;
  estimated_roster_size: number | null;
  created_at: string;
  updated_at: string;
}

// Zod schema for creating a design request
export const CreateDesignRequestSchema = z.object({
  teamId: z.string().uuid('Invalid team ID'),
  brief: z.string().max(5000).optional(),
  estimatedRosterSize: z.number().int().min(0).max(200).optional(),
});

export type CreateDesignRequestPayload = z.infer<typeof CreateDesignRequestSchema>;

// Zod schema for updating design request status
export const UpdateDesignRequestStatusSchema = z.object({
  status: z.enum(['pending', 'rendering', 'ready', 'cancelled', 'in_review', 'changes_requested', 'approved', 'rejected', 'design_ready']),
  selectedCandidateId: z.number().int().positive().optional(),
  feedback: z.string().max(5000).optional(),
  design_id: z.string().uuid().optional(),
});

export type UpdateDesignRequestStatusPayload = z.infer<typeof UpdateDesignRequestStatusSchema>;

// Response types
export interface DesignRequestResponse {
  id: number;
  team_id: string;
  requested_by: string;
  brief: string | null;
  status: string;
  selected_candidate_id: number | null;
  estimated_roster_size: number | null;
  created_at: string;
  updated_at: string;
}

export interface DesignRequestListResponse {
  items: DesignRequestResponse[];
  total: number;
}
