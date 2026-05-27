# AI Photoshoot Audience Segment Rule

Date: 2026-05-27
Owner: Codex
Status: Active operating rule

## Business Rule

Treat the AI Photoshoot Audience as a separate business segment from the legacy selfie education audience.

This segment is for people showing intent around instant AI photoshoot transformations from one selfie. It is not a general SSELFIE list, not a Starter Kit list, and not a Studio/Maya usage list.

## Canonical Names

| Surface | Value |
| --- | --- |
| Business segment | AI Photoshoot Audience |
| Neon canonical tag | `ai-photoshoot-audience` |
| Resend segment env var | `RESEND_SEGMENT_AI_PHOTOSHOOT_AUDIENCE` |
| Resend audience tag | `audience=ai-photoshoot` |
| Resend segment tag | `segment=ai-photoshoot-audience` |
| Resend product tag | `product=ai-photoshoot-prompts` |
| Code source of truth | `lib/audience/ai-photoshoot-segment.ts` |
| Backfill script | `scripts/sync-ai-photoshoot-audience.ts` |

## Include

- `/ai-prompts` opt-ins.
- Prompt Vault buyers.
- Prompt Vault access openers.
- Prompt Vault prompt copiers.
- Prompt Vault checkout abandoners.
- ManyChat users from prompt reels once their email or checkout attribution is captured.

## Exclude

- Selfie Guide only leads who never clicked or opted into AI prompts.
- Starter Kit only buyers unless they also entered the AI prompt path.
- Studio members unless the message is explicitly framed as an included/new member benefit.
- Maya/Feed Planner users whose only signal is legacy app usage.

## Intent Levels

| Intent | Neon tag | Definition | Primary message |
| --- | --- | --- | --- |
| Curious | `ai-photoshoot-curious` | Opted into free AI prompts | Try this week's free transformation. |
| Activated | `ai-photoshoot-activated` | Copied a free prompt | Unlock the full shoot. |
| Buyer | `ai-photoshoot-buyer` | Bought Prompt Vault | Get new drops weekly. |
| Power user | `ai-photoshoot-power-user` | Copied 3+ Vault prompts | You are the best fit for Vault Club. |
| Abandoned | `ai-photoshoot-abandoned` | Started Prompt Vault checkout but did not buy | Your transformation is waiting. |

## Current Automation Coverage

- AI prompt opt-ins are tagged as `curious`.
- Prompt Vault buyers are tagged as `buyer`.
- Prompt Vault checkout recovery candidates are tagged as `abandoned` after recovery send.
- The backfill script can sync existing Neon records and Resend contacts into the canonical rule.

## Messaging Rule

Lead with:

> Turn one selfie into unlimited photoshoots.

Do not lead with:

> Learn prompts.

The buyer is responding to aesthetic transformation, identity play, and Sandra's taste, not prompt education as an abstract skill.
