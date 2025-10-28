-- Fix lora data for user hafdis@icloud.com

-- First, let's find the user
DO $$
DECLARE
  v_user_id VARCHAR;
  v_model_id INTEGER;
  v_training_run_id INTEGER;
BEGIN
  -- Get the user ID
  SELECT id INTO v_user_id
  FROM users
  WHERE email = 'hafdis@icloud.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User hafdis@icloud.com not found';
    RETURN;
  END IF;

  RAISE NOTICE 'Found user: %', v_user_id;

  -- Check if user has a model
  SELECT id INTO v_model_id
  FROM user_models
  WHERE user_id = v_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_model_id IS NULL THEN
    RAISE NOTICE 'No model found for user';
    RETURN;
  END IF;

  RAISE NOTICE 'Found model: %', v_model_id;

  -- Update lora_scale if it's NULL or 0
  UPDATE user_models
  SET lora_scale = 0.8
  WHERE id = v_model_id
    AND (lora_scale IS NULL OR lora_scale = 0);

  RAISE NOTICE 'Updated lora_scale for model %', v_model_id;

  -- Check if there's a training run
  SELECT id INTO v_training_run_id
  FROM training_runs
  WHERE user_id = v_user_id
    AND status = 'completed'
  ORDER BY completed_at DESC
  LIMIT 1;

  IF v_training_run_id IS NOT NULL THEN
    RAISE NOTICE 'Found training run: %', v_training_run_id;

    -- Check if lora_weights exists for this training run
    IF NOT EXISTS (
      SELECT 1 FROM lora_weights WHERE training_run_id = v_training_run_id
    ) THEN
      -- Create lora_weights entry if it doesn't exist
      INSERT INTO lora_weights (
        user_id,
        training_run_id,
        status,
        default_scales,
        created_at,
        updated_at
      ) VALUES (
        v_user_id,
        v_training_run_id,
        'ready',
        '{"default": 0.8}'::jsonb,
        NOW(),
        NOW()
      );
      RAISE NOTICE 'Created lora_weights entry for training run %', v_training_run_id;
    ELSE
      -- Update existing lora_weights
      UPDATE lora_weights
      SET default_scales = '{"default": 0.8}'::jsonb,
          updated_at = NOW()
      WHERE training_run_id = v_training_run_id;
      RAISE NOTICE 'Updated lora_weights for training run %', v_training_run_id;
    END IF;
  END IF;

  -- Display final status
  RAISE NOTICE 'Lora data fix completed for hafdis@icloud.com';
  
END $$;

-- Verify the fix
SELECT 
  u.email,
  u.id as user_id,
  um.id as model_id,
  um.lora_scale,
  um.training_status,
  tr.id as training_run_id,
  tr.status as training_status,
  lw.id as lora_weights_id,
  lw.default_scales
FROM users u
LEFT JOIN user_models um ON u.id = um.user_id
LEFT JOIN training_runs tr ON u.id = tr.user_id AND tr.status = 'completed'
LEFT JOIN lora_weights lw ON tr.id = lw.training_run_id
WHERE u.email = 'hafdis@icloud.com'
ORDER BY um.created_at DESC, tr.completed_at DESC
LIMIT 5;
