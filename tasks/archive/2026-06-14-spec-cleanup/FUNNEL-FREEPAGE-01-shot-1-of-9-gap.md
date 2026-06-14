# FUNNEL-FREEPAGE-01 — "Shot 1 of 9" locked-preview gap on the free AI-prompts page

OWNER: codex (queued — spec by Claude 2026-06-13; implement on a `codex/` branch)

> Move 1 of the offer-fix brief (`docs/funnel/FREE_TO_PAID_OFFER_FIX_2026-06-13.md`).
> Highest-leverage structural conversion change. All front-end on the free access page +
> the prompt-data module. No `/app`, no payments, no email. Clean lane.

## Why

The free `/ai-prompts` page gives the opening shot of each collection as one complete,
polished, usable image. One finished shot reads as "done," so the urge to buy the rest dies.
Diagnosis data: engaged free users almost never click the $27 offer (email click 0.7%), and
the free product satisfies the desire instead of creating it.

Fix: make the gap **visible**. Each free shot becomes "Shot 1 of N · [Collection]", with the
remaining shots shown as locked/teased tiles. "Shot 1 of 9, eight more locked" reframes a
finished image as the first page of a story the buyer is one step into.

## Current structure (verified)

- `lib/ai-prompts/prompt-data.ts`:
  - Each collection is a `PromptCard[]` (e.g. `QUIET_LUXURY_LONDON_SERIES`, 9 shots;
    `MYSTERIOUS_VOGUE_SERIES`, 7; `DENIM_STREET_SERIES`, 14; etc.).
  - `FREEBIE_COLLECTION_PREVIEWS` = `[SERIES[0]]` per collection (one free shot each).
  - `VAULT_COLLECTION_META` (line ~2363) holds per-collection metadata. Use it (or
    `SERIES.length`) for the total count and display name — do NOT hardcode counts.
  - Each `PromptCard` has `title`, `mood`, `exampleImage`, `prompt`.
- Free access page: `app/ai-prompts/access/[token]/page.tsx` renders the previews.
- Paid page: `app/access/prompt-vault/[token]/page.tsx` renders full series.

## What to build

For every freebie preview card on the free access page:

1. **Label the gap.** Above/under the free shot, show "Shot 1 of {total} · {Collection name}".
   Total comes from the series length / `VAULT_COLLECTION_META`.
2. **Render the locked shots (2..N) as teaser tiles.** For each remaining shot in that
   collection, show a tile with:
   - the shot's `exampleImage` (this is the craving driver — show what they're missing),
     visually marked as locked: a soft blur or dim + a small lock badge + "In the Vault".
   - the shot `title` (e.g. "Quiet Luxury London · Seated Hero").
   - **NO prompt text.** The prompt is the paid product. Never render `prompt` for a locked
     shot, and don't ship it to the client for locked tiles (omit it from the props/payload,
     don't just hide it with CSS).
3. **Per-collection unlock CTA.** "Unlock all {total} shots · $27" → the Vault checkout
   (reuse the existing freebie→vault checkout link used elsewhere on this page so the freebie
   token/attribution carries through). One CTA per collection, plus the existing page-level
   Vault CTA stays.
4. **Keep the free experience generous.** The free shot stays fully usable (copyable prompt,
   full image). We are adding the visible gap, not removing free value.

## Guardrails
- **Do not leak paid prompts.** Server-side, only send locked tiles' `title` + `exampleImage`
  to the client. Strip `prompt` for non-free cards. (Audit the page's data flow — if it
  currently imports whole series client-side, change it to send a locked-safe shape.)
- No em-dashes in any copy. No-fake doctrine in any new copy ("keeps your face", etc.).
  Never "learn prompts".
- Mobile: locked tiles must read clearly as locked on a narrow viewport (badge + dim), and
  the grid must not overflow (this app has had mobile overflow regressions).
- Don't touch the paid `/access/prompt-vault` page or the prompt-data series contents.

## Measurement (so we can tell if it worked)
Add lightweight tracking on the new elements, matching how this page already logs to
`analytics_events` / `checkout_attribution`:
- a view event when locked tiles render,
- a click event on a locked tile and on the per-collection "Unlock all" CTA.
This lets `/admin` compare free→Vault conversion before/after. If the page has no existing
event hook, log via the same client the current free-page CTAs use.

## Acceptance
- [ ] Each free collection shows "Shot 1 of N" + the locked teaser tiles for shots 2..N.
- [ ] Locked tiles show image + title only; the paid `prompt` is never sent to the client.
- [ ] Per-collection "Unlock all N · $27" CTA links to the Vault checkout with the freebie
      token/attribution preserved.
- [ ] Free shots stay fully usable; no regression to the existing free experience.
- [ ] Mobile: no overflow, locked state legible.
- [ ] Click/view events fire so the conversion lift is measurable.
