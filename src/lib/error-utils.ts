/**
 * Utility functions for type-safe error handling
 *
 * These utilities help convert unknown error types from catch blocks
 * into proper Error objects that can be safely logged.
 */

/**
 * Converts unknown error to Error object
 * Handles unknown, null, Error, and other types safely
 *
 * @example
 * ```ts
 * try {
 *   await dangerousOperation();
 * } catch (error) {
 *   logger.error('Operation failed', toError(error));
 * }
 * ```
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  if (error === null || error === undefined) {
    return new Error('Unknown error occurred');
  }
  if (typeof error === 'string') {
    return new Error(error);
  }
  // For objects with message property
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return new Error(String(error.message));
  }
  return new Error(String(error));
}

/**
 * Checks if value is an Error object
 * Type guard for Error instances
 *
 * @example
 * ```ts
 * if (isError(someValue)) {
 *   console.error(someValue.stack);
 * }
 * ```
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Converts PostgrestError | null to Error
 * Supabase queries return PostgrestError | null for errors
 *
 * @example
 * ```ts
 * const { data, error } = await supabase.from('teams').select('*');
 * if (error) {
 *   logger.error('Query failed', toSupabaseError(error));
 * }
 * ```
 */
export function toSupabaseError(error: { message: string } | null): Error {
  if (!error) {
    return new Error('Database operation failed');
  }
  return new Error(error.message);
}

/**
 * Safely extracts error message from unknown error
 *
 * @example
 * ```ts
 * catch (error) {
 *   return apiError(getErrorMessage(error));
 * }
 * ```
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }
  return 'An unknown error occurred';
}
