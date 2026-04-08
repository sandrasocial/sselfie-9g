# Paid Blueprint Hotfix - What Changed & Why
**For:** Sandra (CEO/PM)  
**Status:** 🟡 Ready to Implement  
**Date:** January 9, 2026

---

## 🔍 What We Discovered

You were absolutely right. When I audited the **Free Blueprint** and **Maya Pro Photoshoot** implementations, I found that:

1. **Free Blueprint uses the CORRECT model:**
   - Uses `google/nano-banana-pro` (the advanced model)
   - Uses sophisticated prompt templates from a library
   - Takes selfie photos as inputs
   - Generates beautiful, consistent grids

2. **Maya Pro Photoshoot uses the CORRECT pattern:**
   - Generates **one grid at a time** (not all at once)
   - Client polls for each grid's completion
   - Progress saved incrementally
   - Never times out (each API call is fast)

3. **PR-4 (first version) did it WRONG:**
   - Used `black-forest-labs/flux-dev` (generic model, no selfies)
   - Tried to generate all 30 grids in one giant request (5-10 minute timeout risk)
   - Generic prompts (not our proven Blueprint templates)
   - No selfie inputs (less personalized)

---

## 🚨 The Problem in Plain English

**Imagine ordering 30 custom cakes:**

### ❌ How PR-4 v1 Worked (Wrong):
- You place one order for all 30 cakes
- Baker tries to make all 30 at once
- You wait 10 minutes on the phone
- If one cake fails, the whole order might fail
- If you hang up, you lose everything

### ✅ How Maya Pro Works (Correct):
- You order Cake #1
- Baker starts it and says "I'll text you when it's ready"
- You hang up, go do other things
- 30 seconds later: "Cake #1 ready!"
- You order Cake #2
- Repeat 30 times
- Each order is fast, you see progress, you can retry failed cakes individually

---

## 🎯 What the Hotfix Does

### Changes to Make Paid Blueprint Match Maya Pro + Free Blueprint:

| **What Changes** | **Why It's Better** |
|------------------|---------------------|
| Generate **one grid at a time** | Fast API calls, no timeouts |
| Client **polls for completion** | User can close tab and come back |
| Use **Nano Banana Pro** model | Same quality as Free Blueprint |
| Use **Blueprint templates** | Same style as Free Blueprint |
| Require **selfie inputs** | Personalized, consistent faces |
| Show **progress bar** (1/30, 2/30...) | User sees it working |
| Allow **retry per grid** | If Grid #7 fails, just retry #7 (not all 30) |

---

## 📊 Before vs. After

### User Experience

#### Before (PR-4 v1):
1. User clicks "Generate my 30 photos"
2. ⏳ Waiting... (5-10 minutes)
3. ⏳ Still waiting...
4. ❌ Error: Timeout (nothing saved)
5. 😡 User refreshes, tries again, same problem

#### After (Hotfix):
1. User clicks "Generate my 30 photos"
2. ✅ Grid 1/30 generating... (30 seconds)
3. ✅ Grid 2/30 generating... (30 seconds)
4. ✅ Grid 3/30 generating... (30 seconds)
5. 🎉 Progress bar shows 10% → 50% → 100%
6. User can close tab, come back later, progress is saved
7. If Grid #7 fails, user clicks "Retry Grid 7" (not restart all 30)

---

## 🧪 What You'll Test

### Test Flow (Manual):

1. **Go to Paid Blueprint page** (after purchase)
2. **Click "Generate my 30 photos"**
3. **Watch progress bar:**
   - Should show "Grid 1 of 30"
   - Then "Grid 2 of 30"
   - Each grid takes ~30-60 seconds
4. **Close the tab halfway through** (e.g., at Grid 15/30)
5. **Reopen the page**
   - Should show "15/30 complete"
   - Click "Continue" to resume from Grid 16
6. **When all 30 complete:**
   - Gallery shows all 30 grids
   - Each grid has 9 photos (270 total photos)

---

## ✅ What to Look For (Quality Checks)

### Visual Consistency:
- [ ] All grids feature **your face** (from selfies)
- [ ] Style matches **Free Blueprint** (same quality)
- [ ] Lighting/color grade is consistent
- [ ] No random faces or bodies (should always be you)

### Technical:
- [ ] Each grid generates in **< 1 minute**
- [ ] Progress bar updates in real-time
- [ ] No timeout errors
- [ ] Can close tab and resume later
- [ ] If you click "Generate Grid 5" twice, it doesn't charge twice (idempotent)

