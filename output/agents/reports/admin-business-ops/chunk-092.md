Agent Report  
Agent: admin-business-ops  
Specialty: Admin tooling, operational risks, business controls.  
Chunk ID: chunk-092  
Group: docs  
Date: 2026-01-18  

---

Summary:  
- The canonical prompt system is always active without environment variable gating; environment variables exist but only control audit logging or endpoint access, not prompt generation behavior.  
- UI components have a clear canonical vs legacy designation, promoting consistency and maintainability; some key canonical components include Button, Dialog, Tabs, Unified Loading, and Maya Header.  
- Several API routes handling category derivation have inline or insecure implementations leading to risks; a few routes accept client-provided categories without server validation, enabling potential bypasses.  
- Style coherence enforcement and prompt generation assembly have undergone major fixes to hard enforce fashion context coherence, eliminate incoherent prompts, and improve prompt structure and logging.  
- Email automation systems including Cold Reactivation and Cold Re-education sequences are documented with segmentation logic, environment flags, templates, scheduling, and overlap risk assessments for safe, controlled campaigns.  

---

Top Findings:  

1. **Canonical Prompt System Always Active without Env Var Gating**  
   - `lib/maya/prompt-authority.ts` functions have no environment variable checks (lines 324-1978).  
   - Feature flags like `ENABLE_AUTHORITY_FEED_PLANNER_PROMPTS` control routing for audit logging only, not prompt generation (`lib/feed-planner/orchestrator.ts:234`).  
   - Endpoint access is gated by env vars but does not affect prompt generation (e.g., `ENABLE_BLUEPRINT_GUEST` in `app/api/blueprint/generate-concepts/route.ts:232`).  
 
2. **UI Components: Canonical vs Legacy Clearly Defined**  
   - `components/ui/button.tsx` is canonical; specialized buttons wrap or add feature-specific logic.  
   - Core loading spinners, dialogs, tabs, and Maya headers have canonical versions (`components/sselfie/unified-loading.tsx`, `components/ui/dialog.tsx`).  
   - Legacy Maya headers exist but are unused and recommended for archiving.  
 
3. **High Risk from Inline Category Derivation Logic**  
   - `/api/feed/create-free-example` and `/api/feed/[feedId]/regenerate-post` implement inline category logic duplicating `getCategoryAndMood` but missing partial matching and default incorrectly to "professional" category (`app/api/feed/create-free-example/route.ts`, lines 80-219; `app/api/feed/[feedId]/regenerate-post/route.ts`, lines 114-208).  
   - `/api/blueprint/generate-grid` accepts client-provided category without deriving from user profile, enabling category bypass risks (`app/api/blueprint/generate-grid/route.ts:14`).  

4. **Coherence Enforcement and Prompt Assembly Fixes Are Complete**  
   - Coherence resolver is mandated; missing `resolvedFashionStyle` throws errors in `lib/maya/prompt-authority.ts` and `lib/feed-planner/nano-banana-adapter.ts`.  
   - Prompt assembly rewritten to enforce single-scene prompts, proper object sanitization, blocking incompatible frame types, and natural language structure.  
   - Fashion context-based guardrails remove inappropriate objects like laptops/coffee in athletic shoots (`lib/feed-planner/nano-banana-adapter.ts`).  
 
5. **Email Automation: Cold Reactivation and Re-education Campaigns Documented with Safety Controls**  
   - Cold Reactivation campaign carefully designed with segmentation, deduplication, environment gating (`COLD_REACTIVATION_ENABLED`), and scheduled in cron (`app/api/cron/cold-reactivation/route.ts` planned).  
   - Cold Re-education sequence implemented with 3-email series, Resend segment integration (`cold-edu-day-*.tsx`), safety gating via `COLD_EDUCATION_ENABLED` and exclusion of active subscribers and recent reengagement recipients (`app/api/cron/cold-reeducation-sequence/route.ts`).  
   - Overlap risks identified between cold reactivation, reengagement, and win-back campaigns with recommendations for exclusion criteria to prevent duplicate emails.  

6. **Code Verification and Cleanup Reports Confirmed No Pricing Config Leaks and Complete Deletion of Backup Files**  
   - Cleanups successfully deleted over 360 backup files, removed `lib/pricing.config.ts`, and verified single source for credit costs guarantees no duplicate configurations  
   (`docs/CLEANUP_COMPLETE.md`, `docs/CLEANUP_REPORT.md`).  

7. **Commit Review Audit Highlights Missing Cron Job Migration Execution and Cold Re-education Sequence Scheduling Ambiguity**  
   - Migration SQL exists for cron job logs but no runner or verification script created; migration likely unexecuted causing dashboard issues.  
   - Cold re-education sequence active file exists but not scheduled in `vercel.json` and disabled duplicate file also present, requiring decision.  
   - Large reactivation campaign route (~845 lines) flagged for refactor into smaller modules.  

8. **Safe Cleanup Not Yet Ready for Aggressive Deletions due to Dynamic Usage and Critical Business Logic**  
   - `docs/CODEBASE_INVENTORY_REPORT.md` notes ~75% code actively used with some legacy code protected; critical modules for payment, auth, DB must not be deleted without approval.  
   - Duplication identified in DB connectors and Maya headers needing verification before consolidation.  

---

Risks:  

1. **Inline Category Logic in Two High-Risk Routes** (`/api/feed/create-free-example`, `/api/feed/[feedId]/regenerate-post`) duplicates canonical functionality partially and defaults to incorrect categories. May cause inappropriate prompt generation and mismatched user experience.  

2. **Client-Provided Categories Unvalidated in Blueprint Generate-Grid Endpoint** may allow clients to bypass

## FILES_REVIEWED
```json
[
  "docs/CANONICAL_PROMPT_SYSTEM_ENV_AUDIT.md",
  "docs/CANONICAL_UI_COMPONENTS.md",
  "docs/CATEGORY_DERIVATION_AUDIT.md",
  "docs/CLASSIC-VS-PRO-MODE-COMPARISON.md",
  "docs/CLEANUP_COMPLETE.md",
  "docs/CLEANUP_REPORT.md",
  "docs/CODEBASE_INVENTORY_REPORT.md",
  "docs/CODE_VERIFICATION_SUMMARY.md",
  "docs/COHERENCE_ENFORCEMENT_FIX.md",
  "docs/COHERENCE_RESOLVER_IMPLEMENTATION.md",
  "docs/COLD-REACTIVATION-AUDIT.md",
  "docs/COLD-REEDUCATION-SEQUENCE.md",
  "docs/COMMIT_REVIEW_AUDIT.md"
]
```
