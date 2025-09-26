// src/lib/url.ts
export function getBaseURL() {
  // Use Vercel's automatic URL detection
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Fall back to manual config
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // Local development
  return 'http://localhost:3000';
}