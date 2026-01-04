# MASTER CLEANUP PLAN - AGGRESSIVE TIMELINE
*Generated: January 4, 2026*
*Timeline: 2-3 DAYS TOTAL*
*Mindset: Move fast, fix what breaks, deliver value NOW*

---

## 1. CURRENT STATE (Brutal Honesty)

### What Users Expect (Based on Marketing):
- ✅ **Train their AI model** in 10-20 selfies → Get professional photos
- ✅ **Chat with Maya** → Get styled photoshoot concepts with real brand names
- ✅ **Generate images** → High-quality, consistent with their face
- ✅ **Plan Instagram feeds** → 9-post cohesive feed with captions
- ✅ **Download & use** → Professional photos ready for Instagram

### What App Actually Delivers:
- ⚠️ **Training works** → But prompts are inconsistent
- ⚠️ **Maya chat works** → But 8 different prompt builders create confusion
- ⚠️ **Image generation works** → But Classic mode doesn't use brand intelligence
- ⚠️ **Feed Planner exists** → But has broken parts (error handling issues)
- ⚠️ **Code is messy** → 359K lines, 399 backup files, unused builders

### The Gap:
1. **Prompt Quality Inconsistency** → Users get different quality prompts depending on which builder is used
2. **Feed Planner Broken** → Error handling failures, placeholder functions
3. **Code Bloat** → Hard to maintain, hard to fix bugs, hard to add features
4. **No Clear Architecture** → 8 builders, only 3 used, unclear which does what
5. **Missing Intelligence** → Classic image generation doesn't use brand library

**Why Users Aren't Using It:**
- Features don't work reliably
- Quality is inconsistent
- Too complex to understand
- Bugs break the experience

---

## 2. RAPID PHASES (Same-Day Completion)

---

### PHASE 1: Fix Feed Planner Errors (3-4 hours)

**User Value:** Users can actually plan Instagram feeds without errors breaking the flow

**The Fix:**

**Build:**
- Fix error handling in `app/api/feed-planner/create-from-strategy/route.ts`
- Fix placeholder functions in Feed Planner components
- Add proper error messages (user-friendly)
- Fix TypeScript errors in Feed Planner

**Delete:**
- Remove placeholder `TODO` functions that just log to console
- Remove broken error handling that crashes silently

**Test:**
1. Create a 9-post feed strategy
2. Generate feed (should complete without errors)
3. Regenerate a post (should work)

**Done Criteria:**
✅ Feed Planner creates feeds without crashing
✅ Error messages are user-friendly
✅ No console errors in browser
✅ Deploy with feature flag OFF
✅ Sandra tests on phone (15 min)
✅ 2 beta users test (30 min)
✅ Turn flag ON if working
✅ Move to Phase 2

**If Breaks:**
- Rollback: Revert last commit
- Keep moving: If minor, fix in Phase 2

**Time Budget:**
- AI work: 3 hours
- Sandra testing: 15 minutes
- Beta testing: 30 minutes
- Total: 4 hours (same day)

---

### PHASE 2: Delete Unused Code (2-3 hours)

**User Value:** Faster app, easier maintenance, clearer codebase

**The Fix:**

**Build:**
- Nothing new (just cleanup)

**Delete:**
- ❌ `lib/maya/flux-prompt-builder.ts` (not imported anywhere)
- ❌ `lib/maya/prompt-builders/classic-prompt-builder.ts` (not imported)
- ❌ `lib/maya/prompt-builders/pro-prompt-builder.ts` (not imported)
- Archive 350+ backup files from Dec 30 to `archive/backups-2024-12-30/`
- Remove `.backup-*` files older than 7 days (keep recent ones)

**Test:**
1. Run app (should work exactly the same)
2. Check no broken imports
3. Verify TypeScript compiles

**Done Criteria:**
✅ 3 unused builders deleted
✅ 350+ old backups archived
✅ No broken imports
✅ App works exactly as before
✅ Deploy immediately
✅ Quick test (15 min)
✅ Move to Phase 3

