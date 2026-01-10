# Implementation Workflow Recommendation

**Date:** 2026-01-XX  
**Decision:** Best approach to implement the approved onboarding experience plan  
**Scope:** 3 major decisions, ~15-20 files to modify, 3+ database migrations

---

## Implementation Scope

### Decision 1: Credit System for All Users
- **Files:** ~8 files
  - `lib/credits.ts` (add grant functions)
  - `app/api/blueprint/generate-grid/route.ts` (replace quota with credits)
  - `app/api/blueprint/check-grid/route.ts` (remove quota logic)
  - `app/auth/sign-up/page.tsx` (grant credits on signup)
  - `app/api/webhooks/stripe/route.ts` (grant credits on purchase)
  - `components/sselfie/blueprint-screen.tsx` (update UI)
  - `app/api/blueprint/state/route.ts` (update entitlement display)
  - Migration scripts (2 SQL files)

### Decision 2: Embed Feed Planner for Paid Blueprint
- **Files:** ~5 files
  - `components/feed-planner/feed-view-screen.tsx` (add mode prop + flags)
  - `components/sselfie/blueprint-screen.tsx` (embed FeedViewScreen)
  - `lib/feed-planner/mappers.ts` (new: blueprint → feed posts)
  - `app/api/blueprint/state/route.ts` (map blueprint data)
  - Documentation updates

### Decision 3: Progressive Onboarding
- **Files:** ~7 files
  - `components/onboarding/base-wizard.tsx` (new)
  - `components/onboarding/blueprint-extension.tsx` (new)
  - `components/onboarding/studio-extension.tsx` (new)
  - `components/sselfie/sselfie-app.tsx` (update routing)
  - `app/studio/page.tsx` (update server props)
  - `app/api/onboarding/welcome-flow/route.ts` (new)
  - Migration scripts (map existing data)

**Total:** ~20 files + 3 migrations + tests

---

## Workflow Options Analysis

### Option 1: Background Agents ⚠️ NOT RECOMMENDED

**How it works:**
- Start multiple background tasks to work on different decisions
- Parallel implementation of credit system, Feed Planner, onboarding

**Pros:**
- ✅ Faster (parallel work)
- ✅ Can work on multiple areas simultaneously

**Cons:**
- ❌ **Loss of context** - Agents don't maintain full audit/design context
- ❌ **Hard to track** - Progress fragmented across conversations
- ❌ **Potential conflicts** - Multiple agents touching same files
- ❌ **No unified view** - Can't see how decisions interact
- ❌ **Higher risk** - Missed dependencies or edge cases
- ❌ **Debugging difficulty** - Hard to trace issues across parallel work

**Verdict:** ❌ **Too risky** for this scope - 3 interdependent decisions need full context

---

### Option 2: GitHub PR with Copilot ⚠️ PARTIALLY RECOMMENDED

**How it works:**
- Create PR branch
- Use GitHub Copilot to implement changes file-by-file
- Review and iterate in PR comments

**Pros:**
- ✅ Good for code review
- ✅ Version control integration
- ✅ Collaboration-friendly
- ✅ Can break into smaller PRs (one per decision)

**Cons:**
- ❌ **Context fragmentation** - Copilot doesn't see full audit/design docs
- ❌ **Decision rationale lost** - Copilot may miss "why" behind decisions
- ❌ **Harder to track progress** - Spread across PR comments/files
- ❌ **Review overhead** - Need to review every Copilot suggestion
- ❌ **Incomplete implementation** - Copilot may miss edge cases from audit

**Best use case:** After implementing in chat, create PRs for review

**Verdict:** ⚠️ **Use after chat implementation** - Better for review than initial implementation

---

### Option 3: Stay in Chat (Current) ✅ RECOMMENDED

**How it works:**
- Implement decision-by-decision in this chat
- Use todos to track progress
- Reference full context (audit, design plan, decisions)
- Create PRs after each decision is complete

**Pros:**
- ✅ **Full context maintained** - All audit findings, design rationale, decisions visible
- ✅ **Track progress clearly** - Todos show what's done, what's next
- ✅ **Step-by-step approach** - Implement one decision at a time
- ✅ **Dependency awareness** - Can see how decisions interact
- ✅ **Edge case handling** - Full audit context helps catch issues
- ✅ **Rationale preserved** - Understand "why" for each change
- ✅ **Easy debugging** - Can trace issues with full context
- ✅ **No context loss** - Conversation maintains all decisions

**Cons:**
- ⚠️ Slower (sequential)
- ⚠️ One conversation thread (but can create PRs for each decision)

**Verdict:** ✅ **BEST OPTION** - Optimal for complex, interdependent decisions

---

## Recommended Hybrid Approach ✅

### Phase 1: Implement in Chat (Sequential)
1. **Decision 1 (Credit System)** - Full implementation in chat
   - Use todos to track progress
   - Reference audit findings for edge cases
   - Test incrementally
   - Create PR #1: "Credit System for All Users"

2. **Decision 2 (Feed Planner)** - Full implementation in chat
   - Build on Decision 1 (credit checks in place)
   - Use todos to track progress
   - Test with Decision 1 changes
   - Create PR #2: "Embed Feed Planner for Paid Blueprint"

