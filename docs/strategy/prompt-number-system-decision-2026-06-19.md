# Prompt Number System Decision

Date: 2026-06-19  
Owner: Claude/Codex planning, Sandra approved implementation path  
Status: superseded by the 2026-06-30 operating lock. Prompt numbers stay as product/internal IDs, but ManyChat no longer delivers `/p/latest` or numbered prompt pages by default.

## 2026-06-30 correction

Sandra confirmed that numbered prompt keywords were too complex and should not be treated as the operating model. The current/live ManyChat strategy is:

- Keyword: `PROMPT`
- Delivery page: `/ai-prompts`
- Free page promise: the latest five SSELFIE shoot previews, refreshed by the newest published/freebie collection selection
- Paid next step: Prompt Vault for the complete shoot worlds

Do not use this document to revive numbered ManyChat keywords, `n={{last_text_input}}`, or `/p/latest` as the default PROMPT destination.

## Decision

Keep prompt numbers in the product. Stop making numbered comments the default ManyChat operating model.

Prompt numbers are good as stable IDs:
- prompt page URL: `/p/{number}`
- Vault card label
- checkout attribution: `prompt_n`
- admin/content analytics
- optional exact-prompt lookup

Prompt numbers are bad as the default Instagram comment keyword system because they create recurring ManyChat maintenance and make future agents think every new prompt needs live ManyChat wiring. That is the confusion we need to remove.

## Research summary

Best-practice pattern from current funnel guidance:

1. The freebie should create one quick win and capture contact info. It should not feel like the whole paid product. Kit describes lead magnets as freebies exchanged for contact info on lead-generation landing pages: https://kit.com/resources/blog/lead-generation-landing-page
2. Lead capture pages should stay short, clear, and focused. Mailjet highlights short forms, clear value, social proof, and testing as lead-capture best practices: https://www.mailjet.com/blog/marketing/lead-capture-landing-page/
3. The low-ticket offer is the first buyer conversion, not just "more free stuff." Stan frames tripwire funnels as low-ticket products, usually $7-$37, that reduce the first-purchase trust barrier: https://stan.store/blog/tripwire-funnels/
4. CartFlows describes the tripwire as a low-cost offer shown right after opt-in, commonly $7-$47, to turn free subscribers into buyers: https://cartflows.com/blog/tripwire-funnel/
5. ManyChat supports Instagram comment triggers on a specific post/reel or broader post/reel triggers, but the operational detail of extracting a number from arbitrary comment text is the fragile part: https://help.manychat.com/hc/en-us/articles/14281316989724-Instagram-Post-and-Reel-Comments-trigger
6. ManyChat community guidance confirms the first DM should ask for a user interaction, usually a button, before follow-up links and nurture inside the Meta window: https://community.manychat.com/general-q-a-43/how-to-trigger-a-flow-that-starts-with-a-IG-Message-within-24-hour-window-3892

## What this means for SSELFIE

The current strategic problem is real: the free prompt experience has been generous enough to satisfy the desire that should push people into the $27 Vault.

The fix is not "delete numbers." The fix is:

- Free = one taste
- Vault = the complete shoot library and new drops
- SUITE = Maya does it for you

Numbers help the Vault feel big and organized. They should stay visible in the product. They should not become Sandra's weekly ManyChat burden.

## Current funnel

### Public Instagram CTA

Default CTA is:

`Comment PROMPT and I'll send you the latest free prompts.`

Not:

`Comment 104.`

Numbers may still appear in creative as a collectible label, for example `Prompt 104`, but the default comment trigger stays `PROMPT`.

### ManyChat

One evergreen ManyChat automation:

1. Trigger: comments or DMs containing `PROMPT`.
2. First DM: button tap, Meta-safe.
3. Delivery: link to `/ai-prompts`, or call `/api/manychat/prompt` and use the returned `/ai-prompts` URL.
4. If an old flow passes a number, ignore it and send the latest-five free page.

The flow should not require a new ManyChat keyword row for every new prompt.

