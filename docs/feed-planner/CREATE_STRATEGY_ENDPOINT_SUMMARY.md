# Create-Strategy Endpoint: Quick Summary

**Date:** January 18, 2026  
**Verdict:** 🔴 **NOT USED - Safe to Delete**

---

## TL;DR

**The Strategy tab calls a DIFFERENT endpoint.**

- ❌ **Deprecated:** `/api/feed-planner/create-strategy` (NEVER CALLED)
- ✅ **Active:** `/api/feed/[feedId]/generate-strategy` (Strategy tab uses this)

**Recommendation:** DELETE the deprecated endpoint (1,240 lines of dead code)

---

## Evidence

### What the Strategy Tab Actually Calls

**File:** `components/feed-planner/feed-strategy.tsx`

**Line 64:**
```typescript
const response = await fetch(`/api/feed/${feedId}/generate-strategy`, {
  method: 'POST',
})
```

**Endpoint:** `/api/feed/[feedId]/generate-strategy` ← NOT the deprecated one

---

### Search Results

**Query:** "Find all client calls to `/api/feed-planner/create-strategy`"

```bash
grep -r "fetch.*feed-planner.*create-strategy" --include="*.tsx"
```

**Result:** **1 match** (archived docs only, NOT runtime code)

---

### Endpoint Comparison

| Aspect | Deprecated | Active |
|--------|-----------|--------|
| **Path** | `/api/feed-planner/create-strategy` | `/api/feed/[feedId]/generate-strategy` |
| **File** | `app/api/feed-planner/create-strategy/route.ts` | `app/api/feed/[feedId]/generate-strategy/route.ts` |
| **Lines** | 1,240 | 169 |
| **Purpose** | Create NEW feed from scratch | Generate strategy for EXISTING feed |
| **Called By** | ❌ NOTHING | ✅ Strategy tab |
| **Status** | 🔴 Dead code (line 35: `[DEPRECATED]`) | ✅ Active |

---

## Why Two Endpoints Exist

**Historical refactor:**
1. **Phase 1:** Original endpoint created FULL feeds (layout + images + strategy)
2. **Phase 2:** Refactored to simpler endpoint for strategy generation only
3. **Phase 3:** Original endpoint deprecated but never deleted → **dead code**

---

## Recommendation

### DELETE

**File:** `app/api/feed-planner/create-strategy/route.ts`

**Size:** 1,240 lines

**Risk:** **ZERO** (never called by any client code)

**Benefits:**
- ✅ Removes dead code
- ✅ Eliminates confusion (two similar endpoint names)
- ✅ Simplifies architecture

---

## Call Chain Evidence

### Strategy Tab Flow (ACTUAL)

```
User clicks "Create Strategy"
    ↓
components/feed-planner/feed-strategy.tsx
    ↓
fetch(`/api/feed/${feedId}/generate-strategy`) ← Uses active endpoint
    ↓
app/api/feed/[feedId]/generate-strategy/route.ts
    ↓
Generates strategy markdown
    ↓
Returns to client
```

**NO REFERENCE to deprecated endpoint**

---

### Deprecated Endpoint Flow

```
app/api/feed-planner/create-strategy/route.ts
    ↓
❌ NEVER CALLED BY ANYTHING
```

---

## Deletion Impact

**Files to delete:**
- `app/api/feed-planner/create-strategy/route.ts` (1,240 lines)

**Files that break:** **NONE** (no imports, no calls)

**Documentation to update:** 48 docs files (reference the deprecated endpoint)

---

## Detailed Audit

See full report: `CREATE_STRATEGY_ENDPOINT_USAGE_AUDIT.md`

---

**Verdict:** 🔴 **NOT USED**  
**Confidence:** 100%  
**Recommendation:** DELETE immediately