### User Experience:
- [ ] Clear progress indicator (not just spinning wheel)
- [ ] Can see completed grids while others generate
- [ ] Failed grids show "Retry" button (not "Start Over")

---

## 🔢 The Numbers

### Time Comparison:

| **Metric** | **PR-4 v1 (Wrong)** | **Hotfix (Correct)** |
|------------|---------------------|----------------------|
| Time per grid | N/A (all at once) | ~30-60 seconds |
| Total time | 5-10 minutes | 15-30 minutes total |
| Timeout risk | ❌ High | ✅ None |
| Progress visibility | ❌ No | ✅ Yes (1/30, 2/30...) |
| Resume after close | ❌ No | ✅ Yes |
| Retry failed grids | ❌ Restart all | ✅ Retry one |

**Why total time is longer but better:**
- User doesn't have to wait on the page
- Can close tab and come back
- Each grid saves as it finishes (no "all or nothing")
- More reliable (no timeouts)

---

## 🚀 What Happens Next

### Implementation Steps:
1. ✅ **Audit complete** (found the Maya Pro pattern)
2. 🟡 **Awaiting your approval** to proceed with hotfix
3. ⏳ **Rewrite APIs** (2-3 hours)
   - Change `generate-paid` to accept `gridNumber` param
   - Create new `check-paid-grid` polling endpoint
   - Update status endpoint to show progress
4. ⏳ **Test locally** (generate 5 grids to verify)
5. ⏳ **Update test script** (automated test for all 30)
6. ⏳ **Update docs** (new flow diagrams)
7. ⏳ **Deploy to staging** (your test purchase)
8. ⏳ **Deploy to production** (behind feature flag)

---

## 🎨 UI Changes (Frontend)

**NOTE:** This hotfix is **backend only** (APIs).  
Frontend changes are **not included** in this PR.

### What Frontend Needs (Separate PR):
```
Before: 
[Generate my 30 photos] → ⏳ Loading... (10 minutes)

After:
[Generate my 30 photos]
↓
Progress: [████████░░░░░░] 15/30 (50%)
Grid 15 generating... 30 seconds remaining
[Pause] [Cancel]

✅ Grid 1 | ✅ Grid 2 | ✅ Grid 3 | ... | 🔄 Grid 15 | ⏳ Grid 16
```

**For now:** Frontend can call the APIs manually (test with curl/Postman).  
**Later:** Build the UI (PR-5).

---

## 🔒 Safety & Rollback

### What if something breaks?

1. **Feature flag off:**
   ```
   Turn off "paid_blueprint_enabled" in admin panel
   ```

2. **No data loss:**
   - Progress is saved in the database
   - If hotfix fails, we can fix and resume from where it stopped
   - Example: If 12 grids generated, then bug occurred, after fix we resume from Grid 13

3. **Gradual rollout:**
   - Deploy behind feature flag
   - Test with your account first
   - Enable for 10% of users
   - Monitor for errors
   - Enable for 100% when stable

---

## 📋 Questions to Answer Before Proceeding

### 1. Resolution: 2K or 4K?
- **Free Blueprint:** 2K (current)
- **Maya Pro Photoshoot:** 4K (3 credits per grid)
- **Paid Blueprint v1:** Using 2K (no credits, included in $47)

**Recommendation:** Keep 2K for now.  
**Reasoning:** 
- Faster generation (~30 sec vs. ~60 sec)
- Lower costs
- Still high quality
- Can offer "4K Upgrade" later as upsell

**Your decision:** 2K or 4K? ___________

### 2. UI Implementation: When?
- **Option A:** Backend hotfix now, UI later (PR-5)
- **Option B:** Wait, do both together

**Recommendation:** Backend now, UI later (de-risked approach).  

**Your decision:** ___________

### 3. Test Account: Which email?
- Need a test purchase to verify in staging

**Your test email:** ___________

---

## ✅ Approval Checklist

Before we proceed with implementation, confirm:

- [ ] I understand why we're changing from "all at once" to "one at a time"
- [ ] I'm okay with total time being longer (but more reliable)
- [ ] I understand this is backend-only (UI comes later)
- [ ] I approve using 2K resolution (or specify 4K instead)
- [ ] I'll provide a test email for staging verification

**Your approval:** ___________  
**Date:** ___________

---

**Next Step:** Once approved, implement hotfix (2-3 hours).

**Questions?** Ask before we start coding. ✨
