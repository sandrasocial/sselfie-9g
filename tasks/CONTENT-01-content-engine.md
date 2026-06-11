# CONTENT-01 — Weekly Content Intelligence Engine

*Spec written 2026-06-10. Status: implementing.*

## Problem

Sandra spends too much time deciding what to post and doesn't trust generic advice. The existing `maya-instagram-trends-weekly` cron scrapes 3 generic marketing blogs with a regex and was never scheduled — exactly the generic-hook problem.

## What this builds

A weekly brief, generated every Monday and viewable at `/admin/content-brief`, built from three real data sources:

1. **Her own Instagram performance** — Graph API media list (caption, format, likes, comments; reach/saves/shares once `instagram_manage_insights` is granted via reconnect). Posts ranked by engagement, hook lines extracted from winners.
2. **First-party audience demand** — `analytics_events` (prompt copies by title, vault views, checkout successes) + `ig_messages` DM intents and raw audience language from the new DM bridge.
3. **Live hook research** — Claude with web search at generation time, scoped to her niche (AI photos / personal branding for women), cross-checked against her own winners. No static hook lists.

Output per week:
- Performance recap: top 5 posts + why they worked
- Audience demand: top copied prompts, DM themes with example quotes
- Hook intelligence: patterns with evidence, labeled `your-data` vs `research`
- **5 ready-to-post pieces**: hook, caption (Sandra voice + No-Fake doctrine), format, carousel outline or reel cover direction, ChatGPT-ready photoshoot prompt, hashtags, "why this works" tied to data
- **1 story sequence** (frame-by-frame)

## Files

- `lib/content-engine/instagram-performance.ts` — Graph API pull + ranking, graceful insights fallback
- `lib/content-engine/audience-signals.ts` — analytics_events + ig_messages mining
- `lib/content-engine/brief-generator.ts` — web-search research pass + structured brief via Anthropic SDK
- `app/api/cron/content-brief-weekly/route.ts` — Monday 06:30 UTC, gated by `CONTENT_BRIEF_ENABLED=true`, stores report + notifies Sandra by email
- `app/api/admin/content-brief/route.ts` — GET latest/history, POST generate-now (admin only)
- `app/admin/content-brief/page.tsx` — brief viewer with copy buttons
- Storage: `analytics_reports` with `report_type = 'content_brief_weekly'` (no new table)

## Edits

- `app/api/instagram/connect/route.ts` — add `instagram_manage_insights` + `read_insights` to the Facebook-path scope (Sandra reconnects once to unlock reach/saves/shares)
- `lib/analytics/reports.ts` — add `content_brief_weekly` to the report type union
- `vercel.json` — add cron `30 6 * * 1`

## Rules baked into generation

- Sandra voice: warm, short sentences, contractions, no em-dashes anywhere
- No-Fake doctrine (`docs/funnel/NO_FAKE_AI_BRAND_PSYCHOLOGY_2026-06-10.md`): never "fool people" framing; AI-assisted, recognizable, keeps your face
- Banned words: leverage, synergy, transform, game-changer, skyrocket, unlock your potential
- Photoshoot prompts follow the Prompt Vault style (identity reference, editorial scene)
- All content is DRAFT — Sandra approves before posting. The engine never posts.

## Out of scope (v1)

- Competitor dashboards (Instagram API forbids competitor analytics; research pass covers public patterns instead)
- Auto-posting, auto-scheduling
- ManyChat keyword analytics (manual audit covers this for now)
