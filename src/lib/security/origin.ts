// src/lib/security/origin.ts
const ALLOWED_ORIGINS = new Set<string>(
  (process.env.CSRF_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
);

// If env var not set, default to same-origin only (computed at runtime from Host header)
export function isAllowedOrigin(request: Request) {
  const origin = request.headers.get('origin') || '';
  const referer = request.headers.get('referer') || '';

  // If caller is same-origin: Origin and Referer should start with the request's own origin
  const url = new URL(request.url);
  const selfOrigin = `${url.protocol}//${url.host}`;

  const matchesSelf =
    (origin ? origin.startsWith(selfOrigin) : true) &&
    (referer ? referer.startsWith(selfOrigin) : true);

  if (ALLOWED_ORIGINS.size === 0) return matchesSelf;

  // Otherwise, allow listed origins only (and still require Referer to start with the same allowed origin if provided)
  const fromList =
    (origin && ALLOWED_ORIGINS.has(origin)) ||
    (referer && [...ALLOWED_ORIGINS].some(o => referer.startsWith(o)));

  return fromList;
}

export function assertSameSiteOrAllowed(request: Request) {
  if (!isAllowedOrigin(request)) {
    const msg = 'Forbidden: cross-site request blocked';
    return { ok: false as const, response: new Response(msg, { status: 403 }) };
  }
  return { ok: true as const };
}