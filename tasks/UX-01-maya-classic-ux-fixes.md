# UX-01: Maya Classic — Critical UX Fixes

**Priority:** HIGH  
**Source:** Live UX audit (Feb 20, 2026) + code review  
**Tested as:** Admin user (onboarding already complete — findings reflect real user experience post-onboarding)  
**Files involved:** See each fix below

---

## 🔴 CRITICAL BUGS (breaking experience)

---

### Bug 1: "Create Carousel" confirm modal hidden behind input bar

**Observed:** When user clicks "Create Photoshoot in This Style" on a concept card, the `showPhotoshootConfirm` modal appears but is partially hidden behind the fixed bottom input bar. The action buttons ("Let's Go" / "Not Now") may be cut off entirely.

**Code location:** `components/sselfie/concept-card.tsx` — search for `showPhotoshootConfirm`

**Root cause:** Modal uses `z-50 items-center` but the bottom input bar uses `z-[100]`. The modal is centered in viewport but the bottom ~140px is obscured by the input.

**Fix:**
```tsx
// BEFORE:
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">

// AFTER:
<div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-4 pb-44 sm:pb-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
```

Anchors above input on mobile, centered on desktop.

---

### Bug 2: Generated images clear on page refresh

**Observed:** Concept card generates an image → user refreshes page → image disappears from the card even though it was saved to the database.

**Code location:** `components/sselfie/concept-card.tsx` + `app/api/maya/update-message/route.ts`

**Root cause:** The restore logic exists (`generatedImageUrl` initialized from `(concept as any).generatedImageUrl` + useEffect) but it only works if `update-message` correctly writes the URL back into the JSONB `parts` column keyed by concept ID.

**Investigation required:**
1. Check `app/api/maya/update-message/route.ts` — verify Classic mode saves `generatedImageUrl` per concept matching on `concept.id` (not just array index)
2. Verify the DB query that loads messages also returns full JSONB (not truncated)
3. If concept IDs are missing/mismatched on Classic mode concepts, add stable IDs to concepts at generation time

**Testing:** Generate image → F5 → image should still show inside the card.

---

## 🟡 MEDIUM (hurts usability)

---

### Bug 3: Overall layout cramping — too little vertical breathing room

**Observed:** The Maya screen is cramped on mobile. Multiple fixed layers eat the viewport:
- Fixed top header + CLASSIC/PRO toggle
- Tab bar (PHOTOS / VIDEOS / PROMPTS / TRAINING)
- Quick prompts row (always visible)
- Chat messages area
- Fixed bottom input bar (hardcoded 140px padding)
- Bottom navigation bar (Gallery / Feed / Academy / Account)

Result: very little space for actual content. Concept cards feel squished.

**Code location:** `components/sselfie/maya-chat-screen.tsx` (line ~2733), `components/sselfie/concept-card.tsx`, `components/sselfie/maya/maya-concept-cards.tsx`

**Fixes:**

**3a — Dynamic input bar height instead of hardcoded 140px:**
```tsx
// maya-chat-screen.tsx — messages container, around line 2733
// BEFORE:
style={{ paddingBottom: '140px' }}

// AFTER:
style={{ paddingBottom: 'calc(var(--input-bar-height, 140px) + env(safe-area-inset-bottom, 0px))' }}
```
Set `--input-bar-height` via a `ResizeObserver` on the input bar element so it adapts to actual height.

**3b — Hide quick prompts after first message:**
The quick prompts row (Cozy Home, Coffee Run, Brunch Vibes...) takes ~52px permanently. Once the user has sent a message it becomes noise, not help.
Add: if `messages.length > 1` → hide quick prompts row. Can re-surface via a small "✦ Prompts" chip inside the input bar.

**3c — Tighter mobile padding on concept cards:**
```tsx
// concept-card.tsx — header div:
<div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 ...">

// concept-card.tsx — body div:
<div className="px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">
```

---

### Bug 4: Concept card technical labels confuse users

**Observed:** Each concept card header shows "SSELFIE / Environmental Portrait / Half Body Lifestyle" — these are internal shot-type labels that mean nothing to a new user. Looks like technical AI jargon.

**Code location:** `components/sselfie/concept-card.tsx` — the header section renders `concept.category` as the subtitle under "SSELFIE"

**Fix:** Replace `concept.category` (e.g. "Environmental Portrait") with something human:
- Either remove the subtitle entirely (title + description is enough)
- OR translate categories to plain language: "Outdoor scene", "Close-up", "Full body", etc.
- Map exists in concept generation — update there or add a display label map in `concept-card.tsx`

---

### Bug 5: Lightbox actions too minimal — no path to Feed or Video

**Observed:** Clicking a generated image opens a lightbox with only 3 actions: ♡ Heart, ⬇ Download, 🗑 Delete. There's no "Add to Feed Planner" or "Make a Video" button. This is the highest-value moment in the entire flow — the user just got a stunning photo — and there's no next step offered.

**Code location:** `components/image-lightbox.tsx`

**Fix:** Add two action buttons to the lightbox bottom bar:
- **"Add to Feed →"** — navigates/opens Feed Planner with this image pre-selected
- **"Make a Video →"** — triggers the animate flow (same as Videos tab)

These can live as text buttons or icon+label buttons above the existing 3 icons.

---

### Bug 6: Videos tab — play icon misleads users

**Observed:** In the VIDEOS tab, the generated image shows with a ▶ play button overlay. This makes it look like the video already exists and is ready to watch. In reality clicking it would start generating a video. Very confusing.

**Code location:** `components/sselfie/maya/maya-videos-tab.tsx`