**If Breaks:**
- Rollback: Restore deleted files from git
- Keep moving: This is zero-risk (files weren't used)

**Time Budget:**
- AI work: 2 hours
- Testing: 15 minutes
- Total: 2.5 hours (same day)

---

### PHASE 3: Fix Classic Image Generation (4-5 hours)

**User Value:** Classic mode images use full brand intelligence (better quality)

**The Fix:**

**Build:**
- Update `app/api/maya/generate-image/route.ts` to use `prompt-constructor.ts`
- Apply brand intelligence to Maya's prompts before generation
- Ensure trigger word is added correctly

**Delete:**
- Remove direct prompt usage (use builder instead)

**Test:**
1. Generate image in Classic mode
2. Verify prompt includes brand names
3. Verify trigger word is present
4. Check image quality matches Pro mode

**Done Criteria:**
✅ Classic mode uses brand library
✅ Prompts include real brand names
✅ Trigger word added correctly
✅ Image quality improved
✅ Deploy with flag OFF
✅ Test (30 min)
✅ Turn flag ON
✅ Move to Phase 4

**If Breaks:**
- Rollback: Revert to direct prompt usage
- Keep moving: Can skip if too complex, come back later

**Time Budget:**
- AI work: 4 hours
- Testing: 30 minutes
- Total: 4.5 hours (same day)

---

### PHASE 4: Enhance Studio Pro Intelligence (3-4 hours)

**User Value:** Studio Pro gets full brand intelligence (better prompts)

**The Fix:**

**Build:**
- Update `nano-banana-prompt-builder.ts` to import `brand-library-2025.ts`
- Use `generateCompleteOutfit()` for Studio Pro prompts
- Keep natural language format (50-80 words)

**Delete:**
- Nothing (enhancement only)

**Test:**
1. Generate Studio Pro carousel
2. Verify prompts include brand names
3. Check natural language format maintained
4. Verify 50-80 word count

**Done Criteria:**
✅ Studio Pro uses brand library
✅ Prompts include real brands
✅ Natural language format preserved
✅ Word count correct
✅ Deploy with flag OFF
✅ Test (30 min)
✅ Turn flag ON
✅ Move to Phase 5

**If Breaks:**
- Rollback: Revert brand library import
- Keep moving: Can skip, Studio Pro works without it

**Time Budget:**
- AI work: 3 hours
- Testing: 30 minutes
- Total: 3.5 hours (same day)

---

### PHASE 5: Document & Polish (2-3 hours)

**User Value:** Clear understanding of what each file does, easier future maintenance

**The Fix:**

**Build:**
- Create `PROMPT_SYSTEM_GUIDE.md` explaining which builder does what
- Add comments to key files explaining their purpose
- Create simple architecture diagram

**Delete:**
- Remove confusing comments
- Clean up duplicate documentation

**Test:**
1. Read the guide (should be clear)
2. Verify comments are helpful
3. Check diagram is accurate

**Done Criteria:**
✅ Guide created
✅ Key files documented
✅ Architecture diagram clear
✅ Deploy (no flag needed)
✅ Review (15 min)
✅ DONE

**If Breaks:**
- Rollback: N/A (documentation only)
- Keep moving: Always safe

**Time Budget:**
- AI work: 2 hours
- Review: 15 minutes
- Total: 2.25 hours (same day)

---

## 3. AGGRESSIVE PRIORITY ORDER

### Phase 1 (TODAY - Morning): Fix Feed Planner Errors
**What is it?** Feed Planner has broken error handling and placeholder functions
**Why does it matter?** Users can't plan feeds reliably - this is a core feature
**How long?** 3-4 hours
**User Impact:** HIGH - Core feature becomes usable

### Phase 2 (TODAY - Afternoon): Delete the Bloat
**What is it?** Remove 3 unused builders, archive 350+ backup files
**Why does it matter?** Cleaner codebase, faster app, easier maintenance
**How long?** 2-3 hours
**User Impact:** MEDIUM - Indirect (faster, more reliable)

### Phase 3 (TOMORROW - Morning): Fix Classic Image Generation
**What is it?** Classic mode doesn't use brand intelligence
**Why does it matter?** Better image quality, consistent with Pro mode
**How long?** 4-5 hours
**User Impact:** HIGH - Better quality images

### Phase 4 (TOMORROW - Afternoon): Enhance Studio Pro Intelligence
**What is it?** Studio Pro uses limited intelligence, should use full brand library
**Why does it matter?** Better Studio Pro prompts
**How long?** 3-4 hours
**User Impact:** MEDIUM - Better Studio Pro quality

### Phase 5 (DAY 3): Document & Polish
**What is it?** Create guide, add comments, document architecture
**Why does it matter?** Easier future maintenance, clear understanding
**How long?** 2-3 hours
**User Impact:** LOW - Developer experience

---

## 4. RAPID VALIDATION (No 24hr Waits)

### After Each Phase:

**Immediate Deployment (30 min):**
- [ ] Create branch
- [ ] Tag current state
- [ ] Set feature flag OFF
- [ ] Deploy to staging
- [ ] Verify deployment successful

**Sandra Tests on Phone (15 min):**
- [ ] Test the feature
- [ ] Check for errors
- [ ] Verify it works as expected
- [ ] Note any issues

**2 Beta Users Test (30 min):**
- [ ] Share staging link
- [ ] Ask them to test feature
- [ ] Collect feedback
- [ ] Note any errors

**Error Check (15 min):**
- [ ] Check error logs
- [ ] Check Sentry (if available)
- [ ] Check browser console
- [ ] Fix any critical errors

**Decision (5 min):**
- [ ] Works? → Turn flag ON → Next phase
- [ ] Broken? → Rollback → Fix or skip

**Total Time Per Phase:** 1.5 hours max

---

## 5. PHASE CHECKLIST (Streamlined)

### PHASE [X] - [TIME BUDGET: X hours]

#### START (5 min):
- [ ] Create branch: `cleanup/phase-[x]`
- [ ] Tag current state: `git tag before-phase-[x]`
- [ ] Set feature flag OFF (if applicable)

#### BUILD (AI does this - X hours):
- [ ] Create new files (if needed)
- [ ] Delete old files (if needed)
- [ ] Update imports
- [ ] Fix TypeScript errors
- [ ] Run linter
- [ ] Commit: `git commit -m "Phase [X]: [description]"`

#### DEPLOY (30 min):
- [ ] Push to staging
- [ ] Verify deployment
- [ ] Check for build errors

#### TEST (Sandra - 45 min max):
- [ ] Test on phone (15 min)
- [ ] Share with 2 beta users (30 min)
- [ ] Check error logs (15 min)

#### DECISION (5 min):
- [ ] Works? → Turn flag ON → Next phase
- [ ] Broken? → Rollback → Fix or skip

#### DONE:
- [ ] Timestamp: ___________
- [ ] Notes: ___________

---

## 6. WHAT COULD GO WRONG (And How to Keep Moving)

### Phase 1: Feed Planner Errors

**Worst Case:** Feed Planner completely breaks
**Fix Time:** 1 hour (revert changes)
**Or Skip:** Can skip if too complex, users can use Maya chat instead
**Keep Momentum:** Move to Phase 2 (deleting unused code is safe)

### Phase 2: Delete Unused Code

**Worst Case:** Accidentally delete used file
**Fix Time:** 5 minutes (restore from git)
**Or Skip:** Can skip, but zero risk (files aren't imported)
**Keep Momentum:** This is the safest phase, always do it

### Phase 3: Classic Image Generation

**Worst Case:** Images stop generating
**Fix Time:** 30 minutes (revert to direct prompt)
**Or Skip:** Can skip, Classic mode works (just not optimal)
**Keep Momentum:** Move to Phase 4, come back later

### Phase 4: Studio Pro Intelligence

**Worst Case:** Studio Pro prompts break
**Fix Time:** 30 minutes (revert brand library import)
**Or Skip:** Can skip, Studio Pro works without it
**Keep Momentum:** Move to Phase 5, come back later

### Phase 5: Document & Polish

**Worst Case:** Documentation is wrong
**Fix Time:** 15 minutes (update docs)
**Or Skip:** Can skip, no code changes
**Keep Momentum:** Always safe, always do it

**General Rule:** If a phase breaks and takes >1 hour to fix, skip it and move on. Come back later.

---

## 7. PROTECTED FILES (Still Don't Touch)

### 🔴 CRITICAL - DO NOT MODIFY:

1. **`lib/maya/brand-library-2025.ts`**
   - Contains all brand intelligence
   - Used by active builders
   - **DO NOT MODIFY** without extensive testing

2. **`lib/maya/prompt-constructor.ts`**
   - Active in Classic Mode
   - **DO NOT DELETE** (Phase 3 will enhance it)

3. **`lib/maya/prompt-constructor-enhanced.ts`**
   - Active in Pro Mode
   - **DO NOT DELETE** (Phase 3 will enhance it)

4. **`lib/maya/nano-banana-prompt-builder.ts`**
   - Active in Studio Pro
   - **DO NOT DELETE** (Phase 4 will enhance it)

5. **`lib/maya/prompt-builders/guide-prompt-handler.ts`**
   - Active utility functions
   - **DO NOT DELETE**

6. **Route-level intelligence files:**
   - `luxury-lifestyle-settings.ts`
   - `lifestyle-contexts.ts`
   - `influencer-posing-knowledge.ts`
   - `instagram-location-intelligence.ts`
   - **DO NOT DELETE** (used in concept generation)

### ✅ SAFE TO DELETE:

- `flux-prompt-builder.ts` (not imported)
- `classic-prompt-builder.ts` (not imported)
- `pro-prompt-builder.ts` (not imported)
- Backup files older than 7 days

---

## 8. SUCCESS METRICS (How We Know It's Working)

### After All Phases Complete:

**Functional:**
- [ ] Feed Planner works (users can plan feeds)
- [ ] Maya creates quality prompts (both Classic and Pro)
- [ ] Classic mode uses brand intelligence
- [ ] Studio Pro uses brand intelligence
- [ ] No broken features

**Code Quality:**
- [ ] 3 unused builders deleted
- [ ] 350+ backup files archived
- [ ] Code is cleaner (fewer files)
- [ ] No unused imports
- [ ] TypeScript compiles without errors

**Documentation:**
- [ ] Guide created explaining prompt system
- [ ] Key files have comments
- [ ] Architecture diagram exists
- [ ] Sandra can explain what each file does

**User Experience:**
- [ ] Users can plan feeds without errors
- [ ] Image quality is consistent
- [ ] Prompts include real brand names
- [ ] App feels faster (less code to load)
- [ ] Users start using the app

---

## 9. TIMELINE SUMMARY

### Day 1 (Today):
- **Morning (3-4 hours):** Phase 1 - Fix Feed Planner
- **Afternoon (2-3 hours):** Phase 2 - Delete Unused Code
- **Total:** 5-7 hours

### Day 2 (Tomorrow):
- **Morning (4-5 hours):** Phase 3 - Fix Classic Image Generation
- **Afternoon (3-4 hours):** Phase 4 - Enhance Studio Pro
- **Total:** 7-9 hours

### Day 3 (Final Day):
- **Morning (2-3 hours):** Phase 5 - Document & Polish
- **Total:** 2-3 hours

**Grand Total:** 14-19 hours over 2-3 days

---

## 10. AGGRESSIVE MINDSET RULES

### ✅ DO:
- Move fast
- Fix what breaks
- Ship imperfect (better than perfect never)
- Test quickly (45 min max)
- Deploy immediately
- Keep momentum

### ❌ DON'T:
- Wait 24 hours between phases
- Overthink testing
- Perfect every detail
- Get stuck on one phase
- Wait for "perfect" solution
- Delay deployment

### 🎯 PRIORITY:
1. **User Value** > Code Perfection
2. **Momentum** > Perfection
3. **Ship** > Wait
4. **Fix** > Perfect
5. **Move** > Stuck

---

## 11. ROLLBACK PROCEDURES

### Quick Rollback (5 minutes):
```bash
# If phase breaks badly
git tag before-phase-[x]  # Already tagged at start
git reset --hard before-phase-[x]
git push --force
```

### Partial Rollback (15 minutes):
```bash
# If only part of phase breaks
git revert HEAD  # Revert last commit
# Or manually fix the broken part
```

### Skip Phase (1 minute):
```bash
# If phase is too complex
# Just move to next phase
# Come back later if needed
```

---

## 12. FINAL CHECKLIST

### Before Starting:
- [ ] Read this plan
- [ ] Understand each phase
- [ ] Know rollback procedures
- [ ] Have 2 beta users ready
- [ ] Have staging environment ready

### During Execution:
- [ ] Follow phase checklist
- [ ] Test quickly (45 min max)
- [ ] Deploy immediately
- [ ] Keep momentum
- [ ] Don't get stuck

### After Completion:
- [ ] All phases done
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Users can use the app
- [ ] Code is cleaner

---

## ✅ AGGRESSIVE PLAN READY - Can Complete in 2-3 Days

**Total Time:** 14-19 hours over 2-3 days
**Phases:** 5 phases, each 2-5 hours
**Risk:** Low (no active users, can rollback quickly)
**Value:** High (fixes core issues, cleans codebase)

**Ready to execute?** Start with Phase 1 today!

---

*End of Master Cleanup Plan*

