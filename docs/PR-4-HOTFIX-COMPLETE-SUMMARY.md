# PR-4 Hotfix - Complete Summary & Deliverables
**Status:** 🟡 Ready for Approval  
**Date:** January 9, 2026  
**Author:** Engineering Team  
**Reviewer:** Sandra (CEO/PM)

---

## 📋 Executive Summary

### What Happened
During PR-4 testing, we discovered that the Paid Blueprint implementation used:
- ❌ Wrong AI model (`flux-dev` instead of `nano-banana-pro`)
- ❌ Wrong generation pattern (all-at-once instead of incremental)
- ❌ Wrong prompt system (generic instead of templates)
- ❌ Wrong inputs (no selfies)

### Root Cause
PR-4 was developed before the Free Blueprint was refactored to use Maya Pro's architecture. The refactored Free Blueprint uses a superior model and generation pattern that PR-4 didn't adopt.

### Solution
Hotfix PR-4 to align with:
1. **Maya Pro Photoshoot architecture** (incremental generation pattern)
2. **Free Blueprint model & inputs** (Nano Banana Pro + selfies + templates)

### Impact
- ✅ Better quality (consistent, personalized)
- ✅ More reliable (no timeouts)
- ✅ Better UX (progress, resume, retry)
- ✅ Architectural consistency (reuses proven patterns)

---

## 📚 Documentation Deliverables

### 1. Technical Deep Dive
**File:** [`MAYA-PRO-PHOTOSHOOT-AUDIT.md`](./MAYA-PRO-PHOTOSHOOT-AUDIT.md)  
**Audience:** Engineers  
**Purpose:** Complete architectural analysis of Maya Pro Photoshoot

**Answers 7 Critical Questions:**
1. How is a "photoshoot" job represented? (session-based DB pattern)
2. How does Maya Pro run generations incrementally? (one-grid-at-a-time + polling)
3. Where do prompts come from? (template-based system)
4. What inputs does Maya Pro require? (selfies, category, mood)
5. What is the exact output pipeline? (download, upload, split, save)
6. How does Maya Pro handle failures? (retry per grid, not all)
7. How does Maya Pro gate access? (admin + feature flags + credits)

**Key Findings:**
- Maya Pro generates 8 grids (72 frames total)
- Each grid generated one-at-a-time (not all at once)
- Client polls for completion (no long-running requests)
- Uses Nano Banana Pro model
- Template-based prompts (not conversational)
- Incremental progress saving
- Built-in idempotency

---

### 2. Implementation Plan
**File:** [`PR-4-HOTFIX-PLAN.md`](./PR-4-HOTFIX-PLAN.md)  
**Audience:** Engineers  
**Purpose:** Step-by-step implementation guide

**Contains:**
- **Task 1:** Refactor `generate-paid` API (accept gridNumber param)
- **Task 2:** Create `check-paid-grid` API (polling endpoint)
- **Task 3:** Update `get-paid-status` API (add progress tracking)
- **Task 4:** Update documentation

**Breaking Changes:**
- `POST /generate-paid` signature changes
- Now requires `gridNumber` param (1-30)
- Returns `predictionId` immediately (not final URLs)
- Client must implement polling loop

**Acceptance Criteria:**
- Generate one grid at a time
- Use Nano Banana Pro model
- Use Blueprint template prompts
- Use selfie inputs
- 2K resolution
- Idempotent
- Progress tracked
- Tests pass

---

### 3. Non-Technical Summary
**File:** [`PR-4-HOTFIX-SANDRA-SUMMARY.md`](./PR-4-HOTFIX-SANDRA-SUMMARY.md)  
**Audience:** Sandra (CEO/PM), non-technical stakeholders  
**Purpose:** Plain-English explanation of changes

**Analogies Used:**
- "Ordering 30 cakes" (explains incremental pattern)
- "Text when ready" (explains polling)

**User Experience Comparison:**
- **Before:** 10-minute wait, timeout risk, no progress
- **After:** Real-time progress, can close tab, retry per grid

