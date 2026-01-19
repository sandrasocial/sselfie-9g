# Style Coherence Resolver

**Created:** 2026-01-18  
**Module:** `lib/feed-planner/style-coherence-resolver.ts`  
**Status:** ✅ IMPLEMENTED

---

## Purpose

The Style Coherence Resolver ensures that fashion styles, visual aesthetics (category), and mood selections produce **intentionally coherent** visual outputs by adapting or validating combinations before prompt construction.

**Problem Solved:** User can select incompatible style combinations (e.g., "athletic" outfit + "luxury dark editorial" aesthetic) that produce incoherent images. The resolver adapts or blocks these combinations automatically.

---

## Architecture

### Hierarchy (Priority Order)

The resolver enforces a strict priority hierarchy:

1. **Category** (visual_aesthetic) - AUTHORITATIVE
2. **Mood** (feed_style)
3. **Fashion Style** (ADAPTED to fit category+mood)
4. **Template Vibe** (ONLY if compatible - handled downstream)

### Data Flow

```
USER SELECTIONS
├─ category: "luxury"
├─ mood: "luxury" (dark_moody)
└─ fashionStyle: "athletic"
         ↓
    getCategoryAndMood()
    + getFashionStyleForPosition()
         ↓
  [NEW] COHERENCE RESOLVER
├─ Check compatibility: "athletic" + "luxury" = INCOMPATIBLE
├─ Apply action: "adapt"
├─ Transform: "athletic" → "elevated_athleisure"
└─ Return: resolvedFashionStyle = "elevated_athleisure"
         ↓
   PROMPT CONSTRUCTION
   (uses resolved values only)
         ↓
  ✅ COHERENT OUTPUT
```

---

## API

### Main Function

```typescript
resolveCoherentStyle(input: CoherenceResolverInput): CoherenceResolverOutput
```

### Input

```typescript
interface CoherenceResolverInput {
  category: string | null          // e.g., "luxury", "minimal", "beige"
  mood: string | null               // e.g., "luxury", "minimal", "beige"
  fashionStyle: string | null       // e.g., "athletic", "bohemian", "casual"
  templateKey?: string              // Optional template identifier
  userId?: string                   // For logging
  feedId?: string | number          // For logging
}
```

### Output

```typescript
interface CoherenceResolverOutput {
  resolvedCategory: string          // Normalized category
  resolvedMood: string               // Normalized mood
  resolvedFashionStyle: string       // Adapted/validated fashion style
  adaptationApplied: boolean         // Whether adaptation occurred
  adaptationReason?: string          // Explanation of adaptation
}
```

---

## Compatibility Matrix

### Fashion Style × Category

| Fashion | Luxury | Minimal | Beige | Warm | Edgy | Professional |
|---------|--------|---------|-------|------|------|--------------|
| **Athletic** | ⚠️ Adapt | ✅ Allow | ⚠️ Adapt | ⚠️ Adapt | ⚠️ Adapt | 🚫 Block |
| **Bohemian** | 🚫 Block | ⚠️ Adapt | ✅ Allow | ✅ Allow | ⚠️ Adapt | 🚫 Block |
| **Casual** | ⚠️ Adapt | ✅ Allow | ✅ Allow | ✅ Allow | ✅ Allow | ⚠️ Adapt |
| **Business** | ✅ Allow | ⚠️ Adapt | ⚠️ Adapt | ⚠️ Adapt | 🚫 Block | ✅ Allow |
| **Classic** | ✅ Allow | ✅ Allow | ✅ Allow | ✅ Allow | ⚠️ Adapt | ✅ Allow |
| **Trendy** | ✅ Allow | ✅ Allow | ⚠️ Adapt | ✅ Allow | ✅ Allow | ⚠️ Adapt |

**Legend:**
- ✅ **Allow** - Fashion style is compatible as-is
- ⚠️ **Adapt** - Fashion style must be transformed to fit aesthetic
- 🚫 **Block** - Fashion style is incompatible (use fallback)

---

## Adaptation Rules

When compatibility action is "adapt", the fashion style is transformed to fit the aesthetic context.

### Example Adaptations

