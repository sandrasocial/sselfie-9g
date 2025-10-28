-- Check lora_scale for specific users
SELECT 
  'User Model State' as check_type,
  u.id as user_id,
  u.email,
  um.id as model_id,
  um.model_name,
  um.training_status,
  um.lora_scale,
  um.lora_weights_url,
  um.updated_at
FROM users u
LEFT JOIN user_models um ON u.id = um.user_id
WHERE u.email IN (
  'hafdis@icloud.com',
  'hafdisosk@icloud.com',
  'hello@ssefie.com',
  'hello@sselfie.ai',
  'sandrajonna@gmail.com',
  'co@levelpartner.ai',
  'shannon@soulresets.com'
)
ORDER BY u.email, um.id DESC;
