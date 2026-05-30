# ManyChat Prompt Vault Tracking Rule

Date: 2026-05-30
Owner: Codex
Status: Active operating rule

## Why This Exists

ManyChat is a traffic bridge, but Codex does not currently have a ManyChat toolkit available through Composio. The reliable source of truth is therefore the URL tracking that ManyChat sends into SSELFIE.

Every ManyChat link must carry clean UTM and funnel parameters so the Morning Board, Growth Intelligence, checkout attribution, and recovery emails can identify what happened.

## Required Link Pattern

### Free Prompt Pack Link

Use this when the reel asks people to comment `PROMPT` and the first step is the free preview.

```text
https://www.sselfie.ai/ai-prompts?utm_source=instagram&utm_medium=manychat&utm_campaign=prompt&utm_content={reel_slug}&entry_post_slug={reel_slug}&cta_keyword=PROMPT&buyer_stage=lead
```

### Prompt Vault Sales Page Link

Use this when the DM or story is intentionally sending warm buyers to the Vault sales page before checkout.

Important: `/prompt-vault` is a sales/preview page. It should never be described as the free prompt pack in ManyChat copy.

```text
https://www.sselfie.ai/prompt-vault?source=prompt_vault_landing&utm_source=instagram&utm_medium=manychat&utm_campaign=prompt_vault_launch&utm_content={reel_slug}&entry_post_slug={reel_slug}&cta_keyword=VAULT&buyer_stage=lead
```

### Checkout Direct Link

Use this for warm follow-up messages after someone has already seen/copied the preview, or when the CTA language is explicitly "get the full shoot" / "enter the Vault."

```text
https://www.sselfie.ai/checkout/prompt-vault?source=prompt_vault_landing&utm_source=instagram&utm_medium=manychat&utm_campaign=prompt_vault_launch&utm_content={reel_slug}&entry_post_slug={reel_slug}&cta_keyword=VAULT&buyer_stage=lead
```

### Existing Free Prompt Subscriber Rule

If someone already signed up for the free prompt pack and the ManyChat message says "open your prompts" or "open your preview," send them to their free access link.

If the ManyChat message says "get the full shoot," "enter the Vault," or "get all newest and future photoshoots," send them to the checkout direct link above.

## Reel Slug Naming

Use one stable lowercase slug per reel:

```text
2026-05-29-selfie-to-brand-shoot
```

Do not use changing labels like `latest_reel`, `new_reel`, or `story_today`. They make attribution impossible later.

## What We Track

| Parameter | Purpose |
| --- | --- |
| `utm_source=instagram` | Source platform |
| `utm_medium=manychat` | Bridge/tool |
| `utm_campaign=prompt` | Free prompt keyword flow |
| `utm_campaign=prompt_vault_launch` | Vault sales flow |
| `utm_content={reel_slug}` | Exact reel or story angle |
| `entry_post_slug={reel_slug}` | Checkout attribution source |
| `cta_keyword=PROMPT` or `VAULT` | Keyword intent |
| `buyer_stage=lead` | Funnel stage |

## Operating Rule

If a ManyChat flow is changed, update only the URL parameters first. Do not judge the offer from untagged traffic.

If ManyChat traffic is high but SSELFIE shows low opt-ins, the ManyChat link or landing page is leaking.

If free prompt copies are high but Vault clicks are low, the free preview bridge is leaking.

If checkout starts are high but purchases are low, payment confidence, recovery, or checkout value proof is leaking.
