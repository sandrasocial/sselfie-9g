# UX-02: Maya Pro Mode — UX Audit

**Date:** Feb 20, 2026  
**Tested as:** Admin user (Sandra)  
**Mode:** PRO (Nano Banana Pro, reference images, no custom LoRA)

---

## What Pro Mode is

Pro mode generates images using reference photos (selfies, products, vibes) instead of a trained LoRA model. The user provides images from their library, Maya generates concept cards with detailed prompts, each card shows "Images Linked • 2" (the reference photos), and the user hits Generate.

---

## ✅ What's Working Well

- **Image selection flow is clean** — clicking the image upload icon opens "Add Images to Library" modal, "Begin Setup" leads to Selfies step with "Choose from Gallery" or "Upload New". Clear and functional.
- **Gallery picker is excellent** — numbered selection badges, live count ("2 images selected"), "USE 2 IMAGES" button activates correctly. Very polished.
- **"Images Linked • 2" on concept cards** — each card shows thumbnail previews of the selected reference images. This is a strong differentiator and communicates exactly why Pro mode is different.
- **Maya acknowledges images** — the chat message shows "Slide 1 / Slide 2" thumbnails and Maya says "I can see your gorgeous reference images" before generating concepts. Feels personal.
- **Concept card prompts are very detailed** — "Executive Power Moment", "Maternal Grace in Motion", "Luxury Leisure Authority" with full outfit descriptions (specific brands, colours, poses, settings). High quality output.
- **View Prompt + Generate buttons** — clear two-action layout per card. "View Prompt" lets user inspect/edit before burning credits. Good trust-building step.
- **CATEGORY + AESTHETIC tags** — unlike Classic mode, Pro cards show category (LUXURY, TRAVEL) and aesthetic tags. Slightly technical but adds context.

---

## 🔴 Critical Issues

### Issue 1: Main content area is completely blank on Pro mode load

**Observed:** When switching to PRO mode (or landing on Pro), the entire main content area between the tab bar and the input is a blank white space. There is no upload prompt, no guidance, nothing. The user has no idea what to do.

**Impact:** First-time Pro users will be completely lost. The only hint is the image icon in the input bar — but there's no signpost pointing to it.

**Fix:** When Pro mode is active and no images have been added yet, show a centred empty state in the content area:
```
[Image upload icon]
Add your reference photos to get started
[Add Photos button] → opens the image library modal
```
Once images are added and a chat starts, this gets replaced by chat messages as normal.

---

### Issue 2: No explanation of what Pro mode is or why to use it

**Observed:** The CLASSIC → PRO toggle switches modes silently. There's no tooltip, no explanation, no visual difference in the empty state. A user who accidentally toggles to PRO has no idea what changed.

**Fix:** On first Pro mode activation (or on hover/tap of the toggle), show a brief tooltip or one-time callout:
> "Pro Mode uses your reference photos instead of your trained model. Perfect for product shots, lifestyle content, and trying new looks."

One sentence. Dismissable. Never shown again after first view.

---

## 🟡 Medium Issues

### Issue 3: Image Library setup flow — other categories never shown

**Observed:** The "Add Images to Library" intro screen mentions organizing images into categories: "selfies for your face, products for brand partnerships, people for lifestyle moments, and vibes for aesthetic inspiration." But the setup only ever shows the Selfies step. Products, Lifestyle, and Vibes categories are not visible as separate steps or sections.

**Result:** The library feels half-built. The summary screen only shows "Selfies • 2" — the other categories exist in the intro copy but never appear.

**Fix:** Either show all 4 categories as steps in the setup flow (with skip options for non-required ones), OR remove the mention of products/lifestyle/vibes from the intro copy until those categories are properly implemented.

---

### Issue 4: Concept card descriptions are overwhelming on mobile

**Observed:** Pro mode concept card descriptions are extremely long — full outfit descriptions with specific brands ("cream cashmere coat from Toteme, soft beige turtleneck from Khaite, dark wash straight-leg jeans from Citizens of Humanity, comfortable leather loafers from Hermès in cognac..."). On mobile this fills 6-8 lines before truncating.

**Impact:** Users don't need to read the full prompt — that's what "View Prompt" is for. The wall of text makes the card feel like a document, not an action item.

