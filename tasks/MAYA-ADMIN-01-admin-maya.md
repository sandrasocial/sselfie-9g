# MAYA-ADMIN-01 — Maya becomes the admin content surface

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
3. **Admin memory**: persist what she approves/rejects as admin-specific memory notes
   feeding the contract each session ("learn as we go").
4. **Weekly brief as knowledge**: inject the latest content_brief_weekly payload into
   the admin contract so "what should I post this week?" answers from data; remove the
   collapsed brief row.

## Hard rules

- Nothing auto-posts, ever. Email sends always behind an explicit yes with counts shown.
- Member experience must be byte-identical when `adminSession` is absent.
- No em-dashes anywhere in persona text. No-fake doctrine language always.
