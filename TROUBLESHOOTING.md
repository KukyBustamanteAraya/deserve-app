# Troubleshooting Guide

## Common Development Issues

### Issue: Page Displays as Plain Text (No Styling)

**Symptoms:**
- Browser shows unstyled HTML (plain black text on white background)
- Console shows 404 errors for `/_next/static/` assets
- CSS and JavaScript fail to load

**Root Cause:**
This issue was caused by running two separate file-watching processes simultaneously:
1. Tailwind CLI watching and compiling CSS
2. Next.js dev server watching and compiling the app

This created file system race conditions and webpack cache corruption.

**Fix Applied (2025-10-09):**
We fixed this by letting Next.js handle Tailwind CSS natively through PostCSS:

1. ✅ Changed `layout.tsx` to import `globals.css` directly
2. ✅ Updated `npm run dev` to use only `next dev` (no concurrent processes)
3. ✅ Configured webpack to use memory cache instead of filesystem cache
4. ✅ Optimized module resolution

**Quick Fix (If it happens again):**

```bash
# Option 1: Use the restart script
npm run restart

# Option 2: Manual restart
lsof -ti:3000 | xargs kill -9
rm -rf .next
npm run dev
```

**Prevention:**
- ✅ Always use `npm run dev` (not `npm run dev:old`)
- ✅ Never import `tw-built.css` - always use `globals.css`
- ✅ Clear `.next` cache if you see webpack errors
- ✅ Use `npm run dev:turbo` for even better stability (experimental)

---

## Dev Server Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server (stable, recommended) |
| `npm run dev:turbo` | Start dev server with Turbopack (faster, experimental) |
| `npm run restart` | Stop server, clear cache, restart |
| `npm run clean:cache` | Clear Next.js cache only |
| `npm run dev:fresh` | Clean cache and start dev server |

---

## Performance Tips

### 1. Use Turbopack (Optional)
Turbopack is Next.js 14's new bundler - much faster and more stable:
```bash
npm run dev:turbo
```

### 2. Clear Cache Periodically
If the app feels slow or you see weird errors:
```bash
npm run restart
```

### 3. Monitor Memory Usage
The dev server uses memory caching. If your system has <8GB RAM, you may need to restart periodically.

---

## Architecture Notes

### CSS Compilation
- **Before:** Tailwind CLI → `tw-built.css` + Next.js (race conditions)
- **After:** Next.js PostCSS → Direct Tailwind processing (stable)

### Webpack Configuration
```javascript
// next.config.js
webpack: (config, { dev }) => {
  if (dev) {
    config.cache = { type: 'memory' }; // Prevents filesystem issues
  }
  config.resolve.symlinks = false; // Faster module resolution
  return config;
}
```

### File Watching
- Next.js watches: `src/**/*`, `next.config.js`, `tailwind.config.js`
- PostCSS watches: `globals.css` and Tailwind content files
- No separate Tailwind CLI process needed

---

## Getting Help

If you still experience issues:

1. Check the logs in `/tmp/dev-server-output.log`
2. Look for webpack errors or 404s in browser console
3. Try `npm run restart`
4. If all else fails: `npm run clean` (full reinstall)

---

## Changelog

**2025-10-09** - Fixed plain text rendering issue
- Removed concurrent Tailwind CLI process
- Switched to Next.js native PostCSS/Tailwind
- Added memory-based webpack caching
- Created `npm run restart` command