**Fix:** Truncate description to 2-3 lines with "..." and a "See more" expand option. The key info (title + vibe) is enough at a glance. Full prompt lives behind "View Prompt".

---

### Issue 5: No way to swap/change reference images per concept card

**Observed:** All concept cards show "Images Linked • 2" — the same 2 images from the library. There's no way to swap images on a per-card basis (e.g. use a different selfie for one concept, or add a product image to one specific card). This means all concepts are generated from the same reference set.

**Fix:** Add a small "Change images" or "Add more" link under the "Images Linked • 2" section on each card that opens the gallery picker scoped to that card. This is a Pro mode power feature that would unlock much more creative flexibility.

---

### Issue 6: "View Prompt" reveals a wall of technical text

**Note:** I didn't tap "View Prompt" during this session — but based on the concept descriptions being 100+ word outfit/scene descriptions, the full prompt will likely be very long and technical.

**Fix needed:** The "View Prompt" modal should present the prompt in a structured, readable way — not a raw blob of text. Consider sections: Scene, Outfit, Mood, Technical. Also needs a one-tap "Copy" and "Edit" option.

**Verify:** Check `components/sselfie/pro-mode/ConceptCardPro.tsx` for the View Prompt modal implementation.

---

### Issue 7: No cost indicator before hitting Generate

**Observed:** The "Generate" button has no label showing credit cost. In Classic mode there's the same issue, but Pro mode uses Nano Banana which may cost differently.

**Fix:** Add credit cost below the Generate button: `10 credits` or whatever the actual cost is. Users should know what they're spending before clicking. Especially important because Pro mode uses reference images — if the output is wrong due to bad reference images, the user just lost credits with no warning.

---

### Issue 8: Same cramping/layout issues as Classic mode

**Observed:** The same vertical cramping exists in Pro mode — quick prompts row always visible, 140px hardcoded bottom padding, concept cards with no space to breathe. All findings from UX-01 Bug 3 apply here too.

**Fix:** Same as UX-01 Bug 3 — addressed there, applies to both modes.

---

## 🔵 Nice To Have

### Polish 1: The image upload icon in the input bar is too subtle

**Observed:** The only entry point to the image library (when the screen is blank) is a small image icon on the left of the input bar. It looks identical to Classic mode. There's nothing communicating "this icon is how you add your reference images."

**Fix:** In Pro mode, style the image icon differently — add a badge, a different colour, or a persistent pill next to it showing "0 images" until images are added. Once images are added change to "2 images ✓".

### Polish 2: "Start Creating" vs "Begin Setup" — inconsistent CTA labels

**Observed:** The library modal uses "Begin Setup" on the intro screen, then "Start Creating" on the summary screen. These mean different things but are presented at similar weight.

**Fix:** Standardise: "Add Photos" → leads into setup. "Start Creating" → closes modal and returns to chat. Keep the language action-oriented and distinct.

---

## Summary of file changes for Codex

| File | Change |
|---|---|
| `components/sselfie/maya-chat-screen.tsx` | Add empty state UI in Pro mode when no images added yet |
| `components/sselfie/maya-chat-screen.tsx` | Add first-time Pro toggle tooltip/callout |
| `components/sselfie/pro-mode/ImageUploadFlow.tsx` | Show all 4 image categories in setup OR fix intro copy to match actual steps |
| `components/sselfie/pro-mode/ConceptCardPro.tsx` | Truncate description to 2-3 lines; add credit cost under Generate; improve View Prompt modal layout |
| `components/sselfie/maya/maya-unified-input.tsx` | Style image icon differently in Pro mode with image count badge |

---

## Testing checklist after fix

- [ ] Switch to PRO → content area shows empty state with "Add Photos" CTA, not blank white
- [ ] First toggle to PRO → tooltip explains what Pro mode is
- [ ] Image library setup shows all 4 categories (or intro copy only mentions what's implemented)
- [ ] Concept card descriptions truncate to 2-3 lines with expand option
- [ ] Generate button shows credit cost
- [ ] "View Prompt" modal is readable and structured, not a raw text blob
- [ ] Image icon in input bar shows count of linked images in Pro mode
