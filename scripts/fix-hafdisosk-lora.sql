-- Fix lora_scale for user hafdisosk@icloud.com (id: 45038279)

-- First, check current state
SELECT 
  'Current State' as check_type,
  um.id as model_id,
  um.user_id,
  um.model_name,
  um.training_status,
  um.lora_scale,
  um.lora_weights_url,
  um.trigger_word,
  um.replicate_model_id,
  um.replicate_version_id
FROM user_models um
WHERE um.user_id = '45038279';

-- Update lora_scale to 0.8 if it's NULL or 0
UPDATE user_models
SET 
  lora_scale = 0.8,
  updated_at = NOW()
WHERE user_id = '45038279'
  AND (lora_scale IS NULL OR lora_scale = 0)
RETURNING 
  id as model_id,
  user_id,
  model_name,
  lora_scale,
  training_status,
  'Updated' as status;

-- Verify the update
SELECT 
  'After Update' as check_type,
  um.id as model_id,
  um.user_id,
  um.model_name,
  um.training_status,
  um.lora_scale,
  um.lora_weights_url,
  um.trigger_word
FROM user_models um
WHERE um.user_id = '45038279';
