# SSELFIE Rebuild Strategy
**Date:** 2026-02-25  
**Author:** Autonomous AI Engineering Team  
**Status:** LIVE — Active reference for rebuild execution  

---

## The Signal We Cannot Ignore

50 active users → 17. 14 new signups in 24 hours, 0 generated anything. 24 canceled subscriptions.

This is not a feature problem. It is a clarity problem. Users do not understand what to do first, and the one path designed to show them (Maya first-generation flow) was **silently disabled** — a missing feature flag caused every new user to hit a blank wall.

That flag is now fixed. But the deeper problems remain.

---

## What We Found: The Full Audit

### 1. The Immediate Crisis (Fixed Today)

| Issue | Impact | Fix Applied |
|---|---|---|
| `FEATURE_NEW_WELCOME_FLOW` not set in production | 0% activation — welcome flow never showed | Default to enabled; only disable explicitly |
| `hasNoImageSpend` gate too strict | One failed generation = permanently blocked | Gate removed; `hasAnyGeneration` is sufficient |
| Free users defaulted to Feed Planner tab | Maya (core product) was never seen first | All users now land on Maya |

### 2. Structural Complexity

| Area | Measurement | Problem |
|---|---|---|
| `maya-chat-screen.tsx` | 3,534 lines | Unmaintainable; one file controls too much |
| `concept-card.tsx` | 2,307 lines | Over-complex single component |
| `sselfie-app.tsx` | 1,285 lines | App shell doing too many jobs |
| Total components | 218 (91 in sselfie/) | Too many; unclear ownership |
| API routes | 447 | ~5 dead strategist routes; most are legitimate |
| Total pages | 51 | Reasonable for a SaaS |

### 3. Dead Code Identified

**Delete immediately (confirmed unused):**
- `components/sselfie/landing-page.tsx` — superseded by `landing-page-new.tsx`
- `components/sselfie/image-viewer-modal.tsx` — not imported anywhere
- `components/sselfie/image-gallery-modal.tsx` — not imported anywhere

**Dead API routes (verify before deleting):**
- `app/api/agent-coordinator/workflow-status/route.ts`
- `app/api/personal-brand-strategist/strategy/route.ts`
- `app/api/content-research-strategist/research/route.ts`
- `app/api/content-research-strategist/get-research/route.ts`
- `app/api/instagram-strategist/generate-captions/route.ts`

**Redundant components (consolidate):**
- `maya-header.tsx` (887 lines) vs `maya-header-simplified.tsx` (90 lines) — pick one
- 3 image modal components — consolidate into `fullscreen-image-modal.tsx`

### 4. The Activation Path (Root Cause Analysis)

The path from signup to first generated image had 8 gates:
1. Feature flag (was off — blocks 100%)
2. No previous generation check
3. Bonus credits check
4. No image spend check ← too strict, now removed
5. Trained model check (Classic mode — broken for new users, correctly hidden now)
6. Selfie upload requirement (Pro mode)
7. Credit balance check
8. Tab navigation check

After today's fixes: 4 gates remain (all legitimate). Estimated path to first generation: **6 taps + 1 selfie upload**.

### 5. User Journey Gaps

**Current state:**
- Sign up → Bonus credits granted → Land on Feed Planner → Confused → Leave
- No visible CTA to "try Maya now"
- No "you have 2 free photos" message on welcome
- Feed Planner wizard had 1 Continue click in 3 days

**Desired state:**
- Sign up → Land on Maya → Welcome flow auto-opens → Pick style → Upload selfie → Generate → WOW moment → Naturally explore Feed Planner → Subscribe

### 6. Business Metrics Snapshot (2026-02-25)

- Active Studio subscriptions: **17**
- Canceled subscriptions: **24** (churn > retention)
- Paid Blueprint owners: **13** (one-time, not recurring)
- New users (24h): **14**
- First-output activation: **0/14 (0%)**
- Revenue (24h): **$0**
- Cron failures: **0** (infrastructure is healthy)
- Email deliverability: **healthy**

---

## The Rebuild Plan: Phased, Low-Risk, High-Impact

This is not a rewrite. It is a structured simplification. Each phase is reversible. No phase destroys what works.

---

### Phase 1: Activation (This Week) — Already Started

**Goal:** Get activation rate from 0% to 30%+

| Task | Status | File(s) |
|---|---|---|
| Enable welcome flow (feature flag default) | ✅ DONE | `lib/onboarding/welcome-first-generation.ts` |
| Remove hasNoImageSpend gate | ✅ DONE | `lib/onboarding/welcome-first-generation.ts` |
| Route new users to Maya tab | ✅ DONE | `components/sselfie/sselfie-app.tsx` |
| Delete confirmed dead component files | Pending | See dead code list above |
| Add "You have 2 free photos" banner on Maya tab for new users | Pending | `maya-chat-screen.tsx` |
| Make selfie upload in welcome flow camera-first (mobile) | Pending | `maya/welcome-first-generation-flow.tsx` |

**Measure:** `first_generation_guided_complete` analytics event rate (should go from 0 → target 30%+).

---

### Phase 2: Clarity (Next 2 Weeks)

**Goal:** Users immediately understand what SSELFIE is and why they need it.

**The core problem:** SSELFIE looks like 5 equal tabs. There is no hierarchy. Every tab competes for attention. The product feels like a toolkit, not a system.

