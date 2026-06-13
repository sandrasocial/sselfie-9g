# MAYA-ADMIN-01 — Maya becomes the admin content surface

OWNER: sandra (live QA) — code-complete, no Codex task queued; flip to `codex` only if QA surfaces a fix

> Status audit 2026-06-13 (revised): Code-complete. All four slices are built and
> verified in code — including Slice 4 weekly-brief injection (`getAdminBriefContext()`
> at `app/api/app-v3/maya/chat/route.ts:277`, appended to the admin contract at
> route.ts:452). The only outstanding spec item, "remove the collapsed brief row," is
> intentionally NOT done — see decision below. Remaining work is Sandra's live QA
> (human test, checklist below) and optional reel-cover/caption tools after she tests
> the carousel/story workflow. No Codex code task is queued from this spec.

*Approved by Sandra 2026-06-12. Owner: Claude (Cowork). Supersedes the standalone Shoot
Studio UI direction (SHOOT-STUDIO-01 Phase A stays live as a collapsed support tool until
absorbed).*

## Why (Sandra, verbatim logic)

Maya in /app is already excellent: vault vibe + selfie + side profile + full body +
inspiration image = amazing quality. The admin content tab had become an overwhelming
scroll of separate systems. So: don't build parallel tools, embed Maya in admin,
customized to Sandra, and grow her tools there. "When Maya has connections to how the
vault is, she is genuinely good" — the vault DNA bridge is the quality driver, keep it
front and center.

This is the Maya North Star (tool dispatcher + inline components + memory) built for
admin first; Sandra is customer zero of the real vision.

## Slice 1 — SHIPPED 2026-06-12

- `components/admin/admin-maya.tsx`: ConciergeProvider + VisualFrontDoor (vault vibe
  tiles) + MayaConcierge mounted on /admin/content-brief. Page renamed "Content";
  weekly brief + shoot studio + carousel kit + story sequences collapsed into
  `<details>` support-tool rows below Maya.
- `MayaConcierge` gained an `admin` prop -> sends `adminSession: true` with every chat
  message. `VisualFrontDoor` gained overridable header copy + `compact` (member
  defaults unchanged).
- `/api/app-v3/maya/chat`: when `adminSession && isAdminEmail(user.email)`, appends
  `ADMIN_MAYA_CONTRACT` (`lib/app-v3/maya/admin-persona.ts`) to the system prompt:
  distilled IG Growth OS (viral DNA, pillars, signature series, cover system,
  keywords, flop patterns), the no-fake moat, vault-collection thinking (series
  consistency; keep a chosen vibe's world, swap only what she asks), expert-operator
  tone. Server-gated: the flag does nothing for non-admin emails.
- Everything else is the member pipeline untouched: same generate route (multi-angle
  selfies, streaming), same vault DNA injection, same memory (`app_v3_memory`), her
  credits/gallery as today.

## Next slices (one at a time, only after she uses the previous one)

1. **Approve -> backend**: ✅ BUILT 2026-06-13. Admin Maya now has a server-gated
   `publish_admin_shoot_to_vault` tool that publishes a ready Shoot Studio collection
   through the DB-backed Vault pipeline, then shows the Vault drop email handoff inline.
   Admin Maya also has `show_admin_vault_drop_handoff` for counts/status without publishing.
   The handoff reuses the existing selected-collection drop email workflow: test-send,
   create live run, and process batches are explicit buttons in the chat card. No email
   sends just because Maya shows the handoff.
2. **Content tools in chat**: ✅ BUILT 2026-06-13. Admin Maya now has server-gated tools
   to show approved Shoot Studio sources and create draft carousels/story sequences from
   the existing content-kit generators. Results render inline in the Maya thread with
   source-shoot context and review/download links. Member Maya is unchanged because the
   tools are only registered when `adminSession` is true and the user is the admin email.
   Remaining follow-up: reel-cover/caption-specific tools can be added after Sandra tests
   the carousel/story draft workflow.
3. **Admin memory**: ✅ BUILT 2026-06-13. Admin Maya now loads recent
   admin-specific editorial memory into the admin contract and has a server-gated
   `remember_admin_decision` tool for lasting approval, rejection, voice,
   workflow, and content signals. Shoot Studio approve/kill/full-approve/publish
   actions also write compact taste-memory notes automatically. Member Maya is
   unchanged.
4. **Weekly brief as knowledge**: ✅ BUILT 2026-06-13. `getAdminBriefContext()`
   (`app/api/app-v3/maya/chat/route.ts:277`) loads the latest `content_brief_weekly`
   report and appends it to the admin contract (route.ts:452) on every admin session,
   so "what should I post this week?" answers from real data. Member Maya unchanged.
   **Brief-row removal: declined (Claude, 2026-06-13).** The spec originally said to
   remove the collapsed "Weekly brief" row (`app/admin/content-brief/page.tsx:154`,
   renders `ContentBriefClient`). Keeping it: it is the only surface where Sandra can
   *read* the raw brief numbers (post performance, copies, DMs, hooks). Maya holding the
   data as knowledge does not replace the dashboard view, and the row is collapsed by
   default so it costs nothing. Removing it would trade a real capability for a checkbox.
   Revisit only if Sandra says she never opens it.

## Live QA checklist (Sandra — this is the remaining work)

Run inside `/admin/content-brief` (the "Content" page) while signed in as the admin email.

1. **She knows the week.** Ask Maya "what should I post this week?" — she should answer
   from the actual brief (name real hooks/keywords/top posts), not generic advice.
2. **Vault DNA holds.** Pick a Vault vibe tile, then ask for the same world with one change
   (e.g. "same look, swap the location to a car"). Series consistency should survive.
3. **Publish handoff is safe.** Take a ready shoot through `publish_admin_shoot_to_vault`.
   Confirm the drop-email card shows counts and that NOTHING sends without your explicit
   button press (test-send, create run, process batch are all separate clicks).
4. **Content tools.** From an approved shoot, have Maya draft a carousel and a story
   sequence; confirm they render inline with source-shoot context and review links.
5. **Memory sticks.** Tell Maya a lasting preference ("I never want X"), start a fresh
   session, confirm she still respects it.
6. **Member safety.** Open Maya in `/app` as a normal member (or confirm via a non-admin
   account) — none of the admin tools/persona appear. This is the one thing to never break.

Report back which steps feel off; each maps to a small, isolated fix Codex can take
without touching `/app` member code.

## Hard rules

- Nothing auto-posts, ever. Email sends always behind an explicit yes with counts shown.
- Member experience must be byte-identical when `adminSession` is absent.
- No em-dashes anywhere in persona text. No-fake doctrine language always.
