# Prompt Vault Launch Broadcast

Date: 2026-05-26 (revised copy 2026-05-26)
Status: Draft. Sandra approval required before any send.
Audience: Main Resend Audience `3cd6c5e3-fdf9-4744-b7f3-fda7c8cdf6cd`
Primary link: `https://www.sselfie.ai/prompt-vault`
Template: `lib/email/templates/prompt-vault-launch-broadcast.ts`
Preview: `/admin/email-preview/prompt-vault-launch`

## Design

Editorial email shell (`lib/email/editorial-email.ts`):
- Cream background `#F5EFE6`, white card, Georgia serif headlines
- Big display headline (52px, uppercase)
- Full-bleed hero photo (Sandra)
- 3×3 editorial photo grid from vault collections
- Two-column feature section (bullet list + description)
- Wide landscape image break
- Italic "Sandra x" signature

## Subject Lines

Option A: `the vault is live`

Option B: `you asked for the prompts — the full vault is ready`

## Preview Text

There is a version of you in the photos you have been saving. This is how you get there.

## Body Copy

```
Hi {{firstName}},

There is a version of you living somewhere in the photos you have been saving for months.

Not a fantasy version. Not someone else entirely. Just you — photographed in a way that finally matches how you actually see yourself in your best moments.

The problem is not that those photos are impossible. The problem is that nobody ever showed you how to get them.

I have spent the past year testing AI photoshoot prompts on myself. What I kept finding is this: the gap between a beautiful result and a generic one has nothing to do with the AI. It has everything to do with the direction you give it.

Most people open ChatGPT, type something vague, and get something forgettable. That is not an AI problem. That is a prompt problem.

The vault is the direction.

[CTA: Get the Vault · $27]

---

[PHOTO GRID — 9 images from the 4 collections]

Four collections are in the vault right now:

· Coastal White Dress Sunset Editorial
· Marble Café Wine Editorial
· Soft Blazer + Light Denim Street Editorial
· Cozy Leather + Oversized Knit Mirror Editorial

New collections drop as I test them. You pay once and keep everything that comes after.

---

You open ChatGPT. You upload one selfie. You paste the prompt. That is the whole process.

The AI handles the transformation. The vault handles the direction. You just have to start with one photo and one prompt.

That is enough.

[CTA: Get the Vault]
$27 · Instant access · Grows with every new collection

Sandra x
```

## CTA

Button label: `GET THE VAULT`

URL (with UTM): `https://www.sselfie.ai/prompt-vault?utm_source=resend&utm_medium=broadcast&utm_campaign=prompt_vault_launch`

## Send Timing

Send after a prompt reel is live on Instagram so email and social hit the same day. The demand is warmest in the 24 hours after a reel picks up views.

## Pre-Send Voice Check

- [x] No banned words (leverage, transform, game-changer, skyrocket, unlock your potential).
- [x] No em-dashes — replaced with sentence breaks throughout.
- [x] Reads like Sandra texting, not a brand newsletter.
- [x] Exactly one message arc (identity → AI gap → direction → vault).
- [x] Exactly two CTAs — first mid-email, second at the bottom.
- [x] Does not mention Starter Kit, Masterclass, Studio, Maya, or Feed Planner.
- [x] "Marble Café" spelled correctly with accent.
- [ ] Sandra approval required before any send action.

## Notes

- Do NOT send from Codex or Claude without Sandra's explicit approval.
- Preview the email at `/admin/email-preview/prompt-vault-launch` before sending.
- If Sandra wants it shorter, cut the closing paragraph and keep only: "You open ChatGPT. You upload one selfie. You paste the prompt. That is enough."
- Send to Main Audience, not a segment. This is a full-list launch announce.
