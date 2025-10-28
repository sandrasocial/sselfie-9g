-- Update specific users to lora_scale 1.0
-- Users: hafdisosk@icloud.com (was hafdis@icloud.com), hello@sselfie.ai, sandrajonna@gmail.com, co@levelpartner.ai

-- Show current state
SELECT 
  'Current State' as check_type,
  u.id as user_id,
  u.email,
  um.id as model_id,
  um.lora_scale,
  um.lora_weights_url
FROM users u
LEFT JOIN user_models um ON u.id = um.user_id
WHERE u.email IN ('hafdisosk@icloud.com', 'hello@sselfie.ai', 'sandrajonna@gmail.com', 'co@levelpartner.ai')
ORDER BY u.email;

-- Update lora_scale to 1.0 for these users
UPDATE user_models
SET 
  lora_scale = 1.0,
  updated_at = NOW()
WHERE user_id IN (
  SELECT id FROM users 
  WHERE email IN ('hafdisosk@icloud.com', 'hello@sselfie.ai', 'sandrajonna@gmail.com', 'co@levelpartner.ai')
);

-- Verify the update
SELECT 
  'Updated State' as check_type,
  u.id as user_id,
  u.email,
  um.id as model_id,
  um.lora_scale,
  um.lora_weights_url,
  um.updated_at
FROM users u
LEFT JOIN user_models um ON u.id = um.user_id
WHERE u.email IN ('hafdisosk@icloud.com', 'hello@sselfie.ai', 'sandrajonna@gmail.com', 'co@levelpartner.ai')
ORDER BY u.email;
