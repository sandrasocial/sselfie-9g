# MANYCHAT-FUNNEL-01 — Numbered single-prompt funnel

> **SUPERSEDED / DO NOT IMPLEMENT AS CURRENT STRATEGY (2026-06-30).**
>
> This spec is retained only as history. Sandra explicitly moved away from numbered
> ManyChat keywords because they were too complex operationally. The current live
> strategy is:
>
> - Instagram/DM keyword: `PROMPT`
> - ManyChat delivery: the free AI prompts page at `/ai-prompts`
> - Free page content: the latest five SSELFIE shoot previews, always refreshed from
>   the newest published/freebie collection selection
> - Paid upgrade: Prompt Vault for the complete shoot worlds
>
> Do not tell Sandra to wire `n={{last_text_input}}`, create per-number ManyChat
> keywords, or use numbered comments as the default. Prompt numbers may remain as
> product/internal IDs and historical `/p/{number}` links, but they are not the
> operating model for ManyChat.

**Owner:** Codex (app build) · spec by Claude (Cowork)
**Status:** Superseded 2026-06-30. The free prompt experience is now the latest five shoot previews, not one numbered prompt per post.
**Decided by Sandra 2026-06-30:** free = latest five prompt/collection previews on `/ai-prompts`; ManyChat uses `PROMPT`; no numbered keyword system.
**Strategy source:** `docs/strategy/manychat-funnel-plan-2026-06-18.md` + `docs/strategy/competitor-aivideoskool-2026-06-18.md`. Governed by [[no-fake-ai-psychology]]; money rules in CLAUDE.md.

## Why
Historical rationale only. Do not implement this as current strategy.

The old theory was that the free `/ai-prompts` pack over-delivered and should switch to the aivideoskool model: each reel gives away only the single prompt it showed. Sandra later corrected this on 2026-06-30: the live strategy is `PROMPT` -> `/ai-prompts`, with the latest five free shoot previews.

## Historical Scope (do not implement as current strategy)

### 1. Number every Vault prompt (stable id)
- Give each prompt in `lib/ai-prompts/prompt-data.ts` (+ any DB-published drops) a stable, human-facing **prompt number** (e.g. 1..N), never reused. Numbers are the public keyword + the page slug. Store the mapping so a number always resolves to the same prompt even as the library grows.
- Expose a lookup: `getPromptByNumber(n)` returning the prompt (title, whenToUse, mood, the full ChatGPT-paste text, example image url, source collection).

### 2. Single-prompt page `sselfie.ai/p/{number}`
- Renders ONE prompt. Reuse the existing `/ai-prompts/access` email-gate + PromptCard components and the stone design (no gold, light editorial).
- **Light email gate:** show the prompt title + example image + a teaser; require email (one field, one tap) to reveal/copy the full prompt text. Reuse the existing freebie opt-in path so the email lands in the same place the current free flow uses (freebie_subscribers + Resend Main Audience) — do NOT create a parallel email store.
- **Vault upsell on the page:** below the prompt, "This is 1 of [LIVE COUNT]. Get every shoot world in one place → Vault $27" → `/checkout/prompt-vault` with `?source=prompt_page&utm_...&prompt_n={number}`. Use the LIVE Vault count (never a hardcoded number — the Vault grows).
- No-Fake language throughout (keeps your face; never "no one will know"/"fake"/"flawless").

### 3. ManyChat integration (retired)
- Historical note (verified 2026-06-18): the evergreen all-posts comment trigger already existed as "Prompt Pack Automation" for PROMPT.
- Current instruction: keep the evergreen PROMPT flow, but send it to `/ai-prompts`. Do not re-point it at `sselfie.ai/p/{number}`.
- Current resolver behavior: `GET /api/manychat/prompt` returns `/ai-prompts` with `mode: "latest_five_free_prompts"`. If an old flow passes `n={number}`, the resolver ignores it and still returns `/ai-prompts`.
- Tag requesters as prompt requesters; do not stamp a ManyChat prompt number as the operating model.

### 4. `/ai-prompts`
- Current behavior: `/ai-prompts` shows the latest five free shoot previews. This is the intended PROMPT destination.

### 5. Analytics / attribution
- Record the prompt number on the email opt-in and on the checkout attribution so `/admin` can show which prompts drive opt-ins and Vault sales. Money still only from `stripe_payments`/Stripe API; the number is behavior/attribution, not money.

## Out of scope
- SUITE flow unchanged. No new email store. No hardcoded Vault counts anywhere.

## Current Acceptance
- `/ai-prompts` shows the latest five free shoot previews.
- `/api/manychat/prompt` returns `/ai-prompts` with `mode: "latest_five_free_prompts"`.
- Old numbered query params do not change the PROMPT destination.
- No per-post ManyChat keyword or automation is needed for a new prompt.

## Claude/Sandra (not Codex)
- Sandra approves any customer-facing copy on the page + DM (no autonomous sends).
- Claude can set up the evergreen ManyChat trigger via browser when pages are live, and write the page/DM copy for approval.
