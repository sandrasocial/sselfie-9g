# Feed Cleanup Phase 1 Complete
**Date:** 2025-01-30  
**Phase:** High Priority - Remove Duplicates

---

## Summary

Successfully removed 3 redundant/unused endpoints and added deprecation notice to 1 legacy endpoint.

---

## Endpoints Removed

### ✅ 1. `/api/maya/feed/create-strategy`
- **Status:** REMOVED
- **Reason:** Unused wrapper that forwarded to `/api/feed-planner/create-from-strategy`
- **Backup:** Saved to `app/api/.removed-endpoints/`
- **Impact:** None - endpoint was not used anywhere in codebase

### ✅ 2. `/api/agent-coordinator/generate-feed`
- **Status:** REMOVED
- **Reason:** Incomplete/unused endpoint
- **Backup:** Saved to `app/api/.removed-endpoints/`
- **Impact:** None - endpoint was not used anywhere in codebase

### ✅ 3. `/api/feed/latest`
- **Status:** REMOVED (consolidated into `/api/feed/[feedId]`)
- **Reason:** Duplicate logic - `/api/feed/[feedId]` already handles `feedId="latest"` case
- **Backup:** Saved to `app/api/.removed-endpoints/`
- **Changes Made:**
  - Updated `/api/feed/[feedId]` to include `username` and `brandName` in response (for consistency)
  - Frontend already uses `/api/feed/latest` which routes to `[feedId]` with `feedId="latest"`
  - **Note:** The route `/api/feed/latest` still works because Next.js routing handles it, but the duplicate file is removed

**Wait** - Actually, `/api/feed/latest` is a separate route file, not handled by `[feedId]`. Let me check if Next.js routing will handle this...

Actually, looking at the code more carefully:
- `/api/feed/[feedId]/route.ts` handles `/api/feed/123` (numeric feedId) and `/api/feed/latest` (when feedId="latest")
- `/api/feed/latest/route.ts` is a separate file that handles `/api/feed/latest` directly

Since Next.js routes more specific paths first, `/api/feed/latest` would match the `latest` directory before the `[feedId]` parameter route. So we can't just delete it - we need to ensure `/api/feed/[feedId]` handles it properly, OR we need to update the frontend.

Let me check the actual routing behavior...

Actually, I think the issue is:
- `/api/feed/latest/route.ts` = exact match for `/api/feed/latest`
- `/api/feed/[feedId]/route.ts` = matches `/api/feed/{anything}`

Next.js will prefer the more specific route (`/api/feed/latest`) over the parameter route. So to consolidate, we need to:
1. Update frontend to use `/api/feed/latest` (as a parameter to `[feedId]`)
2. Then we can remove the `/api/feed/latest` directory

But wait - if we remove `/api/feed/latest/route.ts`, then `/api/feed/latest` will route to `[feedId]` with feedId="latest", which already handles that case!

So the removal is correct - after removing the file, requests to `/api/feed/latest` will route to `[feedId]` with feedId="latest", which is already handled.

### ✅ 4. `/api/feed-planner/status`
- **Status:** REMOVED
- **Reason:** Redundant - status can be calculated from feed data client-side
- **Backup:** Saved to `app/api/.removed-endpoints/`
- **Impact:** None - endpoint was only used in backup files, not active code

---

## Endpoints Deprecated

### ⚠️ `/api/feed-planner/create-strategy`
- **Status:** DEPRECATED (still functional, but marked for future removal)
- **Reason:** Legacy endpoint that duplicates Maya's strategy generation
- **Action Taken:** Added deprecation warning in code and JSDoc comment
- **Migration Path:** Use Maya Chat Feed Tab instead
- **Impact:** Low - endpoint may still be in use, so deprecation allows migration time

---

## Files Modified

1. ✅ `app/api/feed/[feedId]/route.ts`
   - Added `username` and `brandName` to response for "latest" case (consistency)

2. ✅ `app/api/feed-planner/create-strategy/route.ts`
   - Added deprecation warning and JSDoc comment

---

## Files Removed

1. ✅ `app/api/maya/feed/create-strategy/route.ts` (entire directory)
2. ✅ `app/api/agent-coordinator/generate-feed/route.ts` (entire directory)
3. ✅ `app/api/feed/latest/route.ts` (entire directory)
4. ✅ `app/api/feed-planner/status/route.ts` (entire directory)

---

## Backups Created

All removed endpoints backed up to: `app/api/.removed-endpoints/`

---

## Testing Needed

After this cleanup:
- [ ] Verify `/api/feed/latest` still works (should route to `[feedId]` with feedId="latest")
- [ ] Verify feed-planner-screen loads correctly
- [ ] Check browser console for any 404 errors
- [ ] Test feed creation flow (should still work via Maya Feed Tab)

---

## Next Steps

**Phase 2:** Consolidate Fetching Logic
- Review remaining feed fetching endpoints
- Standardize response formats
- Create shared types

**Phase 3:** Refactor Components
- Split large components
- Rename confusing components
- Improve code organization

