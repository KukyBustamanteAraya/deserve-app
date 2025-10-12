// Common utility types for the application

/**
 * Type-safe error type for catch blocks
 */
export type ErrorWithMessage = {
  message: string;
  code?: string;
  [key: string]: unknown;
};

/**
 * Check if error has a message property
 */
export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

/**
 * Convert unknown error to ErrorWithMessage
 */
export function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError;

  try {
    return { message: JSON.stringify(maybeError) };
  } catch {
    return { message: String(maybeError) };
  }
}

/**
 * Get error message safely
 */
export function getErrorMessage(error: unknown): string {
  return toErrorWithMessage(error).message;
}

/**
 * JSON value type for database JSON columns
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * Product image type for catalog
 */
export interface ProductImage {
  id: string;
  product_id: string;
  path: string;
  alt: string | null;
  position: number;
  created_at: string;
}

/**
 * Sort function type for arrays
 */
export type CompareFn<T> = (a: T, b: T) => number;

/**
 * Generic pagination params
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string | null;
}

/**
 * Generic paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  limit?: number;
  nextCursor?: string | null;
}

/**
 * User identity from Supabase auth
 */
export interface UserIdentity {
  id: string;
  user_id: string;
  identity_data?: {
    [key: string]: JsonValue;
  };
  provider: string;
  created_at: string;
  updated_at: string;
}

/**
 * Supabase User type (simplified)
 */
export interface AuthUser {
  id: string;
  email?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
  identities?: UserIdentity[];
  [key: string]: unknown;
}

/**
 * Generic select option for forms
 */
export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

/**
 * Form field error
 */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * Form validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: FieldError[];
}
