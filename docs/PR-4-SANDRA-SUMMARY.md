# PR-4 Summary for Sandra 👋

**What We Built:** The backend that generates 30 custom photos for Paid Blueprint buyers

**Status:** ✅ Ready for review & testing

---

## 🎯 WHAT THIS DOES

When someone buys the Paid Brand Blueprint ($47), they need to get their 30 custom photos.

**PR-4 adds the systems that:**
1. Let them check if their photos are ready
2. Actually generate the 30 photos (using AI)
3. Save the photos so they can download/view them

---

## 🧩 HOW IT FITS IN THE PLAN

```
✅ PR-1: Added Paid Blueprint product config
✅ PR-2: Webhook logs payment when someone buys
✅ PR-3: Database columns to store the 30 photo URLs
✅ PR-4: APIs that generate & save the photos ← YOU ARE HERE
⏳ PR-5: UI page where buyers see their photos
⏳ PR-6: Email that notifies them when photos are ready
```

---

## 📝 WHAT WAS ADDED

### 2 New Backend APIs

**API #1: Check Status**
- **What it does:** Checks if someone bought and if their photos are ready
- **Returns:** Purchase status, photo count, photo URLs

**API #2: Generate Photos**
- **What it does:** Creates 30 custom AI photos based on their brand strategy
- **Takes:** 5-10 minutes to complete
- **Safety:** If they click "Generate" twice, it won't create duplicates

---

## 🔒 SAFETY FEATURES

### ✅ No Duplicates
If someone clicks "Generate" twice (or refreshes), it returns the same 30 photos. Doesn't generate 60 photos.

### ✅ Progress Saved
Photos are saved in batches of 5. If generation fails halfway (internet issue, server restart), the first 15 photos are still saved. They can retry to continue from where it left off.

### ✅ Guardrails
- Must have purchased first (can't generate without paying)
- Must have completed free blueprint first (need strategy for prompts)
- Invalid access code → Error message

### ✅ No Credits Involved
This uses the FLUX model directly (no Studio credits needed or deducted).

---

## 🎨 PHOTO DIVERSITY

**Problem:** If we use the same prompt 30 times, all photos look identical.

**Solution:** We automatically vary the prompts:
- Photo 1: "close-up portrait"
- Photo 2: "medium shot"
- Photo 3: "full body shot"
- Photo 4: "side profile"
- ...and so on

This creates 30 unique photos that all match their brand aesthetic but show different angles/poses.

---

## 🧪 HOW YOU CAN TEST

### Option 1: Ask Engineering Team
"Can you run the test commands in `/docs/PR-4-TEST-SCRIPT.md`?"

They'll run curl commands to verify everything works.

### Option 2: Wait for PR-5
PR-5 adds the UI page. You'll be able to click "Generate my 30 photos" and see them appear.

---

## 📊 WHAT TO EXPECT

### Happy Path (Everything Works)

1. **Someone buys Paid Blueprint** → Webhook marks them as purchased (PR-2)
2. **They land on /blueprint/paid page** → UI shows "Generate my 30 photos" button (PR-5)
3. **They click button** → Calls PR-4 API
4. **PR-4 generates 30 photos** → Takes 5-10 minutes
5. **Photos appear on page** → They can view/download (PR-5)
6. **Email sent** → "Your photos are ready!" (PR-6)

### What Users See (Logs)

Engineering can check server logs to see progress:
```
Progress saved: 5/30
Progress saved: 10/30
Progress saved: 15/30
...
✅ Generation complete: 30 photos
```

---

## ⚠️ WHAT THIS PR DOES NOT INCLUDE

❌ **No UI yet** - Users can't see/trigger this from the website (PR-5 adds that)  
❌ **No emails yet** - Users won't get notified when photos are ready (PR-6 adds that)  
❌ **No checkout changes** - Buying flow already works (PR-1)  
❌ **No webhook changes** - Payment tracking already works (PR-2 & PR-3)  

This PR is **ONLY the backend logic** that generates and stores photos.

---

## ✅ ACCEPTANCE CRITERIA

All requirements met:

| Requirement | Status |
|-------------|--------|
| Generate exactly 30 photos (no more, no less) | ✅ |
| Photos saved in database | ✅ |
| Safe to retry (idempotent) | ✅ |
| Handles partial failures (progress saved) | ✅ |
| Requires purchase first | ✅ |
| Requires free blueprint completed | ✅ |
| No credits involved | ✅ |
| Clear error messages | ✅ |
| Prompt diversity (not all identical) | ✅ |

---

## 🚀 NEXT STEPS

### For You (Sandra)

1. **Review this summary** - Any questions or concerns?
2. **Approve PR-4** - Or request changes
3. **Decision:** Deploy to staging first, or go straight to production?

### For Engineering Team

1. **Run test commands** (see `/docs/PR-4-TEST-SCRIPT.md`)
2. **Verify:**
   - Status API works
   - Generation creates 30 photos
   - Photos are valid image URLs
   - Idempotency works (retry doesn't duplicate)
3. **Deploy** (after Sandra approves)
4. **Start PR-5** (UI page)

---

## 🤔 QUESTIONS YOU MIGHT HAVE

### Q: Can I test this myself?

**A:** Not easily yet. PR-4 is backend-only (APIs). Once PR-5 is done (UI page), you can click a button and see it work.

If you want to test now, engineering can run curl commands for you and show you the results.

---

### Q: What if generation fails halfway?

**A:** Progress is saved. Example:
- User clicks "Generate"
- 15 photos complete
- Internet drops / server restarts
- User clicks "Generate" again
- System sees 15 photos already exist
- Generates remaining 15
- Total: 30 photos

No photos are lost, no duplicates created.

---

### Q: What if someone clicks "Generate" 5 times?

**A:** First click generates 30 photos (takes 5-10 min). All other clicks return the same 30 photos instantly (< 1 sec). No extra photos created.

---

### Q: Will this work for 100 buyers at once?

**A:** Yes. Each buyer's generation is independent. Replicate API handles the load. If we hit rate limits, users just wait a bit longer (or we upgrade Replicate plan).

---

### Q: How much does this cost per user?

**A:** 30 FLUX photos ≈ $0.90 (30 × $0.03 per image).

For a $47 product, that's ~2% cost of goods sold.

---

### Q: What if Replicate is down?

**A:** Generation fails, user sees error message. They can retry later when Replicate is back up. No photos are lost (progress saved).

Engineering gets alerts if Replicate failures spike.

---

## 📎 TECHNICAL DOCS (For Engineering)

- [Full Implementation Details](./PR-4-IMPLEMENTATION-SUMMARY.md)
- [Quick Reference](./PR-4-QUICK-REFERENCE.md)
- [Test Script](./PR-4-TEST-SCRIPT.md)

---

## 💬 FEEDBACK

**Questions? Concerns? Changes?**

Reply to the team with:
- ✅ "Approved, deploy to staging"
- ✅ "Approved, deploy to production"
- ❌ "Wait, I have questions..." (then ask below)

---

**Implementation Date:** January 9, 2026  
**Ready for Review:** Yes ✅  
**Estimated Review Time:** 5 minutes (this summary)  
**Next PR:** PR-5 (UI page where users click "Generate")
