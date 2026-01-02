# Replicate API Setup Guide

## Overview
This document explains the Replicate API integration for AI model training in the SSELFIE app.

## Required Environment Variable

Add the following environment variable to your project:

\`\`\`
REPLICATE_API_TOKEN=your_replicate_api_token_here
\`\`\`

### How to get your Replicate API token:
1. Go to https://replicate.com
2. Sign up or log in to your account
3. Navigate to Account Settings → API Tokens
4. Copy your API token
5. Add it to the **Vars** section in the v0 sidebar

## Implementation Details

### 1. ZIP File Creation ✅
- Training images are downloaded from Vercel Blob storage
- Images are packaged into a ZIP file using JSZip
- ZIP file is uploaded to Vercel Blob storage
- ZIP URL is passed to Replicate for training

### 2. Training Parameters ✅
The following parameters are configured for Flux LoRA training:
- **steps**: 1000 (training iterations)
- **lora_rank**: 16 (LoRA rank size)
- **optimizer**: adamw8bit (memory-efficient optimizer)
- **batch_size**: 1 (images per training step)
- **resolution**: "512,768,1024" (supported image sizes)
- **autocaption**: true (automatic image captioning)
- **learning_rate**: 0.0004
- **num_repeats**: 10 (dataset repetitions)

### 3. Training Workflow ✅

**Step 1: Upload Images**
- User uploads 5+ training images
- Images are stored in Vercel Blob storage
- Image URLs are saved to `selfie_uploads` table

**Step 2: Start Training**
- Create ZIP file from uploaded images
- Generate unique trigger word (e.g., "user42585527")
- Create model record in `user_models` table
- Start Replicate training job
- Save training ID to database

**Step 3: Monitor Progress**
- Frontend polls `/api/training/progress` every 5 seconds
- API checks Replicate training status
- Database is updated with progress percentage
- Training states: starting → training → completed/failed

**Step 4: Save Model**
When training completes, the following are saved to database:
- `replicate_model_id`: Replicate model identifier
- `replicate_version_id`: Specific model version
- `lora_weights_url`: URL to trained LoRA weights
- `trigger_word`: Word to activate the model
- `training_status`: "completed"
- `training_progress`: 100

### 4. Database Tables

**user_models**
- Stores trained model information
- Links to Replicate model IDs
- Tracks training status and progress

**training_runs**
- Detailed training execution logs
- Parameters and configurations
- Error tracking

**selfie_uploads**
- Training images uploaded by users
- Processing and validation status

**lora_weights**
- LoRA weight files and metadata
- S3/storage locations

## API Endpoints

### POST `/api/training/start`
Starts a new training job
- **Input**: modelName, modelType, gender, imageUrls
- **Output**: modelId, trainingId, triggerWord

### GET `/api/training/progress?modelId={id}`
Checks training progress
- **Input**: modelId (query parameter)
- **Output**: status, progress, model details

### POST `/api/training/upload`
Uploads training images
- **Input**: FormData with image files
- **Output**: Array of uploaded image URLs

## Testing

To test the training workflow:
1. Ensure `REPLICATE_API_TOKEN` is set in environment variables
2. Navigate to the Training screen
3. Upload 5+ selfie images
4. Click "Start Training"
5. Monitor progress (updates every 5 seconds)
6. Training typically takes 20-40 minutes

## Troubleshooting

**Error: "REPLICATE_API_TOKEN environment variable is not set"**
- Add your Replicate API token to the Vars section

**Error: "At least 5 training images are required"**
- Upload more images before starting training

**Error: "Failed to create training ZIP"**
- Check that image URLs are accessible
- Verify Vercel Blob storage is working

**Training stuck at 0%**
- Check Replicate dashboard for training status
- Verify training ID in database matches Replicate

## Next Steps

After training completes:
- Model can be used in Studio screen for image generation
- Trigger word activates the trained style
- LoRA weights are stored and ready for inference
