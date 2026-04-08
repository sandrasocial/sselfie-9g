# Feed Planner - Next Steps & Action Plan

**Date:** January 4, 2026  
**Server Status:** ✅ Running on http://localhost:3000  
**Overall Progress:** 60% Complete

---

## 🎯 What You Should Do Next

Based on the updated audit report, here are your recommended next steps in priority order:

---

## 🔴 HIGH PRIORITY (Do This Week)

### 1. Verify Feed Aesthetic Expertise (30 minutes) ⚠️

**Why:** Feeds might be too generic without aesthetic guidance

**What to do:**
1. Open Maya Chat on the Feed tab
2. Ask: "Create a Dark & Moody Instagram feed"
3. Check if Maya uses specific aesthetic expertise
4. If feeds are generic, check system prompt loading

**Where to look:**
- `app/api/maya/chat/route.ts` (lines 128-136)
- System prompt should include feed planner context when `x-active-tab === "feed"`

**How to test:**
```bash
# Open browser console (F12)
# Send feed request
# Look for logs like:
[Maya Chat API] ✅ FEED TAB DETECTED - Will load aesthetic expertise
```

**Expected behavior:**
- Maya should mention specific aesthetics (Dark & Moody, Minimalist Chic, etc.)
- Feed posts should reflect the requested aesthetic
- Captions should align with the aesthetic

**If it's broken:**
- Check if system prompt includes feed context
- Verify `x-active-tab` header reaches the API
- Check if context is properly loaded

---

### 2. End-to-End Feed Testing (1 hour) ✅

**Why:** Confirm entire flow works from start to finish

**Test Scenario:**
```
1. Open Maya Chat → Feed Tab
2. Send: "Create a beige minimalist feed for my coffee shop"
3. Wait for feed card to appear
4. Click "Save Feed" button
5. Verify feed is saved to database
6. Click "Generate Images" 
7. Wait for images to generate
8. Verify images match aesthetic
9. Check captions are appropriate
```

**What to verify:**
- [ ] Feed card renders correctly
- [ ] Save button works
- [ ] Feed appears in database
- [ ] Images generate successfully
- [ ] Aesthetic is maintained
- [ ] Captions are relevant
- [ ] No errors in console

**If something fails:**
- Check browser console for errors
- Check server logs
- Verify API endpoints are responding
- Check database for feed entry

---

## 🟡 MEDIUM PRIORITY (Do Next Week)

### 3. Clean Up Duplicate API Endpoints (2-3 hours) 🧹

**Why:** 5 duplicate endpoints causing confusion and maintenance burden

**Endpoints to remove/consolidate:**

#### Step 1: Remove Unused Wrappers
```bash
# These files should be removed (after verifying nothing uses them):
rm app/api/maya/feed/create-strategy/route.ts
rm app/api/agent-coordinator/generate-feed/route.ts
```

#### Step 2: Consolidate Feed Latest
```bash
# Update all references from /api/feed/latest to /api/feed/[feedId] with feedId="latest"
# Then remove:
rm app/api/feed/latest/route.ts
```

#### Step 3: Remove Redundant Status Endpoint
```bash
# Move status calculation to client-side, then remove:
rm app/api/feed-planner/status/route.ts
```

**Before removing anything:**
1. Search codebase for references:
   ```bash
   cd /Users/MD760HA/sselfie-9g-1
   grep -r "maya/feed/create-strategy" .
   grep -r "agent-coordinator/generate-feed" .
   grep -r "feed/latest" .
   grep -r "feed-planner/status" .
   ```

2. Verify no frontend code uses them
3. Test after each removal

---

### 4. Refactor Large Components (2-3 hours) 📦

**Why:** `maya-feed-tab.tsx` is 797 lines - hard to maintain

**Recommended splits:**

```
maya-feed-tab.tsx (797 lines)
  ↓ Split into:
  ├── maya-feed-list.tsx (200 lines)
  │   └── Displays list of feeds
  ├── maya-feed-creator.tsx (300 lines)
  │   └── Handles feed creation logic
  ├── maya-feed-card.tsx (200 lines)
  │   └── Individual feed card component
  └── maya-feed-tab.tsx (100 lines)
      └── Orchestration and tab wrapper
```

