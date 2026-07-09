# PHASE2-CLEANUP-01 — Delete the dead Admin Maya brain, retire post-now.ts, collapse /admin nav

Date: 2026-07-09
Owner: Codex
Priority: 1 — safe to run NOW, no dependency on the new Cowork tasks proving themselves.

## Scope note (read this first)

This is the "safe half" of Phase 2 from the 2026-07-08/09 content-automation migration
(VOICE-LOOP-01, EMPLOYEE-01, and the two new Claude Cowork tasks — see
`docs/AUTOMATION_ROSTER.md`). The OTHER half (retiring `content-brief-weekly` cron code +
`lib/admin/daily-briefing-intelligence.ts`) is intentionally NOT in this spec — it's held until
the new `weekly-content-brief-draft` Cowork task has completed at least one real Monday run
(next: 2026-07-13) and `ig-dm-drafter` has run at least once. Do not touch those two files/crons
in this pass.

## A. Delete the dead Admin Maya brain

Verified 2026-07-09: the only UI that ever set `adminSession: true` (`components/admin/admin-maya.tsx`)
was deleted in commit `6b124ec6` ("Fix admin shoot studio quality path", 2026-06-18), which
explicitly replaced it with direct Shoot Studio tooling. `isAdminSession` in the chat route can
only become true via a raw authenticated API call today — there is no live button/page path to
it. Confirm this is still true (grep for any `adminSession` prop setter before deleting), then
delete:

- `lib/app-v3/maya/admin-persona.ts` (whole file — `ADMIN_MAYA_CONTRACT`)
- In `app/api/app-v3/maya/chat/route.ts`: the `isAdminSession` gate and everything it uniquely
  feeds — search fresh rather than trust exact line numbers (VOICE-LOOP-01 touched this file
  since the original audit): `AdminToolShoot` type, `getAdminContentToolContext()`,
  `pickAdminSourceShootId()`, `summarizeAdminCarouselDeck()`, `summarizeAdminStorySequence()`,
  `summarizeVaultDropEmailPreview()`, `getAdminBriefContext()`, `getAdminEditorialMemoryContext()`
  (this specific wrapper only — see caveat below), the 7 admin-only tools
  (`showAdminContentSources`/`rememberAdminDecision`/`createAdminCarousel`/
  `createAdminTutorialCarousel`/`createAdminStorySequence`/`publishAdminShootToVault`/
  `showAdminVaultDropHandoff`), and the `...(isAdminSession ? {...} : {})` tools spread.
- `components/app-v3/admin-content-tool-card.tsx` (whole file)
- In `components/app-v3/maya-concierge.tsx`: the `admin` prop, `adminSession` request field,
  `extractAdminContentTool()`, and the `<AdminContentToolCard>` render.
- In `components/app-v3/visual-front-door.tsx`: the vestigial admin-override props
  (`eyebrow`/`title`/`subtitle`/`note`/`compact` overrides written for the old admin-Maya mount)
  IF grep confirms no live caller still passes them.

**Do NOT delete `lib/app-v3/maya/admin-memory-store.ts`.** It's shared, load-bearing
infrastructure — `addAdminMemoryNote`/`getAdminMemoryContext` are called directly by
`app/api/admin/content-kit/route.ts`, `.../shoots/route.ts`, `.../stories/route.ts`,
`app/api/admin/content-brief/memory/route.ts`, `app/api/admin/ig-inbox/[id]/reply/route.ts`,
`lib/admin/daily-briefing-intelligence.ts`, `lib/content-engine/brief-generator.ts`, and
internally by the carousel/story generators. Only the chat-route-specific wrapper function
(`getAdminEditorialMemoryContext`) and the `remember_admin_decision` tool go — the store itself
stays exactly as-is.

**Do NOT touch** `lib/content-kit/carousel-generator.ts`, `story-generator.ts`,
`shoot-generator.ts`, `slide-redesign-generator.ts` — all four have independent, live, tested
direct API entry points under `/admin/content-brief` (Shoot Studio, Carousel Kit, Story
Sequences) that don't go through the chat/tool-calling flow at all; `slide-redesign-generator.ts`
is also core member-product infrastructure (`app/api/app-v3/maya/generate/route.ts`). Nothing
here is admin-Maya-specific.

## B. Delete `lib/admin/post-now.ts`

Its job (an on-demand "what should I post tonight" LLM call) is now covered live by the
`.agents/skills/reel-hooks/` Cowork skill. Delete:

- `lib/admin/post-now.ts`
- `app/api/admin/content-kit/post-now/route.ts`
- The `PostNowClient` mount/component on `/admin/content-brief` (component file too, if nothing
  else references it after the route is gone)

## C. Collapse `/admin` nav to the 5 items the Admin Data Contract already mandates

Per `CLAUDE.md`'s Admin Data Contract rule 6, nav should be Home · Inbox · Content · Support ·
Tools. Reality has drifted to ~11 separate top-level routes. Fix:

- **Home** (`/admin`) — unchanged.
- **Content** (`/admin/content-brief`) — becomes ONLY the three visual creation tools Sandra
  actually uses: Shoot Studio, Carousel Kit, Story Sequences. Remove from this page: the
  `ContentBriefClient` weekly-brief panel (its underlying cron/file gets removed in the separate,
  still-gated Phase 2B spec — until then this panel may render a simplified/different payload
  shape from the new Cowork task's writes; removing the panel here avoids that entirely, so
  sequence this ahead of or alongside Phase 2B), member-pulse panel, and the vault-drop-email
  preview panel (keep the underlying data/routes if anything else uses them — just stop
  surfacing them on this page).
- **Inbox** (`/admin/ig-inbox`) — unchanged.
- **Support** (`/admin/customer-support`) — unchanged.
- **Tools** (new, one nav link, simple index page) — houses: Academy, Credits, Testimonials,
  Webhook Review, Prompt Vault monitor, Selfie-to-Brand-Shoot monitor, and the
  `/admin/preview/selfie-to-brand-shoot` QA mirror. These keep their existing routes/functionality
  unchanged — only the top-level nav entry point changes.

## Acceptance

- `grep -r adminSession components/` returns no live setter before deletion (confirms it's safe).
- Full test suite green (expect some existing admin-Maya/tool tests to need deletion alongside
  the code they test — remove them, don't leave them red).
- Shoot Studio, Carousel Kit, Story Sequences all still work and are still reachable and tested
  after the nav change.
- `/admin` nav renders exactly 5 top-level items.
- Full suite green before merge (standing rule after two stale-test-merge incidents this cycle —
  run the WHOLE suite, not just touched files).

## Out of scope

`content-brief-weekly`/`content-brief-jobs` crons, `lib/content-engine/brief-generator.ts`,
`lib/admin/daily-briefing-intelligence.ts` — held for the separate PHASE2B spec, gated on proof.
Model ID updates — separate PHASE2-MODEL-REFRESH-01 spec (higher risk, needs live verification).
