# Simplified Template Variety Approach - Summary

## ✅ Answer to Your Question

**YES! We can add more templates WITHOUT changing the existing 18 templates!**

### Current Approach (Simplified)

**Instead of restructuring:**
- ❌ ~~Nested object structure~~ 
- ❌ ~~Breaking changes~~

**We can simply:**
- ✅ Keep existing 18 templates as-is (they work perfectly)
- ✅ Add new templates with `_v2`, `_v3` suffixes
- ✅ Track usage per user per category+mood
- ✅ Rotate through available variations

---

## How It Works

### Template Structure (No Change Needed!)

```typescript
// Existing templates (keep as-is - they're v1 implicitly)
BLUEPRINT_PHOTOSHOOT_TEMPLATES = {
  luxury_dark_moody: "...",           // v1 (original)
  luxury_light_minimalistic: "...",  // v1 (original)
  // ... all 18 existing templates
}

// Just ADD new variations (additive only)
BLUEPRINT_PHOTOSHOOT_TEMPLATES = {
  // ... existing 18 templates ...
  
  // NEW: Add variations with suffixes
  luxury_dark_moody_v2: "...",        // Different outfits, poses, locations
  luxury_dark_moody_v3: "...",        // Another variation
  luxury_light_minimalistic_v2: "...",
  // ... etc
}
```

### Rotation Logic

**When user creates a new feed:**

1. **Check user's history** for this category+mood combination
   ```sql
   SELECT template_variation
   FROM feed_layouts
   WHERE user_id = ? 
     AND feed_category = 'luxury'
     AND feed_style = 'luxury' -- (maps to dark_moody)
   ORDER BY created_at DESC
   ```

2. **Find available variations:**
   - Base: `luxury_dark_moody` (v1)
   - Check: `luxury_dark_moody_v2`, `luxury_dark_moody_v3`, etc.

3. **Select first unused variation:**
   - If user used `luxury_dark_moody` → Next feed gets `luxury_dark_moody_v2`
   - If user used `luxury_dark_moody_v2` → Next feed gets `luxury_dark_moody_v3`
   - If all used → Cycle back to `luxury_dark_moody` (v1)

4. **Store selected variation key:**
   ```sql
   UPDATE feed_layouts
   SET template_variation = 'luxury_dark_moody_v2'
   WHERE id = ?
   ```

### Example Flow

**User creates multiple feeds with "dark and moody" style:**

```
Feed #1: 
  - Category: luxury (from profile)
  - Mood: luxury → dark_moody
  - Selected: luxury_dark_moody (v1) ✅
  - Stored: template_variation = "luxury_dark_moody"

Feed #2:
  - Category: luxury (from profile)  
  - Mood: luxury → dark_moody
  - History: Used "luxury_dark_moody"
  - Selected: luxury_dark_moody_v2 ✅ (next unused)
  - Stored: template_variation = "luxury_dark_moody_v2"

Feed #3:
  - Category: luxury (from profile)
  - Mood: luxury → dark_moody
  - History: Used "luxury_dark_moody", "luxury_dark_moody_v2"
  - Selected: luxury_dark_moody_v3 ✅ (next unused)
  - Stored: template_variation = "luxury_dark_moody_v3"

Feed #4:
  - Category: luxury (from profile)
  - Mood: luxury → dark_moody
  - History: Used all 3 variations
  - Selected: luxury_dark_moody (v1) ✅ (cycled back)
  - Stored: template_variation = "luxury_dark_moody"
```

---

## Benefits of This Approach

### ✅ No Breaking Changes
- Existing 18 templates work as-is
- No code restructuring needed
- All existing code continues to work

### ✅ Simple to Implement
- Just add new template keys
- Simple rotation logic
- Easy to test

### ✅ Easy to Extend
- Want more variations? Just add `_v4`, `_v5`, etc.
- No structure changes needed
- Can add variations incrementally

### ✅ Backward Compatible
- Existing feeds work (NULL variation → use base template)
- Old code continues to work
- Gradual migration possible

---

## Implementation Changes

### What Changes:
1. **Add new templates** with `_v2`, `_v3` suffixes (additive only)
2. **Add rotation function** to select next unused variation
3. **Store variation key** in `feed_layouts.template_variation`
4. **Use stored key** when generating images

### What Doesn't Change:
- ✅ Existing 18 templates (no changes)
- ✅ Template structure (flat object, no nesting)
- ✅ `getBlueprintPhotoshootPrompt()` function (unchanged)
- ✅ Existing code (continues to work)

---

## Database Schema

```sql
-- Add column to track which variation was used
ALTER TABLE feed_layouts
ADD COLUMN IF NOT EXISTS template_variation VARCHAR(100);

-- Index for rotation queries
CREATE INDEX idx_feed_layouts_template_rotation 
ON feed_layouts(user_id, feed_category, feed_style, template_variation);
```

**Stores:**
- `"luxury_dark_moody"` (v1 - base template)
- `"luxury_dark_moody_v2"` (variation 2)
- `"luxury_dark_moody_v3"` (variation 3)
- etc.

---

## Code Example

### New Function (in `blueprint-photoshoot-templates.ts`):

```typescript
export async function getBlueprintPhotoshootPromptWithRotation(
  category: BlueprintCategory,
  mood: BlueprintMood,
  userId: string
): Promise<{ template: string; variationKey: string }> {
  const moodName = MOOD_MAP[mood]
  const baseKey = `${category}_${moodName}`
  
  // Find all available variations
  const availableVariations: string[] = []
  
  // Base template (v1)
  if (BLUEPRINT_PHOTOSHOOT_TEMPLATES[baseKey]) {
    availableVariations.push(baseKey)
  }
  
  // Check for v2, v3, etc.
  let v = 2
  while (BLUEPRINT_PHOTOSHOOT_TEMPLATES[`${baseKey}_v${v}`]) {
    availableVariations.push(`${baseKey}_v${v}`)
    v++
  }
  
  // Get user's usage history
  const usedVariations = await sql`
    SELECT template_variation
    FROM feed_layouts
    WHERE user_id = ${userId}
      AND feed_category = ${category}
      AND feed_style = ${mood}
      AND template_variation IS NOT NULL
    ORDER BY created_at DESC
  `
  
  const usedKeys = new Set(usedVariations.map(r => r.template_variation))
  const unused = availableVariations.filter(v => !usedKeys.has(v))
  
  // Select first unused, or cycle back
  const selectedKey = unused.length > 0 
    ? unused[0] 
    : availableVariations[0] // Cycle back
  
  return {
    template: BLUEPRINT_PHOTOSHOOT_TEMPLATES[selectedKey],
    variationKey: selectedKey
  }
}
```

### Usage in Feed Creation:

```typescript
// Get template with rotation
const { template: fullTemplate, variationKey } = 
  await getBlueprintPhotoshootPromptWithRotation(category, mood, user.id)

// Store variation key
await sql`
  UPDATE feed_layouts
  SET template_variation = ${variationKey}
  WHERE id = ${feedId}
`
```

---

## Summary

✅ **No template restructuring needed**
✅ **Just add new templates with suffixes**
✅ **Simple rotation logic**
✅ **Fully backward compatible**
✅ **Easy to extend**

This approach is **much simpler** and **safer** than restructuring the template system!