**Includes:**
- Test flow walkthrough
- Quality checklist
- Approval checklist
- Questions to answer before proceeding

---

### 4. Visual Comparison
**File:** [`PR-4-HOTFIX-VISUAL-COMPARISON.md`](./PR-4-HOTFIX-VISUAL-COMPARISON.md)  
**Audience:** Visual learners, stakeholders  
**Purpose:** Side-by-side diagrams and comparisons

**Includes:**
- Flow diagrams (all-at-once vs. incremental)
- Model comparison table
- Architecture diagrams
- User flow wireframes
- Timeline charts
- Quality comparison
- Code snippets (simplified)

---

## 🔍 Key Architectural Decisions

### Decision 1: Clone Maya Pro Pattern (Not Rebuild)
**Rationale:**
- Maya Pro already solves this problem
- Proven in production (admin use for months)
- Same model, similar output
- Reduce technical debt

**Alternative Considered:** Build custom solution  
**Why Rejected:** Unnecessary complexity, untested

---

### Decision 2: Store Full Grids Only (No Frame Splitting Yet)
**Rationale:**
- Free Blueprint stores both grid + frames
- Maya Pro splits frames for gallery reuse
- Paid Blueprint doesn't need gallery integration yet

**Implementation:**
- Store 30 grid URLs in `paid_blueprint_photo_urls` JSONB
- Each grid contains 9 frames (user can download/view)
- Frame splitting deferred to future PR if needed

**Alternative Considered:** Split frames like Maya Pro  
**Why Deferred:** Not required for MVP, adds complexity

---

### Decision 3: 2K Resolution (Not 4K)
**Rationale:**
- Free Blueprint uses 2K
- Faster generation (~30 sec vs. ~60 sec)
- Lower costs (no credit charge)
- Still high quality

**Future Upgrade Path:**
- Offer "4K Upgrade" as separate product ($10-20)
- Or include 4K in higher tier (Studio Pro)

**Alternative Considered:** 4K for paid  
**Why Rejected:** Speed > marginal quality gain at this price point

---

### Decision 4: No New Database Tables
**Rationale:**
- `blueprint_subscribers` table already has all needed columns
- `paid_blueprint_photo_urls` JSONB can store 30 URLs
- Simpler than creating session/grid/frame tables

**Comparison to Maya Pro:**
| **Maya Pro** | **Paid Blueprint** |
|--------------|-------------------|
| `pro_photoshoot_sessions` | `blueprint_subscribers` (existing) |
| `pro_photoshoot_grids` | `paid_blueprint_photo_urls` JSONB array |
| `pro_photoshoot_frames` | (Not needed, store grids only) |

**Alternative Considered:** Create session/grid tables  
**Why Rejected:** Over-engineering for 30 grids, adds schema complexity

---

### Decision 5: Template Prompts (Not Conversational)
**Rationale:**
- Free Blueprint uses template system (proven)
- Paid Blueprint should match Free Blueprint quality
- Templates = consistent output
- No LLM cost per grid

**Implementation:**
```typescript
import { getBlueprintPhotoshootPrompt } from "@/lib/maya/blueprint-photoshoot-templates"
const category = formData.vibe // From Blueprint form
const mood = formData.feed_style
const prompt = getBlueprintPhotoshootPrompt(category, mood)
```

**Alternative Considered:** LLM-generated prompts per grid  
**Why Rejected:** Unnecessary variance, slower, costs more

---

## 🚨 Risk Assessment

### Technical Risks

| **Risk** | **Likelihood** | **Impact** | **Mitigation** |
|----------|---------------|-----------|----------------|
| Polling implementation bugs | Medium | Medium | Copy exact logic from Maya Pro `check-grid` |
| JSONB array indexing issues | Low | Medium | Test with 30 full generations before deploy |
| Idempotency edge cases | Low | Low | Reuse proven guards from Maya Pro |
| Timeout on check endpoint | Low | High | Each check is < 3 sec (tested in Maya Pro) |

### Business Risks

