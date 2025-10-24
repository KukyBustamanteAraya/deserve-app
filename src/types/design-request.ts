/**
 * Design Request Mockup Types
 *
 * Defines the structure for storing and displaying mockups
 * for design requests with home/away color variations
 */

export type MockupPreference = 'home' | 'away' | 'both';

export interface MockupSet {
  front?: string;
  back?: string;
}

export interface DesignRequestMockups {
  home?: MockupSet;
  away?: MockupSet;
}

/**
 * Extended design request type with mockup fields
 */
export interface DesignRequestWithMockups {
  id: string | number;
  mockup_preference?: MockupPreference;
  mockups?: DesignRequestMockups;
  mockup_urls?: string[] | null; // Legacy field - kept for backward compatibility (can be null or undefined)
}
