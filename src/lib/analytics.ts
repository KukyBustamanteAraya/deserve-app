// src/lib/analytics.ts

export function track(event: string, props?: Record<string, unknown>) {
  if (process.env.NEXT_PUBLIC_DEBUG_ANALYTICS === "1") {
    console.log("[analytics]", event, props || {});
  }

  // TODO: Add actual analytics service integration here
  // e.g., Segment, Mixpanel, PostHog, etc.
}