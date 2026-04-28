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
| Preset bundle | Included | DNG mobile presets are now hosted in Vercel Blob at `academy/starter-kit/presets/starter-kit-dng-presets.zip`. Existing `STARTER_KIT_PRESET_DOWNLOAD_URL` / `SELFIE_GUIDE_PRESET_DOWNLOAD_URL` is still used as an optional desktop XMP link. |
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

The Starter Kit buyer home loads the existing `editing_masterclass` Academy course videos from `academy_lessons` and shows them as an embedded lesson playlist. It also includes an "Ask Maya while you edit" panel that posts to `/api/academy/starter-kit/editing-masterclass-chat`. The route requires `starter_kit` access and answers from the transcript only, so the lesson support stays focused on Sandra's actual method.

## Preset Format Guidance

The Starter Kit access pages now tell users which preset format to use:

- Phone / Lightroom Mobile: use DNG preset files.
- Desktop Lightroom: use XMP preset files.

XMP presets work well in Lightroom desktop, but DNG preset files are the smoother path for most mobile users because Lightroom Mobile can import a DNG photo and save its edit settings as a preset.

## Preset Collection Inventory

Sandra shared the preset collection folder on 2026-04-28:

- `https://drive.google.com/drive/folders/1AtPix_8QioYfH3xLvZRvsu_U7T73UOSL`

Connected files:

| Collection | Files | Blob handling |
| --- | ---: | --- |
| Scandinavian Light & Dreamy | 5 DNG files | Included in `starter-kit-dng-presets.zip` |
| Nordic Deep Urban | 5 DNG files | Included in `starter-kit-dng-presets.zip` |
| Scandinavian Dark & Moody | 5 DNG files | Included in `starter-kit-dng-presets.zip` |
| `SSA Step by Step guide presets.pdf (1).pdf` | 1 PDF | Uploaded to `academy/starter-kit/presets/ssa-step-by-step-guide-presets.pdf` |

Ignored files:

- `.DS_Store`

The authenticated Starter Kit buyer home and token fallback page now link directly to:

- DNG mobile preset ZIP: `https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/academy/starter-kit/presets/starter-kit-dng-presets.zip`
- Setup guide PDF: `https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/academy/starter-kit/presets/ssa-step-by-step-guide-presets.pdf`

## Future In-App Preset Tool

An in-app photo editor that applies Sandra-style presets is technically possible, but it should be treated as a SSELFIE approximation of the Lightroom look, not a perfect Lightroom engine.

Recommended build path:

1. Parse the XMP preset values we can safely support, such as exposure, contrast, highlights, shadows, whites, blacks, temperature, tint, saturation, vibrance, sharpening, vignette, tone curve, and HSL where practical.
2. Apply those values server-side with an image-processing library such as Sharp or a similar pipeline.
3. Show before/after preview in the app.
4. Let the user adjust preset strength before download.
5. Keep Lightroom/DNG files available because some Lightroom settings may not translate perfectly.

Blocked until Sandra provides or approves:

- The exact XMP preset pack that should become the app's first in-app preset styles.
- Before/after reference images for visual QA.

## Missing Or Needs Sandra

| Item | Needed From Sandra |
| --- | --- |
| Exact 7-day starter copy | Current in-app version is a clean first draft. Sandra can replace with final prompts. |
| Custom Command Tutorial placement | Confirm whether the MOV belongs on the Starter Kit buyer home as a bonus/tutorial. |
| Desktop XMP preset files | Optional if Sandra wants desktop-specific preset downloads separate from the DNG mobile ZIP. |
| In-app preset editor references | Need approved XMP presets and before/after references before building the app-side editor. |

## Recommended Next Build Slice

1. Confirm production has `STARTER_KIT_PRESET_DOWNLOAD_URL` set to the existing preset bundle.
2. Add the same PDF download library to `/access/starter-kit/[token]` if token buyers should use the non-Academy page.
3. Mirror the light Starter Kit design to `/access/starter-kit/[token]`.
4. Add simple click analytics for preset download, guide open, and 7-day starter engagement.
