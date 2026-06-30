# ManyChat automation audit — 2026-06-19

> **2026-06-30 correction:** This audit is historical. The current live/default
> PROMPT strategy is `PROMPT` -> `/ai-prompts`, where the free page shows the
> latest five SSELFIE shoot previews. Do not use the older `/p/latest` or
> numbered prompt recommendations below as current instructions.

## What changed live

- `Prompt Pack Automation` is still live and still uses Sandra's current first-message copy and `Grab it here 🥰` button.
- The first private reply is now tap-first: `Grab it here 🥰` sends the contact to the attached `Send Message #1` step instead of opening a website button directly.
- `Send Message #1` should deliver the tracked free prompt URL inside the 24-hour DM window:
  `https://www.sselfie.ai/ai-prompts?source=prompt_pack_automation&utm_source=instagram&utm_medium=manychat&utm_campaign=latest_five_free_prompts&utm_content=prompt_pack_delivery&cta_keyword=PROMPT&checkout_source=manychat_prompt_delivery&buyer_stage=lead`
- App-side `/ai-prompts` and Prompt Vault checkout links preserve generic `PROMPT` attribution. `/p/{number}` links remain historical/exact links, not the ManyChat default.
- Admin now has a `PROMPT DEMAND BY LINK` report that joins prompt views, email captures, copy events, checkout starts, and purchases by prompt/reel/source attribution.
- Live-editor note: an unattached `Randomizer` step remains in the Prompt Pack Automation because ManyChat did not expose a safe delete path during this session. It is not attached to the PROMPT route; both randomizer branches were assigned existing steps only so the live update could publish.

## Current best-practice baseline

Sources checked:

- ManyChat Instagram Post/Reel Comments trigger docs, updated 2026-06-02:
  https://help.manychat.com/hc/en-us/articles/14281316989724-Instagram-Post-and-Reel-Comments-trigger
- Kit lead-generation landing page best practices:
  https://kit.com/resources/blog/lead-generation-landing-page
- CartFlows tripwire funnel guidance:
  https://cartflows.com/blog/tripwire-funnel/

Rules we should use for SSELFIE:

1. First private reply should create one clean tap, not ask the follower to remember a number.
2. If we need continued DM nurture, use a regular button or quick reply before the link. ManyChat's docs say a website button does not opt the person in or open the 24-hour messaging window.
3. Freebie should be one complete win, not a tiny scrap and not the whole paid product.
4. The landing page should have one goal, one CTA, short email capture, mobile-first design, and immediate delivery.
5. Tracking must travel from ManyChat -> prompt page -> email capture -> checkout attribution.

## Live automation inventory

| Automation | Status | Runs | Current pattern | Notes |
| --- | --- | ---: | --- | --- |
| Prompt Pack Automation | Live | 7,889 | Comment/DM keyword -> private reply -> button tap -> delivery message | Highest-volume flow. Should use tracked `/ai-prompts` delivery inside the DM window. |
| SELFIE | Live | 6,005 | Easy Builder tap-first flow | Good structure: comment reply variations, “Send me the link” button, delivery message, reminder. Needs URL tracking audit next. |
| Selfie Starter Kit Automation | Live | 3,174 | Older file builder | High volume, low visible CTR on comment trigger. Migrate/audit carefully before edits. |
| STUDIO | Live | 386 | Easy Builder tap-first flow | Good structure. Copy sounds older than current voice and should be refreshed later. |
| PRESET comments | Live | 28 | Easy Builder tap-first flow | Good structure. Keywords include `preset`, `presets`, and misspelling `perser`. |
| PRESET DM | Live | 17 | DM keyword -> delivery | Separate from comments; likely OK but should share the same tracked destination as PRESET comments. |
| Prompt Vault | Live | 17 | Older file builder | Small volume. Should become a secondary CTA from PROMPT rather than a standalone cold keyword flow. |
| Visibility suite | Live | 65 | Older file builder | Product/positioning may be stale versus the current Prompt Vault/SUITE funnel. Do not edit until the offer is confirmed. |
| Instagram Default Reply | Live | 1 | External request bridge | Points to `/api/webhooks/manychat-inbound`; keep as support/admin bridge. |
| Private 1:1 May | Stopped | 0 | Off | Safe to leave stopped. |

## Key findings

1. `PROMPT` is the main growth asset. It should stay frictionless: comment `PROMPT`, tap the DM button, land on `/ai-prompts`.
2. The freebie is intentionally capped: the latest five shoot previews, not the full paid Vault archive.
3. The previous free pack over-delivered when it felt like a free mini-Vault. Keep the page capped and make the Vault the obvious next step.
4. Generic `/ai-prompts` is the right default for new content.
5. ManyChat should not become the source of truth for prompt numbers. The app owns prompt identity, tracking, and checkout attribution.

## Recommended next implementation

1. Keep `PROMPT` as the public keyword.
2. Keep the live PROMPT flow tap-first:
   - First private reply: Sandra's welcome copy + button.
   - Delivery message: tracked `/ai-prompts` link.
   - Optional 20-60 second follow-up: soft Vault bridge, only after the current flow has baseline conversion data.
3. Audit URL tracking inside SELFIE, KIT, STUDIO, PRESET, and Visibility before changing copy.

## Do not do

- Do not ask followers to comment a prompt number as the default behavior.
- Do not paste raw prompt text in DMs.
- Do not send followers to `/p/latest` from the PROMPT automation.
- Do not edit the high-volume SELFIE/KIT flows without first documenting their current button URLs and checking the product ladder.