| Original | Category | Adapted To | Reasoning |
|----------|----------|------------|-----------|
| athletic | luxury | elevated_athleisure | Luxury fabrics, tailored fit |
| athletic | minimal | athletic (allowed) | Clean lines fit minimal |
| athletic | beige | cozy_active | Warm tones, relaxed fit |
| athletic | warm | warm_active | Cozy activewear aesthetic |
| athletic | edgy | street_athletic | Urban streetwear style |
| bohemian | minimal | minimal_bohemian | ONE flowing element, NO layering |
| bohemian | edgy | dark_bohemian | Black lace, deep burgundy |
| casual | luxury | elevated_casual | Luxury materials, refined |
| casual | professional | smart_casual | Polished but relaxed |
| business | minimal | minimal_professional | Clean lines, simple |

---

## Blocking Rules

When compatibility action is "block", the fashion style is replaced with a category-aligned fallback.

### Fallback Hierarchy

1. **Category-Aligned Default** (preferred)
   - luxury → classic
   - minimal → casual
   - beige → casual
   - warm → casual
   - edgy → casual
   - professional → business

2. **Universal Fallback** (if category default fails)
   - casual

3. **Never Fails** (always returns a valid value)

### Example Blocks

| Original | Category | Fallback | Reason |
|----------|----------|----------|--------|
| athletic | professional | business | Athletic incompatible with professional formal |
| bohemian | luxury | classic | Bohemian layering incompatible with luxury polish |
| bohemian | professional | business | Bohemian eclectic incompatible with professional |
| business | edgy | casual | Business formal incompatible with edgy street |

---

## Integration

### Using the Resolver

#### Option 1: Direct Integration (Recommended)

Use the new wrapper function `getCoherentStyleParameters()` which combines category/mood resolution + fashion style resolution + coherence checking:

```typescript
import { getCoherentStyleParameters } from '@/lib/feed-planner/generation-helpers'

// Get coherent style parameters (all-in-one)
const {
  category,
  mood,
  fashionStyle,
  adaptationApplied,
  adaptationReason
} = await getCoherentStyleParameters(feedLayout, user, position, {
  checkSettingsPreference: true,
  checkBlueprintSubscribers: true,
  defaultCategory: 'minimal'
})

// fashionStyle is now guaranteed coherent with category+mood
console.log(`Using coherent fashion style: ${fashionStyle}`)
if (adaptationApplied) {
  console.log(`Adaptation applied: ${adaptationReason}`)
}
```

#### Option 2: Manual Integration (Advanced)

If you need more control, call the resolver directly:

```typescript
import { resolveCoherentStyle } from '@/lib/feed-planner/style-coherence-resolver'
import { getCategoryAndMood, getFashionStyleForPosition } from '@/lib/feed-planner/generation-helpers'

// Step 1: Get category and mood
const { category, mood } = await getCategoryAndMood(feedLayout, user, options)

// Step 2: Get raw fashion style
const rawFashionStyle = await getFashionStyleForPosition(user, position, feedLayout)

// Step 3: Resolve coherence
const coherentStyle = resolveCoherentStyle({
  category,
  mood,
  fashionStyle: rawFashionStyle,
  userId: user.id,
  feedId: feedLayout?.id
})

// Step 4: Use resolved values
const finalFashionStyle = coherentStyle.resolvedFashionStyle
```

---

## Logging

The resolver automatically logs all actions:

### Allow (Compatible)

```
[COHERENCE-RESOLVER] ✅ Fashion style compatible: casual + minimal
{
  userId: "123",
  feedId: "456",
  category: "minimal",
  mood: "minimal",
  fashionStyle: "casual"
}
```

### Adapt (Transformation)

```
[COHERENCE-RESOLVER] ⚠️ Adaptation applied: athletic → elevated_athleisure
{
  userId: "123",
  feedId: "456",
  category: "luxury",
  mood: "luxury",
  originalFashion: "athletic",
  adaptedFashion: "elevated_athleisure",
  reason: "Adapted 'athletic' to 'elevated_athleisure' for luxury aesthetic"
}
```

### Block (Fallback)