| **Risk** | **Likelihood** | **Impact** | **Mitigation** |
|----------|---------------|-----------|----------------|
| User confusion (longer time) | Medium | Low | Clear progress bar + "can close tab" messaging |
| Support tickets increase | Low | Medium | Improve error messages, add retry buttons |
| Refund requests | Low | High | Feature flag off if quality issues detected |

### UX Risks

| **Risk** | **Likelihood** | **Impact** | **Mitigation** |
|----------|---------------|-----------|----------------|
| Users close tab thinking it failed | Medium | Medium | Show "safe to close" message, auto-resume |
| Failed grids not retried | Low | Medium | Clear "Retry Grid X" buttons |
| No ETA shown | High | Low | Show estimated time per grid (~30 sec) |

---

## 📊 Success Metrics

### Technical KPIs
- ✅ API response time < 5 seconds (was ~300-600 sec)
- ✅ Zero timeout errors (was high risk)
- ✅ Idempotency: 100% (duplicate requests safe)
- ✅ Model consistency: `nano-banana-pro` in all logs
- ✅ Selfie usage: 100% (every generation uses selfies)

### Quality KPIs
- ✅ Face consistency: 95%+ (same person in all grids)
- ✅ Style consistency: 90%+ (matches Blueprint aesthetic)
- ✅ Completion rate: 100% (all 30 grids generated)
- ✅ Retry success rate: 95%+ (failed grids succeed on retry)

### UX KPIs
- ✅ Progress visibility: Real-time (1/30, 2/30, etc.)
- ✅ Resume capability: 100% (close tab, reopen, continues)
- ✅ User satisfaction: TBD (post-launch survey)

---

## 🧪 Testing Strategy

### Phase 1: Local Testing (Dev)
```bash
# Test single grid generation
npx tsx scripts/test-paid-blueprint-single-grid.ts

# Test full 30-grid generation
npx tsx scripts/test-paid-blueprint-pr4-incremental.ts

# Test idempotency (retry same grid)
npx tsx scripts/test-paid-blueprint-idempotency.ts

# Test resume (simulate close tab)
npx tsx scripts/test-paid-blueprint-resume.ts
```

### Phase 2: Staging Testing (Pre-Production)
1. Deploy to staging
2. Sandra makes test purchase ($47)
3. Generate 5 grids, verify:
   - Quality matches Free Blueprint
   - Progress updates correctly
   - Can close tab and resume
4. Generate remaining 25 grids
5. Verify all 30 grids in gallery

### Phase 3: Production Rollout (Gradual)
1. Deploy behind feature flag (OFF by default)
2. Enable for test account only
3. Verify with real Stripe webhook
4. Enable for 10% of new purchases (A/B test)
5. Monitor error rates for 48 hours
6. If stable: Enable for 100%

---

## 🔄 Rollback Plan

### If Hotfix Breaks in Production

#### Step 1: Feature Flag Off (Immediate)
```sql
UPDATE admin_feature_flags 
SET enabled = FALSE 
WHERE flag_name = 'paid_blueprint_enabled'
```
**Impact:** New purchases can't generate (but existing progress safe)  
**Time to Execute:** < 1 minute

#### Step 2: Revert Code (If Flag Off Insufficient)
```bash
git revert <hotfix-commit-sha>
git push origin main
# Vercel auto-deploys
```
**Impact:** APIs revert to PR-4 v1 (broken, but at least consistent)  
**Time to Execute:** ~5 minutes

#### Step 3: Data Integrity Check
```sql
-- Verify no corrupted JSONB arrays
SELECT 
  email,
  jsonb_array_length(paid_blueprint_photo_urls) as count,
  paid_blueprint_generated
FROM blueprint_subscribers
WHERE paid_blueprint_purchased = TRUE
```
**Action:** Manually fix any < 30 counts if needed

#### Step 4: Communicate with Users
- Email users who were mid-generation
- Offer:
  - Wait for fix (ETA: X hours)
  - Full refund
  - Free credit bonus
- Transparency = trust

---

