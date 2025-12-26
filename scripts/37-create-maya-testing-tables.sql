-- Maya Testing Lab Database Schema
-- Creates tables for testing training parameters, prompts, and image generation
-- All test data is isolated from production

-- Test configurations and results
CREATE TABLE IF NOT EXISTS maya_test_results (
  id SERIAL PRIMARY KEY,
  test_name VARCHAR(255) NOT NULL,
  test_type VARCHAR(50) NOT NULL, -- 'training', 'prompt', 'generation', 'comparison'
  test_user_id TEXT REFERENCES users(id), -- Test user for training/generation
  configuration JSONB NOT NULL, -- All test parameters (training params, prompt settings, etc.)
  results JSONB, -- Test results (generated images, metrics, comparison scores, etc.)
  created_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT REFERENCES users(id), -- Admin who created the test
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  comparison_group_id INTEGER, -- Group tests for comparison
  status VARCHAR(50) DEFAULT 'pending' -- 'pending', 'running', 'completed', 'failed'
);

CREATE INDEX IF NOT EXISTS idx_maya_test_results_test_type ON maya_test_results(test_type);
CREATE INDEX IF NOT EXISTS idx_maya_test_results_test_user ON maya_test_results(test_user_id);
CREATE INDEX IF NOT EXISTS idx_maya_test_results_comparison_group ON maya_test_results(comparison_group_id);
CREATE INDEX IF NOT EXISTS idx_maya_test_results_created_at ON maya_test_results(created_at DESC);

-- Test training sessions (isolated from production)
CREATE TABLE IF NOT EXISTS maya_test_trainings (
  id SERIAL PRIMARY KEY,
  test_result_id INTEGER REFERENCES maya_test_results(id),
  test_user_id TEXT REFERENCES users(id),
  training_params JSONB NOT NULL, -- {lora_rank, learning_rate, caption_dropout_rate, steps, etc.}
  replicate_training_id TEXT,
  replicate_model_id TEXT, -- The trained model ID
  training_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'training', 'completed', 'failed'
  model_url TEXT,
  trigger_word TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  metrics JSONB, -- Training metrics (loss, steps, duration, etc.)
  training_images_count INTEGER,
  training_images_urls TEXT[] -- URLs of images used for training
);

CREATE INDEX IF NOT EXISTS idx_maya_test_trainings_test_result ON maya_test_trainings(test_result_id);
CREATE INDEX IF NOT EXISTS idx_maya_test_trainings_status ON maya_test_trainings(training_status);

-- Test image generations
CREATE TABLE IF NOT EXISTS maya_test_images (
  id SERIAL PRIMARY KEY,
  test_result_id INTEGER REFERENCES maya_test_results(id),
  prompt TEXT NOT NULL,
  prompt_settings JSONB NOT NULL, -- {length_range, lighting_style, feature_inclusion, etc.}
  image_url TEXT NOT NULL,
  generation_params JSONB NOT NULL, -- Replicate generation params
  created_at TIMESTAMP DEFAULT NOW(),
  comparison_rank INTEGER, -- For ranking in comparison view (1 = best)
  rating INTEGER, -- User rating 1-5
  notes TEXT,
  generation_time_ms INTEGER,
  replicate_prediction_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_maya_test_images_test_result ON maya_test_images(test_result_id);
CREATE INDEX IF NOT EXISTS idx_maya_test_images_comparison_rank ON maya_test_images(comparison_rank);

-- Test comparisons (grouping multiple tests for side-by-side comparison)
CREATE TABLE IF NOT EXISTS maya_test_comparisons (
  id SERIAL PRIMARY KEY,
  comparison_name VARCHAR(255) NOT NULL,
  test_result_ids INTEGER[] NOT NULL, -- Array of test_result_ids to compare
  created_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT REFERENCES users(id),
  winner_test_result_id INTEGER REFERENCES maya_test_results(id), -- Which test won
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_maya_test_comparisons_created_at ON maya_test_comparisons(created_at DESC);

-- Test configurations (saved presets for easy reuse)
CREATE TABLE IF NOT EXISTS maya_test_configs (
  id SERIAL PRIMARY KEY,
  config_name VARCHAR(255) NOT NULL,
  config_type VARCHAR(50) NOT NULL, -- 'training', 'prompt', 'generation'
  configuration JSONB NOT NULL, -- The saved configuration
  created_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT REFERENCES users(id),
  is_template BOOLEAN DEFAULT false, -- Template configs are shared/defaults
  description TEXT
);

CREATE INDEX IF NOT EXISTS idx_maya_test_configs_config_type ON maya_test_configs(config_type);
CREATE INDEX IF NOT EXISTS idx_maya_test_configs_created_by ON maya_test_configs(created_by);

COMMENT ON TABLE maya_test_results IS 'Main test results table - tracks all Maya testing experiments';
COMMENT ON TABLE maya_test_trainings IS 'Training sessions with custom parameters for testing';
COMMENT ON TABLE maya_test_images IS 'Generated images from prompt/generation tests';
COMMENT ON TABLE maya_test_comparisons IS 'Groupings of tests for side-by-side comparison';
COMMENT ON TABLE maya_test_configs IS 'Saved test configurations for easy reuse';





























