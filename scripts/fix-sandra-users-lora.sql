-- Fix lora data for sandrajonna@gmail.com and sandra@dibssocial.com
-- Sets lora_scale to 0.9 and populates lora_weights_url

-- Step 1: Check current state for both users
SELECT 
  'Current State - sandrajonna@gmail.com' as check_type,
  u.id as user_id,
  u.email,
  um.id as model_id,
  um.model_name,
  um.training_status,
  um.lora_scale,
  um.lora_weights_url,
  um.trigger_word
FROM users u
LEFT JOIN user_models um ON u.id = um.user_id
WHERE u.email = 'sandrajonna@gmail.com'

UNION ALL

SELECT 
  'Current State - sandra@dibssocial.com' as check_type,
  u.id as user_id,
  u.email,
  um.id as model_id,
  um.model_name,
  um.training_status,
  um.lora_scale,
  um.lora_weights_url,
  um.trigger_word
FROM users u
LEFT JOIN user_models um ON u.id = um.user_id
WHERE u.email = 'sandra@dibssocial.com'

UNION ALL

-- Step 2: Find available lora weights for both users
SELECT 
  'Available Lora Weights' as check_type,
  u.id as user_id,
  u.email,
  lw.id as lora_weights_id,
  lw.s3_bucket,
  lw.s3_key,
  lw.status,
  'https://' || lw.s3_bucket || '.s3.amazonaws.com/' || lw.s3_key as constructed_url
FROM users u
INNER JOIN lora_weights lw ON u.id = lw.user_id
WHERE u.email IN ('sandrajonna@gmail.com', 'sandra@dibssocial.com')
  AND lw.status = 'available'
ORDER BY lw.created_at DESC;

-- Step 3: Update user_models for sandrajonna@gmail.com
UPDATE user_models
SET 
  lora_scale = 0.9,
  lora_weights_url = (
    SELECT 'https://' || lw.s3_bucket || '.s3.amazonaws.com/' || lw.s3_key
    FROM lora_weights lw
    INNER JOIN users u ON lw.user_id = u.id
    WHERE u.email = 'sandrajonna@gmail.com'
      AND lw.status = 'available'
    ORDER BY lw.created_at DESC
    LIMIT 1
  ),
  updated_at = NOW()
WHERE user_id = (SELECT id FROM users WHERE email = 'sandrajonna@gmail.com')
  AND training_status = 'completed';

-- Step 4: Update user_models for sandra@dibssocial.com
UPDATE user_models
SET 
  lora_scale = 0.9,
  lora_weights_url = (
    SELECT 'https://' || lw.s3_bucket || '.s3.amazonaws.com/' || lw.s3_key
    FROM lora_weights lw
    INNER JOIN users u ON lw.user_id = u.id
    WHERE u.email = 'sandra@dibssocial.com'
      AND lw.status = 'available'
    ORDER BY lw.created_at DESC
    LIMIT 1
  ),
  updated_at = NOW()
WHERE user_id = (SELECT id FROM users WHERE email = 'sandra@dibssocial.com')
  AND training_status = 'completed';

-- Step 5: Verify the updates
SELECT 
  'Updated State - sandrajonna@gmail.com' as check_type,
  u.id as user_id,
  u.email,
  um.id as model_id,
  um.model_name,
  um.training_status,
  um.lora_scale,
  um.lora_weights_url,
  um.trigger_word,
  um.updated_at
FROM users u
LEFT JOIN user_models um ON u.id = um.user_id
WHERE u.email = 'sandrajonna@gmail.com'

UNION ALL

SELECT 
  'Updated State - sandra@dibssocial.com' as check_type,
  u.id as user_id,
  u.email,
  um.id as model_id,
  um.model_name,
  um.training_status,
  um.lora_scale,
  um.lora_weights_url,
  um.trigger_word,
  um.updated_at
FROM users u
LEFT JOIN user_models um ON u.id = um.user_id
WHERE u.email = 'sandra@dibssocial.com';
