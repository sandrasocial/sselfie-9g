-- Create all essential tables for SSELFIE app
-- Run this first before migrating data

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  display_name TEXT,
  profile_image_url TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'free',
  role TEXT DEFAULT 'user',
  monthly_generation_limit INTEGER DEFAULT 50,
  generations_used_this_month INTEGER DEFAULT 0,
  gender TEXT,
  profession TEXT,
  brand_style TEXT,
  photo_goals TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  location TEXT,
  instagram_handle TEXT,
  website_url TEXT,
  bio TEXT,
  brand_vibe TEXT,
  goals TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  plan_name TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Training runs table
CREATE TABLE IF NOT EXISTS training_runs (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  replicate_model_id TEXT,
  trigger_word TEXT NOT NULL,
  training_status TEXT DEFAULT 'pending',
  model_name TEXT,
  replicate_version_id TEXT,
  training_progress INTEGER DEFAULT 0,
  estimated_completion_time TIMESTAMPTZ,
  failure_reason TEXT,
  trained_model_path TEXT,
  lora_weights_url TEXT,
  training_id TEXT,
  is_luxury BOOLEAN DEFAULT false,
  model_type TEXT,
  finetune_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Generated images table
CREATE TABLE IF NOT EXISTS generated_images (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  model_id INTEGER REFERENCES training_runs(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  prompt TEXT NOT NULL,
  image_urls TEXT[] NOT NULL,
  selected_url TEXT,
  saved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maya chats table
CREATE TABLE IF NOT EXISTS maya_chats (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maya chat messages table
CREATE TABLE IF NOT EXISTS maya_chat_messages (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER REFERENCES maya_chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  concept_cards JSONB,
  styling_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maya personal memory table
CREATE TABLE IF NOT EXISTS maya_personal_memory (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  memory_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Concept cards table
CREATE TABLE IF NOT EXISTS concept_cards (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  chat_id INTEGER REFERENCES maya_chats(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  aesthetic TEXT,
  prompt TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User personal brand table
CREATE TABLE IF NOT EXISTS user_personal_brand (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  brand_name TEXT,
  brand_values TEXT[],
  target_audience TEXT,
  brand_personality TEXT,
  color_palette JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User styleguides table
CREATE TABLE IF NOT EXISTS user_styleguides (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  style_rules JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Selfie uploads table
CREATE TABLE IF NOT EXISTS selfie_uploads (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  training_run_id INTEGER REFERENCES training_runs(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- LoRA weights table
CREATE TABLE IF NOT EXISTS lora_weights (
  id SERIAL PRIMARY KEY,
  training_run_id INTEGER REFERENCES training_runs(id) ON DELETE CASCADE,
  weights_url TEXT NOT NULL,
  version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User models table
CREATE TABLE IF NOT EXISTS user_models (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  training_run_id INTEGER REFERENCES training_runs(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  trigger_word TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photo selections table
CREATE TABLE IF NOT EXISTS photo_selections (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  image_id INTEGER REFERENCES generated_images(id) ON DELETE CASCADE,
  selection_type TEXT CHECK (selection_type IN ('favorite', 'download', 'share')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_training_runs_user_id ON training_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_maya_chats_user_id ON maya_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_maya_chat_messages_chat_id ON maya_chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_concept_cards_user_id ON concept_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_selfie_uploads_training_run_id ON selfie_uploads(training_run_id);
CREATE INDEX IF NOT EXISTS idx_lora_weights_training_run_id ON lora_weights(training_run_id);
CREATE INDEX IF NOT EXISTS idx_user_models_user_id ON user_models(user_id);
