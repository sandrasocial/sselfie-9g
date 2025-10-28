-- Diagnostic script to check hafdis@icloud.com's data
-- Check if user exists
SELECT 
  'User Check' as check_type,
  id,
  email,
  first_name,
  last_name,
  plan,
  created_at
FROM users 
WHERE email = 'hafdis@icloud.com';

-- Check user's models
SELECT 
  'User Models' as check_type,
  id,
  user_id,
  model_name,
  model_type,
  training_status,
  lora_scale,
  lora_weights_url,
  trigger_word,
  created_at
FROM user_models 
WHERE user_id = (SELECT id FROM users WHERE email = 'hafdis@icloud.com');

-- Check training runs
SELECT 
  'Training Runs' as check_type,
  id,
  user_id,
  training_id,
  status,
  progress,
  base_model,
  created_at
FROM training_runs 
WHERE user_id = (SELECT id FROM users WHERE email = 'hafdis@icloud.com');

-- Check lora weights
SELECT 
  'Lora Weights' as check_type,
  id,
  user_id,
  training_run_id,
  status,
  trigger_word,
  default_scales,
  created_at
FROM lora_weights 
WHERE user_id = (SELECT id FROM users WHERE email = 'hafdis@icloud.com');

-- Check for similar emails (in case of typo)
SELECT 
  'Similar Emails' as check_type,
  id,
  email,
  first_name,
  last_name
FROM users 
WHERE email ILIKE '%hafdis%' OR email ILIKE '%icloud%';