3. **Decision 3 (Progressive Onboarding)** - Full implementation in chat
   - Build on Decisions 1 & 2
   - Use todos to track progress
   - Test end-to-end flow
   - Create PR #3: "Progressive Onboarding System"

### Phase 2: Review in GitHub
- Each PR is self-contained and reviewable
- Reviewers can see full context from design plan
- Can use Copilot for small fixes/suggestions in PR
- Merge sequentially (Decision 1 → Decision 2 → Decision 3)

### Phase 3: Monitor & Iterate
- Use this chat to discuss issues/iterations
- Full context maintained for debugging

---

## Why Chat is Best for This Implementation

### 1. Interdependent Decisions
- **Decision 1** (Credits) affects **Decision 2** (Feed Planner) - need credit checks in image generation
- **Decision 2** (Feed Planner) affects **Decision 3** (Onboarding) - paid blueprint screen routing
- **Decision 3** (Onboarding) affects **Decision 1** (Credits) - grant credits during onboarding

**Need:** Full context to see dependencies

### 2. Complex Edge Cases from Audit
- Audit found: "Blueprint Welcome Wizard never triggered"
- Audit found: "Onboarding state not persisted"
- Audit found: "Two identity systems"
- Audit found: "Customer ID duplication"

**Need:** Full audit context to handle edge cases correctly

### 3. Multiple Files Per Decision
- Each decision touches 5-8 files
- Changes need to be coordinated across files
- Need to see full picture while implementing

**Need:** Step-by-step with todos, not parallel work

### 4. Migration Requirements
- Database migrations need careful sequencing
- Data migration requires understanding existing data structure
- Rollback plans need full context

**Need:** Sequential implementation with careful testing

---

## Recommended Implementation Sequence

### Week 1: Decision 1 (Credit System)
**Goal:** Replace quota system with credits for all users

**Steps:**
1. Create migration script (grant credits to existing users)
2. Add `grantFreeUserCredits()` function
3. Add `grantPaidBlueprintCredits()` function
4. Update signup flow (grant credits on signup)
5. Update Stripe webhook (grant credits on purchase)
6. Update blueprint generation (replace quota with credit checks)
7. Update UI (show credits instead of quota)
8. Test: Signup → Get 2 credits → Generate grid → Credits deducted

**Deliverable:** PR #1 ready for review

---

### Week 2: Decision 2 (Feed Planner)
**Goal:** Embed Feed Planner UI for paid blueprint

**Steps:**
1. Add `mode` prop to `FeedViewScreen`
2. Add feature flags based on mode
3. Create mapper: blueprint strategy → feed posts
4. Update paid blueprint screen to embed FeedViewScreen
5. Test: Paid blueprint → Shows Feed Planner UI → Generate images

**Deliverable:** PR #2 ready for review

---

### Week 3: Decision 3 (Progressive Onboarding)
**Goal:** Unified base wizard + product-specific extensions

**Steps:**
1. Create base wizard component (5 steps)
2. Create blueprint extension component (3 steps)
3. Create studio extension component (7 steps)
4. Update routing logic (base → extension → welcome)
5. Migration: Map existing blueprint data → base + extension
6. Test: Signup → Base wizard → Blueprint extension → Welcome → Blueprint tab

**Deliverable:** PR #3 ready for review

---

## Tracking Progress

### Use Todos in This Chat
```
✅ Decision 1: Credit System Migration
  ✅ Migration script created
  ✅ Grant functions added
  ✅ Signup flow updated
  ✅ Blueprint generation updated
  ⏳ UI updates (in progress)
  ⏳ Testing (pending)

⏳ Decision 2: Feed Planner Integration
  ⏳ Mode prop added
  ⏳ Feature flags implemented
  ⏳ Mapper created
  ⏳ Paid blueprint screen updated

⏳ Decision 3: Progressive Onboarding
  ⏳ Base wizard created
  ⏳ Extensions created
  ⏳ Routing updated
  ⏳ Migration complete
```

### Create PRs After Each Decision
- PR #1: "feat: Credit system for all users (Decision 1)"
- PR #2: "feat: Embed Feed Planner for paid blueprint (Decision 2)"
- PR #3: "feat: Progressive onboarding system (Decision 3)"

---

## Final Recommendation

**✅ USE CHAT (Current Approach) with Structured Todos**

**Why:**
1. **Full context maintained** - All audit findings, design decisions, rationale visible
2. **Interdependent decisions** - Can see how decisions interact
3. **Complex edge cases** - Audit context helps handle correctly
4. **Progress tracking** - Todos show clear progress
5. **Sequential implementation** - One decision at a time, test thoroughly
6. **PRs for review** - Create PRs after each decision for code review

**Process:**
1. Implement Decision 1 in chat (with todos)
2. Test Decision 1 thoroughly
3. Create PR #1 for review
4. Implement Decision 2 in chat (building on Decision 1)
5. Test Decision 2 with Decision 1
6. Create PR #2 for review
7. Implement Decision 3 in chat (building on Decisions 1 & 2)
8. Test end-to-end flow
9. Create PR #3 for review
10. Merge sequentially after review

**This approach gives you:**
- ✅ Full context throughout
- ✅ Clear progress tracking
- ✅ Thorough testing
- ✅ Code review opportunity
- ✅ No context loss
- ✅ Ability to iterate based on feedback

---

**Ready to start with Decision 1?** 🚀
