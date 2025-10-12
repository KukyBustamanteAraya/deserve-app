// Standard API response helpers for consistent error handling and response shapes

import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types/api';

/**
 * Creates a successful API response
 * @param data - The response data
 * @param message - Optional success message
 * @param status - HTTP status code (default: 200)
 */
export function apiSuccess<T>(
  data: T,
  message?: string,
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message }),
    },
    { status }
  );
}

/**
 * Creates an error API response
 * @param error - Error message
 * @param status - HTTP status code (default: 500)
 */
export function apiError(
  error: string,
  status = 500
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

/**
 * Creates a validation error response (400)
 * @param error - Validation error message
 */
export function apiValidationError(error: string): NextResponse<ApiResponse<never>> {
  return apiError(error, 400);
}

/**
 * Creates an unauthorized error response (401)
 * @param error - Authorization error message
 */
export function apiUnauthorized(error = 'Unauthorized'): NextResponse<ApiResponse<never>> {
  return apiError(error, 401);
}

/**
 * Creates a forbidden error response (403)
 * @param error - Forbidden error message
 */
export function apiForbidden(error = 'Forbidden'): NextResponse<ApiResponse<never>> {
  return apiError(error, 403);
}

/**
 * Creates a not found error response (404)
 * @param error - Not found error message
 */
export function apiNotFound(error = 'Resource not found'): NextResponse<ApiResponse<never>> {
  return apiError(error, 404);
}
