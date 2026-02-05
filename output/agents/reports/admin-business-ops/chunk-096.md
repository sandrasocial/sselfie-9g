Agent Report  
Agent: admin-business-ops  
Specialty: Admin tooling, operational risks, business controls.  
Chunk ID: chunk-096  
Group: docs  
Date: 2026-01-20  

Summary:  
- Detailed audits cover Feed Designer prompt generation, template migration, feed layout architecture, loading overlays, feed planner V2 flows, free blueprint signup flow, polling fixes, upsell flows, free mode implementation, and overall app readiness.  
- Several operational risks identified in webhook user resolution, credit deduction race conditions, and checkout success polling causing user confusion or revenue risk.  
- Business controls improved via feed style persistence, prompt generation standardization, and access gating clarifications.  
- Opportunities exist to enhance upsell flow tracking, overlay UX consistency, feed planner V2 simplification, and polling efficiency.  

Top Findings:  
1. **Feed Designer Prompt Generation** (docs/FEED_DESIGNER_PROMPT_GENERATION_AUDIT.md):  
   - FREE and PAID BLUEPRINT users forced to Pro Mode (Nano Banana Pro) using template or AI prompts respectively; MEMBERSHIP users default to Classic Mode with trigger word-heavy AI prompts.  
   - Templates for FREE users are static and category/mood driven; PAID users use AI generation with rich brand context; MEMBERSHIP user prompts validated with trigger words and gender information.  
   - Evidence: `app/api/feed/[feedId]/generate-single/route.ts` (Lines 285-368, 415-576), `lib/maya/blueprint-photoshoot-templates.ts`, `lib/maya/mode-adapters.ts`, prompt helper functions.  

2. **Template Migration Plan** (docs/FEED_DESIGNER_TEMPLATE_MIGRATION_AUDIT.md):   
   - Proposal to switch PAID BLUEPRINT users from Maya AI dynamic prompts to blueprint template prompts for preview grids, reducing API costs, increasing speed, and producing consistent previews.  
   - Detailed implementation steps to replace Maya AI calls with template lookups using priority on `blueprint_subscribers` data, falling back to `user_personal_brand`.  
   - Evidence: Modified code snippets in `app/api/feed/[feedId]/generate-single/route.ts` and `regenerate-post/route.ts`.  

3. **Feed Loading Overlay Issues & Fix** (docs/FEED_LOADING_OVERLAY_AUDIT.md):  
   - Current overlay logic does not consider if individual posts are generating, causing persistent loading overlays even after images complete.  
   - Recommended fix: Show overlay when any posts are actively generating or feed is processing; hide otherwise.  
   - Evidence: `instagram-feed-view.tsx`, polling code in `use-feed-polling.ts`.  

4. **Feed Planner V2 Audit & Implementation** (docs/FEED_PLANNER_V2_AUDIT.md, docs/FEED_PLANNER_V2_IMPLEMENTATION_PLAN.md):  
   - V1 remnants and over-engineered logic cause race conditions and inconsistent variation selection persistence.  
   - Recommendations to remove V1 code, simplify useEffect hooks managing variation selection, resolve race conditions by passing selected variation directly to feed creation API, and remove redundant feature flags.  
   - V2 Implementation preserves coexistence with V1 but adds new tables with richer prompt and style data models.  
   - Evidence: `feed-style-modal.tsx`, API routes for feed creation, and feature flag checks.  

5. **Free Blueprint Signup Flow Audit** (docs/FREE-BLUEPRINT-SIGNUP-AUDIT.md):  
   - Evidence-based recommendation to KEEP current email-first signup with optional account linking later to avoid conversion risks caused by password creation and email verification delay.  
   - Free Blueprint flow currently depends on email lookup (not user accounts), no subscription required to access `/studio`.  
   - Evidence: Auth components, signup routes, blueprint email capture API routes, user syncing logic, and database schema.  

6. **Free Blueprint Polling Fix** (docs/FREE_BLUEPRINT_POLLING_FIX.md):  
   - Polling logic refined to immediately stop polling once single image is generated for free blueprint single post feeds, removing grace period and improving UI responsiveness.  
   - Evidence: `use-feed-polling.ts`, progress endpoint behavior.  

7. **Free Blueprint → Paid Blueprint Upsell Flow Audit** (docs/FREE_BLUEPRINT_UPSELL_FLOW_AUDIT.md):  
   - Upsell flow is mostly consistent but lacks feedId tracking through checkout, has potential webhook user resolution failures, and has polling timeout issues causing poor UX.  
   - Recommendations include adding feedId to checkout metadata, increasing success page polling timeout to 120 seconds, and improving error handling.  
   - Evidence: Checkout page, webhook handler, success content polling logic, and upsell CTA in feed UI.  

8. **Free Mode Current Implementation** (docs/FREE_MODE_CURRENT_IMPLEMENTATION.md):  
   - Free users can create feeds with one post, generate individual images at 9:16 ratio, and incur 2 credit cost.  
   - Preview grid generation for free users not yet supported; recommended to add non-breaking preview support with new endpoint and UI updates.  
   - Polling accurately stops immediately once image is ready.  
   - Evidence: API routes for feed creation/generation, UI placeholder components.  

9. **Feed Style Persistence Fix and Summary** (docs/FEED_STYLE_PERSISTENCE_FIX.md and FEED_STYLE_PERSISTENCE_SUMMARY.md):  
   - Added JSONB columns for feed-specific `visual_aesthetic` and `fashion_style` to `feed_layouts` to persist overrides independent of personal brand.  
   - Prompt generation helpers updated to prefer feed-level styles over personal brand.  
   - Validation added to require feed style on feed creation endpoints.  
   - Evidence: Database migrations, API route updates, generation

## FILES_REVIEWED
```json
[
  "docs/FEED_DESIGNER_PROMPT_GENERATION_AUDIT.md",
  "docs/FEED_DESIGNER_TEMPLATE_MIGRATION_AUDIT.md",
  "docs/FEED_LAYOUT_ARCHITECTURE.md",
  "docs/FEED_LOADING_OVERLAY_AUDIT.md",
  "docs/FEED_PLANNER_V2_AUDIT.md",
  "docs/FEED_PLANNER_V2_IMPLEMENTATION_PLAN.md",
  "docs/FEED_POST_CARD_MODAL_INCONSISTENCY.md",
  "docs/FEED_PREVIEW_NATURAL_LANGUAGE_REFACTOR.md",
  "docs/FEED_STYLE_PERSISTENCE_FIX.md",
  "docs/FEED_STYLE_PERSISTENCE_SUMMARY.md",
  "docs/FINAL_TEST_STATUS.md",
  "docs/FREE-BLUEPRINT-SIGNUP-AUDIT.md",
  "docs/FREE_BLUEPRINT_POLLING_FIX.md",
  "docs/FREE_BLUEPRINT_UPSELL_FLOW_AUDIT.md",
  "docs/FREE_MODE_CURRENT_IMPLEMENTATION.md",
  "docs/FULL_APP_CODE_AUDIT_DEPLOYMENT_READINESS_REPORT.md"
]
```
