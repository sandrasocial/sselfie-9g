# Blueprint Pro Photoshoot - Prompt Combinations List

**Total Prompts Needed:** 18 (6 categories × 3 moods)

---

## Structure

**Categories (from formData.vibe):**
1. `luxury`
2. `minimal`
3. `beige`
4. `warm`
5. `edgy`
6. `professional`

**Moods/Feed Styles (from selectedFeedStyle):**
1. `luxury` = "Dark & Moody"
2. `minimal` = "Light & Minimalistic"
3. `beige` = "Beige Aesthetic"

---

## All 18 Prompt Combinations

### Category: LUXURY

1. **Luxury + Dark & Moody** (`luxury` + `luxury`)
   - Category: Luxury
   - Mood: Dark & Moody
   - **Prompt Key:** `luxury_dark_moody`

2. **Luxury + Light & Minimalistic** (`luxury` + `minimal`)
   - Category: Luxury
   - Mood: Light & Minimalistic
   - **Prompt Key:** `luxury_light_minimalistic`

3. **Luxury + Beige Aesthetic** (`luxury` + `beige`)
   - Category: Luxury
   - Mood: Beige Aesthetic
   - **Prompt Key:** `luxury_beige_aesthetic`

---

### Category: MINIMAL

4. **Minimal + Dark & Moody** (`minimal` + `luxury`)
   - Category: Minimal
   - Mood: Dark & Moody
   - **Prompt Key:** `minimal_dark_moody`

5. **Minimal + Light & Minimalistic** (`minimal` + `minimal`)
   - Category: Minimal
   - Mood: Light & Minimalistic
   - **Prompt Key:** `minimal_light_minimalistic`

6. **Minimal + Beige Aesthetic** (`minimal` + `beige`)
   - Category: Minimal
   - Mood: Beige Aesthetic
   - **Prompt Key:** `minimal_beige_aesthetic`

---

### Category: BEIGE

7. **Beige + Dark & Moody** (`beige` + `luxury`)
   - Category: Beige
   - Mood: Dark & Moody
   - **Prompt Key:** `beige_dark_moody`

8. **Beige + Light & Minimalistic** (`beige` + `minimal`)
   - Category: Beige
   - Mood: Light & Minimalistic
   - **Prompt Key:** `beige_light_minimalistic`

9. **Beige + Beige Aesthetic** (`beige` + `beige`)
   - Category: Beige
   - Mood: Beige Aesthetic
   - **Prompt Key:** `beige_beige_aesthetic`

---

### Category: WARM

10. **Warm + Dark & Moody** (`warm` + `luxury`)
    - Category: Warm
    - Mood: Dark & Moody
    - **Prompt Key:** `warm_dark_moody`

11. **Warm + Light & Minimalistic** (`warm` + `minimal`)
    - Category: Warm
    - Mood: Light & Minimalistic
    - **Prompt Key:** `warm_light_minimalistic`

12. **Warm + Beige Aesthetic** (`warm` + `beige`)
    - Category: Warm
    - Mood: Beige Aesthetic
    - **Prompt Key:** `warm_beige_aesthetic`

---

### Category: EDGY

13. **Edgy + Dark & Moody** (`edgy` + `luxury`)
    - Category: Edgy
    - Mood: Dark & Moody
    - **Prompt Key:** `edgy_dark_moody`

14. **Edgy + Light & Minimalistic** (`edgy` + `minimal`)
    - Category: Edgy
    - Mood: Light & Minimalistic
    - **Prompt Key:** `edgy_light_minimalistic`

15. **Edgy + Beige Aesthetic** (`edgy` + `beige`)
    - Category: Edgy
    - Mood: Beige Aesthetic
    - **Prompt Key:** `edgy_beige_aesthetic`

---

### Category: PROFESSIONAL

16. **Professional + Dark & Moody** (`professional` + `luxury`)
    - Category: Professional
    - Mood: Dark & Moody
    - **Prompt Key:** `professional_dark_moody`

17. **Professional + Light & Minimalistic** (`professional` + `minimal`)
    - Category: Professional
    - Mood: Light & Minimalistic
    - **Prompt Key:** `professional_light_minimalistic`

18. **Professional + Beige Aesthetic** (`professional` + `beige`)
    - Category: Professional
    - Mood: Beige Aesthetic
    - **Prompt Key:** `professional_beige_aesthetic`

---

## Prompt Key Format

Each prompt key follows the pattern: `{category}_{mood}`

Where:
- `{category}` = lowercase category name (luxury, minimal, beige, warm, edgy, professional)
- `{mood}` = mood name with underscores (dark_moody, light_minimalistic, beige_aesthetic)

---

## Example Usage

**User selects:**
- Category: "Luxury" (formData.vibe = "luxury")
- Mood: "Light & Minimalistic" (selectedFeedStyle = "minimal")

**Result:**
- Prompt Key: `luxury_light_minimalistic`
- Function call: `getBlueprintPhotoshootPrompt("luxury", "minimal")`

---

## Next Steps

1. Update template library structure to support category + mood combinations
2. Update generation endpoint to accept both category and mood
3. Update concept card to pass both values
4. **User provides 18 prompts** (one for each combination above)

---

**Ready for prompt design!**
