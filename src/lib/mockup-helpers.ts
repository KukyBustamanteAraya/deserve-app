/**
 * Helper functions for handling mockup display with backward compatibility
 */

import type { DesignRequestMockups, MockupPreference } from '@/types/design-request';

export interface DesignRequestWithMockups {
  mockup_preference?: MockupPreference;
  mockups?: DesignRequestMockups;
  mockup_urls?: string[]; // Legacy field
}

/**
 * Get all mockup URLs from a design request
 * Checks structured mockups first, falls back to legacy mockup_urls
 */
export function getAllMockups(request: DesignRequestWithMockups): string[] {
  const urls: string[] = [];

  // Check structured mockups first
  if (request.mockups) {
    if (request.mockups.home?.front) urls.push(request.mockups.home.front);
    if (request.mockups.home?.back) urls.push(request.mockups.home.back);
    if (request.mockups.away?.front) urls.push(request.mockups.away.front);
    if (request.mockups.away?.back) urls.push(request.mockups.away.back);
  }

  // If no structured mockups, fall back to legacy mockup_urls
  if (urls.length === 0 && request.mockup_urls && request.mockup_urls.length > 0) {
    urls.push(...request.mockup_urls);
  }

  return urls;
}

/**
 * Get the primary mockup URL (first available mockup)
 * Prioritizes: home front → home back → away front → away back → legacy first
 */
export function getPrimaryMockup(request: DesignRequestWithMockups): string | null {
  // Check structured mockups
  if (request.mockups) {
    if (request.mockups.home?.front) return request.mockups.home.front;
    if (request.mockups.home?.back) return request.mockups.home.back;
    if (request.mockups.away?.front) return request.mockups.away.front;
    if (request.mockups.away?.back) return request.mockups.away.back;
  }

  // Fall back to legacy mockup_urls
  if (request.mockup_urls && request.mockup_urls.length > 0) {
    return request.mockup_urls[0];
  }

  return null;
}

/**
 * Check if a design request has any mockups
 */
export function hasMockups(request: DesignRequestWithMockups): boolean {
  return getAllMockups(request).length > 0;
}

/**
 * Get mockup count
 */
export function getMockupCount(request: DesignRequestWithMockups): number {
  return getAllMockups(request).length;
}
