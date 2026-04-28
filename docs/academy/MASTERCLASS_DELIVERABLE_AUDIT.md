# Branded by SSELFIE Masterclass Audit

Last audited: 2026-04-28

Drive source folder:

- `https://drive.google.com/drive/folders/1d2_Zttp-cyJb8A_6NWcpOiMKs6k4yTJT`

## Product Structure

The commercial product is `masterclass`.

In `lib/academy-entitlements.ts`, `masterclass` unlocks:

- `brand_strategy_pack`
- `branded_by_sselfie`
- `editing_masterclass`

The Academy currently has two relevant published video courses:

| Course | Product ID | Lessons | Status | Notes |
| --- | --- | ---: | --- | --- |
| Branded by SSELFIE | `branded_by_sselfie` | 29 declared, 14 found | Published | Core personal brand course. Videos and lesson companion prompts are connected. Drive resources are not attached to lessons. |
| SSELFIE EDITING MASTERCLASS | `editing_masterclass` | 6 found | Published | Editing/video workflow course. Now embedded in Starter Kit and available as part of Masterclass bundle. |

## Live Branded by SSELFIE Lessons

All 14 discovered lessons have Vimeo URLs, duration data, reflection prompts, action steps, and key takeaways in `academy_lessons.content`.

| # | Lesson | Video | Maya/Profile Sync |
| ---: | --- | --- | --- |
| 1 | Start Here: Welcome to Branded By SSELFIE | Connected | No profile field |
| 2 | Introduction to Personal Branding | Connected | `mission_statement` |
| 3 | Start showing up | Connected | No profile field |
| 4 | Your Energy on Camera | Connected | `brand_voice` |
| 5 | The Camera Hack | Connected | No profile field |
| 6 | Personal Branding 101 | Connected | `mission_statement` |
| 7 | Design Your Brand | Connected | `visual_aesthetic` |
| 8 | Design Your Instagram Feed | Connected | `brand_vibe` |
| 9 | Create Your Brand Pillars | Connected | `content_pillars` |
| 10 | Start Showing Up | Connected | No profile field |
| 11 | The Content System | Connected | `content_themes` |
| 12 | High Quality Selfies | Connected | No profile field |
| 13 | Instagram Reels | Connected | No profile field |
| 14 | Content Planning | Connected | `content_themes` |

## Live Editing Masterclass Lessons

All 6 editing lessons have Vimeo URLs. Lesson resources currently point mostly to the root Drive folder, not specific deliverables.

| # | Lesson | Video | Resource Status |
| ---: | --- | --- | --- |
| 1 | Welcome To SSELFIE editing masterclass | Connected | Root Drive folder linked as preset/checklist resource |
| 2 | Editing Introduction | Connected | Root Drive folder linked as checklist resource |
| 3 | Custom Command Tutorial | Connected | Root Drive folder linked as preset resource |
| 4 | Editing with Hypic App | Connected | No specific resource |
| 5 | Editing inside the iphone app | Connected | No specific resource |
| 6 | Video editing with capcut | Connected | No specific resource |

## Drive Resource Inventory

### Module One Resources

Folder: `Module One Recources`

| Resource | Type | Recommended Placement |
| --- | --- | --- |
| `Your CEO ERA STARTS NOW WORKSHEET.pdf` | PDF | Branded lesson 1 or module intro |
| `CONFIDENCE ACTIVATION JOURNAL.pdf` | PDF | Lessons 3-4 |
| `CEO Energy Affirmation Sheet.pdf` | PDF | Lesson 4 |
| `The Confidence Camera Hack™.pdf` | PDF | Lesson 5 |
| `The Confidence Glow-Up Journal (2).pdf` | PDF | Lessons 3-5 or module bonus |
| `_Selfie to CEO FEAR TO POWER.pdf` | PDF | Lessons 3-4 |
| `AFFIRMATION GUIDE – “SHOW UP LIKE A CEO” (1).pdf` | PDF | Lesson 4 or module bonus |

### Module 2 Resources

Folder: `Module 2 Resources`

| Resource | Type | Recommended Placement |
| --- | --- | --- |
| `Brand Glow-Up Map™.pdf` | PDF | Lesson 7 |
| `Copy of Brand Glow-Up Map™.pdf` | PDF duplicate/copy | Exclude or archive duplicate |
| `Brand Glow Blueprint™.pdf` | PDF | Lesson 7 |
| `Your Bio & Feed Glow-Up Map™.pdf` | PDF | Lesson 8 |
| `CEO Brand Blueprint™.pdf` | PDF | Lessons 6-9 |
| `Confidence Posting Checklist™.pdf` | PDF | Lesson 10 or module transition |

