# UX-02: Maya Pro Mode — UX Fixes

**Priority:** HIGH  
**Source:** Live UX audit (Feb 20, 2026) — Pro mode, Nano Banana Pro, reference images  
**Tested as:** Admin user (Sandra)  
**Follows:** UX-01 (deployed ✅)  
**Files involved:** See each fix below

---

## 🔴 CRITICAL (2 fixes)

---

### Fix 1: Blank screen in Pro mode — add empty state

**Observed:** When PRO toggle is active and no chat has started, the entire main content area between the tab bar and the input bar is completely blank white. There is zero guidance for the user. The only entry point to add reference images is the small image icon in the input bar — but nothing points to it.

**Impact:** First-time Pro users will be completely lost and may think the app is broken.

**What to show instead:**
When Pro mode is active AND no messages exist in the current session, render a centred empty state in the content area:

```
[image icon — same as used elsewhere in the app, ~48px]
"Add your reference photos to get started"  ← Inter 300 16px, color: #666666
[Add Photos  ←  black pill button, same style as other primary CTAs]
```

Clicking "Add Photos" opens the existing image library modal (same as clicking the image icon in the input bar).

Once the user adds images and sends their first message, this empty state disappears and the normal chat + concept card flow takes over.

**Code location:**
- `components/sselfie/maya-chat-screen.tsx` — find where Classic mode renders its empty/welcome state. Add a parallel block for Pro mode.
- Look for the `isProMode` / `mode === 'pro'` condition that controls which UI renders.
- The "Add Photos" button should call the same handler as the image icon in the input bar (`handleOpenImageLibrary` or equivalent).

---

### Fix 2: No explanation when switching to Pro mode — add first-use tooltip

**Observed:** Toggling CLASSIC → PRO is silent. No explanation of what changed, what Pro mode is, or what the user should do next.

**Fix:** On first-ever toggle to Pro (use localStorage key `sselfie_pro_tooltip_seen`), show a one-time dismissable callout banner just below the header/tab bar:

```
"Pro Mode uses your reference photos instead of your trained model.
 Perfect for product shots, lifestyle content, and trying new looks."
[Got it  ×]
```

