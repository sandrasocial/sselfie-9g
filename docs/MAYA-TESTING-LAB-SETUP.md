# Maya Testing Lab - Setup & Usage Guide

## ✅ Phase 2 Complete!

The Maya Testing Lab is now fully functional with:
- ✅ Training parameter testing with custom values
- ✅ Prompt/generation settings testing
- ✅ Test user selection and management
- ✅ Training progress monitoring
- ✅ Test result comparison view
- ✅ Full isolation from production

## Setup Instructions

### 1. Run Database Migration

**IMPORTANT:** You need to run the SQL migration script first. Since `psql` isn't available in your environment, you can either:

**Option A: Use a database client (Recommended)**
- Connect to your Neon database using your preferred SQL client
- Run the contents of `scripts/37-create-maya-testing-tables.sql`
- Or copy-paste the SQL into your Neon dashboard SQL editor

**Option B: Create migration via API (Future)**
- Could add a migration API route if needed

### 2. Access the Testing Lab

Navigate to: `/admin/maya-testing` (admin-only)

You must be logged in as: `ssa@ssasocial.com`

## How to Use

### Testing Training Parameters

1. **Select Test Type:** Click "Training" tab
2. **Select Test User:** Choose a user with 5+ uploaded images
3. **Provide Training Images:** Paste image URLs (one per line) in the textarea
4. **Adjust Parameters:**
   - LoRA Rank (slider: 8-64, recommended: 24)
   - Learning Rate (slider: 0.00001-0.001, recommended: 0.0001)
   - Caption Dropout Rate (slider: 0-0.3, recommended: 0.05)
   - Steps (input: default 1400)
   - Dataset Repeats (input: default 20)
5. **Run Test:** Click "Run Training Test"
6. **Monitor Progress:** The test will automatically monitor progress every 5 seconds
7. **View Results:** Check the "Recent Test Results" section

### Testing Prompt Settings

1. **Select Test Type:** Click "Prompt" tab
2. **Select Test User:** Choose a user with a trained model
3. **Configure Settings:**
   - Prompt Length Range (min-max words)
   - Lighting Style (warm, realistic, hybrid)
   - Feature Inclusion Strategy
   - Authenticity Keywords Behavior
4. **Run Test:** Click "Test Prompt Generation"
5. **View Results:** Results saved for comparison

### Testing Image Generation

1. **Select Test Type:** Click "Generation" tab
2. **Select Test User:** Choose a user with a trained model
3. **Configure Prompt Settings:** Same as Prompt tab
4. **Run Test:** Click "Generate Test Images"
5. **View Results:** Generated images saved for comparison

### Comparing Results

1. **View Comparison Tab:** Click "Compare" tab
2. **See All Results:** All test results are listed with their configurations
3. **Compare Configurations:** Side-by-side view shows:
   - Test parameters used
   - Status (pending, running, completed, failed)
   - Results and metrics

## Features

### Training Progress Monitoring

- Automatically polls every 5 seconds when a training test is running
- Updates status in real-time
- Shows completion/failure status
- Stops monitoring when test completes

### Test User Management

- **Users with Models:** Shown for prompt/generation tests
- **Users without Models:** Shown for training tests (need 5+ images)
- Selection dropdown shows user email and status

### Test Isolation

- All tests use separate test tables
- Test models use separate Replicate model names (prefixed with `test-`)
- No impact on production users
- Clear visual indicators

### Cost Estimation

**Training Tests:**
- ~$0.10-0.50 per training (depending on steps/params)
- ~10-15 minutes per training

**Image Generation:**
- ~$0.003-0.01 per image
- ~10-30 seconds per image

## Current Limitations

1. **Image Upload:** Currently requires pasting image URLs manually
   - Future: Add drag-and-drop image uploader
   
2. **Prompt Generation:** Returns placeholder (configured but not executing generation yet)
   - Future: Full implementation to generate actual images with custom prompt settings

3. **Comparison View:** Shows configurations and status, but no side-by-side image comparison yet
   - Future: Add image grid comparison view

## Next Steps

### Immediate Use

You can now:
1. ✅ Test different training parameters
2. ✅ Compare training configurations
3. ✅ Monitor training progress
4. ✅ Save test results for future reference

### Future Enhancements

1. **Full Prompt Generation Implementation**
   - Execute actual image generation with custom prompt settings
   - Save generated images to test results
   - Display images in comparison view

2. **Image Upload UI**
   - Drag-and-drop interface
   - Multiple image selection
   - Preview before training

3. **Advanced Comparison**
   - Side-by-side image grid
   - Configuration diff view
   - Rating/voting system
   - Export comparison reports

4. **Test Configuration Templates**
   - Save common parameter sets
   - Quick-select templates
   - Share configurations

## Troubleshooting

### "Test users not loading"
- Check admin authentication
- Verify database connection
- Check browser console for errors

### "Training not starting"
- Verify image URLs are valid
- Check Replicate API key is set
- Verify test user has 5+ images

### "Progress not updating"
- Check network tab for API calls
- Verify test_result_id is correct
- Check Replicate training status directly

## Database Tables Created

- `maya_test_results` - Main test results
- `maya_test_trainings` - Training test sessions
- `maya_test_images` - Generated test images
- `maya_test_comparisons` - Comparison groupings
- `maya_test_configs` - Saved configurations

All tables are prefixed with `maya_test_` for easy identification and isolation.
















