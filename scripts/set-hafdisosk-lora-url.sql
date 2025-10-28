-- Set the lora_weights_url for hafdisosk@icloud.com (user_id: 45038279)
-- Using the constructed URL from the lora_weights table

-- Update the user_models table with the lora_weights_url
UPDATE user_models
SET lora_weights_url = 'https://sselfie-studio-assets.s3.amazonaws.com/lora-weights/45038279/sandrasocial/45038279-selfie-lora-1756752197176-placeholder.safetensors',
    updated_at = NOW()
WHERE user_id = '45038279'
  AND model_name = '45038279-selfie-lora-1756752197176';

-- Verify the update
SELECT 
  'Verification' as check_type,
  id,
  user_id,
  model_name,
  training_status,
  lora_scale,
  lora_weights_url,
  trigger_word,
  updated_at
FROM user_models
WHERE user_id = '45038279'
  AND model_name = '45038279-selfie-lora-1756752197176';
