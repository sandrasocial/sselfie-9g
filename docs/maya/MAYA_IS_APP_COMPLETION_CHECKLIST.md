# Maya Is The App - Completion Checklist

Last updated: 2026-03-05
Owner: Stella implementation track
Scope decision: Named-agent onboarding is intentionally deferred (Maya remains the default name for all users).

## Definition Of Done

Maya is considered complete for this phase when users can discover, execute, edit, and publish core outputs from chat without needing to navigate tabs for the main workflow.

## Checklist

### A. Chat-Native Tool Runtime
- [x] Tool registry + marker parsing for core tools (`show_capabilities`, `show_gallery`, `save_to_gallery`, `generate_image`, `generate_video`, `show_upload_zone`, `collect_offer_brief`, `create_asset`, `edit_asset`)
- [x] Multi-step asset creation (`page`, `calendar`, `pdf`) in one turn
- [x] New chat-native `show_studio_hub` tool to view created assets inline
- [ ] True dependent multi-step executor (`do X then Y then Z` with per-step state, retries, and resumable state IDs)

### B. Hydration + Memory Reliability
- [x] Shared Maya user snapshot resolver used across tool dispatch/hydration
- [x] Schema-drift-safe memory writes (`maya_personal_memory`) with backward-compatible merge path
- [x] Schema-drift-safe brand snapshot fallback query
- [ ] Snapshot-backed hydration applied to all remaining non-chat execution routes

### C. Asset Creation + Publishing
- [x] Landing page/calendar/pdf drafts created inline in chat
- [x] User images pulled from `generated_images`, `ai_images`, and `brand_assets` for asset generation
- [x] Studio Hub API + screen lists pages and feed outputs
- [ ] Explicit publish/connect flows in chat (Stripe + email provider integration step)
- [ ] Inline edit loop with version history and rollback UI for all asset types

### D. UX + Capability Discovery
- [x] Capabilities card with multiple start paths (photo, video, page, calendar, workbook, upload, studio hub)
- [x] Inline Studio Hub renderer in Maya chat
- [ ] First-session guided path with progressive forms for missing context in every major flow
- [ ] Full tab-to-chat migration plan for Feed Planner and Academy core actions

### E. Cost + Guardrails
- [x] Credit checks for generation dispatches
- [ ] Cost budget guardrails for chained workflows (max steps/token/media budgets)
- [ ] User-facing budget fallback messaging per workflow stage

### F. QA + Launch Gate
- [x] Type-check passing
- [x] Tool dispatcher/orchestrator/marker tests passing
- [ ] End-to-end manual acceptance across: image -> video -> page -> lead capture -> checkout
- [ ] Production flag audit + rollout checklist (ensure chat-first behavior enabled intentionally)

## Next Highest-Impact Slices

1. Implement true dependent multi-step executor with durable `runId` and per-step status.
2. Add chat-native publish integrations (Stripe/email connect) for generated pages.
3. Add workflow budget guardrails for chained executions.
4. Finish Feed Planner and Academy chat-native action parity for "no navigation" target state.