```
[COHERENCE-RESOLVER] 🚫 Fashion style blocked: athletic + professional
{
  userId: "123",
  feedId: "456",
  category: "professional",
  mood: "minimal",
  originalFashion: "athletic",
  fallbackFashion: "business",
  reason: "Blocked 'athletic' (incompatible with professional), using fallback: business"
}
```

---

## Example Scenarios

### Scenario 1: Athletic + Luxury = Adaptation

**User Selections:**
- Category: "luxury"
- Mood: "luxury" (dark_moody)
- Fashion: "athletic"

**Resolver Output:**
```typescript
{
  resolvedCategory: "luxury",
  resolvedMood: "luxury",
  resolvedFashionStyle: "elevated_athleisure", // ← ADAPTED
  adaptationApplied: true,
  adaptationReason: "Adapted 'athletic' to 'elevated_athleisure' for luxury aesthetic"
}
```

**Result:** Instead of gym leggings, generates luxury athleisure with tailored fit and premium fabrics.

---

### Scenario 2: Bohemian + Minimal = Adaptation

**User Selections:**
- Category: "minimal"
- Mood: "minimal"
- Fashion: "bohemian"

**Resolver Output:**
```typescript
{
  resolvedCategory: "minimal",
  resolvedMood: "minimal",
  resolvedFashionStyle: "minimal_bohemian", // ← ADAPTED
  adaptationApplied: true,
  adaptationReason: "Adapted 'bohemian' to 'minimal_bohemian' for minimal aesthetic"
}
```

**Result:** Instead of layered bohemian, generates ONE flowing element with clean lines.

---

### Scenario 3: Athletic + Professional = Block

**User Selections:**
- Category: "professional"
- Mood: "minimal"
- Fashion: "athletic"

**Resolver Output:**
```typescript
{
  resolvedCategory: "professional",
  resolvedMood: "minimal",
  resolvedFashionStyle: "business", // ← BLOCKED, fallback applied
  adaptationApplied: true,
  adaptationReason: "Blocked 'athletic' (incompatible with professional), using fallback: business"
}
```

**Result:** Athletic completely incompatible with professional formal, replaced with business attire.

---

### Scenario 4: Casual + Minimal = Allow

**User Selections:**
- Category: "minimal"
- Mood: "minimal"
- Fashion: "casual"

**Resolver Output:**
```typescript
{
  resolvedCategory: "minimal",
  resolvedMood: "minimal",
  resolvedFashionStyle: "casual", // ← ALLOWED as-is
  adaptationApplied: false
}
```

**Result:** Casual naturally fits minimal aesthetic, no adaptation needed.

---

## Backward Compatibility

### Existing Feeds

The resolver is **fully backward compatible**:

1. **No Database Changes Required**
   - Uses existing `feed_layouts` and `user_personal_brand` tables
   - No new columns or migrations needed

2. **Gradual Adoption**
   - Old code paths continue to work unchanged
   - New code can opt-in to coherence checking
   - No breaking changes

3. **Fallback Behavior**
   - Unknown fashion styles are allowed (logged as warning)
   - Missing data uses safe defaults
   - Never fails generation

### Migration Path

1. **Phase 1 (Current):** Resolver available, but NOT enforced
   - Old code uses `getCategoryAndMood()` + `getFashionStyleForPosition()` separately
   - New code can opt-in to `getCoherentStyleParameters()`

2. **Phase 2 (Future):** Gradual adoption
   - Update critical generation paths to use coherence resolver
   - Monitor logs for adaptation frequency
   - Adjust compatibility matrix based on real-world usage

3. **Phase 3 (Future):** Full enforcement
   - All generation paths use coherence resolver
   - UI shows only compatible fashion styles per category
   - Remove legacy code paths

---

## Testing

### Validation Tests

The resolver includes built-in validation tests. Run them to verify behavior:

```typescript
import { _validateCoherenceResolver } from '@/lib/feed-planner/style-coherence-resolver'

// Run validation tests (development only)
_validateCoherenceResolver()
```

**Expected Output:**
```
[COHERENCE-RESOLVER] Running validation tests...
[COHERENCE-RESOLVER] ✅ All validation tests passed
```

