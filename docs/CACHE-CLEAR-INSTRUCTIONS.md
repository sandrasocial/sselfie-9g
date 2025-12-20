# Cache Clearing Instructions for Maya Updates

**Date:** January 2025  
**Purpose:** Ensure Maya changes take effect after reconstruction updates

---

## Why Clear Cache?

After making significant changes to Maya's prompting system, Next.js/Turbopack may cache old code, causing:
- Old behavior to persist
- Build errors from cached files
- Changes not taking effect

---

## Cache Clearing Steps

### 1. Stop the Dev Server
```bash
pkill -f "next dev"
```

### 2. Clear Next.js Build Cache
```bash
rm -rf .next
```

### 3. (Optional) Clear Node Modules Cache
If issues persist:
```bash
rm -rf node_modules/.cache
```

### 4. Restart Dev Server
```bash
npm run dev
```

---

## What Gets Cached

### Next.js/Turbopack Cache
- **Location**: `.next/` directory
- **Contains**: Compiled pages, API routes, server components
- **Impact**: High - this is the main cache that affects Maya

### Node Modules Cache
- **Location**: `node_modules/.cache/`
- **Contains**: Package-level caches
- **Impact**: Low - usually not needed

### Browser Cache
- **Location**: Browser storage
- **Contains**: Client-side cached responses
- **Impact**: Medium - may need hard refresh (Cmd+Shift+R / Ctrl+Shift+R)

---

## When to Clear Cache

### Always Clear After:
1. ✅ Major refactoring (like Maya reconstruction)
2. ✅ Changes to API routes (`app/api/maya/`)
3. ✅ Changes to system prompts or personality files
4. ✅ Build errors that persist after code fixes
5. ✅ Changes not taking effect

### Usually Not Needed:
- Minor UI changes
- CSS/styling updates
- Frontend component changes (unless they import Maya modules)

---

## Verification

After clearing cache and restarting:

1. **Check server logs**: Look for successful compilation
2. **Test Maya**: Try a guide prompt to verify changes
3. **Check console**: No build errors
4. **Verify behavior**: Maya should use new personality and respect guide prompts

---

## Quick Command

```bash
# Full cache clear and restart
pkill -f "next dev" && rm -rf .next && npm run dev
```

---

## Troubleshooting

### If changes still don't take effect:

1. **Hard refresh browser**: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
2. **Clear browser cache**: DevTools → Application → Clear Storage
3. **Check for TypeScript errors**: `npm run build` (if not in dev mode)
4. **Verify imports**: Make sure new modules are properly imported

### If build errors persist:

1. **Check for duplicate exports**: `grep -r "export.*function" lib/maya/prompt-builders/`
2. **Verify file paths**: Check imports match actual file locations
3. **Check TypeScript**: `npx tsc --noEmit` to find type errors

---

## Current Status

✅ **Cache cleared**: `.next/` directory removed  
✅ **Server restarted**: Fresh dev server running  
✅ **Ready for testing**: Maya should use new code

---

## Notes

- Turbopack (Next.js 16) is faster but can be more aggressive with caching
- Always clear cache after major changes to Maya's core logic
- Browser cache may also need clearing for frontend changes















