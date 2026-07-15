# MAYA-ARRIVAL-01 — new members must land somewhere that works

Status: READY for Codex 2026-07-15 — START NOW (parallel with CALENDAR-CLEAN-01; different
surfaces). PULL MAIN FIRST. Evidence + root causes:
`docs/audits/MAYA_PROMPT_HANDOFF_AUDIT_2026-07-15.md` (triggered by the campaign's real $97
buyer getting lost). Every customer-visible string below ships as DRAFT for Sandra — build
with the placeholder copy, flag her exact words before merge.

## 1. Create front door: restore access to her purchased Vault (audit cause 2)

The 2026-07-13 recommendation-led redesign (d5d1ca89) removed the only path that feeds
purchased Vault collection prompts into Maya from the Create tab's own entries (the
`"maya-decides"` id was never exempted in `hasSpecificVisualWorld`,
`components/app-v3/maya-concierge.tsx` ~line 1366, so `shouldShowVibeChoice` never fires).

Fix shape (KEEPS the locked one-recommendation default — this is an addition, not a revert):
one quiet secondary affordance on the Create front door under the recommendation/text box —
DRAFT copy: "Pick from your Vault instead" — which opens the ALREADY-WORKING picker path
(the `maya-general` flow used by `components/app-v3/app-v3-shell.tsx` `createFormat`; the
floating launcher proves it works). Do NOT re-enable the picker inside "maya-decides"
sessions and do NOT touch the guided first-selfie path. Contract note: this amends
`docs/product/MAYA_INVISIBLE_AI_FIRST_RESULT_2026-07-13.md` minimally — update that doc's
non-regression list in the same PR (one recommendation stays the lead; Vault browsing is the
member's explicit escape).

## 2. Vault access page: recognize her own members (audit cause 5)

`app/access/prompt-vault/[token]/page.tsx` today: CopyButton copies raw prompt text and
stops (no destination), and the bottom `SuiteDoor` CTA sends EVERYONE — including active
members — to `/join/studio` (a cold checkout). The campaign buyer hit this page 105 times.

Fix shape, member-aware (resolve membership/pass server-side on the page):
- Active member/pass holder: each prompt card's action becomes "Open in Maya" (deep link
  into `/app` Create with that collection preselected via the existing aesthetics/creation
  channel — NOT a clipboard copy), and SuiteDoor becomes DRAFT copy "Open this look in Maya"
  → `/app`. Keep a small secondary "copy text" for members who want it.
- Not a member: page unchanged (copy button + upgrade CTA exactly as today).
- The free `/ai-prompts/access/[token]` page stays untouched (unauthenticated surface).

## 3. Pre-selfie question path — build DARK behind a flag (audit cause 7)

Members with zero selfies get NO chat/text surface at all
(`components/app-v3/visual-front-door.tsx` renders only "Add my selfie"). That is a
deliberate 2026-07-13 lock, and turning it on is SANDRA'S decision — so build it gated:
`MAYA_PRESELFIE_CHAT_ENABLED` (default OFF). When on: one quiet text link under the selfie
gate — DRAFT copy: "Have a question first? Ask Maya" — opening plain chat (questions,
guidance, what-do-I-get) with generation still locked until a selfie exists. When off:
today's behavior byte-for-byte.

## Explicitly OUT of scope

The paste-a-full-prompt verbatim path (audit decision C — separate design, do not improvise
it here). Buyer-home consolidation (decision D — pairs with the campaign postmortem). Any
change to the recommendation engine, persona, prompt compiler, or generation pipeline.

## Acceptance

- Tests: front-door affordance renders only for members with vault access and opens the
  picker path (pin the mechanism like `tests/maya-invisible-ai-first-result.test.ts` does);
  vault page renders member vs non-member variants correctly (token + session matrix);
  pre-selfie link absent with flag off.
- 375px mobile check on all three surfaces; both `/app` and the standalone vault page
  smoke-checked; full suite + type-check + `pnpm check:voice` green; no em-dashes; all new
  copy marked DRAFT for Sandra's exact words.
- `docs/product/MAYA_INVISIBLE_AI_FIRST_RESULT_2026-07-13.md` updated in the same PR (item 1).
