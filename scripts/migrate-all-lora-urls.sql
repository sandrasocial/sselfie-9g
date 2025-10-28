-- Migrate all users' lora_weights_url from lora_weights table to user_models table
-- This fixes the issue where lora_weights_url is not being sent to Replicate

-- Step 1: Show current state (users missing lora_weights_url)
SELECT 
  'Users Missing LoRA URL' as check_type,
  COUNT(*) as count
FROM user_models um
WHERE um.training_status = 'completed'
AND (um.lora_weights_url IS NULL OR um.lora_weights_url = '');

-- Step 2: Show users with lora_weights but missing URL in user_models
SELECT 
  'Users With LoRA Weights But Missing URL' as check_type,
  u.email,
  um.id as model_id,
  um.user_id,
  um.model_name,
  um.training_status,
  um.lora_scale,
  um.lora_weights_url as current_url,
  'https://' || lw.s3_bucket || '.s3.amazonaws.com/' || lw.s3_key as constructed_url
FROM users u
JOIN user_models um ON u.id = um.user_id
JOIN lora_weights lw ON lw.user_id = um.user_id
WHERE um.training_status = 'completed'
AND (um.lora_weights_url IS NULL OR um.lora_weights_url = '')
AND lw.status = 'available'
ORDER BY um.created_at DESC;

-- Step 3: Update all user_models with missing lora_weights_url
-- Set lora_scale to 1.0 (default) and populate lora_weights_url from lora_weights table
UPDATE user_models um
SET 
  lora_scale = COALESCE(um.lora_scale, 1.0),
  lora_weights_url = (
    SELECT 'https://' || lw.s3_bucket || '.s3.amazonaws.com/' || lw.s3_key
    FROM lora_weights lw
    WHERE lw.user_id = um.user_id
    AND lw.status = 'available'
    ORDER BY lw.created_at DESC
    LIMIT 1
  ),
  updated_at = NOW()
WHERE um.training_status = 'completed'
AND (um.lora_weights_url IS NULL OR um.lora_weights_url = '')
AND EXISTS (
  SELECT 1 FROM lora_weights lw
  WHERE lw.user_id = um.user_id
  AND lw.status = 'available'
);

-- Step 4: Verify the update
SELECT 
  'Updated Users' as check_type,
  u.email,
  um.id as model_id,
  um.user_id,
  um.model_name,
  um.training_status,
  um.lora_scale,
  um.lora_weights_url,
  um.updated_at
FROM users u
JOIN user_models um ON u.id = um.user_id
WHERE um.training_status = 'completed'
AND um.lora_weights_url IS NOT NULL
AND um.lora_weights_url != ''
ORDER BY um.updated_at DESC;

-- Step 5: Show remaining users still missing lora_weights_url (if any)
SELECT 
  'Still Missing LoRA URL' as check_type,
  u.email,
  um.id as model_id,
  um.user_id,
  um.model_name,
  um.training_status
FROM users u
JOIN user_models um ON u.id = um.user_id
WHERE um.training_status = 'completed'
AND (um.lora_weights_url IS NULL OR um.lora_weights_url = '')
ORDER BY um.created_at DESC;