**The fix:**
1. **Maya tab = Home** — rename or reposition as the entry point
2. **Reduce welcome flow complexity** — Step 2 (pick mode) should be removed for new users; default to Pro, skip the choice
3. **Feed Planner positioning** — move it from "default tab" to "next step after first generation"
4. **Empty state redesign** — every empty state needs one clear CTA ("Create your first photo →")
5. **Credit visibility** — show credit balance prominently near the Maya generate button

**Files to modify:**
- `components/sselfie/maya/welcome-first-generation-flow.tsx` — remove Step 2 (mode selection) for new users
- `components/sselfie/sselfie-app.tsx` — tab ordering/labels
- `components/sselfie/maya-chat-screen.tsx` — new-user empty state with credit count

---

### Phase 3: Simplification (Weeks 3–4)

**Goal:** Remove 20%+ of the codebase without losing functionality.

**Cut list:**
1. Delete 3 dead component files (confirmed above)
2. Remove 5 dead API routes (after confirming zero usage in analytics)
3. Consolidate `maya-header.tsx` → use `maya-header-simplified.tsx` everywhere
4. Consolidate 3 image modal components → 1
5. Extract tab-content from `sselfie-app.tsx` into a `StudioTabs` component
6. Split `maya-chat-screen.tsx` (3,534 lines) into: `MayaChat.tsx`, `MayaConceptCard.tsx`, `MayaGenerationQueue.tsx`

**What this enables:** Faster rendering, easier debugging, agents can work in focused files.

---

### Phase 4: Conversion (Month 2)

**Goal:** Increase Studio subscription rate from new signups.

**The core problem:** Users have the tool, but they don't see the reason to pay. The free tier (2 credits) gives a taste, but the upgrade path is unclear.

**The fix:**
1. **After first successful generation** → show "Create a full photoshoot with 6–9 photos" (2 credits → would need 8 more → upgrade nudge)
2. **Upgrade messaging** — change "upgrade" to "keep going" or "create more"
3. **Academy integration** — after first generation, show the most relevant mini-product
4. **Feed Planner** — gate the "publish to Instagram" feature behind Studio plan
5. **Maya personalization** — after 3 generations, show "Train your personal model for even more realistic results"

---

### Phase 5: Architecture for Scale (Month 3+)

**Goal:** The codebase is maintainable by AI agents without context collapse.

**What needs to happen:**
1. `sselfie-app.tsx` → extract to: `StudioShell.tsx` + `StudioTabs.tsx` + `StudioModals.tsx`
2. `maya-chat-screen.tsx` (3,534 lines) → split into 3–4 focused files
3. All API routes → add `route.schema.ts` files documenting input/output types
4. Feature docs in `docs/features/` → kept current after every sprint
5. Automation outputs → surfaced on admin dashboard in real time

---

## What SSELFIE Should Feel Like

Right now: "A collection of AI tools I don't know how to use."

After Phase 1–2: "I uploaded a selfie and got a stunning brand photo in 2 minutes. I need more."

After Phase 3–4: "This is my content system. It knows my brand. It makes me look good consistently."

After Phase 5: "I don't worry about content anymore. SSELFIE handles it."

---

## The North Star Metric

**Weekly first generations by new users.** Everything else is downstream of this.

If a new user generates a photo in their first session → 5× more likely to subscribe.  
If they don't generate in session 1 → 90% never come back.

Every decision should be evaluated against: **does this make the first generation more likely?**

---

## What This Is Not

- ❌ A full rewrite (that takes months and breaks production)
- ❌ A redesign (the visual design is solid; the UX flows are the problem)
- ❌ A new feature build (we stop adding until activation is fixed)
- ❌ A dependency upgrade sprint (not now)

---

## Agent Coordination Model

For parallel work, use these domains:

| Agent Domain | Scope | Key Files |
|---|---|---|
| **Activation Agent** | Welcome flow, Maya first-generation, credit display | `welcome-first-generation-flow.tsx`, `welcome-first-generation.ts`, `maya-chat-screen.tsx` |
| **Simplification Agent** | Dead code removal, component consolidation | `landing-page.tsx`, `image-viewer-modal.tsx`, `maya-header.tsx` |
| **Conversion Agent** | Post-generation nudges, upgrade messaging, Academy integration | `academy-screen.tsx`, `buy-credits-modal.tsx`, `account-screen.tsx` |
| **Architecture Agent** | File splitting, route documentation, schema files | `sselfie-app.tsx`, `maya-chat-screen.tsx`, `concept-card.tsx` |

**Rule:** Each agent owns its domain exclusively. No agent touches another agent's files in the same sprint.

---

## Open Questions for Sandra

1. **Should free users ever see Feed Planner?** — Or should it be Maya-only until first generation?
2. **Classic mode** — Is the "train your model" flow still a priority? It requires a separate onboarding path.
3. **Feed Planner wizard** — 1 click in 3 days suggests it may need to be completely rethought or removed for now.
4. **Academy mini-products** — Are more mini-products planned? The integration is built; the content is what's missing.
5. **ClawDBot bridge** — Is there an active bridge to `.openclaw`? We need to verify or build this.

---

*This document is the single source of truth for the SSELFIE rebuild. Update it after each sprint.*
