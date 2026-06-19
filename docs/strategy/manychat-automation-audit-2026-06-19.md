# ManyChat automation audit — 2026-06-19

## What changed live

- `Prompt Pack Automation` is still live and still uses Sandra's current message/button copy.
- The `Grab it here 🥰` button now points to:
  `https://www.sselfie.ai/p/latest?source=prompt_pack_automation&utm_source=instagram&utm_medium=manychat&utm_campaign=current_free_prompt&utm_content=prompt_pack_automation&cta_keyword=PROMPT&checkout_source=manychat_prompt_button&buyer_stage=lead`
- App-side `/p/latest`, `/p/{number}`, and Prompt Vault checkout links now preserve generic `PROMPT` attribution separately from the resolved prompt number.

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
| Prompt Pack Automation | Live | 7,889 | Comment/DM keyword -> private reply -> website button | Highest-volume flow. Now tracked to `/p/latest`. Still not a true opt-in follow-up because the button is `Open website`. |
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

1. `PROMPT` is the main growth asset. It should stay frictionless: comment `PROMPT`, tap the DM button, land on the current free prompt.
2. The freebie is not too small if the page makes it feel like a complete result: example image, one strong prompt, email delivery, one clear Vault upgrade.
3. The previous free pack over-delivered because it satisfied too much of the Vault desire. The new one-prompt model is directionally right; the risk is only if the page feels like "just text."
4. Generic `/p/latest` is the right default for new content, but old evergreen reels need exact post-specific URLs only when they keep getting meaningful traffic.
5. ManyChat should not become the source of truth for prompt numbers. The app owns prompt identity, tracking, and checkout attribution.

## Recommended next implementation

1. Keep `PROMPT` as the public keyword.
2. For the top 5 old evergreen prompt reels, create post-specific triggers with exact `/p/{number}` links and `entry_post_slug`.
3. Migrate the PROMPT flow to a true opt-in pattern in a cloned/draft automation:
   - First private reply: Sandra's welcome copy + quick reply/button `Send me the prompt`.
   - Delivery message: link button to the tracked prompt page.
   - Optional 20-60 second follow-up: soft Vault bridge.
4. Add a small admin report section for prompt funnel demand:
   - prompt page views by `prompt_number`
   - email captures by `cta_keyword`
   - Vault checkout starts by `prompt_n`, `cta_keyword`, `entry_post_slug`
5. Audit URL tracking inside SELFIE, KIT, STUDIO, PRESET, and Visibility before changing copy.

## Do not do

- Do not ask followers to comment a prompt number as the default behavior.
- Do not paste raw prompt text in DMs.
- Do not send followers straight to the full `/ai-prompts` pack from the PROMPT automation.
- Do not edit the high-volume SELFIE/KIT flows without first documenting their current button URLs and checking the product ladder.