Style: Pearl background (#f5f5f5), 1px Whisper border (#e5e5e5), Inter 300 14px, full width, collapses on dismiss and never shown again.

**Code location:**
- `components/sselfie/maya-chat-screen.tsx` or `components/sselfie/maya-header.tsx`
- Gate behind `localStorage.getItem('sselfie_pro_tooltip_seen')` — set to `'true'` on dismiss.

---

## 🟡 MEDIUM (4 fixes)

---

### Fix 3: Image library intro mentions 4 categories but setup only shows Selfies

**Observed:** The "Add Images to Library" intro screen says: *"We'll help you organize your images into categories: selfies for your face and features, products for brand partnerships, people for lifestyle moments, and vibes for aesthetic inspiration."*

But the setup flow only ever shows the Selfies step. Products, Lifestyle, and Vibes never appear as steps or sections.

**Fix (choose one):**

Option A — Implement the other 3 categories as optional steps in the setup flow (recommended):
- After the Selfies REQUIRED step, show Products, Lifestyle, Vibes as OPTIONAL steps with skip buttons
- Each step has the same "Choose from Gallery" / "Upload New" pattern
- The library summary screen shows all 4 sections (empty ones show "Add images →" link)

Option B — Quick fix: Remove mention of the other 3 categories from the intro copy until they're implemented. Update the intro body text to just say: *"Add your selfies to power Pro mode generation. You can always add more photos later."*

**Code location:**
- `components/sselfie/pro-mode/ImageLibraryModal.tsx` (or similar — find the modal rendered when clicking the image icon)
- Search for the intro body text string "selfies for your face and features" to find the file

---

### Fix 4: Concept card descriptions too long — truncate on mobile

**Observed:** Pro mode concept card descriptions are 80-120 word detailed outfit/scene descriptions with specific brand names. On mobile this fills 6-8 lines. The card becomes a wall of text before the user even sees the "Generate" button.

**Fix:** Truncate to 3 lines with a "See more" expander:

```tsx
// Add state: const [expanded, setExpanded] = useState(false)

<p className={`text-sm text-[#666666] leading-relaxed ${!expanded ? 'line-clamp-3' : ''}`}>
  {description}
</p>
{description.length > 150 && (
  <button
    onClick={() => setExpanded(!expanded)}
    className="text-xs text-[#0a0a0a] underline mt-1"
  >
    {expanded ? 'See less' : 'See more'}
  </button>
)}
```

**Code location:**
- `components/sselfie/concept-card.tsx` or `components/sselfie/pro-mode/ConceptCardPro.tsx`
- Find where the concept description text is rendered

---

### Fix 5: No credit cost shown before Generate in Pro mode

**Observed:** The "Generate" button has no label showing how many credits will be spent. In Pro mode especially, if the result is wrong (bad reference image, wrong pose), the user has lost credits with no prior warning.

**Fix:** Add a credit cost label just below (or inside) the Generate button:

```tsx
<button className="w-full bg-[#0a0a0a] text-white ...">
  Generate
</button>
<p className="text-center text-xs text-[#666666] mt-1">Uses 10 credits</p>
```

Replace `10` with the actual credit cost from your constants/config. If Pro and Classic cost different amounts, show them differently.

**Code location:**
- `components/sselfie/concept-card.tsx` — find the Generate button render
- Check `lib/credits.ts` or similar for the credit cost constant

---

### Fix 6: Image icon in input bar needs count badge in Pro mode

**Observed:** The image icon in the input bar looks identical in Classic and Pro mode. In Pro mode, it's the primary entry point to the image library — but there's no indication of how many images are currently linked, or whether images have been added at all.

**Fix:** In Pro mode, add a small badge/count to the image icon:
- 0 images: show orange dot (like a notification) to indicate "action needed"
- 1+ images: show count badge e.g. `2` in a small black circle

```tsx
// In the input bar image icon render, when isProMode:
<div className="relative">
  <ImageIcon ... />
  {isProMode && imageCount === 0 && (
    <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" />
  )}
  {isProMode && imageCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-[#0a0a0a] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
      {imageCount}
    </span>
  )}
</div>
```

**Code location:**
- `components/sselfie/maya/maya-unified-input.tsx` or wherever the input bar image icon is rendered
- `imageCount` = the number of images currently in the Pro library for this session

---

## 🔵 POLISH (1 fix)

---

### Polish 1: Standardise CTA labels in image library modal

**Observed:** The image library modal uses "Begin Setup" on the intro screen and "Start Creating" on the summary/completion screen. These are presented at similar visual weight but mean different things.

**Fix:** Rename for clarity:
- Intro CTA: `"Add Photos"` (action-oriented, matches the empty state CTA from Fix 1)
- Summary CTA: `"Start Creating"` (keep as-is — it's good)

**Code location:**
- Same modal file as Fix 3 — find the "Begin Setup" string and replace with "Add Photos"

---

## ✅ Validation checklist

After implementing, verify:

- [ ] Switch to PRO with empty session → content area shows "Add your reference photos" empty state, NOT blank white
- [ ] Click "Add Photos" in empty state → image library modal opens
- [ ] First-ever toggle to PRO → tooltip banner appears below header
- [ ] Dismiss tooltip → never shown again (localStorage key set)
- [ ] Image library setup: either shows all 4 category steps, OR intro copy updated to only mention selfies
- [ ] Concept card descriptions truncate to 3 lines with "See more" expander
- [ ] Generate button shows credit cost below it
- [ ] Image icon in Pro mode shows orange dot (0 images) or count badge (1+ images)
- [ ] Intro "Begin Setup" button renamed to "Add Photos"
- [ ] pnpm exec eslint on touched files: no new errors
- [ ] pnpm dev smoke: /studio returns expected response

---

## State Summary (for CODEX_CONTEXT.md)

After completing this task, update STATUS.md with:
- UX-02 status: DONE
- Production deploy URL
- Files changed
- Any deferred items
