# CLAUDE.md Archive — sections moved out 2026-06-11

*Moved from CLAUDE.md to cut per-session token load. Content preserved verbatim. Nothing here is deleted doctrine — it is history and superseded detail.*

---

## Current Priorities (April 2026)

| Task file | Topic | Status |
|-----------|-------|--------|
| `tasks/UX-01-maya-classic-ux-fixes.md` | Maya Classic UX fixes | Active |
| `tasks/UX-02-maya-pro-mode-ux-audit.md` | Maya Pro mode UX audit | Active |
| `tasks/UX-02-maya-pro-mode-ux-fixes.md` | Maya Pro mode fixes | Active |
| `tasks/E-01-fix-subscriber-count-and-mismatch-guard.md` | Subscriber count fix + guard | Active |
| `tasks/ACADEMY-01-foundation.md` | Academy foundation | Planned |
| `tasks/ACADEMY-02-CODEX-SPEC.md` | Academy Codex spec | Planned |

### Prompt Vault Pivot (May 26-27, 2026)

**Current growth signal:** Instagram and email behavior show people want instant AI photoshoot transformations from one selfie, not another selfie education starter product and not a generic "prompt collection."

**Do not drift back to the old Starter Kit-first funnel.** Starter Kit has been tested for weeks and has sold weakly (7 total reported by Sandra; live Neon shows 6 active Starter Kit records and Stripe payment tracking is incomplete). The audience is asking for AI photo prompts. The front-end offer should follow that demand.

- New low-ticket offer: **AI Photo Prompt Vault** (`prompt_vault`) — $27.
- Positioning: **"turn one selfie into unlimited photoshoots."** Avoid positioning it as "learn prompts" or a static prompt pack.
- New funnel/product ladder source of truth: `docs/funnel/AI_PROMPT_FUNNEL_RESEARCH_AND_LADDER_2026-05-26.md`.
- Free lead magnet: `/ai-prompts` and token access at `/ai-prompts/access/[token]`.
- Primary upgrade from the free AI prompts product: `/prompt-vault` -> `/checkout/prompt-vault` -> `/access/prompt-vault/[token]`.
- Academy/library access: `/academy/access/prompt-vault`.
- Delivery email: `lib/email/templates/prompt-vault-delivery.ts`.
- Buyer-success nurture drafts: `lib/email/templates/prompt-vault-buyer-sequence.ts`, scheduled by `app/api/cron/nurture-sequence/route.ts` only when `PROMPT_VAULT_NURTURE_ENABLED=true`.
- Launch monitor: `/admin/prompt-vault` tracks Prompt Vault visits, free-to-vault clicks, checkout starts, purchases, access opens, prompt views, and prompt copies.
- Attribution priority: preserve `source`, UTM params, `entry_post_slug`, `cta_keyword`, and `buyer_stage` from reels, ManyChat, email, and free prompt bridges into `/checkout/prompt-vault`.
- **Buyer psychology doctrine (LOCKED 2026-06-10): `docs/funnel/NO_FAKE_AI_BRAND_PSYCHOLOGY_2026-06-10.md` governs ALL copy, captions, UI text, emails, carousels, and Maya language.** Core: her fear is "people will think I'm fake," so the promise is "look elevated without feeling fake." AI = creative direction around the real her, never deception. Never write copy implying viewers are fooled ("no one will know", "look rich", "fake photoshoot", "perfect face", "flawless skin"). Always: AI-assisted, realistic, recognizable, tasteful, true-to-you, "keeps your face." Signature line: "AI should not erase you. It should frame you."
- Buyer behavior priority: use prompt view/copy frequency as the demand signal for the next "PROMPT MY SELFIE" reel. Current strongest aesthetic signal is Dark Balcony / Reel Cover Hero.
- Checkout recovery: abandoned Prompt Vault checkouts are handled by `/api/cron/prompt-vault-checkout-recovery`, gated by `PROMPT_VAULT_CHECKOUT_RECOVERY_ENABLED=true`.
- AI audience segmentation: use **AI Photoshoot Audience** as the clean business segment for AI prompt opt-ins, Prompt Vault buyers, checkout abandoners, access openers, prompt copiers, and ManyChat prompt-reel leads. Canonical rule: `docs/funnel/AI_PHOTOSHOOT_AUDIENCE_SEGMENT_RULE_2026-05-27.md`; code source: `lib/audience/ai-photoshoot-segment.ts`; Resend env: `RESEND_SEGMENT_AI_PHOTOSHOOT_AUDIENCE`.
- Launch broadcast draft: `docs/email/PROMPT_VAULT_LAUNCH_BROADCAST_DRAFT_2026-05-26.md` — Sandra must approve before any send.
- SOP for adding new collections: `docs/PROMPT_VAULT_ADD_COLLECTION_SOP.md`.
- Membership reposition plan: `docs/funnel/PROMPT_VAULT_MEMBERSHIP_REPOSITION_PLAN_2026-05-27.md`. Working direction is SSELFIE Vault Club: weekly AI photoshoot transformation drops, seasonal collections, creator challenges, and referral/community loop. Do not build the subscription until validation gates in that doc are met.
- Starter Kit is no longer the primary next step from AI prompts. It may remain as a secondary support product only when clearly framed as "make the original selfie stronger before AI."

