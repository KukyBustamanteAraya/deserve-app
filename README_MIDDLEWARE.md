# Middleware Status

The middleware has been temporarily disabled for debugging purposes.

## To re-enable middleware:
```bash
mv src/_middleware.off.ts src/middleware.ts
```

## Issue Found:
The middleware was making blocking Supabase auth calls on every request, preventing server startup.

## Original Location:
- **Disabled**: `src/_middleware.off.ts`
- **Active**: `src/middleware.ts` (when enabled)