**Fix:**
- Replace ▶ play icon with a ✦ sparkle / magic wand icon (signals "create" not "play")
- Add a label: **"Animate →"** below or overlaid on the image
- The instructional text already says "Click any image to animate" — but the visual contradicts it

---

### Bug 7: Credits display shows decimal (1000623.0)

**Observed:** The credits counter in the top header shows `1000623.0` — the `.0` decimal makes it look like a display bug. It also reads as a very confusing number for a user to understand in terms of "how much can I generate?"

**Code location:** `components/sselfie/maya-chat-screen.tsx` — the credits display in the header (and the side menu also shows `creditBalance.toFixed(1)`)

**Fix:**
```tsx
// BEFORE:
{creditBalance.toFixed(1)}

// AFTER:
{Math.round(creditBalance).toLocaleString()}
```
Show as a whole number with thousands separator: `1,000,623`

Longer term: consider showing "~X generations left" instead of raw credit number (more meaningful to users).

---

### Bug 8: Quick prompts scroll indicator missing

**Observed:** The quick prompts row (Cozy Home / Coffee Run / Brunch Vibes / Golden Hour...) cuts off mid-word on the last item ("Gol..."). A new user won't know there are more prompts to the right.

**Code location:** `components/sselfie/maya/maya-quick-prompts.tsx`

**Fix:** Add a right-fade gradient overlay on the container to signal scrollability:
```tsx
// Wrap the scrollable row in a relative container with a fade:
<div className="relative">
  <div className="overflow-x-auto flex gap-2 ...scrollable row...">
    {prompts.map(...)}
  </div>
  <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
</div>
```

---

### Bug 9: "Create Photoshoot in This Style" button — not prominent or clear enough

**Observed:** After an image generates, the photoshoot button appears below the image but blends in. Users may miss it entirely, and the label doesn't communicate the value (6-9 matching photos for a carousel).

**Code location:** `components/sselfie/concept-card.tsx` — search `Create Photoshoot in This Style`

**Fix:**
- Rename label to: **"Create Full Photoshoot →"**
- Add supporting line: `6–9 matching photos • ~3 min`
- Consider adding a camera icon before the text

---

### Bug 10: Three-dot menu (⋯) on concept cards — empty or unclear

**Observed:** Every concept card has a ⋯ button in the top right corner. In Classic mode this opens a menu but for regular users (non-admin) it may be empty or only show irrelevant options. Tapping it and seeing nothing creates doubt.

**Code location:** `components/sselfie/concept-card.tsx` — the `showMenu` dropdown

**Root cause:** The menu only shows "View/Edit Prompt" for Pro mode and "Save to Guide" for admin users. Classic non-admin users get an empty dropdown.

**Fix:** 
- For Classic mode non-admin: either hide the ⋯ button entirely if there are no actions, OR add useful actions like "Regenerate with different style" and "Copy prompt"
- Minimum: don't render the button if the resulting menu would be empty

---

## 🔵 NICE TO HAVE (polish)

---

### Polish 1: History tab — no visual preview

**Observed:** "NEW PROJECT | HISTORY" appears below the chat. Clicking HISTORY doesn't show any obvious visual change — no panel, no preview thumbnails of past sessions.

**Fix:** History tab should show a list of past sessions with the first generated image as a thumbnail + date + first message preview. Makes it feel like a real project management tool.

---

### Polish 2: PROMPTS tab — MANAGE button out of place

**Observed:** The MANAGE button with a gear icon sits next to the prompt pack photos in the Prompts tab. Feels like an admin/settings thing, not a user discovery feature.

**Fix:** Move MANAGE to Account → Settings. Keep the Prompts tab purely for browsing and using prompts.

---

### Polish 3: Concept card style reference thumbnails (future)

**Observed:** Concept cards are text-only — title + description + button. Users have no visual sense of the aesthetic before generating.

**Fix (future):** Show a small style reference image or colour swatch on each card representing the visual vibe. Could pull from existing prompt guide images.

---

## Summary of file changes

| File | Changes |
|---|---|
| `components/sselfie/concept-card.tsx` | Fix carousel modal z-index; tighten mobile padding; hide ⋯ if no actions; rename photoshoot button; translate category labels |
| `components/sselfie/maya-chat-screen.tsx` | Dynamic input bar height; hide quick prompts after first message; fix credits display |
| `components/sselfie/maya/maya-concept-cards.tsx` | Tighter mobile card gaps |
| `components/sselfie/maya/maya-quick-prompts.tsx` | Add right-fade scroll indicator |
| `components/sselfie/maya/maya-videos-tab.tsx` | Replace play icon with sparkle/animate icon |
| `components/image-lightbox.tsx` | Add "Add to Feed" + "Make a Video" action buttons |
| `app/api/maya/update-message/route.ts` | Verify + fix JSONB persistence of generatedImageUrl for Classic mode |

---

## Testing checklist after fix

- [ ] Click "Create Photoshoot in This Style" → confirm modal fully visible above input bar on mobile
- [ ] Generate image → F5 refresh → image still shows inside concept card
- [ ] On mobile (375px) chat area has breathing room — 1 full concept card visible without scrolling
- [ ] Quick prompts row hides after first message sent
- [ ] Quick prompts row has right-fade gradient showing more items exist
- [ ] Credits display shows whole number (no decimal)
- [ ] Lightbox has "Add to Feed" and "Make a Video" buttons
- [ ] Videos tab shows sparkle/animate icon instead of play button
- [ ] Concept card ⋯ button hidden in Classic mode when no actions available
- [ ] "Create Full Photoshoot →" button shows subtitle `6–9 matching photos • ~3 min`
- [ ] Concept card category label is human-readable or removed
