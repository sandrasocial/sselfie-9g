# MAYA-LEARNING-01: make Maya's learning visible (the moat members can feel)

Status: ready for Codex.
Freeze compliance: read `docs/product/MAYA_CREATIVE_FREEZE_2026-07-15.md`. This is Track B
(experience/routing/UI). The likeness prompt-injection block already exists and is frozen;
this task changes CAPTURE and VISIBILITY only. Freeze snapshots must stay unchanged.

## The evidence (2026-07-15)

"She learns you" is the hardest-to-copy promise, and it is invisible today:

- 2 likeness notes total across all members; 20 `app_v3_memory` rows; 6 members named Maya.
- Only 20 edit-images in 14 days, so the silent edit-classifier
  (`classifyLikenessCorrection` in `app/api/app-v3/maya/edit/route.ts` ~line 231, gated by
  `APP_V3_LIKENESS_MEMORY_ENABLED`) almost never fires - and when it does, nothing tells
  the member Maya remembered.
- Suite Quality Audit (2026-07) already ranked the likeness-memory loop as the agreed next
  moat build; admin-side parity work found the same gap.

## Build

1. **Acknowledge every capture.** When the edit classifier saves a note (it already logs
   `suite_likeness_note_captured`), the edit response and the chat surface tell her in one
   Maya line: e.g. "Noted. Dark brown hair, not black. Every photo from now on knows that."
   (voice: short, warm, no m-dashes, never a banned likeness phrase - run check:voice).
2. **Offer capture at the right moment.** After an edit whose instruction is
   likeness-classified but low-confidence, or after she downloads an edited image, one
   dismissible inline offer: "Want me to remember that for every future photo?" One tap
   saves the note. Never interrupts the pre-value first-result path (respect
   `docs/product/MAYA_INVISIBLE_AI_FIRST_RESULT_2026-07-13.md`).
3. **Show what Maya knows.** In the existing Memory/account surface, a "What I know about
   you" card: likeness notes, preferred worlds, agent name - each deletable (the likeness
   contract already promises deletability; make it real if it is not).
4. **Instrument it.** Events for offer shown/accepted/dismissed and note deleted, so the
   weekly vibe check can measure whether visible learning moves retention and downloads.

## Guardrails

- No changes to `lib/app-v3/likeness-memory.ts` classification rules or the prompt block it
  injects (frozen). Capture UX only.
- Identity-safety copy doctrine applies to every string
  (`docs/funnel/NO_FAKE_AI_BRAND_PSYCHOLOGY_2026-06-10.md`).
- Naming stays optional and post-value.

## Acceptance

- A member who corrects her look once sees Maya acknowledge it and can find + delete the
  note in Memory.
- Likeness-note count and members-with-notes climb week over week (baseline: 2 notes, 2
  members on 2026-07-15).
- Freeze snapshots unchanged; full suite green before merge.