### Module 3 Resources

Folder: `Module 3 Resources`

| Resource | Type | Recommended Placement |
| --- | --- | --- |
| `CEO Content Confidence System™.pdf` | PDF | Lesson 11 |
| `Confidence Posting Checklist™.pdf` | PDF duplicate | Use one version only, likely Module 2 or 3 depending final positioning |
| `Selfie CEO System™ Cheat Sheet.pdf` | PDF | Lessons 11-14 or module summary |
| `CEO Reels Launchpad™.pdf` | PDF | Lesson 13 |

### Pre-Sale Bonuses

Folder: `Pre Sale Bonuses`

| Resource | Type | Recommended Placement |
| --- | --- | --- |
| `The Confidence Glow-Up Journal (1).pdf` | PDF | Bonus or duplicate of Module One journal |
| `The Visibility Checklist.pdf` | PDF | Masterclass bonus or lesson 10 |
| `Selfie To CEO Instagram Planner.pdf` | PDF | Lesson 14 or bonus |
| `Selfieto CEO Goal Setting - 30 Day Caption Pack.pdf` | PDF | Bonus, post-course implementation |
| `CHATGPT PROMPTS (1).pdf` | PDF | Bonus, content support |
| `Preset Collection/` | Folder | Bonus or Editing Masterclass resource |

Preset Collection contains:

- `SSA Step by Step guide presets.pdf (1).pdf`
- `Scandinavian Light & Dreamy collection/` with 5 `.dng` presets
- `Nordic Deep Urban 2/` with 5 `.dng` presets
- `Scandinavian Dark&Moody/` with 5 `.dng` presets and one `.DS_Store` file that should be ignored/removed

## Current Gaps

1. **Branded by SSELFIE has no lesson-level PDF resources attached.**
   - The course videos are connected, but `academy_lessons.resources` and `content.resources` are empty for all 14 Branded by SSELFIE lessons.

2. **Course metadata says 29 lessons, but only 14 Branded by SSELFIE lessons were found.**
   - This may be legacy metadata, a partially migrated course, or missing lessons. It should be corrected before launch.

3. **Resource folder contains duplicates/copies.**
   - `Confidence Posting Checklist™.pdf` appears in Module 2 and Module 3.
   - `The Confidence Glow-Up Journal` appears in Module One and Pre-Sale Bonuses.
   - `Brand Glow-Up Map™` has a copy file.

4. **Editing Masterclass resource links are too broad.**
   - Lessons link back to the root Drive folder instead of specific preset/checklist files.

5. **Resources are in Drive, not Vercel Blob or app-owned URLs.**
   - This works if Drive sharing is correct, but it is less polished and harder to track than Blob-hosted downloads with thumbnails.

6. **No transcript-backed Maya helper for Branded by SSELFIE yet.**
   - Starter Kit now has a transcript-backed Maya helper. Branded by SSELFIE currently has companion prompts and Maya profile sync, but not lesson transcript Q&A.

## Recommended Build Plan

### Slice 1: Clean Inventory

1. Decide which duplicate PDFs are canonical.
2. Exclude/archive obvious duplicates and `.DS_Store`.
3. Confirm whether pre-sale bonuses should appear inside the course, on the Masterclass buyer home, or only in delivery email.

### Slice 2: Attach Resources

1. Upload canonical PDFs to Vercel Blob.
2. Generate cover thumbnails from the first page of each PDF.
3. Attach lesson-specific resource cards to `academy_lessons.content.resources`.
4. Replace broad Editing Masterclass Drive links with specific preset/checklist links.

### Slice 3: Course UX

1. Add a Masterclass buyer home similar to Starter Kit, with:
   - Start Here
   - Branded by SSELFIE course path
   - Editing Masterclass path
   - Bonus resource library
   - Maya companion prompts
2. Keep the Academy course viewer as the lesson experience, but make the buyer home the clear product entry point.

### Slice 4: Maya Companion

1. Add transcript-backed Maya help per module, starting with Module One.
2. Let Maya summarize the action step, explain the lesson, and turn reflections into profile updates.
3. Avoid adding new Maya tabs or chat types; keep this scoped to Academy lesson/buyer surfaces.

## Launch Readiness Verdict

The **videos and core lesson companion structure are mostly ready**.

The **deliverables are not launch-ready inside the app yet** because the PDFs and bonuses are still only in Drive and are not connected to the Branded by SSELFIE lessons.

Best next implementation step:

> Upload and attach the Module One PDFs first, then build the Masterclass buyer home around the two course paths and bonus library.
