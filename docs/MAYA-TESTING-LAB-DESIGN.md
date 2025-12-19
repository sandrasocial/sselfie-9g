# Maya Testing Lab - Design Document

## Overview

A comprehensive testing UI for Maya that allows testing different training parameters, prompt settings, and image generation configurations before implementing changes to production.

## Goals

1. **Test Training Parameters** - Compare different `lora_rank`, `caption_dropout_rate`, `learning_rate` combinations
2. **Test Prompt Settings** - Compare different prompt lengths, lighting descriptions, feature inclusion strategies
3. **Side-by-Side Comparison** - View multiple test results simultaneously
4. **Isolated Testing** - All tests are marked as test data, never affect production
5. **Result Persistence** - Save test configurations and results for future comparison
6. **Easy Comparison** - Visual comparison of generated images with different settings

## Architecture

### Database Schema

```sql
-- Test configurations and results
CREATE TABLE IF NOT EXISTS maya_test_results (
  id SERIAL PRIMARY KEY,
  test_name VARCHAR(255) NOT NULL,
  test_type VARCHAR(50) NOT NULL, -- 'training', 'prompt', 'generation'
  test_user_id TEXT REFERENCES users(id), -- Test user for training/generation
  configuration JSONB NOT NULL, -- All test parameters
  results JSONB, -- Test results (generated images, metrics, etc.)
  created_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT REFERENCES users(id), -- Admin who created the test
  is_active BOOLEAN DEFAULT true,
  notes TEXT
);

-- Test training sessions (isolated from production)
CREATE TABLE IF NOT EXISTS maya_test_trainings (
  id SERIAL PRIMARY KEY,
  test_result_id INTEGER REFERENCES maya_test_results(id),
  test_user_id TEXT REFERENCES users(id),
  training_params JSONB NOT NULL,
  replicate_training_id TEXT,
  training_status VARCHAR(50) DEFAULT 'pending',
  model_url TEXT,
  trigger_word TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  metrics JSONB -- Training metrics (loss, steps, etc.)
);

-- Test image generations
CREATE TABLE IF NOT EXISTS maya_test_images (
  id SERIAL PRIMARY KEY,
  test_result_id INTEGER REFERENCES maya_test_results(id),
  prompt TEXT NOT NULL,
  prompt_settings JSONB NOT NULL, -- Prompt generation settings used
  image_url TEXT NOT NULL,
  generation_params JSONB NOT NULL, -- Replicate generation params
  created_at TIMESTAMP DEFAULT NOW(),
  comparison_rank INTEGER -- For ranking in comparison view
);
```

### Component Structure

```
/app/admin/maya-testing/
  page.tsx                    # Admin page wrapper (auth check)
  
/components/admin/maya-testing-lab/
  index.tsx                   # Main component
  training-params-panel.tsx   # Training parameter inputs
  prompt-settings-panel.tsx   # Prompt generation settings
  comparison-view.tsx         # Side-by-side results comparison
  test-history.tsx            # Saved test results list
  test-runner.tsx             # Handles test execution
```

### API Routes

```
/api/admin/maya-testing/
  generate-test/route.ts      # Generate image with custom settings
  train-test/route.ts         # Train model with custom parameters
  save-config/route.ts        # Save test configuration
  load-config/route.ts        # Load saved configuration
  list-results/route.ts       # List all test results
  get-result/route.ts         # Get specific test result
  compare/route.ts            # Compare multiple test results
```

## Features

### 1. Training Parameter Testing

**Inputs:**
- `lora_rank` (slider: 8-64, default: 24, 48)
- `learning_rate` (slider: 0.00001-0.001, default: 0.00008, 0.0001)
- `caption_dropout_rate` (slider: 0.0-0.3, default: 0.15, 0.05)
- `steps` (input: default 1400)
- `num_repeats` (input: default 20)
- `network_alpha` (auto-set to match lora_rank)

**Workflow:**
1. Select test user (or create dedicated test user)
2. Upload test training images (if needed)
3. Configure training parameters
4. Start test training (uses test flag, isolated from production)
5. Monitor training progress
6. Generate test images with trained model
7. Save results for comparison

