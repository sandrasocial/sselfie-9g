# Studio Member Health

Verified: 2026-06-13

Spec source: `tasks/UX-03-maya-classic-training-retention.md`

## Query Scope

Source tables:

- `subscriptions`: active live SSELFIE SUITE memberships only
- `user_models`: LoRA training status
- `generated_images`: Classic mode generations
- `ai_images`: OpenAI Quick Photo, App v3 Maya, carousel/feed, and Pro generations

Filters:

- `subscriptions.product_type = 'sselfie_studio_membership'`
- `subscriptions.status IN ('active', 'trialing')`
- `COALESCE(subscriptions.is_test_mode, false) = false`
- `user_models.is_test` excluded for training counts
- `ai_images.generation_status = 'completed'` for generated-image counts

## Results

| Metric | Count | Share |
|---|---:|---:|
| Active live Studio members | 8 | 100% |
| Started LoRA training | 4 | 50% |
| Completed LoRA training | 4 | 50% |
| Generated with Classic mode | 4 | 50% |
| Generated with OpenAI/App v3/Quick paths | 4 | 50% |
| Generated with Pro mode | 1 | 13% |
| Ever generated any completed image | 4 | 50% |
| Never generated any completed image | 4 | 50% |
| Never generated, excluding smoke-test account | 3 | 38% |

## Never-Generated Segment

These rows have an active live membership row, no completed LoRA training, no Classic generation, and no completed `ai_images` generation.

| Email | Member since | Note |
|---|---|---|
| `codex-member-1772440594452-8548@sselfie-smoke.test` | 2026-03-02 | Smoke-test account. Exclude from customer outreach. |
| `ciaobellalife@gmail.com` | 2025-11-17 | Real customer. Re-engagement candidate. |
| `rosannaewm@gmail.com` | 2025-11-14 | Real customer. Re-engagement candidate. |
| `kiyadawn@yahoo.com` | 2025-11-11 | Real customer. Re-engagement candidate. |

## Active/Generated Segment

| Email | Training | Classic generations | App/Quick generations | Pro generations | Last generated |
|---|---|---:|---:|---:|---|
| `april@journu.com` | Completed | 113 | 326 | 0 | 2026-05-17 |
| `tracy.deniger@outlook.com` | Completed | 127 | 178 | 0 | 2026-06-02 |
| `eveliene@gmail.com` | Completed | 320 | 842 | 0 | 2026-06-05 |
| `myriam@mdrluxuryhomes.com` | Completed | 501 | 501 | 111 | 2026-06-10 |

## Read

The retention split is very clear: the members who trained also generated heavily. The members who did not train have not generated at all. The strongest immediate move is not to deprecate Classic training. It is to rescue the three real quiet members with a personal re-entry path: "upload one selfie, pick one look, I will help you get your first usable image."

## Implementation

This report is now exposed on `/admin` inside the Paying Members card as "Studio member health". The data layer lives in `lib/admin/studio-member-health.ts` and is included in `lib/admin/home-report.ts`.
