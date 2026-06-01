# Prompt Vault 7-Day Value Certainty Test

Date: 2026-06-01
Status: Active test plan
Owner: Sandra + Codex

## Decision

For the next 7 days, test whether Prompt Vault can convert when the product is framed as a guided first-result system instead of a prompt archive.

Do not judge the Vault only by follower count. Judge it by the path:

```text
free prompt demand
-> opening shot copied
-> full shoot clicked
-> checkout started
-> purchase
-> buyer opens Vault
-> buyer copies first paid prompt
```

## Hypothesis

The market wants the transformation:

> one selfie -> editorial AI photoshoot -> elevated personal brand image

But the paid offer has had a value-certainty gap. People copied free prompts and started checkout, but too few bought. The 7-day test improves the buyer's certainty by adding:

- a clear first result path
- selfie guidance before the prompt
- troubleshooting for bad ChatGPT outputs
- stronger "full shoot + future drops" upgrade language
- a clearer free-preview bridge after Shot 1

## What Changed

### Paid Vault

Route: `/access/prompt-vault/[token]`

Added:

- "Start Here" first-result section.
- Three guided paths:
  - Dark Feminine Brand Shoot
  - Clean Girl Founder Morning
  - Denim Street Editorial
- For each path:
  - best use case
  - best source selfie
  - what to do if ChatGPT result feels off
  - direct prompt copy
  - link to full shoot
- Shorter "How it works" section.
- Updated title positioning: Selfie to Brand Shoot Vault.

### Free Preview

Route: `/ai-prompts/access/[token]`

Added:

- "Try one opening shot before you decide."
- 3-step free preview test.
- Clearer bridge: Shot 1 is free; the rest of the shoot, newest drops, and future photoshoots are inside the Vault.

## Revenue Target

The practical 7-day target is not $1M pace yet. This test is meant to prove whether the low-ticket front door can convert.

Minimum acceptable result:

- 15+ Prompt Vault purchases in 7 days.
- Checkout-start-to-purchase rate above 7%.
- At least 70% of buyers open the Vault.
- At least 50% of buyers copy one paid prompt.

Strong result:

- 25+ Prompt Vault purchases in 7 days.
- Checkout-start-to-purchase rate above 10%.
- 75%+ buyer access open rate.
- 60%+ first paid prompt copy rate.

Breakout signal:

- 40+ purchases in 7 days without discounting.
- Buyers reply/DM with results or ask what to buy next.
- Top collections become obvious from copy data.

## If It Misses

If the test produces fewer than 15 purchases after 7 days, do not keep pushing the same Vault offer harder.

Run the council again and decide between:

1. Bundle Prompt Vault with a stronger implementation asset:
   - "Selfie to Brand Shoot Kit"
   - Vault + source-selfie guide + troubleshooting + first content plan
   - possible price: $47-$67

2. Move the money to a higher-ticket guided offer:
   - "AI Brand Shoot Sprint"
   - small group or async review
   - possible price: $297-$497

3. Reposition the low-ticket product as a lead qualifier, not the main revenue engine:
   - Vault remains the taste/proof product
   - primary revenue comes from Sprint, 1:1, or a rebuilt Studio layer

4. Pause broad Vault promotion and interview buyers/nonbuyers:
   - why they bought
   - why they did not buy
   - what result they expected
   - what would make it a no-brainer

## What Not To Do During Test

- Do not launch Vault Club.
- Do not discount the Vault.
- Do not build a new product before reading the 7-day data.
- Do not turn Studio/Maya into the public next step for cold prompt traffic.
- Do not post more content without a clearer offer bridge.

## Sandra Does Daily

- Post one transformation proof story.
- Use this angle: "one selfie -> full brand shoot."
- Show at least one before/after or source/result sequence.
- Send VAULT traffic to the improved path.
- Collect buyer/nonbuyer replies.

## Codex Does Daily

- Watch free prompt opens, prompt copies, Vault clicks, checkout starts, purchases, access opens, and paid prompt copies.
- Check whether top clicked/copied collections are changing.
- Check whether checkout recovery converts.
- Add any urgent clarity fixes only if the data shows a specific leak.

## Review Date

2026-06-08

