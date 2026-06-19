# MANYCHAT-FUNNEL-01 — Numbered single-prompt funnel

**Owner:** Codex (app build) · spec by Claude (Cowork)
**Status:** Built and strategy-adjusted 2026-06-19. Prompt numbers stay in the product, but `PROMPT` is the default ManyChat keyword. `/p/latest` and `/api/manychat/prompt` now support current-prompt fallback so Sandra does not need per-prompt ManyChat wiring.
**Decided by Sandra 2026-06-18:** free = ONE exact prompt per post (a taste, not a pack); light email gate on delivery (protect list growth + nurture); numbered keywords per prompt post.
**Strategy source:** `docs/strategy/manychat-funnel-plan-2026-06-18.md` + `docs/strategy/competitor-aivideoskool-2026-06-18.md`. Governed by [[no-fake-ai-psychology]]; money rules in CLAUDE.md.

## Why
The free `/ai-prompts` pack over-delivers and satisfies the desire that should drive Vault sales (see `funnel-conversion-truth-2026-06`). Switch to the aivideoskool model: each reel gives away ONLY the single prompt it showed, the Vault becomes "all of them + new drops," and ManyChat is set up once (no per-post automations).

## Scope

### 1. Number every Vault prompt (stable id)
- Give each prompt in `lib/ai-prompts/prompt-data.ts` (+ any DB-published drops) a stable, human-facing **prompt number** (e.g. 1..N), never reused. Numbers are the public keyword + the page slug. Store the mapping so a number always resolves to the same prompt even as the library grows.
- Expose a lookup: `getPromptByNumber(n)` returning the prompt (title, whenToUse, mood, the full ChatGPT-paste text, example image url, source collection).

### 2. Single-prompt page `sselfie.ai/p/{number}`
- Renders ONE prompt. Reuse the existing `/ai-prompts/access` email-gate + PromptCard components and the stone design (no gold, light editorial).
- **Light email gate:** show the prompt title + example image + a teaser; require email (one field, one tap) to reveal/copy the full prompt text. Reuse the existing freebie opt-in path so the email lands in the same place the current free flow uses (freebie_subscribers + Resend Main Audience) — do NOT create a parallel email store.
- **Vault upsell on the page:** below the prompt, "This is 1 of [LIVE COUNT]. Get every shoot world in one place → Vault $27" → `/checkout/prompt-vault` with `?source=prompt_page&utm_...&prompt_n={number}`. Use the LIVE Vault count (never a hardcoded number — the Vault grows).
- No-Fake language throughout (keeps your face; never "no one will know"/"fake"/"flawless").

### 3. ManyChat integration (set once)
- NOTE (verified 2026-06-18): the evergreen all-posts comment trigger ALREADY EXISTS — "Prompt Pack Automation" fires on "User comments on any Post or Reel contains PROMPT" (7,674 runs, 44.6% CTR, live). It captured only 3 emails across 7,791 sends — the email-capture hole this task fixes. So Codex's job is NOT to create the trigger; it's to (a) build the pages/endpoint below and (b) re-point this automation's delivery at the single-prompt page + add the email-capture step. Sandra/Claude updates the ManyChat flow once those exist.
- The flow: opening DM is a tappable button (Meta policy), then delivers a link to `sselfie.ai/p/{number}`.
- **Zero-touch routing endpoint (build this):** `GET /api/manychat/prompt?n={number}` → returns `{ ok, number, title, pageUrl, found }` for a valid number, and a graceful fallback for an unknown/not-yet-published number ("that one's coming, here's the Vault"). This lets a single ManyChat flow resolve any number without a new keyword row per prompt. Secure it (shared token / allowlist) so it isn't a public scrape surface.
- Tag requesters (e.g. `prompt-requester`) and stamp the number so we can attribute Vault sales to the originating prompt.

### 4. Reposition `/ai-prompts`
- From "a pack" to "a single rotating taste + Vault pitch." Coordinate with the existing `codex/freebie-curation` branch (free cap = a few evergreen + 1 rotating). The library/pack framing moves up to the Vault.

### 5. Analytics / attribution
- Record the prompt number on the email opt-in and on the checkout attribution so `/admin` can show which prompts drive opt-ins and Vault sales. Money still only from `stripe_payments`/Stripe API; the number is behavior/attribution, not money.

## Out of scope
- SUITE flow unchanged. No new email store. No hardcoded Vault counts anywhere.

## Acceptance
- `sselfie.ai/p/1` (a real number) shows one prompt, gates copy behind email (stored in the existing freebie path), and shows a live Vault upsell with working checkout link carrying `prompt_n`.
- `/api/manychat/prompt?n=` resolves valid numbers and degrades gracefully for unknown ones, behind a token.
- A test comment with the number, through the evergreen ManyChat trigger, returns the right page link in DM with a tappable opening.
- No per-post automation needed for a new prompt: publish the prompt + number in the app, post the reel with "comment {number}", done.

## Claude/Sandra (not Codex)
- Sandra approves any customer-facing copy on the page + DM (no autonomous sends).
- Claude can set up the evergreen ManyChat trigger via browser when pages are live, and write the page/DM copy for approval.