## 📅 Implementation Timeline

### Estimated Effort: 3-4 hours

| **Phase** | **Task** | **Time** | **Owner** |
|-----------|----------|----------|-----------|
| **1. Audit** | ✅ Complete | 1 hour | Engineer |
| **2. Planning** | ✅ Complete | 1 hour | Engineer |
| **3. Implementation** | Pending | 2 hours | Engineer |
| 3a. Refactor generate-paid | | 45 min | |
| 3b. Create check-paid-grid | | 45 min | |
| 3c. Update get-paid-status | | 30 min | |
| **4. Testing** | Pending | 1 hour | Engineer |
| 4a. Local tests | | 30 min | |
| 4b. Integration tests | | 30 min | |
| **5. Documentation** | ✅ Complete | 1 hour | Engineer |
| **6. Code Review** | Pending | 30 min | Sandra |
| **7. Deploy Staging** | Pending | 15 min | Engineer |
| **8. UAT** | Pending | 1 hour | Sandra |
| **9. Deploy Production** | Pending | 15 min | Engineer |

**Total:** ~6-7 hours (includes testing + approvals)

---

## ✅ Approval Checklist

Before proceeding with implementation:

### Technical Review
- [x] Audit complete and verified
- [x] Implementation plan reviewed
- [x] Breaking changes documented
- [x] Rollback plan in place
- [x] Test strategy defined

### Business Review
- [ ] Sandra approves approach
- [ ] Sandra approves 2K resolution (vs. 4K)
- [ ] Sandra approves incremental UX (longer total time)
- [ ] Sandra provides test email for staging
- [ ] Timeline acceptable (3-4 hours implementation)

### Risk Review
- [x] Technical risks assessed
- [x] Business risks assessed
- [x] UX risks assessed
- [x] Mitigation strategies defined

---

## 🚀 Next Steps

### If Approved:
1. Engineer implements Tasks 1-3 (APIs)
2. Engineer runs local tests
3. Engineer updates documentation
4. Sandra reviews code changes
5. Deploy to staging
6. Sandra tests in staging (5-10 grids)
7. If staging passes: Deploy to production
8. Monitor for 48 hours
9. If stable: Mark PR-4 complete ✅

### If Changes Requested:
1. Sandra specifies changes
2. Engineer updates plan
3. Re-submit for approval

### If Rejected:
1. Document reasons
2. Propose alternative approach
3. Schedule follow-up discussion

---

## 📞 Questions & Contact

### For Sandra:
- **Quick Questions:** Review [`PR-4-HOTFIX-SANDRA-SUMMARY.md`](./PR-4-HOTFIX-SANDRA-SUMMARY.md)
- **Visual Guide:** Review [`PR-4-HOTFIX-VISUAL-COMPARISON.md`](./PR-4-HOTFIX-VISUAL-COMPARISON.md)
- **Approval:** Fill out checklist above

### For Engineers:
- **Technical Spec:** Review [`PR-4-HOTFIX-PLAN.md`](./PR-4-HOTFIX-PLAN.md)
- **Architecture Reference:** Review [`MAYA-PRO-PHOTOSHOOT-AUDIT.md`](./MAYA-PRO-PHOTOSHOOT-AUDIT.md)
- **Implementation:** Follow tasks in hotfix plan

---

## 📝 Change Log

| **Date** | **Change** | **Author** |
|----------|-----------|-----------|
| 2026-01-09 | Initial hotfix proposal | Engineering Team |
| 2026-01-09 | Audit completed (Maya Pro + Free Blueprint) | Engineering Team |
| 2026-01-09 | Implementation plan drafted | Engineering Team |
| 2026-01-09 | Documentation created | Engineering Team |
| 2026-01-09 | Submitted for approval | Engineering Team |

---

**Status:** 🟡 Awaiting Sandra's Approval  
**Confidence Level:** 🟢 High (cloning proven architecture)  
**Risk Level:** 🟢 Low (no schema changes, feature flag protected)

**Ready to proceed when approved.** ✅
