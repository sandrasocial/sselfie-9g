# Maya prompt handoff + new-member overview audit — 2026-07-15

Trigger: the One Selfie bundle's real $97 buyer (Grethe Sagmoen, grethe@grethesagmoen.no,
Norwegian, iPhone) messaged Sandra: no app where everything is collected, hard to get an
overview, prompts no longer land in Maya automatically, and a copied prompt pasted into
Maya produces a completely different image. Sandra added: Maya doesn't respond properly
when members just want to ask questions. Audit-first per Sandra; two code auditors + live
DB pulls + a live LLM repro. This doc is the durable record; fix decisions at bottom.

## Member truth (Neon, 2026-07-15 morning)

She is NOT stalled — she is the most active member: 12 selfies, 10 Maya chats, 16
completed images (0 failed), 16 downloads, 198/220 credits. But: 105
`prompt_vault_prompt_viewed` + 21 `prompt_vault_prompt_copied` on the STANDALONE vault
access page — she lives on a page that has no path into her app. Her complaint is
overview + handoff, not capability.

## Verified root causes

1. **LLM transport is HEALTHY (negative result, proven live).** The Jul 9 model bump
   (f98cd1c3) moved Maya to `anthropic/claude-sonnet-5` via OpenRouter with no
   reasoning param — suspicious after the content-kit thinking incident — but a live
   repro with the exact production shape (temperature 0.8, tools, 16384 max tokens,
   Norwegian question) returned complete healthy answers, `reasoning_tokens: 0`, no
   errors, both at temp 0.8 and 1. Do NOT ship a thinking-disable "fix" here.

2. **Create-tab Vault picker regression (d5d1ca89, 2026-07-13).** The front door's three
   primary entries switched `MAYA_BLANK` → `MAYA_DECIDES_AESTHETIC`, but
   `maya-concierge.tsx` `hasSpecificVisualWorld` (line ~1366) never exempted
   `"maya-decides"`, so `shouldShowVibeChoice` is false and the InlineVibePicker →
   InlineShotPicker chain (the ONLY UI that feeds purchased Vault collection prompts
   into Maya) no longer appears from Create's own front door. Server side, the same
   commit replaced "MAYA SUGGESTS LOOKS" (ask_clarify with named Vault looks) with
   silent self-selection. Deliberate redesign trade-off, but it is the literal mechanism
   behind "prompts don't land in Maya automatically anymore." Content-tab ideas, This
   Week strip, gallery actions, and the floating launcher (all `maya-general`) still
   reach the picker.

3. **Old inspiration silently attached to fresh sessions — FIXED 2026-07-15
   (main `28db4bc2`).** be68754b's guard covered only the one-selfie starter chip;
   every other fresh entry still restored the member's saved inspiration image and
   attached it ("use its pose and wardrobe/styling") to her message. Second independent
   cause of "completely different image." Now inspiration restores only into sessions
   resumed with existing messages; identity references restore everywhere. Contract
   test updated (tests/maya-invisible-ai-first-result.test.ts).

4. **No verbatim prompt path exists in App v3 (by design).** Pasted text →
   emit_concepts field decomposition (outfit/setting/mood/pose/camera/lighting) →
   prompt-compiler appends ~10 fixed blocks (CANDID_EDITORIAL actively fights posed
   vault looks; Vault signature DNA is lost when no collection is selected). Copy-paste
   can never reproduce a Vault look. The vault card prompts were "written for
   paste-into-ChatGPT use" (lib/app-v3/maya/vault-styles.ts:13-17). The only verbatim
   mechanism today is Feed Planner's sceneTemplate field.

5. **The standalone Vault access page is a dead end for members.**
   `app/access/prompt-vault/[token]/page.tsx`: CopyButton copies to clipboard with no
   afterCopyHref (no "open in Maya"); the bottom SuiteDoor CTA pitches "No more pasting
   prompts…" but links every visitor — including paying members — to `/join/studio`
   (cold checkout), with no membership check.

6. **Buyer home scatters the product across 6 URLs.**
   `app/academy/access/one-selfie/page.tsx` presents 4 numbered steps → Starter Kit
   access page, Vault access page, two course pages, then `/app` as a separate final
   step; the in-app Library tab re-lists the same items as link-outs. No surface is
   "everything in one place."

7. **Pre-selfie members have NO chat surface (deliberate Jul 13 lock).**
   visual-front-door.tsx renders only "Add my selfie" until a selfie exists — no text
   box, no way to ask a question. Explains "Maya doesn't respond when they just want to
   chat" for brand-new members. Post-selfie, questions typed into the box are answered
   (transport healthy), but the maya-decides system prompt pushes toward emitting one
   concept rather than conversing.

## Shipped immediately (campaign-freeze-safe, member surface only)

- `28db4bc2` on main: inspiration-inheritance fix (cause 3). Suite 1,207+ green,
  type-check, deployed + verified.

## Decisions Sandra owns (do not build without her word)

A. Restore Vault browsing from the Create front door. Recommended shape: keep the
   locked one-recommendation default, add ONE quiet affordance ("Pick from your Vault
   instead") that opens the already-working maya-general picker path. Amends the
   2026-07-13 contract minimally. Alternative shapes: exempt "maya-decides" in the
   picker gate, or server-side ask_clarify with named looks.
B. Make the Vault access page member-aware: CopyButton afterCopyHref deep-link into
   /app; SuiteDoor shows "Open this look in Maya" → /app for active members instead of
   /join/studio. Copy needs Sandra approval.
C. Paste-detection verbatim path (bigger design): detect a pasted full prompt and give
   it sceneTemplate-style verbatim treatment plus identity anchor, instead of field
   decomposition. Spec for Codex post-freeze.
D. Buyer home consolidation: Library tab becomes the canonical "everything you own"
   surface; bundle steps deep-link into /app instead of 6 scattered URLs. Post-freeze,
   pairs with the campaign postmortem.
E. Pre-selfie question path: smallest option is a "Have a question first?" link under
   the selfie gate. Contract amendment — Sandra's call.

## Also noticed

- `"maya-blank"` dead references remain in two gate checks + one test fixture.
- Mid-thread there is no way to reopen the Vault picker (hard `!hasStarted` gate);
  workaround is Start new.
- The other two recent signups (kayte.foster@outlook.com, colorqueen158@gmail.co,
  Starter Kit trials) have zero selfies/chats/images — the pre-selfie wall (cause 7)
  is where they stand today.
