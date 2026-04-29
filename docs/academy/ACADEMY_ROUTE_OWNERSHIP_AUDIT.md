# Academy Route Ownership Audit

Updated: 2026-04-29

## Decision

The in-app Academy tab is the main hub. It should feel like part of Studio, not like a separate landing page.

Product homes explain what a buyer owns. Course pages teach lessons. Lesson pages hold video, action inputs, lesson resources, and lesson-specific Maya support.

## Route Map

| Route                                                           | Type                      | Owns                                                                                      | Should Not Own                                                     |
| --------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `/studio` Academy tab / `components/sselfie/academy-screen.tsx` | Main in-app hub           | Routing to owned products, active courses, and the correct resource home                  | Full product curriculum, duplicate download libraries, lesson work |
| `/academy`                                                      | Authenticated web library | Legacy/external authenticated Academy home                                                | A second competing in-app hub                                      |
| `/academy/access/starter-kit`                                   | Product home              | Starter Kit PDFs, presets, 7-day starter, embedded editing bonus, Starter Kit Maya helper | Full Branded by SSELFIE curriculum                                 |
| `/academy/access/masterclass`                                   | Product home              | Masterclass path, Brand Strategy Pack link, bonus library, module downloads               | Lesson-level actions and reflections                               |
| `/academy/access/selfie-guide`                                  | Product home              | Selfie Guide access handoff                                                               | Masterclass or Starter Kit resources                               |
| `/academy/access/brand-strategy`                                | Product home              | Brand Strategy Pack handoff                                                               | Video lesson curriculum                                            |
| `/academy/courses/[courseId]`                                   | Course index              | Course outline and progress                                                               | Product bonuses or global downloads                                |
| `/academy/courses/[courseId]/lessons/[lessonId]`                | Lesson page               | Video, Ask Maya for that lesson, reflection/action inputs, lesson PDFs                    | Product-level bonus library                                        |
| `/academy/products/[productId]`                                 | Purchase/access fallback  | Locked product information and redirects                                                  | Canonical owned-product experience                                 |

## Canonical Products

| Commercial Product  | Canonical Home                   | Included/Related Content                                                                  |
| ------------------- | -------------------------------- | ----------------------------------------------------------------------------------------- |
| Selfie Starter Kit  | `/academy/access/starter-kit`    | Selfie Guide, presets, Starter Kit PDFs, 7-day starter, Editing Masterclass bonus         |
| Selfie Masterclass  | `/academy/access/masterclass`    | Brand Strategy Pack, Branded by SSELFIE course, Editing Masterclass course, bonus library |
| Selfie Guide        | `/academy/access/selfie-guide`   | Guide access handoff                                                                      |
| Brand Strategy Pack | `/academy/access/brand-strategy` | Strategy output/access                                                                    |

## Canonical Courses

| Course                      | Product ID            | Canonical Course Path | Notes                                                                                       |
| --------------------------- | --------------------- | --------------------- | ------------------------------------------------------------------------------------------- |
| Branded by SSELFIE          | `branded_by_sselfie`  | `/academy/courses/1`  | Core Masterclass course. Database metadata says 29 lessons, but 14 lessons currently exist. |
| SSELFIE Editing Masterclass | `editing_masterclass` | `/academy/courses/3`  | 6 lessons. Appears as Starter Kit bonus and Masterclass included course.                    |

## Known Duplication

1. Editing Masterclass appears in two contexts.
   - Starter Kit: positioned as a bonus/editing path.
   - Masterclass: positioned as a full included course.
   - Decision: keep one underlying course record. Use context labels in the hub so users understand why it appears.

2. Downloads appear both in product homes and lesson resources.
   - Decision: product-level bonuses live in product homes.
   - Lesson-specific worksheets can remain on lesson pages.

3. `/academy` and the in-app Academy tab have different visual systems.
   - Decision: in-app Academy should match Studio shell first.
   - `/academy` can be normalized later or redirected if the in-app hub becomes the only entry point.

## Implementation Plan

1. Make the in-app Academy tab a dark, Studio-consistent router.
2. Label each card by role: Product Home, Course, Bonus Library, Studio Resource.
3. Keep product homes as focused ownership pages.
4. Keep lessons as the only place for lesson Ask Maya, reflections, and lesson actions.
5. Later: normalize `/academy`, `/academy/access/starter-kit`, and `/academy/access/masterclass` into one shared Academy layout system.
