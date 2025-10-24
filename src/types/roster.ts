// Roster types and Zod schemas for CSV upload validation

import { z } from 'zod';

export interface RosterMember {
  id: number;
  team_id: string;
  full_name: string;
  number: string | null;
  size: string | null;
  email: string | null;
  phone: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

// Zod schema for CSV row validation
export const RosterRowSchema = z.object({
  full_name: z.string().min(1, 'Name is required').max(255),
  number: z.string().max(10).optional().nullable(),
  size: z.string().max(10).optional().nullable(),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  phone: z.string().max(20).optional().nullable(),
});

export type RosterRow = z.infer<typeof RosterRowSchema>;

// Alias for backwards compatibility
export const RosterMemberSchema = RosterRowSchema;

// Zod schema for CSV preview response
export const PreviewRowSchema = z.object({
  rowIndex: z.number(),
  data: z.record(z.string(), z.any()),
});

export type PreviewRow = z.infer<typeof PreviewRowSchema>;

// Zod schema for commit payload
export const RosterCommitPayloadSchema = z.object({
  teamId: z.string().uuid('Invalid team ID'),
  mapping: z.object({
    csvNameField: z.string(),
    csvNumberField: z.string().optional(),
    csvSizeField: z.string().optional(),
    csvEmailField: z.string().optional(),
    csvPhoneField: z.string().optional(),
  }),
  rows: z.array(z.record(z.string(), z.any())),
});

export type RosterCommitPayload = z.infer<typeof RosterCommitPayloadSchema>;

// Response types
export interface RosterCommitResponse {
  inserted: number;
  skipped: number;
  errors: Array<{ line: number; message: string }>;
}

export interface RosterPreviewResponse {
  headers: string[];
  rows: PreviewRow[];
  totalRows: number;
}

// Aliases for backwards compatibility
export type RosterCommitResult = RosterCommitResponse;
export type CSVPreview = RosterPreviewResponse;

// Column mapping type for CSV import (maps CSV headers to database fields)
export type ColumnMapping = {
  csvNameField: string;
  csvNumberField?: string;
  csvSizeField?: string;
  csvEmailField?: string;
  csvPhoneField?: string;
};