### Selfie Education Reposition (April 23, 2026 — Superseded For Front-Door Growth)

- Approved direction: `docs/SELFIE-EDUCATION-REPOSITION-PLAN-2026-04-23.md`
- Old public ladder: Free Selfie Guide -> Starter Kit ($37) -> Masterclass ($147) -> Studio (€97/mo) -> 1:1
- Status: keep routes and fulfillment working for existing buyers, but do not treat this as the active front-door growth funnel.
- Lifecycle owner: `app/api/cron/nurture-sequence/route.ts`
- Delivery model:
  - Free Guide -> `freebie_subscribers` token -> `/selfie-guide/access/[token]`
  - Starter Kit -> tokenized access route at `/access/starter-kit/[token]`
  - Masterclass -> Academy entitlement + lifecycle delivery
- Public marketing routes now live in repo: `/starter-kit`, `/masterclass`, `/join/studio`, `/work-with-me`
- Checkout routes now live in repo: `/checkout/starter-kit`, `/checkout/masterclass`
- Keep outbound copy draft-safe until Sandra approves final launch copy and ops confirms production env vars

### Selfie Guide Status (April 2026)

- `tasks/SELFIE-GUIDE-02-phase-b.md` — **Implemented** (chapter flow, challenge tracking + Day 14 trigger, Maya preview API, analytics API + admin UI, email templates)
- Remaining polish is content/ops validation (real before/after assets swap, end-to-end smoke checks in prod-like environment)

### Academy Library Status (April 23, 2026)

- `tasks/ACADEMY-03-course-library-ui.md` — **Implemented on `codex/academy-course-library`**
- `/academy` is now the authenticated course library, not the old mini-product wall
- New surfaces:
  - `/academy/courses/[courseId]`
  - `/academy/courses/[courseId]/lessons/[lessonId]`
  - `/api/academy/lessons/[lessonId]/notes`
- Lesson companion data is seeded into `academy_lessons.content`
- New per-user lesson state table: `user_lesson_notes`
- Maya profile sync from Academy lessons writes into `user_personal_brand` for whitelisted brand fields

**Completed sprints (do not re-open):**
- V-02 Full Funnel Hardening ✅ (2026-03-09)
- Maya UX Stabilization ✅ (2026-03-11, commit `b950f1db`)

---


## Email History

- Studio membership had NEVER had a dedicated broadcast before Feb 28, 2026
- Feb 28, 2026: First Studio membership email — Broadcast ID `8cacda39-7495-47a6-8505-c6985df7eaeb`
- Mar 02, 2026: SEQ-01 Nurture sequence approved (5 emails, Day 2/5/9/14/20 for Selfie Guide buyers) — templates renamed `nurture-strategy-n*.ts`
- Mar 09, 2026: Legacy manual/scheduled campaign stack removed from repo. Only live email paths remain.
- Apr 23, 2026: Selfie education ladder approved. `nurture-sequence` now owns draft lifecycle for Free Guide -> Starter Kit -> Masterclass plus the legacy Brand Strategy follow-up until checkout/webhook migration completes.
- May 26, 2026: Growth pivot documented. Prompt Vault is the primary paid bridge from AI prompt demand. Do not promote Starter Kit as the main AI prompts upgrade unless Sandra explicitly reverses this decision.

---

