# Build Error Analysis & Strategy

## Summary
- **Total Errors:** 97
- **User-Facing Files:** ~25 (CRITICAL - must fix)
- **Admin-Only Files:** ~15 (Can fix later or delete)
- **Components/Lib Files:** ~20 (Check if used)
- **Cron Jobs:** ~5 (Background - low priority)

---

## 🚨 CRITICAL: User-Facing Files (Fix First)

These are used by your customers. **Must fix these:**

### Core Maya Chat (Most Important)
- `app/api/maya/chat/route.ts` ✅ (Already fixed - no errors)
- `app/api/maya/load-chat/route.ts` ⚠️
- `app/api/maya/generate-image/route.ts` ⚠️
- `app/api/maya/generate-concepts/route.ts` ⚠️
- `app/api/maya/new-chat/route.ts` ⚠️
- `app/api/maya/save-message/route.ts` ⚠️

### Studio Pro (Core Feature)
- `app/api/studio-pro/generate/carousel/route.ts` ⚠️
- `app/api/studio-pro/generate/reel-cover/route.ts` ⚠️
- `app/api/studio-pro/generate/edit-reuse/route.ts` ⚠️

### Feed Planner (Core Feature)
- `app/api/feed/[feedId]/generate-single/route.ts` ⚠️
- `app/api/feed/[feedId]/generate-bio/route.ts` ⚠️
- `app/api/feed/latest/route.ts` ⚠️
- `app/api/feed-planner/create-strategy/route.ts` ⚠️

### Training (Core Feature)
- `app/api/training/start/route.ts` ⚠️
- `app/api/training/progress/route.ts` ⚠️
- `app/api/training/upload-zip/route.ts` ⚠️
- `app/api/training/sync-version/route.ts` ⚠️

### Academy (Core Feature)
- `app/api/academy/exercises/submit/route.ts` ⚠️
- `app/api/academy/lessons/[lessonId]/route.ts` ⚠️

### Webhooks (Critical for Payments)
- `app/api/webhooks/stripe/route.ts` ⚠️
- `app/api/webhooks/resend/route.ts` ⚠️

---

## ⚠️ ADMIN-ONLY: Fix After User-Facing

These are only used by you (admin) - **13 references to Alex, 12 to Maya Testing**. 
**Fix after user-facing files are done:**

### Admin Alex Chat
- `app/api/admin/alex/chat/route.ts` ⚠️ (Has errors)
- `app/api/admin/alex/load-chat/route.ts` ⚠️ (Has errors)

### Admin Maya Testing
- `app/api/admin/maya-testing/get-training-progress/route.ts` ⚠️
- `app/api/admin/maya-testing/run-test/route.ts` ⚠️

### Admin Training Tools
- `app/api/admin/training/fix-trigger-word/route.ts` ⚠️
- `app/api/admin/training/sync-status/route.ts` ⚠️
- `app/api/admin/training/promote-test-model/route.ts` ⚠️

### Cron Jobs (Background - Low Priority)
- `app/api/cron/send-blueprint-followups/route.ts` ⚠️
- `app/api/cron/reengagement-campaigns/route.ts` ✅ (Just fixed)

---

## 📦 COMPONENTS/LIB: Check If Used

These might be unused. **Check before fixing:**

### Components
- `components/admin/admin-agent-chat-new.tsx` ⚠️
- `components/admin/email-preview-card.tsx` ⚠️
- `components/admin/maya-testing-lab.tsx` ⚠️
- `components/admin/prompt-builder-chat.tsx` ⚠️
- `components/feed-planner/instagram-feed-view.tsx` ⚠️
- `components/sselfie/academy-screen.tsx` ⚠️
- `components/sselfie/b-roll-screen.tsx` ⚠️
- `components/sselfie/install-prompt.tsx` ⚠️
- `components/sselfie/maya-chat-screen.tsx` ⚠️ (CRITICAL - used by customers!)
- `components/sselfie/training-screen.tsx` ⚠️

### Lib Files
- `lib/analytics/feed-generation-metrics.ts` ⚠️
- `lib/credits.ts` ⚠️ (CRITICAL - used by customers!)
- `lib/data/training.ts` ⚠️
- `lib/email/run-scheduled-campaigns.ts` ⚠️
- `lib/email/send-email.ts` ⚠️
- `lib/feed-planner/batch-prompt-generator.ts` ⚠️
- `lib/maya/motion-similarity.ts` ⚠️
- `lib/maya/photoshoot-session.ts` ⚠️
- `lib/nano-banana-client.ts` ⚠️
- `lib/subscription.ts` ⚠️ (CRITICAL - used by customers!)
- `lib/supabase/client.ts` ⚠️ (CRITICAL - used by customers!)
- `lib/user-mapping.ts` ⚠️ (CRITICAL - used by customers!)

---

## 🎯 RECOMMENDED STRATEGY

### Option 1: Fix Only User-Facing (Fastest - ~25 files)
**Time:** ~1-2 hours
**Impact:** Customers can use app, admin tools broken temporarily
**Risk:** Low - admin tools can wait

### Option 2: Fix All (Complete - ~97 errors)
**Time:** ~4-6 hours
**Impact:** Everything works
**Risk:** Medium - might break something while fixing

### Option 3: Delete Unused Admin Files (Most Efficient)
**Time:** ~30 minutes to identify + delete
**Impact:** Fewer files to maintain, faster builds
**Risk:** Low if we verify they're unused

---

## 🔍 QUICK CHECK: Are Admin Files Used?

Run this to see if admin routes are actually called:
```bash
grep -r "/api/admin" app components --include="*.tsx" --include="*.ts" | grep -v "node_modules"
```

If no results, those admin files might be unused and can be deleted!

---

## ✅ NEXT STEPS

1. **Fix user-facing files first** (Option 1) - Get customers working
2. **Check if admin files are used** - Delete if unused
3. **Fix remaining files** - Only if needed

**Recommendation:** Start with Option 1, then check if admin files are used.

