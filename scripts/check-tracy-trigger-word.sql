-- Diagnostic script to check Tracy's account and trigger word status
-- User: tracy.deniger@outlook.com

-- 1. Find Tracy's user account
SELECT 
  id as user_id,
  email,
  display_name,
  created_at,
  plan,
  role
FROM users
WHERE email = 'tracy.deniger@outlook.com';

-- 2. Check Tracy's trained models and trigger words
SELECT 
  um.id as model_id,
  um.user_id,
  um.trigger_word,
  um.training_status,
  um.training_progress,
  um.model_name,
  um.created_at,
  um.started_at,
  um.completed_at,
  um.failure_reason,
  um.error_message,
  um.replicate_model_id,
  um.replicate_version_id
FROM user_models um
JOIN users u ON um.user_id = u.id
WHERE u.email = 'tracy.deniger@outlook.com'
ORDER BY um.created_at DESC;

-- 3. Check if Tracy has any selfie uploads for training
SELECT 
  su.id,
  su.user_id,
  su.filename,
  su.processing_status,
  su.validation_status,
  su.created_at,
  su.error_details
FROM selfie_uploads su
JOIN users u ON su.user_id = u.id
WHERE u.email = 'tracy.deniger@outlook.com'
ORDER BY su.created_at DESC
LIMIT 10;

-- 4. Check Tracy's recent Maya chat interactions
SELECT 
  mc.id as chat_id,
  mc.user_id,
  mc.chat_title,
  mc.chat_type,
  mc.created_at,
  mc.last_activity,
  COUNT(mcm.id) as message_count
FROM maya_chats mc
JOIN users u ON mc.user_id = u.id
LEFT JOIN maya_chat_messages mcm ON mc.id = mcm.chat_id
WHERE u.email = 'tracy.deniger@outlook.com'
GROUP BY mc.id, mc.user_id, mc.chat_title, mc.chat_type, mc.created_at, mc.last_activity
ORDER BY mc.last_activity DESC
LIMIT 5;

-- 5. Summary query - What Maya sees for Tracy
SELECT 
  u.id as user_id,
  u.email,
  u.display_name,
  u.gender,
  um.trigger_word,
  um.training_status,
  um.training_progress,
  um.completed_at,
  CASE 
    WHEN um.trigger_word IS NOT NULL THEN um.trigger_word
    ELSE 'user' || u.id
  END as effective_trigger_word,
  CASE
    WHEN um.training_status = 'completed' THEN '✅ Has trained model'
    WHEN um.training_status = 'processing' THEN '⏳ Training in progress'
    WHEN um.training_status = 'failed' THEN '❌ Training failed'
    WHEN um.training_status IS NULL THEN '❌ No trained model'
    ELSE '⚠️ Unknown status: ' || um.training_status
  END as status_summary
FROM users u
LEFT JOIN user_models um ON u.id = um.user_id AND um.training_status = 'completed'
WHERE u.email = 'tracy.deniger@outlook.com'
ORDER BY um.created_at DESC
LIMIT 1;
