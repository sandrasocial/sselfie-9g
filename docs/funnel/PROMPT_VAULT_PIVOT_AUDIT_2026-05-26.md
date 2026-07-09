# Prompt Vault Pivot Audit

Date: 2026-05-26
Owner: Codex
Status: Historical pivot evidence. Use `CLAUDE.md` and
`docs/business/SSELFIE_FORWARD_REVENUE_PLAN_2026-07-01.md` for current offer roles.

## Decision

SSELFIE should stop treating Starter Kit as the primary paid upgrade from AI prompt demand.

The current audience signal is AI photoshoot prompts for ChatGPT. The low-ticket offer built from that signal is **AI Photo Prompt Vault**.

## Why

Sandra's Instagram and product data show strong prompt demand:

- Prompt reels are the strongest visible Instagram signal.
- AI Prompts has 1,330 subscribers since May 16.
- AI Prompts access has opened 3,373 times.
- Prompts have been copied 3,728 times.
- Starter Kit has sold weakly after weeks of testing.

The conclusion is not that Prompt Vault has proven sales yet. As of the pre-launch audit, Prompt Vault had 0 live sales. The conclusion is that the audience demand is clearly closer to "give me the prompts" than "teach me the selfie starter system."

## Active Funnel

```text
Instagram prompt reels
-> /ai-prompts
-> /ai-prompts/access/[token]
-> /prompt-vault
-> /checkout/prompt-vault
-> /access/prompt-vault/[token]
-> Masterclass / Studio / 1:1
```

## Product Roles

| Product | Current Role |
| --- | --- |
| AI Prompts | Free lead magnet for prompt reel demand |
| Prompt Vault | Primary low-ticket paid upgrade |
| Starter Kit | Secondary support offer for better source selfies, presets, and editing |
| Masterclass | Deeper method offer after buyers prove intent |
| Studio | Ongoing execution layer for committed buyers |

## Implementation State

Live routes and files:

- `/ai-prompts`
- `/ai-prompts/access/[token]`
- `/prompt-vault`
- `/checkout/prompt-vault`
- `/access/prompt-vault/[token]`
- `/academy/access/prompt-vault`
- `/api/prompt-vault/access-token`
- `lib/email/templates/prompt-vault-delivery.ts`
- `docs/PROMPT_VAULT_ADD_COLLECTION_SOP.md`

Product plumbing:

- Product id: `prompt_vault`
- Paid buyer tag/source: `prompt-vault-paid`
- Checkout env var: `STRIPE_PRICE_PROMPT_VAULT`
- Webhook fulfillment creates token access and sends Prompt Vault delivery email.

## Audit Findings

1. The high-level docs were still pointing future agents toward the April Starter Kit-first ladder.
2. The AI Prompts Day 7 nurture template still promoted Starter Kit as the primary next step.
3. Prompt Vault analytics events existed in code but were missing from the allowed analytics contract.
4. The free AI Prompts access page already correctly treats Prompt Vault as the primary upgrade and Starter Kit as secondary.

## Updated On 2026-05-26

- `CLAUDE.md`
- `docs/CODEX_CONTEXT.md`
- `.agents/product-marketing-context.md`
- `docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md`
- `docs/archive/2026-07-09-documentation-cleanup/SELFIE-EDUCATION-REPOSITION-PLAN-2026-04-23.md`
- `docs/funnel/SSELFIE-2026-CTA-METRICS-CLEANUP.md`
- `docs/archive/2026-07-09-documentation-cleanup/email/LIGHT_EDITORIAL_EMAIL_AUDIT_2026-05-21.md`
- `lib/email/templates/ai-prompts-day7-prompt-vault-offer.ts`
- `lib/analytics/event-contract.ts`

## Non-Drift Rules

1. Do not make Starter Kit the primary CTA from `/ai-prompts`.
2. Do not describe Prompt Vault as random prompts. It is a full editorial AI photoshoot vault.
3. Do not send prompt-reel traffic directly to Studio as the first ask.
4. Do measure Prompt Vault with checkout success, access opened, prompt copied, and downstream buyer movement.
5. Do keep Starter Kit available only as a secondary "better original selfie before AI" support offer.