### Test Cases

The built-in tests verify:

1. ✅ Athletic + Luxury = `elevated_athleisure` (adaptation)
2. ✅ Bohemian + Minimal = `minimal_bohemian` (adaptation)
3. ✅ Athletic + Professional = `business` (block → fallback)
4. ✅ Casual + Minimal = `casual` (allow)
5. ✅ No fashion style + Luxury = `classic` (category default)

---

## Monitoring

### Key Metrics to Track

1. **Adaptation Rate**
   - % of generations where adaptation is applied
   - Target: <30% (most combinations should be compatible)

2. **Block Rate**
   - % of generations where blocking occurs
   - Target: <5% (blocks should be rare)

3. **Top Adaptations**
   - Which fashion × category combinations adapt most often
   - Use to refine compatibility matrix

4. **User Feedback**
   - Monitor support tickets about "bad outputs"
   - Expected: 80%+ reduction after resolver deployment

### Log Analysis Queries

```sql
-- Count adaptations by type (requires log aggregation)
SELECT 
  original_fashion,
  adapted_fashion,
  category,
  COUNT(*) as adaptation_count
FROM generation_logs
WHERE adaptation_applied = true
GROUP BY original_fashion, adapted_fashion, category
ORDER BY adaptation_count DESC;
```

---

## Future Enhancements

### Short-Term

1. **UI Integration**
   - Show compatibility hints in Feed Style Picker
   - Gray out incompatible fashion styles based on selected category
   - Display "This will be adapted to X" messages

2. **Enhanced Logging**
   - Structured logging to database
   - Dashboard for adaptation metrics
   - A/B testing framework

### Long-Term

1. **Machine Learning**
   - Learn optimal adaptations from user behavior
   - Predict aesthetic compatibility
   - Auto-suggest best combinations

2. **User Customization**
   - Allow users to override adaptations
   - Save preferred adaptations per user
   - Custom compatibility rules

3. **Template Integration**
   - Make templates adaptive (not rigid)
   - Templates can accept adapted fashion styles
   - Semantic template selection

---

## Troubleshooting

### Issue: Adaptation not applied

**Symptom:** Images still show incompatible aesthetics despite resolver being called.

**Possible Causes:**
1. Old code path not using resolver
2. Resolved fashion style not passed to prompt construction
3. Fashion style mapping happens AFTER resolution

**Solution:**
- Ensure `getCoherentStyleParameters()` is called
- Verify resolved fashion style is passed to `getBlueprintPhotoshootPrompt()`
- Check that `mapFashionStyleToVibeLibrary()` is called on RAW style BEFORE resolution

### Issue: Too many blocks

**Symptom:** Many generations use fallback instead of adapted styles.

**Possible Causes:**
1. Compatibility matrix too restrictive
2. Common fashion × category combinations marked as "block"

**Solution:**
- Review block logs to identify patterns
- Change "block" to "adapt" for common combinations
- Add new adaptation rules

### Issue: Adaptations feel wrong

**Symptom:** Adapted styles don't match user expectations.

**Possible Causes:**
1. Adaptation rules don't capture aesthetic intent
2. Adapted fashion style name not descriptive enough
3. Downstream systems don't understand adapted names

**Solution:**
- Refine adaptation rules based on user feedback
- Add more nuanced adaptations (e.g., "luxury_athletic_evening")
- Ensure outfit generation understands adapted style names

---

## Related Documentation

- **Audit Report:** `docs/AESTHETIC_COHERENCE_AUDIT.md` - Full diagnostic of the problem
- **Feed Style Picker:** `docs/feed-planner/FEED_STYLE_PICKER_AUDIT.md` - UI integration points
- **Prompt System:** `docs/CANONICAL_PROMPT_SYSTEM_AUDIT.md` - How prompts are constructed

---

**Status:** ✅ **IMPLEMENTED AND READY FOR INTEGRATION**

**Next Steps:**
1. Deploy resolver to staging
2. Update 1-2 critical generation paths to use `getCoherentStyleParameters()`
3. Monitor logs for adaptation patterns
4. Refine compatibility matrix based on real-world usage
5. Roll out gradually to all generation paths
