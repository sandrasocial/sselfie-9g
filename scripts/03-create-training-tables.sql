-- Training Pipeline Tables

-- Training runs for LoRA model training
CREATE TABLE IF NOT EXISTS training_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'training', 'completed', 'failed')),
  replicate_training_id TEXT,
  replicate_version_id TEXT,
  trigger_word TEXT,
  progress INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Selfie uploads for training
CREATE TABLE IF NOT EXISTS selfie_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  training_run_id UUID REFERENCES training_runs(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'processed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LoRA weights (trained model files)
CREATE TABLE IF NOT EXISTS lora_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_run_id UUID REFERENCES training_runs(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  version TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User models (active trained models)
CREATE TABLE IF NOT EXISTS user_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  training_run_id UUID REFERENCES training_runs(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  trigger_word TEXT NOT NULL,
  replicate_version_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_runs_user_id ON training_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_training_runs_status ON training_runs(status);
CREATE INDEX IF NOT EXISTS idx_selfie_uploads_training_run_id ON selfie_uploads(training_run_id);
CREATE INDEX IF NOT EXISTS idx_user_models_user_id ON user_models(user_id);
CREATE INDEX IF NOT EXISTS idx_user_models_active ON user_models(user_id, is_active);
