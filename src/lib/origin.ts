export function getOrigin(): string {
  // On server, use NEXT_PUBLIC_SITE_URL if available
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  }

  // On client, use window.location.origin
  return window.location.origin
}