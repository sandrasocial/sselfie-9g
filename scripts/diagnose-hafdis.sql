-- Diagnostic script to check hafdis@icloud.com's data
-- This will show us what exists and what's missing

-- Check if user exists
SELECT 'User Check' as check_type, 
       id, email, created_at 
FROM users 
WHERE email = 'hafdis@icloud.com';

-- Check user models
SELECT 'User Models' as check_type,
       um.id, um.user_id, um.model_name, um.status, 
       um.lora_scale, um.created_at
FROM user_models um
JOIN users u ON um.user_id = u.id
WHERE u.email = 'hafdis@icloud.com';

-- Check training runs
SELECT 'Training Runs' as check_type,
       tr.id, tr.user_id, tr.status, tr.replicate_training_id,
       tr.version_id, tr.created_at
FROM training_runs tr
JOIN users u ON tr.user_id = u.id
WHERE u.email = 'hafdis@icloud.com';

-- Check lora weights
SELECT 'Lora Weights' as check_type,
       lw.id, lw.training_run_id, lw.weights_url, 
       lw.lora_scale, lw.created_at
FROM lora_weights lw
JOIN training_runs tr ON lw.training_run_id = tr.id
JOIN users u ON tr.user_id = u.id
WHERE u.email = 'hafdis@icloud.com';

-- Check all users with similar email (in case of typo)
SELECT 'Similar Emails' as check_type,
       id, email, created_at
FROM users
WHERE email ILIKE '%hafdis%' OR email ILIKE '%icloud%';
