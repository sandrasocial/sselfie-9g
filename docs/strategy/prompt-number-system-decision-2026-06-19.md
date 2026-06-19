# Prompt Number System Decision

Date: 2026-06-19  
Owner: Claude/Codex planning, Sandra approved implementation path  
Status: app-side implementation shipped; live PROMPT automation updated 2026-06-19 with tracked `/p/latest` button

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

## Recommended funnel

### Public Instagram CTA

Default CTA becomes:

`Comment PROMPT and I'll send you today's prompt.`

Not:

`Comment 104.`

Numbers may still appear in creative as a collectible label, for example `Prompt 104`, but the default comment trigger stays `PROMPT`.

### ManyChat

One evergreen ManyChat automation:

1. Trigger: comments or DMs containing `PROMPT`.
2. First DM: button tap, Meta-safe.
3. Delivery: link to the current single-prompt page.
4. Optional: if the user typed a number and ManyChat can pass it reliably, use the resolver. If not, ignore the number and send the current prompt page.

The flow should not require a new ManyChat keyword row for every new prompt.

### App

Build a current-prompt layer:

- `/p/latest` resolves to the current free prompt.
- `/api/manychat/prompt` with no valid `n` returns the current free prompt instead of a generic Vault fallback.
- Admin/content tooling can set the current free prompt, or the app can default to newest published prompt.
- `/p/{number}` remains live forever for exact links and attribution.

### Free prompt page

The page shows:

- one prompt
- one example/result
- email gate before copy
- one clear Vault upsell

No archive browsing. No "here are ten free prompts." No full pack framing.

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

Implemented app-side:

- `/p/latest` resolves to the current free prompt.
- Current-prompt resolver helper exists.
- `/api/manychat/prompt`:
  - valid `n` returns exact prompt
  - missing `n` returns current prompt
  - invalid `n` returns current prompt plus `found: false`, not a dead end
- Tests cover `/p/latest` and resolver fallback.

Operational default: `CURRENT_FREE_PROMPT_NUMBER` can pin a specific prompt. Without it, the app uses newest published Vault drop, then newest static prompt.

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
- Delivery URL: `/p/latest` or resolver endpoint with fallback to latest
- Optional advanced path: if a number is captured reliably, exact prompt lookup

Sandra should never need to create per-prompt automations.

## Recommendation

Approve this path:

> Prompt numbers stay. Numbered comments stop being the default. PROMPT is the automation keyword. The app decides which single prompt to deliver.

This protects the $27 Vault conversion gap, keeps the numbered work useful, and removes the operational trap inside ManyChat.
