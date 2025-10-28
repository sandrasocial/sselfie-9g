-- Fix lora data for hafdisosk@icloud.com
-- Set lora_scale to 0.9 and populate lora_weights_url

-- Step 1: Check current state
SELECT 
  'Current User Model State' as check_type,
  um.id,
  um.user_id,
  um.model_name,
  um.training_status,
  um.lora_scale,
  um.lora_weights_url,
  um.trigger_word
FROM user_models um
WHERE um.user_id = '45038279';

-- Step 2: Find lora weights for this user
SELECT 
  'Available Lora Weights' as check_type,
  lw.id,
  lw.user_id,
  lw.training_run_id,
  lw.s3_bucket,
  lw.s3_key,
  lw.status,
  lw.trigger_word,
  lw.created_at,
  -- Construct the full S3 URL
  CASE 
    WHEN lw.s3_bucket IS NOT NULL AND lw.s3_key IS NOT NULL 
    THEN 'https://' || lw.s3_bucket || '.s3.amazonaws.com/' || lw.s3_key
    ELSE NULL
  END as constructed_url
FROM lora_weights lw
WHERE lw.user_id = '45038279'
ORDER BY lw.created_at DESC;

-- Step 3: Update user_models with lora_scale and lora_weights_url
-- Using the most recent lora_weights record
UPDATE user_models um
SET 
  lora_scale = 0.9,
  lora_weights_url = (
    SELECT 
      CASE 
        WHEN lw.s3_bucket IS NOT NULL AND lw.s3_key IS NOT NULL 
        THEN 'https://' || lw.s3_bucket || '.s3.amazonaws.com/' || lw.s3_key
        ELSE NULL
      END
    FROM lora_weights lw
    WHERE lw.user_id = '45038279'
      AND lw.status = 'completed'
    ORDER BY lw.created_at DESC
    LIMIT 1
  ),
  updated_at = NOW()
WHERE um.user_id = '45038279'
  AND (um.lora_scale IS NULL OR um.lora_weights_url IS NULL);

-- Step 4: Verify the update
SELECT 
  'Updated User Model' as check_type,
  um.id,
  um.user_id,
  um.model_name,
  um.training_status,
  um.lora_scale,
  um.lora_weights_url,
  um.trigger_word,
  um.updated_at
FROM user_models um
WHERE um.user_id = '45038279';
