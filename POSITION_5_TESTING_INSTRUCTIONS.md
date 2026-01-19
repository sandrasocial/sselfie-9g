# Position 5 Sign/Text Fix — Testing Instructions

**Date:** 2026-01-19  
**Status:** ✅ Ready for Testing

---

## 🧪 TESTING OVERVIEW

Position 5 (Middle-Center) has been changed from a "person holding sign" portrait to a "sign/text close-up" without the person. This affects both:
1. **Preview Mode** (9 scenes in 1 image)
2. **Single Scene Mode** (9 individual images)

---

## ✅ TESTING CHECKLIST

### Test 1: Preview Mode — Athletic Style
**Steps:**
1. Go to Feed Planner
2. Select **Athletic** fashion style
3. Click "Generate Preview Feed"
4. Wait for 3x3 grid to generate

**Expected Result:**
- Position 5 (center) shows a **street sign or wall sign**
- Sign text reads: **"Strong & Well"**
- NO person visible (or person in background only)
- Sign is in focus, background blurred
- Sign style matches athletic aesthetic (modern, clean)

**Actual Prompt Should Contain:**
```
Position 5 (Middle-Center): Close-up of a vintage street sign or 
wall-mounted sign displaying "Strong & Well" in bold typography...
```

---

### Test 2: Preview Mode — Luxury Style
**Steps:**
1. Go to Feed Planner
2. Select **Luxury** fashion style
3. Click "Generate Preview Feed"
4. Wait for 3x3 grid to generate

**Expected Result:**
- Position 5 (center) shows an **elegant sign**
- Sign text reads: **"Live Luxuriously"**
- NO person visible
- Sign has sophisticated, upscale appearance
- Cool desaturated tones

**Actual Prompt Should Contain:**
```
Position 5 (Middle-Center): Close-up of a vintage street sign or 
wall-mounted sign displaying "Live Luxuriously" in bold typography...
```

---

### Test 3: Single Scene Mode — Bohemian Style
**Steps:**
1. Generate a full feed with **Bohemian** style
2. Navigate to the generated feed
3. Click on **Position 5** card
4. Click "Generate" to create single image

**Expected Result:**
- Position 5 generates as a **standalone sign/text image**
- Sign text reads: **"Free Spirit"**
- NO identity anchor in the prompt (no person reference)
- Vintage, bohemian-style sign
- Natural, artistic lighting

**Actual Prompt Should Start With:**
```
An eye-level shot of a wall-mounted sign displaying "Free Spirit" 
in bold, modern typography. The sign is positioned at eye level...
```

**Should NOT contain:**
- "A portrait photograph of the person from the reference images"
- "Preserve facial features"
- "Use the uploaded photos as strict identity reference"

---

### Test 4: Single Scene Mode — Minimal Style
**Steps:**
1. Generate a full feed with **Minimal** style
2. Navigate to the generated feed
3. Click on **Position 5** card
4. Click "Generate" to create single image

**Expected Result:**
- Position 5 generates as a **clean, minimalist sign**
- Sign text reads: **"Simply Elegant"**
- NO person in the image
- Clean, bright aesthetic
- Soft diffused lighting

---

### Test 5: Verify Other Positions Unchanged
**Steps:**
1. Generate any preview feed
2. Check positions 1, 2, 3, 4, 6, 7, 8, 9

**Expected Result:**
- Position 1: Portrait (full-body) ✅
- Position 2: Object flatlay ✅
- Position 3: Portrait (full-body) ✅
- Position 4: Detail close-up (hands holding item) ✅
- **Position 5: Sign/text close-up ✅ NEW!**
- Position 6: Texture shot (fabric close-up) ✅
- Position 7: Portrait (full-body) ✅
- Position 8: Overhead flatlay ✅
- Position 9: Portrait (full-body) ✅

---

## 🔍 WHAT TO LOOK FOR

### ✅ Success Indicators
- Position 5 shows a sign/text as the main subject
- Brand statement is clear and readable on the sign
- No person holding the sign
- Sign style matches the selected aesthetic
- Background is softly blurred (bokeh effect)
- Sign looks like a real street sign or wall sign (not a printed card)

### ❌ Failure Indicators
- Person is holding a small sign (OLD BEHAVIOR)
- Person is the main focus instead of the sign
- Sign looks like a poster or printed card
- No brand statement visible
- Text is illegible or unclear

---

## 📊 CONSOLE LOG VERIFICATION

When generating, check the browser console for these logs:

### Preview Mode:
```
[SCENE DATA] Position 5: { framing: 'close_up', ... }
[SCENE EXECUTION] Position 5: Routing to SIGN/TEXT block
```

### Single Scene Mode:
```
[SINGLE SCENE] Position 5: Routing to SIGN/TEXT builder (no person, no identity anchor)
```

---

## 🐛 IF SOMETHING GOES WRONG

### Issue 1: Still seeing person holding sign
**Cause:** Cache or old scene data  
**Fix:** 
1. Clear browser cache
2. Delete the feed and create a new one
3. Restart dev server

### Issue 2: Identity anchor appearing in position 5
**Cause:** Routing logic not being applied  
**Fix:** 
1. Check console for routing logs
2. Verify `scene.position === 5` is true
3. Check that `buildSignTextBlock` is being called

### Issue 3: Wrong brand statement
**Cause:** Fashion style not matching  
**Fix:** 
1. Check `scene.narrative` in console logs
2. Verify fashion style is being passed correctly
3. Check `buildBrandStatement()` in `scene-resolver.ts`

---

## 📝 BRAND STATEMENT MAPPINGS

**Reference for expected text:**

| Fashion Style | Brand Statement |
|---------------|----------------|
| Athletic / Wellness | "Strong & Well" |
| Luxury / Elevated | "Live Luxuriously" |
| Bohemian | "Free Spirit" |
| Minimal | "Simply Elegant" |
| Beige / Warm | "Warmth & Grace" |
| Default | "Be Yourself" |

---

## 🚀 PERFORMANCE NOTES

- Generation time should be similar to other positions
- Nano Banana Pro should handle sign/text generation well
- No identity anchor means slightly shorter prompts for position 5
- Should NOT trigger "reference image" errors

---

## ✅ SIGN-OFF CRITERIA

**Before marking as COMPLETE, verify:**
- [ ] Preview mode shows sign/text at position 5 (not person)
- [ ] Single scene mode generates standalone sign/text image
- [ ] NO identity anchor in position 5 single scene prompts
- [ ] Brand statement appears correctly on sign
- [ ] All other positions (1-4, 6-9) remain unchanged
- [ ] Console logs show correct routing
- [ ] Multiple aesthetics tested (luxury, athletic, bohemian)

---

**Testing By:** [Sandra]  
**Date:** [2026-01-19]  
**Status:** [Pending / Pass / Fail]
