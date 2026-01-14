# Implementation Checklist - Quick Reference

## Pre-Implementation

- [ ] Review implementation plan with team
- [ ] Backup database
- [ ] Test migrations on staging environment
- [ ] Verify all 18 templates are working correctly
- [ ] Document current template structure

---

## Phase 1: Template Variety (Day 1)

### Database
- [ ] Create migration: `add-template-variation-to-feed-layouts.sql`
- [ ] Create runner: `run-template-variation-migration.ts`
- [ ] Create verifier: `verify-template-variation-migration.ts`
- [ ] Run migration: `npx tsx scripts/migrations/run-template-variation-migration.ts`
- [ ] Verify migration: `npx tsx scripts/migrations/verify-template-variation-migration.ts`

### Code Changes
- [ ] Restructure `BLUEPRINT_PHOTOSHOOT_TEMPLATES` to nested object
- [ ] Add `getBlueprintPhotoshootPromptWithVariation()` function
- [ ] Keep old `getBlueprintPhotoshootPrompt()` for backward compatibility
- [ ] Update `create-manual/route.ts` to select and store variation
- [ ] Update `generate-single/route.ts` to use stored variation

### Testing
- [ ] Create Feed #1 with "dark and moody" → Check variation stored
- [ ] Create Feed #2 with "dark and moody" → Check different variation
- [ ] Generate all 9 images in Feed #1 → Verify same variation
- [ ] Generate all 9 images in Feed #2 → Verify same variation
- [ ] Test existing feeds (NULL variation) → Verify random selection works

### Verification
- [ ] All 18 templates have at least 2 variations
- [ ] Variation selection is random but consistent within feed
- [ ] Existing feeds still work
- [ ] No breaking changes to API responses

---

## Phase 2: Category Selection (Day 2)

### Database
- [ ] Create migration: `add-feed-category-to-feed-layouts.sql`
- [ ] Create runner: `run-feed-category-migration.ts`
- [ ] Create verifier: `verify-feed-category-migration.ts`
- [ ] Run migration: `npx tsx scripts/migrations/run-feed-category-migration.ts`
- [ ] Verify migration: `npx tsx scripts/migrations/verify-feed-category-migration.ts`

### UI Changes
- [ ] Add category selection to `feed-style-modal.tsx`
- [ ] Update modal to show category options
- [ ] Add category descriptions/help text
- [ ] Update `onConfirm` callback to include category
- [ ] Update parent components to handle category

### Code Changes
- [ ] Update `create-manual/route.ts` to save `feed_category`
- [ ] Update `generate-single/route.ts` to use `feed_category` (with fallback)
- [ ] Update template selection to use feed category

### Testing
- [ ] Create feed with category selection → Verify category stored
- [ ] Create feed without category → Verify profile category used
- [ ] Generate images → Verify correct template used
- [ ] Test all 6 categories (luxury, minimal, beige, warm, edgy, professional)
- [ ] Test existing feeds → Verify fallback to profile category

### Verification
- [ ] Category selection UI works correctly
- [ ] Category is stored in database
- [ ] Template selection uses feed category
- [ ] Fallback to profile category works
- [ ] Existing feeds continue to work

---

## Phase 3: Fashion Style Integration (Day 3)

### Code Changes
- [ ] Add `fashionStyle` parameter to `buildSingleImagePrompt()`
- [ ] Create `adjustOutfitForFashionStyle()` function
- [ ] Update `create-manual/route.ts` to read and pass fashion style
- [ ] Update `generate-single/route.ts` to read and pass fashion style

### Testing
- [ ] User with "casual" fashion style → Verify casual adjustments
- [ ] User with "business" fashion style → Verify professional adjustments
- [ ] User with "trendy" fashion style → Verify trendy adjustments
- [ ] User with "timeless" fashion style → Verify classic adjustments
- [ ] User without fashion style → Verify no adjustments (backward compatible)

### Verification
- [ ] Fashion style influences outfit descriptions
- [ ] Outfit adjustments are appropriate
- [ ] Backward compatible (works without fashion style)
- [ ] No breaking changes to prompt structure

---

## Post-Implementation

### Documentation
- [ ] Update API documentation
- [ ] Update user-facing documentation
- [ ] Create migration notes
- [ ] Document template variation system

### Monitoring
- [ ] Monitor error rates
- [ ] Check database performance
- [ ] Verify template selection accuracy
- [ ] Monitor user feedback

### Cleanup (Optional)
- [ ] Remove deprecated `getBlueprintPhotoshootPrompt()` function (after migration period)
- [ ] Clean up unused code
- [ ] Optimize template lookup performance

---

## Rollback Checklist (If Needed)

### Phase 1 Rollback
- [ ] Revert template structure to flat object
- [ ] Restore old `getBlueprintPhotoshootPrompt()` function
- [ ] Remove variation selection from feed creation
- [ ] Verify existing feeds still work

### Phase 2 Rollback
- [ ] Remove category selection from UI
- [ ] Restore old category selection logic
- [ ] Verify existing feeds still work

### Phase 3 Rollback
- [ ] Remove fashion style parameter
- [ ] Restore old function signature
- [ ] Verify existing feeds still work

---

## Critical Files Reference

### Templates
- `lib/maya/blueprint-photoshoot-templates.ts` - Template storage

### Feed Creation
- `app/api/feed/create-manual/route.ts` - Feed creation logic

### Image Generation
- `app/api/feed/[feedId]/generate-single/route.ts` - Single image generation
- `lib/feed-planner/build-single-image-prompt.ts` - Prompt building

### UI
- `components/feed-planner/feed-style-modal.tsx` - Feed style selection modal

### Database
- `scripts/migrations/add-template-variation-to-feed-layouts.sql`
- `scripts/migrations/add-feed-category-to-feed-layouts.sql`

---

## Dependencies to Update

### Files Using `getBlueprintPhotoshootPrompt()`
- [ ] `app/api/feed/create-manual/route.ts`
- [ ] `app/api/feed/[feedId]/generate-single/route.ts`
- [ ] `app/api/feed/create-free-example/route.ts`
- [ ] `app/api/feed/[feedId]/regenerate-post/route.ts`
- [ ] `lib/feed-planner/orchestrator.ts`

### Files Using `buildSingleImagePrompt()`
- [ ] `app/api/feed/create-manual/route.ts`
- [ ] `app/api/feed/[feedId]/generate-single/route.ts`

---

## Testing Commands

```bash
# Run migrations
npx tsx scripts/migrations/run-template-variation-migration.ts
npx tsx scripts/migrations/run-feed-category-migration.ts

# Verify migrations
npx tsx scripts/migrations/verify-template-variation-migration.ts
npx tsx scripts/migrations/verify-feed-category-migration.ts

# Run linter
npm run lint

# Run tests (if available)
npm test
```

---

## Notes

- **Template Variations**: Start with 2 variations per template, add more later
- **Category Selection**: Default to user's profile category if not selected
- **Fashion Style**: Start with simple adjustments, enhance later
- **Backward Compatibility**: Always maintain for existing feeds
