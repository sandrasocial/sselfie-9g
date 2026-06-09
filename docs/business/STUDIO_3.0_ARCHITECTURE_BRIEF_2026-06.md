# SSELFIE Studio 3.0 — Architecture Decision Brief (June 2026)

Decision requested: Option A (refactor the existing `sselfie-app` shell) vs Option B (build Studio 3.0 fresh on a new clean route, reusing only the backend). Business constraint: the 7 active paying members must stay perfectly safe on legacy `/studio` and `/maya` while we build.

## Definitive recommendation: **Option B — build fresh on a new route.**

Build the Hybrid Concierge as a new, clean app shell on its own route, reuse the proven backend (auth, `user_avatar_images`, the synchronous `generate-image-openai` engine, gallery storage, credits, Stripe entitlements), and leave the legacy shell completely untouched for the 7 members until a deliberate, tested cutover. This is faster, dramatically safer, and the only path that doesn't fight the existing architecture the whole way.

---

## The analysis

### Safety (the hard constraint)
- **Option B satisfies the constraint by construction.** If you never edit the legacy shell, you cannot break the 7 members. Full stop.
- **Option A puts them at risk on every change.** Concrete evidence from this week: a 5-line nav edit to `sselfie-app.tsx` (hiding Feed Planner) introduced a runtime `ReferenceError` on login. It compiled cleanly and still crashed, because `next.config` runs with `ignoreBuildErrors: true`, which hides exactly this class of bug. Refactoring this shell means repeatedly risking the live members' app, with the type-checker turned off as a safety net. That is the opposite of "keep them perfectly safe."

### Technical debt
- `sselfie-app.tsx` is a ~900-line shell that couples: 5+ top tabs (Maya, Gallery, Feed Planner, Academy, Studio, Account), Maya sub-tabs (Photos/Plan/Videos/Training), Classic vs Pro vs Nano Banana modes, the feed planner, academy, LoRA training, onboarding wizards, and the **asynchronous job-and-poll generation** flow.
- The generation engine is fundamentally **async** (start job → poll `check-generation`). The Studio 3.0 vision is **synchronous** (OpenAI returns a finished image in one call, then conversational edits). These are different control-flow paradigms. Bolting sync + conversational edits into an async, mode-switched shell means constant impedance mismatch.
- `ignoreBuildErrors: true` means the codebase's type safety is off. Greenfield code can run strict TypeScript and catch errors at build time; refactoring legacy can't, without first untangling it.

### Development speed
- **Option A is slower than it looks.** Every change must be regression-tested against the live members, the async plumbing must be unwound, and the type-checker won't help. You spend your time fighting the old architecture, not building the new product.
- **Option B is faster to a working 3.0.** You build the new UX directly against the sync OpenAI engine that already exists (`generate-image-openai`), with a clean component tree and strict types. No legacy modes to reconcile, no async-to-sync surgery, no tab router to appease.

### The key insight: rebuild the UI, REUSE the backend
Option B is not "rebuild everything." The expensive, proven parts are backend and stay shared:
- Auth / session, Stripe entitlements (gate 3.0 to Studio members)
- `user_avatar_images` (reference selfies)
- `generate-image-openai` (the synchronous engine, already built)
- Gallery storage (`generated_images` / Vercel Blob) — 3.0 writes to the same place
- Prompt Vault collection data + images (the aesthetics for the visual front door)
- Credits / usage tracking
Only the **UI shell and the generation orchestration** are new. That is a much smaller build than "Studio 3.0 from scratch" implies, and it carries none of the legacy UI debt.

### Why NOT `/brand-engine`
Avoid that route name. Per CLAUDE.md, Brand Engine is a retired product with legacy compatibility code and redirects. Reusing the name invites confusion and dead-route collisions. Build at a clean, neutral route instead.

---

## Phase 1 Technical Roadmap (Option B)

Recommended route: **`/app`** (clean, forward-looking; promote to `/studio` at final cutover). Legacy `/studio` and `/maya` are untouched throughout.

1. **Scaffold the isolated 3.0 shell** at `/app`.
   - New component tree under `components/app-v3/` (no imports from `components/sselfie/`).
   - Strict TypeScript for this tree (do NOT rely on `ignoreBuildErrors`; treat type errors as blockers here).
   - Access gate: Studio membership entitlement; everyone else sees the upgrade path. The 7 members can opt in to test but their default home stays legacy until cutover.

2. **The Visual Front Door** (removes decision fatigue).
   - Pinterest-style responsive grid of Prompt Vault aesthetics (Quiet Luxury, Editorial, Dark Feminine, Coastal, etc.), sourced from the existing Vault collection data/images.
   - Each tile carries its aesthetic "intent" (the styling direction) as structured data, not just a label.

3. **The Concierge handoff.**
   - Clicking a vibe opens Maya with that aesthetic preloaded into the conversation context ("Quiet Luxury, great choice...").
   - Maya asks the two simple questions: upload your selfie, and Reel cover or carousel. Warm, guided, not a blank chatbot.

4. **Reference selfie capture.**
   - Inline upload that writes to `user_avatar_images` (reuse the existing avatar path). This is the new mental model's "Upload" step.

5. **Synchronous generation.**
   - Call `generate-image-openai` directly with `{ prompt (from the chosen aesthetic + Maya's Q&A), referenceImageUrl (from user_avatar_images) }`. No polling. Show a single clean progress state.
   - Persist to the gallery store so it appears in the member's gallery.

6. **Conversational edits.**
   - "Make my blazer black" → re-call the OpenAI route using the just-generated image as the `referenceImageUrl` plus the edit instruction. The route already supports reference-based refinement. Each turn is one synchronous call.

7. **Gallery view (reuse).**
   - Read the same gallery data the legacy app uses, so members see one unified set of images regardless of which shell made them.

Phase 1 done = a Studio member can land at `/app`, pick a vibe, upload a selfie, get a generated image, and tweak it conversationally — all synchronous, all on shared backend, with the legacy app and the 7 members untouched.

## Cutover / sunset path (later phases, not Phase 1)
- Phase 2: harden, add the rest of the aesthetics, polish the concierge, dogfood with 1-2 willing members.
- Phase 3: promote `/app` to be the default Studio, migrate the 7 members deliberately (their galleries already carry over since storage is shared), and soft-archive the legacy `sselfie-app` shell the same way we soft-archived the legacy routes.
- The legacy async generation routes (already soft-archived in MAYA-REBUILD Phase 1) get retired once no one is on the old shell.

## Risks & guardrails
- **Temporary duplication** (two shells) is the cost of safety. Acceptable and intentional; it ends at cutover.
- **Don't let 3.0 import legacy UI** — enforce the boundary (`components/app-v3/` imports backend libs only). This keeps 3.0 clean and prevents re-inheriting the debt.
- **Shared backend changes need care** — any change to `generate-image-openai`, gallery, or entitlements affects both apps. Keep backend changes additive and tested.
- **Turn type-checking on for the new tree** — the single biggest lesson from this week. The login crash happened because errors were suppressed. 3.0 should fail the build on type errors.

## Open decisions for you
1. Route name: `/app` (my pick) vs `/studio-v3` vs other. (Not `/brand-engine`.)
2. Do the 7 members get an opt-in "try the new Studio" toggle during the build, or stay fully on legacy until cutover?
3. Reel cover vs carousel: confirm these are the two initial output formats for Phase 1, or is single-image enough to start?