**Benefits:**
- Easier to understand
- Easier to test
- Better separation of concerns
- Reusable components

---

## 🟢 LOW PRIORITY (When You Have Time)

### 5. Clean Up Debug Logs (1 hour) 🧽

**Why:** Production console is noisy with debug logs

**What to do:**
1. Create debug utility:
   ```typescript
   // lib/debug.ts
   const DEBUG = process.env.NODE_ENV === 'development'
   
   export const debugLog = (...args: any[]) => {
     if (DEBUG) console.log(...args)
   }
   ```

2. Replace console.log with debugLog:
   ```typescript
   // Before:
   console.log("[FEED] ✅ Detected trigger")
   
   // After:
   import { debugLog } from '@/lib/debug'
   debugLog("[FEED] ✅ Detected trigger")
   ```

3. Search and replace in these files:
   - `components/sselfie/maya/hooks/use-maya-chat.ts`
   - `components/sselfie/maya/maya-feed-tab.tsx`
   - `components/sselfie/maya/maya-chat-interface.tsx`

---

### 6. Improve Error Handling UX (2 hours) 💬

**Why:** Using `alert()` for errors - not great UX

**What to do:**
1. Install a toast library (if not already):
   ```bash
   pnpm add sonner
   ```

2. Replace alert() with toast:
   ```typescript
   // Before:
   alert("Failed to create feed. Please try again.")
   
   // After:
   import { toast } from 'sonner'
   toast.error("Failed to create feed. Please try again.")
   ```

3. Add toast provider to layout:
   ```typescript
   import { Toaster } from 'sonner'
   
   export default function RootLayout() {
     return (
       <>
         {children}
         <Toaster position="bottom-right" />
       </>
     )
   }
   ```

---

## 📊 Progress Tracking

Use this checklist to track your progress:

### This Week:
- [ ] Verify feed aesthetic expertise (30 mins)
- [ ] End-to-end feed testing (1 hour)
- [ ] Fix any issues found in testing

### Next Week:
- [ ] Clean up duplicate endpoints (2-3 hours)
- [ ] Refactor large components (2-3 hours)

### Future:
- [ ] Clean up debug logs (1 hour)
- [ ] Improve error handling UX (2 hours)

---

## 🎓 Success Criteria

You'll know you're done when:

### ✅ Feed Quality:
- [ ] Feeds reflect requested aesthetics
- [ ] Captions are relevant and on-brand
- [ ] Images match the aesthetic
- [ ] No generic/boring feeds

### ✅ Code Quality:
- [ ] No duplicate endpoints
- [ ] Components are reasonably sized (<500 lines)
- [ ] No debug logs in production
- [ ] Clean error handling

### ✅ User Experience:
- [ ] Tab switching works smoothly
- [ ] Feed creation is intuitive
- [ ] Errors are user-friendly
- [ ] Loading states are clear

---

## 📚 Documentation to Reference

1. **Current Status:** `FEED_AUDIT_REPORT.md` (Section 13)
2. **Code Details:** `FEED_IMPLEMENTATION_AUDIT.md`
3. **What Changed:** `FEED_AUDIT_UPDATE_SUMMARY.md`
4. **Test Guide:** `TEST_TAB_SWITCHING.md`

---

## 💡 Tips

1. **Test after each change** - Don't accumulate untested changes
2. **Keep backups** - Especially before removing endpoints
3. **Check console logs** - They'll tell you what's happening
4. **Use git commits** - Commit working code frequently
5. **Ask questions** - Better to ask than break something

---

## 🆘 If You Get Stuck

**Issue:** Feed aesthetics not working
- Check: `app/api/maya/chat/route.ts` system prompt loading
- Look for: `x-active-tab` header check
- Verify: Feed context is included

**Issue:** Duplicate endpoint removal breaks something
- Rollback: `git revert HEAD`
- Search: `grep -r "endpoint-name" .`
- Fix: Update references before removing

**Issue:** Component refactoring causes errors
- Check: Import paths are correct
- Verify: Props are properly passed
- Test: Each component individually

---

**Action Plan Created:** January 4, 2026  
**Owner:** Sandra  
**Support:** Cursor AI (Your Virtual Dev Team)  
**Status:** Ready to execute 🚀

