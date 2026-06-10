# SSELFIE Deep Audit + Clean Plan
*2026-06-10 — full-repo audit (4 parallel deep-dives) + revenue diagnosis. This is the cleanup
contract: what stays, what goes, and the rules that keep an AI-managed codebase from rotting.*

---

## 1. The honest picture

**Traffic is real. Revenue isn't.** ~4,100 visitors/week (+16%), 89% mobile, 73% iOS, almost all
from Instagram. But ~60% of traffic lands on FREE pages (/ai-prompts 1.6K, /selfie-guide 826) and
only ~140/week reach the $27 sales page. Sales: ~20 Vault/month (~$540), ~14 Starter Kits, **zero
new memberships in 60 days** (first doors shipped 2026-06-10). Revenue per visitor ≈ $0.08.

**The machine converts attention → emails brilliantly (~2,600 new emails/month) and emails →
money poorly.** The site is not the revenue engine; the email list + the ladder is. That's where
the work goes.

**The codebase:** 105 pages, 387 API routes, 30 cron routes (16 scheduled), a 6,247-line Stripe
webhook, 133 legacy member-app components (55K lines) next to the 23-file new /app, 58 remote
branches (37 codex/*), 21 git worktrees, 78 docs. A year of AI building without deletion. Agents
get confused because for every job there are 2-3 systems and only one is real.

## 2. The one rule going forward

> **One live system per job. Every feature that ships deletes what it replaced.**
> If an agent finds two ways to do something, that's a bug — CLAUDE.md says which one is real.

## 3. Revenue plan (do these before any big refactor)

1. **One public story:** Free AI prompts → Vault $27 → SUITE $97/mo (System $197 as the bridge).
   Everything else (Masterclass, Starter Kit, Selfie Guide) becomes secondary/nurture, not
   front-door. 8 pages currently funnel into /masterclass — that's old campaign debt, not a
   strategy.
2. **Email is the engine:** the new-subscriber nurture should drive to ONE next step (Vault),
   then the SUITE door. Measure weekly: opt-ins → vault sales → member joins (now trackable —
   doors, membership checkout events, and the repaired Resend webhook all landed 2026-06-10).
3. **Watch the new instruments for 2 weeks before adding anything:** Apple Pay impact on the
   ~14% checkout conversion, bridge clicks (after_copy_free_prompt), SUITE door clicks →
   membership payment forms, habit-email effect on member activity.
4. **Retention before acquisition for SUITE:** habit system is live; rescue the 3 zero-usage
   members; annual offer at month 2; pause-instead-of-cancel. Membership LTV (~$330 today) is
   the number to move.

## 4. Delete list (verified safe — execute as one "DELETE-01" batch)

**Redirect-only pages → move to next.config.js redirects, delete the page dirs (18):**
visibility-suite, ai-brand-photos, ai-photo-refresh, concept-cards, captions, feed-reset,
transform, what-to-say, whats-new, show-up, sselfie-vs-aragon, paid-blueprint, private-shoot,
quiz/post-to-paid (+results), prompt-guides (+[slug]), checkout/transform, checkout/visibility-suite.

**Dead Maya feed tab (already in CLAUDE.md dead-code map):**
components/sselfie/maya/maya-feed-tab.tsx; app/api/maya/feed, feed-chat, feed-progress,
generate-feed, generate-feed-prompt, generate-all-feed-prompts; lib/feed-chat/history.ts.

**Dead lib directories (zero importers):** lib/feed-planner-v2, lib/automation,
lib/content-engine, lib/gallery, lib/semantic, lib/hooks, lib/selfie-guide,
lib/generation/prompt/legacy-authority.ts (2,344 lines).

**Orphaned components (zero importers):** sselfie/studio-screen.tsx, sselfie/post-to-paid-quiz.tsx,
sselfie/hashtag-strategy-panel.tsx, sselfie/interactive-pipeline-showcase.tsx,
sselfie/training-screen.tsx, sselfie/work-with-me-inquiry-form.tsx, components/studio-pro/,
components/engagement/, components/strategy/.

**Orphaned cron routes (have code, never scheduled — 14):** reindex-codebase,
send-scheduled-newsletters, cohort-report-weekly, product-qa-daily, funnel-report-daily,
refresh-segments, sync-audience-segments, referral-bonus-notifications,
blueprint-followup-sequence, revenue-engine-weekly, maya-instagram-trends-weekly,
backfill-resend-audience, arpu-churn-weekly, cohort-delivery-load-weekly.
(Confirm none are hit by external schedulers before deleting.)

**Unused npm deps:** canvas, puppeteer, jimp, pdf-lib, html2canvas (verify jszip, konva,
react-konva before removing).

**Repo noise:** git rm --cached all .DS_Store + .gitignore entry; move the 15 stray .md debug
files out of tests/ into docs/archive/testing/; dedupe the two duplicated funnel decision docs;
delete merged codex/* branches (37 total, ~13 stale since April); prune the ~6 dead worktrees;
**delete or archive the `studio-3.0-phase1` branch — it received pushes in June and is months
behind; an agent building there is building on the wrong base.**

**Protected (never delete — restating CLAUDE.md):** app/feed-planner, app/api/feed-planner,
app/api/feed, lib/feed-planner, components/feed-planner, lib/maya/feed-generation-handler.ts.

## 5. Consolidate list (bigger jobs, one at a time, in this order)

1. **Stripe webhook monolith (6,247 lines):** split into per-product handlers under
   lib/payments/handlers/, one shared fulfillment pipeline, server-side analytics events that
   actually fire (we measured: purchase events undercount ~50%). This file caused the June 3-5
   checkout outage and the unfulfilled-buyer incident — it's the single riskiest file.
2. **The two member apps:** /studio (133 files, 55K lines) vs /app (23 files, 3.4K). Finish /app
   to parity for the member jobs that matter (create, library, content, account — done on
   staging), migrate the 7 members, then delete the legacy tree in stages. Target: one app.
3. **Maya brains:** lib/maya (legacy, 120 imports) vs lib/app-v3/maya (new). The new engine is
   the future; port what /studio still needs, then retire legacy prompt builders
   (vibe-libraries 4,792 lines, influencer-outfits 1,983 lines are data dumps the new
   Vault-driven engine replaced).
4. **Email sequences:** 5 near-identical sequence files + 1,320-line nurture cron → one
   sequence engine with per-product configs.
5. **Maya chat/generate legacy routes (3,210 + 2,798 lines):** shrink when /studio retires.

## 6. Rules for an AI-managed repo (the operating system)

1. **CLAUDE.md is the only brain.** Route map, live-products table, dead-code map, doctrine
   pointers. Every cleanup updates it in the same PR.
2. **One branch flow:** work branches off main → Sandra merges. `studio-v3-staging` is the only
   long-lived feature branch. No agent builds on anything else (kill phase1).
3. **tasks/ mirrors reality:** delete specs for shipped work in the shipping PR. CLAUDE.md's
   task table currently lists files that don't exist — fix in next CLAUDE.md pass.
4. **Monthly DELETE ritual:** last Friday of the month, an agent runs the dead-code audit and
   ships a deletion PR. Deletion is a feature.
5. **Money numbers only from stripe_payments / Stripe API** — never analytics events
   (memory: sselfie-funnel-truth).
6. **Every new system ships with:** an env kill-switch, an entry in CLAUDE.md, and the deletion
   of what it replaces.

## 7. Suggested order of execution

| Week | Work |
|---|---|
| Now | Watch the new funnel instruments; send rescue emails; QA staging /app |
| 1 | DELETE-01 batch (section 4) — one PR, big diff, zero behavior change |
| 2 | Stripe webhook split (section 5.1) — highest risk reduction |
| 3-4 | /app to member parity + migrate 7 members; retire legacy /studio in stages |
| Monthly | The DELETE ritual + CLAUDE.md sync |
