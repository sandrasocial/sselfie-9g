# Starter Kit Deliverable Audit

Last audited: 2026-04-28

## Current Implementation

The authenticated Starter Kit buyer home lives at:

- `/academy/access/starter-kit`

The token fallback page lives at:

- `/access/starter-kit/[token]`

Starter Kit is a direct private product, not an Academy course. It does not currently have lessons in `academy_courses`.

## Connected Deliverables

| Deliverable | Status | Notes |
| --- | --- | --- |
| Selfie Guide access | Connected | Buyer home links to `/academy/access/selfie-guide`. |
| Preset bundle | Included | The buyer home supports the preset bundle through `STARTER_KIT_PRESET_DOWNLOAD_URL`, falling back to `SELFIE_GUIDE_PRESET_DOWNLOAD_URL`. The bundle is treated as a hosted/download URL, not a local `public/` file. |
| 7-day content starter | Connected in-app | Added as static in-app steps on the Starter Kit buyer home. No database tracking yet. |
| Day 0 delivery email | Connected | `lib/email/templates/starter-kit-day0-delivery.ts`. |
| Starter Kit nurture sequence | Connected | Day 0, 1, 3, 5, 7, 10, and 14 touches exist in `lib/email/starter-kit-email-sequence.ts`. |

## Drive Deliverables Reviewed

Sandra shared the Starter Kit deliverables folder on 2026-04-28. The Canva crash course is excluded because it does not belong to the SSELFIE brand/product promise.

| Drive item | Product fit | Current handling |
| --- | --- | --- |
| `Posing Guide (1).pdf` | Starter Kit core deliverable | Branded SSELFIE version uploaded to Vercel Blob at `academy/starter-kit/sselfie-posing-guide.pdf`. |
| `INSTAGRAM CAPTIONS & CONTENT IDEAS (2).pdf` | Starter Kit supporting deliverable | Branded SSELFIE version uploaded to Vercel Blob at `academy/starter-kit/sselfie-instagram-captions-content-ideas.pdf`. |
| `Selfie to CEO Storytelling Captions .pdf` | Starter Kit supporting deliverable | Branded SSELFIE version uploaded to Vercel Blob at `academy/starter-kit/sselfie-selfie-to-ceo-storytelling-captions.pdf`. |
| `Preset Collection/` | Starter Kit core deliverable | Already included through the preset bundle URL. |
| `Custom Command Tutorial.MOV` | Possible bonus/tutorial | Not redesigned in this PDF pass. Needs separate product placement decision. |
| `Canva Crash Course (1).pdf` | Excluded | Not included because it is not SSELFIE-brand aligned. |

## Editing Masterclass Companion

The editing masterclass transcript is stored in `lib/academy/starter-kit-editing-masterclass.ts`.

The Starter Kit buyer home includes an "Ask Maya while you edit" panel that posts to `/api/academy/starter-kit/editing-masterclass-chat`. The route requires `starter_kit` access and answers from the transcript only, so the lesson support stays focused on Sandra's actual method.

## Missing Or Needs Sandra

| Item | Needed From Sandra |
| --- | --- |
| Exact 7-day starter copy | Current in-app version is a clean first draft. Sandra can replace with final prompts. |
| Editing masterclass video URL | The transcript-backed Maya helper is connected. The actual video embed/download URL still needs to be added when ready. |
| Custom Command Tutorial placement | Confirm whether the MOV belongs on the Starter Kit buyer home as a bonus/tutorial. |

## Recommended Next Build Slice

1. Confirm production has `STARTER_KIT_PRESET_DOWNLOAD_URL` set to the existing preset bundle.
2. Add the same PDF download library to `/access/starter-kit/[token]` if token buyers should use the non-Academy page.
3. Mirror the light Starter Kit design to `/access/starter-kit/[token]`.
4. Add simple click analytics for preset download, guide open, and 7-day starter engagement.