### App

Current app behavior:

- `/ai-prompts` shows the latest five free shoot previews.
- `FREEBIE_TOTAL_SHOOT_LIMIT = 5` caps the page.
- `/api/manychat/prompt` returns `mode: "latest_five_free_prompts"` and a URL for `/ai-prompts`.
- `/p/{number}` remains live forever for exact links and attribution.

### Historical free prompt page recommendation

This section described the 2026-06-19 interim direction and is no longer the live default. It is retained as history only.

The old recommendation was:

- one prompt
- one example/result
- email gate before copy
- one clear Vault upsell

The current free page is `/ai-prompts` with the latest five shoot previews, not `/p/latest`.

### Vault

The Vault becomes:

- all numbered prompts
- all collections
- newest drops
- the complete "story" behind the one free prompt

The paid promise is not "more prompts." It is "the whole shoot world in one place."

## What to do with the existing numbered system

Keep:

- `lib/ai-prompts/prompt-data.ts` numbers
- `lib/ai-prompts/prompt-lookup.ts`
- `/p/[number]`
- `/api/manychat/prompt`
- `prompt_n` checkout attribution
- numbered tests
- numbered display inside Vault/admin

Change:

- Docs that say numbered comments are the default.
- ManyChat wiring plan so it says `PROMPT` is the default and numbers are optional exact lookup.
- Resolver behavior so missing/invalid number can return "current prompt" when used by ManyChat.
- Free `/ai-prompts` positioning so it does not read like a whole pack.

Pause:

- Any instruction that asks Sandra to wire every number as a ManyChat keyword.
- Any future agent task that assumes every prompt post needs a new ManyChat keyword.

## Implementation plan

### Phase 1: Decision cleanup

Update docs/specs so future agents do not continue the brittle path:

- Mark `tasks/MANYCHAT-FUNNEL-01-numbered-prompts.md` as built but strategy-adjusted.
- Update `docs/strategy/manychat-funnel-plan-2026-06-18.md`.
- Update `docs/strategy/manychat-bridge-wiring-2026-06-18.md`.
- Add this decision doc to `CLAUDE.md` or `docs/CODEX_CONTEXT.md` if Sandra approves the direction.

### Phase 2: Code cleanup

Historical app-side implementation from 2026-06-19:

- `/p/latest` resolves to the current free prompt.
- Current-prompt resolver helper exists.
- `/api/manychat/prompt`:
  - valid `n` returns exact prompt
  - missing `n` returns current prompt
  - invalid `n` returns current prompt plus `found: false`, not a dead end
- Tests cover `/p/latest` and resolver fallback.

Current 2026-06-30 default: `/api/manychat/prompt` returns `/ai-prompts` with `mode: "latest_five_free_prompts"` even if an old flow passes an `n` value.

### Phase 3: Freebie/offer cleanup

- Ensure `/ai-prompts` and the single prompt flow sell one taste, not the whole archive.
- Keep email gate.
- Move Vault upsell immediately after reveal/copy.
- Add a 3-touch AI-prompts email bridge:
  - Touch 1: your prompt is here, here is what the full set unlocks
  - Touch 2: proof/how-to
  - Touch 3: why the Vault is the next step

### Phase 4: ManyChat operating model

One live flow:

- Keyword: `PROMPT`
- First DM: button
- Delivery URL: `/ai-prompts` or resolver endpoint returning `/ai-prompts`
- No numbered keyword path by default

Sandra should never need to create per-prompt automations.

Live status 2026-06-30: `Prompt Pack Automation` should send `/ai-prompts` with `cta_keyword=PROMPT`, `utm_content=prompt_pack_delivery`, and `checkout_source=manychat_prompt_delivery`.

## Recommendation

Approve this path:

> Prompt numbers stay as product IDs. Numbered comments stop being the default. PROMPT is the automation keyword. The app delivers the latest five free shoot previews.

This protects the $27 Vault conversion gap, keeps the numbered work useful, and removes the operational trap inside ManyChat.
