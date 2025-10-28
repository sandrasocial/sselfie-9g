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

-- Step 2: Find lora weights URL
SELECT 
  'Available Lora Weights' as check_type,
  lw.id,
  lw.user_id,
  lw.training_run_id,
  lw.weights_url,
  lw.created_at
FROM lora_weights lw
WHERE lw.user_id = '45038279'
ORDER BY lw.created_at DESC;

-- Step 3: Update user_model with lora_scale and lora_weights_url
-- This will set lora_scale to 0.9 and copy the most recent lora_weights_url
UPDATE user_models um
SET 
  lora_scale = 0.9,
  lora_weights_url = (
    SELECT lw.weights_url 
    FROM lora_weights lw 
    WHERE lw.user_id = '45038279' 
    ORDER BY lw.created_at DESC 
    LIMIT 1
  ),
  updated_at = NOW()
WHERE um.user_id = '45038279'
RETURNING 
  id,
  user_id,
  model_name,
  lora_scale,
  lora_weights_url,
  trigger_word;

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
