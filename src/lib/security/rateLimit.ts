// src/lib/security/rateLimit.ts
type Bucket = { tokens: number; resetAt: number };

const store = new Map<string, Bucket>();

const DEFAULT_WINDOW_MS = 60_000; // 60s
const DEFAULT_TOKENS = 10;        // 10 requests per window

function getIp(req: Request) {
  const xfwd = req.headers.get('x-forwarded-for') || '';
  const ip = xfwd.split(',').map(s => s.trim()).filter(Boolean)[0]
    || req.headers.get('x-real-ip')
    || '127.0.0.1';
  return ip;
}

export function rateLimit(req: Request, keyHint?: string, windowMs = DEFAULT_WINDOW_MS, tokens = DEFAULT_TOKENS) {
  const ip = getIp(req);
  const url = new URL(req.url);
  const key = `${ip}:${keyHint || url.pathname}`;

  const now = Date.now();
  const existing = store.get(key);
  if (!existing || now >= existing.resetAt) {
    // reset bucket
    store.set(key, { tokens: tokens - 1, resetAt: now + windowMs });
    return { ok: true, resetInMs: windowMs };
  }

  if (existing.tokens > 0) {
    existing.tokens -= 1;
    return { ok: true, resetInMs: existing.resetAt - now };
  }

  return { ok: false, resetInMs: Math.max(0, existing.resetAt - now) };
}