### 2. Prompt Generation Testing

**Settings to Test:**
- Prompt length (30-45 vs 40-55 vs 50-80 words)
- Lighting descriptions (warm vs realistic)
- Feature inclusion (include hair vs omit vs safety net)
- Authenticity keywords (mandatory vs optional)
- Physical preferences handling (remove vs convert vs preserve)

**Workflow:**
1. Select existing user with trained model
2. Configure prompt generation settings
3. Generate concept with same user request
4. Generate multiple variations
5. Compare results side-by-side

### 3. Side-by-Side Comparison

**View Options:**
- 2-column, 3-column, or 4-column layout
- Show images, prompts, and settings
- Highlight differences between configurations
- Rating/voting system for best results

### 4. Test Result Management

**Features:**
- Save test configurations with names
- Load previous configurations
- Delete old tests
- Export test results (JSON/CSV)
- Add notes to tests

## Isolation Strategy

### 1. Test User
- Use dedicated test user or marked test users
- Test user models are tagged with `is_test: true`
- Test images stored separately or tagged

### 2. Database Isolation
- All test data in `maya_test_*` tables
- Test trainings don't interfere with production
- Test images clearly marked

### 3. API Isolation
- All test routes under `/api/admin/maya-testing/`
- Admin-only access (ADMIN_EMAIL check)
- Test flag passed to all operations
- Never affects production user data

### 4. Visual Indicators
- Clear "TEST" badges on all test results
- Warning messages before running tests
- Confirmation dialogs for destructive operations

## UI/UX Design

### Main Layout

```
┌─────────────────────────────────────────────────────────┐
│  Maya Testing Lab                              [Admin]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [Test Type Selector: Training | Prompt | Generation]  │
│                                                         │
│  ┌──────────────────┐  ┌─────────────────────────────┐ │
│  │ Configuration    │  │ Comparison View             │ │
│  │ Panel            │  │                             │ │
│  │                  │  │  [Image 1]  [Image 2]       │ │
│  │ - Params         │  │  Settings   Settings        │ │
│  │ - Settings       │  │  Prompt     Prompt          │ │
│  │                  │  │                             │ │
│  │ [Run Test]       │  │  [Rate Best] [Export]       │ │
│  │ [Save Config]    │  │                             │ │
│  └──────────────────┘  └─────────────────────────────┘ │
│                                                         │
│  ┌───────────────────────────────────────────────────┐ │
│  │ Test History                                      │ │
│  │ - Test 1 (Training Params: rank=24, lr=0.0001)   │ │
│  │ - Test 2 (Prompt Length: 40-50 words)            │ │
│  │ - Test 3 (Lighting: Warm vs Realistic)           │ │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Phase 1: Core Infrastructure
1. Create database tables
2. Create admin page wrapper
3. Create main component structure
4. Create API route stubs

### Phase 2: Training Parameter Testing
1. Build training params panel
2. Create test training API route
3. Implement training monitoring
4. Test result saving

### Phase 3: Prompt Generation Testing
1. Build prompt settings panel
2. Create test generation API route
3. Implement prompt variation generation
4. Comparison view for prompts

### Phase 4: Comparison & History
1. Build comparison view component
2. Implement result saving/loading
3. Build test history component
4. Export functionality

## Safety Measures

1. **Admin-Only Access** - All routes check ADMIN_EMAIL
2. **Test Flagging** - All test data clearly marked
3. **Confirmation Dialogs** - Warn before expensive operations
4. **Rate Limiting** - Limit concurrent tests
5. **Cost Monitoring** - Show estimated Replicate costs
6. **Test User Isolation** - Never test on production users
7. **Rollback Capability** - Can delete test results easily

## Cost Considerations

- Training: ~$0.10-0.50 per training (depending on params)
- Image Generation: ~$0.003-0.01 per image
- Monitor usage and add warnings before expensive operations

## Success Metrics

- Time to test different configurations
- Ability to visually compare results
- Confidence in changes before production
- Number of test iterations before finding optimal settings




