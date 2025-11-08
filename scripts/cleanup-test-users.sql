-- Pre-launch cleanup: Remove ALL users without completed trained models
-- This removes test users and keeps only real users who actually used the product

BEGIN;

-- Step 1: Show users we'll keep (have trained models)
SELECT 
    '✅ KEEPING' as action,
    u.email,
    u.display_name,
    COUNT(DISTINCT um.id) as trained_models,
    u.plan,
    u.created_at::date as created_date
FROM users u
INNER JOIN user_models um ON um.user_id = u.id AND um.training_status = 'completed'
GROUP BY u.id, u.email, u.display_name, u.plan, u.created_at
ORDER BY u.created_at DESC;

-- Step 2: Show users we'll delete (no trained models)
SELECT 
    '❌ DELETING' as action,
    u.email,
    u.display_name,
    u.plan,
    COALESCE(COUNT(DISTINCT um.id), 0) as models_attempted,
    u.created_at::date as created_date
FROM users u
LEFT JOIN user_models um ON um.user_id = u.id AND um.training_status = 'completed'
WHERE NOT EXISTS (
    SELECT 1 FROM user_models 
    WHERE user_id = u.id AND training_status = 'completed'
)
GROUP BY u.id, u.email, u.display_name, u.plan, u.created_at
ORDER BY u.created_at DESC;

-- Step 3: Delete all related data for users WITHOUT trained models
-- Delete in dependency order (children first, parents last)

-- Delete Maya chat messages for users without trained models
DELETE FROM maya_chat_messages 
WHERE chat_id IN (
    SELECT mc.id FROM maya_chats mc
    WHERE NOT EXISTS (
        SELECT 1 FROM user_models um 
        WHERE um.user_id = mc.user_id AND um.training_status = 'completed'
    )
);

-- Delete Maya chats
DELETE FROM maya_chats 
WHERE user_id IN (
    SELECT id FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM user_models um 
        WHERE um.user_id = u.id AND um.training_status = 'completed'
    )
);

-- Delete credit transactions
DELETE FROM credit_transactions 
WHERE user_id IN (
    SELECT id FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM user_models um 
        WHERE um.user_id = u.id AND um.training_status = 'completed'
    )
);

-- Delete subscriptions
DELETE FROM subscriptions 
WHERE user_id IN (
    SELECT id FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM user_models um 
        WHERE um.user_id = u.id AND um.training_status = 'completed'
    )
);

-- Delete academy enrollments
DELETE FROM user_academy_enrollments 
WHERE user_id IN (
    SELECT id FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM user_models um 
        WHERE um.user_id = u.id AND um.training_status = 'completed'
    )
);

-- Delete lesson progress
DELETE FROM user_lesson_progress 
WHERE user_id IN (
    SELECT id FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM user_models um 
        WHERE um.user_id = u.id AND um.training_status = 'completed'
    )
);

-- Delete resource downloads
DELETE FROM user_resource_downloads 
WHERE user_id IN (
    SELECT id FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM user_models um 
        WHERE um.user_id = u.id AND um.training_status = 'completed'
    )
);

-- Delete feed layouts
DELETE FROM feed_layouts 
WHERE user_id IN (
    SELECT id FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM user_models um 
        WHERE um.user_id = u.id AND um.training_status = 'completed'
    )
);

-- Delete feed posts
DELETE FROM feed_posts 
WHERE user_id IN (
    SELECT id FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM user_models um 
        WHERE um.user_id = u.id AND um.training_status = 'completed'
    )
);

-- Delete user personal brand
DELETE FROM user_personal_brand 
WHERE user_id IN (
    SELECT id FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM user_models um 
        WHERE um.user_id = u.id AND um.training_status = 'completed'
    )
);

-- Delete user credits
DELETE FROM user_credits 
WHERE user_id IN (
    SELECT id FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM user_models um 
        WHERE um.user_id = u.id AND um.training_status = 'completed'
    )
);

-- Delete user style profile
DELETE FROM user_style_profile 
WHERE user_id IN (
    SELECT id FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM user_models um 
        WHERE um.user_id = u.id AND um.training_status = 'completed'
    )
);

-- Delete training runs (incomplete ones for these users)
DELETE FROM training_runs 
WHERE user_id IN (
    SELECT id FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM user_models um 
        WHERE um.user_id = u.id AND um.training_status = 'completed'
    )
);

-- Delete user models (incomplete/failed)
DELETE FROM user_models 
WHERE user_id IN (
    SELECT id FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM user_models um 
        WHERE um.user_id = u.id AND um.training_status = 'completed'
    )
);

-- Delete generated images
DELETE FROM generated_images 
WHERE user_id IN (
    SELECT id FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM user_models um 
        WHERE um.user_id = u.id AND um.training_status = 'completed'
    )
);

-- Delete AI images
DELETE FROM ai_images 
WHERE user_id IN (
    SELECT id FROM users u
    WHERE NOT EXISTS (
        SELECT 1 FROM user_models um 
        WHERE um.user_id = u.id AND um.training_status = 'completed'
    )
);

-- Step 4: Finally delete the users themselves
DELETE FROM users 
WHERE NOT EXISTS (
    SELECT 1 FROM user_models um 
    WHERE um.user_id = users.id AND um.training_status = 'completed'
);

-- Step 5: Show final statistics
SELECT 
    '📊 CLEANUP SUMMARY' as title,
    (SELECT COUNT(*) FROM users) as remaining_users,
    (SELECT COUNT(*) FROM user_models WHERE training_status = 'completed') as trained_models,
    (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') as active_subscriptions,
    (SELECT COALESCE(SUM(amount), 0)::float / 100 
     FROM credit_transactions 
     WHERE transaction_type = 'purchase' AND stripe_payment_id IS NOT NULL) as real_revenue_usd;

COMMIT;
