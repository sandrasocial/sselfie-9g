# Maya Testing Lab - Implementation Guide

## Status: Phase 1 Complete ✅

### Completed Components

1. ✅ **Database Schema** - `scripts/37-create-maya-testing-tables.sql`
2. ✅ **Admin Page** - `/app/admin/maya-testing/page.tsx`
3. ✅ **Main Component** - `/components/admin/maya-testing-lab.tsx`
4. ✅ **API Routes:**
   - ✅ `/api/admin/maya-testing/run-test/route.ts` - Test execution (stub)
   - ✅ `/api/admin/maya-testing/list-results/route.ts` - List test results

### What's Working

- Admin authentication and page access
- UI for configuring training parameters (sliders, inputs)
- UI for configuring prompt settings (dropdowns, inputs)
- Test result listing
- Basic test execution flow (placeholder implementation)

### Next Steps (Phase 2)

To complete the testing lab, implement:

1. **Training Test Implementation**
   - Create test user selection/creation
   - Implement actual training with custom parameters
   - Monitor training progress
   - Save training results

2. **Prompt/Generation Test Implementation**
   - Implement image generation with custom prompt settings
   - Generate multiple variations for comparison
   - Save generated images

3. **Comparison View**
   - Side-by-side image comparison
   - Settings comparison
   - Rating/voting system

4. **Enhanced Features**
   - Save/load test configurations
   - Export test results
   - Cost estimation
   - Test user management

## Setup Instructions

### 1. Run Database Migration

```bash
psql $DATABASE_URL -f scripts/37-create-maya-testing-tables.sql
```

### 2. Access the Testing Lab

Navigate to: `/admin/maya-testing` (admin-only)

### 3. Test the UI

1. Go to Training tab
2. Adjust parameters (sliders will update network_alpha automatically)
3. Click "Run Training Test" (currently shows placeholder message)
4. Check Test Results section for saved tests

## Current Limitations

- Test execution is stubbed (returns success but doesn't actually run)
- No actual training or image generation yet
- Comparison view not implemented
- Test user selection not implemented

## Implementation Complexity

**Phase 1 (Current):** ✅ **COMPLETE** - Low complexity, UI and structure
- Time: ~2 hours
- Complexity: Low
- Files: 5 files created

**Phase 2 (Next):** Medium complexity
- Full training implementation: ~4-6 hours
- Full prompt/generation implementation: ~3-4 hours
- Comparison view: ~2-3 hours
- **Total: ~9-13 hours**

**Why Phase 1 First?**
- Validates the UI/UX design
- Establishes the structure
- Allows testing the concept before full implementation
- Isolates concerns (UI vs logic)

## Safety Measures Implemented

✅ Admin-only access (ADMIN_EMAIL check)
✅ Test data isolation (separate tables)
✅ Clear "Test Environment" warnings
✅ Confirmation before expensive operations (training)

## How to Extend

### Add New Test Type

1. Add type to `TestType` in component
2. Add configuration interface
3. Add UI panel in TabsContent
4. Implement handler in API route
5. Add database fields if needed

### Add New Training Parameter

1. Add to `TrainingParams` interface
2. Add UI input in Training tab
3. Include in API request
4. Store in `configuration` JSONB field

### Add New Prompt Setting

1. Add to `PromptSettings` interface
2. Add UI input in Prompt tab
3. Include in API request
4. Apply in prompt generation logic

## Testing Strategy

### Manual Testing

1. **UI Testing**
   - Verify all sliders/inputs work
   - Check parameter validation
   - Test tab switching
   - Verify alerts/errors display

2. **API Testing**
   - Test admin authentication
   - Test test result creation
   - Test test result listing
   - Verify error handling

### Integration Testing (Phase 2)

1. **Training Flow**
   - Create test user
   - Upload test images
   - Start training with custom params
   - Monitor progress
   - Verify model is created
   - Generate test images

2. **Prompt Flow**
   - Select test user
   - Configure prompt settings
   - Generate images
   - Compare results
   - Save configuration

## Cost Estimation

**Training:**
- Per training: ~$0.10-0.50 (depending on steps/params)
- Test 5 configurations: ~$0.50-2.50

**Image Generation:**
- Per image: ~$0.003-0.01
- 20 test images: ~$0.06-0.20

**Total per testing session:** ~$1-5 (reasonable for validation)

## Next Implementation Priorities

1. **High Priority:**
   - Actual training execution with custom params
   - Test user selection/creation
   - Training progress monitoring

2. **Medium Priority:**
   - Prompt generation with custom settings
   - Image generation and saving
   - Basic comparison view

3. **Low Priority:**
   - Advanced comparison features
   - Export/import configurations
   - Test history search/filtering




