-- ============================================
-- COMMIT: Delete Test Users Without Trained Models
-- ============================================
-- This script PERMANENTLY deletes all users who do NOT have trained models
-- Users with trained models will be PRESERVED
-- ============================================

BEGIN;

-- Step 1: Store user IDs to delete (no trained models)
CREATE TEMP TABLE users_to_delete AS
SELECT u.id, u.email, u.display_name, u.supabase_user_id
FROM users u
LEFT JOIN user_models um ON u.id = um.user_id
GROUP BY u.id, u.email, u.display_name, u.supabase_user_id
HAVING COUNT(um.id) = 0;

-- Step 2: Show what will be deleted
SELECT 
  '🗑️ DELETING' as action,
  COUNT(*) as users_to_delete
FROM users_to_delete;

-- Removed created_at column that doesn't exist
SELECT 
  email,
  display_name
FROM users_to_delete
ORDER BY email;

-- Step 3: Delete related data for users without trained models (in dependency order)

-- Delete Maya chat messages first (depends on maya_chats)
DELETE FROM maya_chat_messages 
WHERE chat_id IN (
  SELECT id FROM maya_chats WHERE user_id IN (SELECT id FROM users_to_delete)
);

-- Delete Maya chats
DELETE FROM maya_chats 
WHERE user_id IN (SELECT id FROM users_to_delete);

-- Delete Maya concepts
DELETE FROM maya_concepts 
WHERE user_id IN (SELECT id FROM users_to_delete);

-- Delete AI images
DELETE FROM ai_images 
WHERE user_id IN (SELECT id FROM users_to_delete);

-- Delete generated images
DELETE FROM generated_images 
WHERE user_id IN (SELECT id FROM users_to_delete);

-- Delete feed posts
DELETE FROM feed_posts 
WHERE user_id IN (SELECT id FROM users_to_delete);

-- Delete feed layouts
DELETE FROM feed_layouts 
WHERE user_id IN (SELECT id FROM users_to_delete);

-- Delete user credits
DELETE FROM user_credits 
WHERE user_id IN (SELECT id FROM users_to_delete);

-- Delete credit transactions
DELETE FROM credit_transactions 
WHERE user_id IN (SELECT id FROM users_to_delete);

-- Delete subscriptions
DELETE FROM subscriptions 
WHERE user_id IN (SELECT id FROM users_to_delete);

-- Delete user profiles
DELETE FROM user_profiles 
WHERE user_id IN (SELECT id FROM users_to_delete);

-- Delete user personal brand
DELETE FROM user_personal_brand 
WHERE user_id IN (SELECT id FROM users_to_delete);

-- Delete onboarding data
DELETE FROM onboarding_data 
WHERE user_id IN (SELECT id FROM users_to_delete);

-- Delete email logs
DELETE FROM email_logs 
WHERE user_email IN (SELECT email FROM users_to_delete);

-- Step 4: Delete the users themselves
DELETE FROM users 
WHERE id IN (SELECT id FROM users_to_delete);

-- Step 5: Show final results
SELECT 
  '✅ CLEANUP COMPLETE' as status;

SELECT 
  'Users with trained models (KEPT)' as status,
  COUNT(*) as user_count
FROM users u
INNER JOIN user_models um ON u.id = um.user_id
WHERE um.training_status = 'completed'

UNION ALL

SELECT 
  'Total users remaining' as status,
  COUNT(*) as user_count
FROM users;

-- Clean up temp table
DROP TABLE users_to_delete;

-- Review the results above, then decide:
-- - Type COMMIT; to permanently apply all deletions
-- - Type ROLLBACK; to cancel and keep everything unchanged

-- Uncomment to automatically commit:
-- COMMIT;
