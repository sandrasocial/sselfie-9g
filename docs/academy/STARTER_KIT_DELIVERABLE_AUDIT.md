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
| Preset download | Partially connected | Uses `STARTER_KIT_PRESET_DOWNLOAD_URL`, falling back to `SELFIE_GUIDE_PRESET_DOWNLOAD_URL`. No Starter Kit file was found in `public/`. |
| 7-day content starter | Connected in-app | Added as static in-app steps on the Starter Kit buyer home. No database tracking yet. |
| Day 0 delivery email | Connected | `lib/email/templates/starter-kit-day0-delivery.ts`. |
| Starter Kit nurture sequence | Connected | Day 0, 1, 3, 5, 7, 10, and 14 touches exist in `lib/email/starter-kit-email-sequence.ts`. |

## Missing Or Needs Sandra

| Item | Needed From Sandra |
| --- | --- |
| Starter Kit preset file | Final download file or hosted URL for `STARTER_KIT_PRESET_DOWNLOAD_URL`. |
| Printable Starter Kit PDF | Final PDF/workbook file if this should be downloadable. No PDF was found in `public/`. |
| Exact 7-day starter copy | Current in-app version is a clean first draft. Sandra can replace with final prompts. |
| Bonus templates | Confirm whether Canva templates, caption templates, or workbook pages belong in Starter Kit. |

## Recommended Next Build Slice

1. Add the final Starter Kit preset download URL or file.
2. Add a printable PDF card once the file exists.
3. Mirror the light Starter Kit design to `/access/starter-kit/[token]`.
4. Add simple click analytics for preset download, guide open, and 7-day starter engagement.
