# TASK M-12 — Selfie Guide Interactive Upgrade
Priority: High · Content is live · Component enhancements only
Estimated time: 2-3 hours

## Objective
Add two interactive features to the existing selfie-guide-experience.tsx component, and swap in the upgraded guide content (v3). The component architecture and design system stay exactly as-is.

## Context
The freebie selfie guide lives at `/selfie-guide/access/[token]`. It is a fully working production feature:
- Content is loaded from `content-templates/selfie-guide-content-v3.md` (new file, see Task 1)
- Component: `components/freebie/selfie-guide-experience.tsx`
- Parser: `lib/selfie-guide/experience.ts` (splits markdown on `##` headings into chapters)
- Image markers in markdown are parsed by `extractImageMarker()` and rendered via `VISUAL_LIBRARY`

Do NOT touch the design system, color palette, typography, or overall layout. The existing design is correct.

## Task 1 — Swap guide content to v3

In `app/selfie-guide/access/[token]/page.tsx`, change:

```ts
const GUIDE_CONTENT_PATH = path.join(process.cwd(), "content-templates", "selfie-guide-content-v2.md")
```

to:

```ts
const GUIDE_CONTENT_PATH = path.join(process.cwd(), "content-templates", "selfie-guide-content-v3.md")
```

The v3 markdown file has already been written and is ready at that path. Also reset the cache variable so it picks up the new file on next deploy:
- The `cachedGuideMarkdown` module-level variable is fine as-is, no change needed.

## Task 2 — Interactive checklist rendering

The v3 markdown uses `- [ ]` syntax for checklist items. Currently these render as plain list items. Make them interactive.

In `selfie-guide-experience.tsx`, update the `markdownComponents` object to detect and render checkbox list items:

Add a `li` renderer that detects `[ ]` at the start of the text content and renders a toggleable checkbox UI element. On click, the checkbox should toggle between checked/unchecked state (client-side only, no persistence needed).

Design requirements:
- Checkbox: 18x18px, border: `1px solid rgba(195, 190, 182, 0.32)`, border-radius: 4px
- Checked state: background `#c8c4bb`, checkmark via CSS content or SVG
- Checked label: `text-decoration: line-through`, `color: var(--stone-muted)`
- Cursor: pointer on the whole list item
- Keep the existing `.guide-li` style for non-checkbox items

State: Use a `Set<string>` in a `useState` hook keyed by the text content of each checklist item to track checked state.

## Task 3 — 7-Day Challenge tracker component

The v3 guide has a "7-Day Challenge" chapter. Add a `SevenDayChallenge` component rendered inside this chapter.

Trigger: when `parseSelfieGuideChapters` produces a chapter whose title includes "7-Day" or "Challenge", render the `SevenDayChallenge` component after the chapter markdown content (not replacing it).

The component is a 7-card grid where each card represents one day:

**Card data** (hardcode these):
1. Day 1 - Window Light Selfie: "Take one selfie using natural window light. No ring light. Just you and a window."
2. Day 2 - Rule of Thirds: "Turn on your grid. Frame your eyes on the top third line. Take 5 shots."
3. Day 3 - High Angle Test: "Hold your phone 15 degrees above eye level. Slightly tilt your chin down. Take 3 shots."
4. Day 4 - Editing Pass: "Take your best selfie from days 1-3. Apply only light and warmth adjustments. No filters."
5. Day 5 - Confidence Shot: "Take a selfie while doing something you love. No posing. Just do the thing."
6. Day 6 - Caption Writing: "Write 3 different captions for your day 5 photo. Short, medium, and story format."
7. Day 7 - Post It: "Choose your best selfie from this week. Write a caption. Post it. You're done."

**Card design:**
- Background: `rgba(175, 170, 162, 0.08)`, border: `1px solid rgba(195, 190, 182, 0.2)`, border-radius: 14px
- Day label: 10px, uppercase, `letter-spacing: 0.34em`, `color: var(--stone-muted)`
- Task title: Cormorant Garamond, 20px, uppercase, font-weight 300
- Description: Inter, 14px, `color: rgba(240, 237, 232, 0.78)`, line-height 1.7
- Completed state: border-color becomes `rgba(200, 196, 187, 0.5)`, background becomes `rgba(200, 196, 187, 0.14)`, day label gets a small checkmark prefix
- Tap/click anywhere on card to toggle complete
- Grid: `repeat(auto-fill, minmax(260px, 1fr))`, gap 12px

State: `useState<Set<number>>` tracking completed day indexes. Client-side only, no persistence.

## Acceptance criteria
- [ ] Content loads from v3 markdown correctly, all chapters present
- [ ] Checklist items render with interactive checkboxes and toggle on click
- [ ] Non-checklist list items look exactly as before
- [ ] 7-day challenge component renders in the correct chapter
- [ ] All 7 day cards toggle correctly on click
- [ ] No layout shifts, no console errors
- [ ] Mobile layout still works (cards stack to single column on narrow screens)
- [ ] No changes to any other component, route, or design token

## Out of scope
- Do NOT change the design system, colors, fonts, or layout
- Do NOT add persistence or server-side state for checklist/challenge progress
- Do NOT touch the guide content markdown (v3 is already written)
- Do NOT change the token auth, DB queries, or funnel CTAs
- Do NOT rename or move any files

## Files to touch
- `app/selfie-guide/access/[token]/page.tsx` — change content path to v3
- `components/freebie/selfie-guide-experience.tsx` — add checklist li renderer + SevenDayChallenge component
