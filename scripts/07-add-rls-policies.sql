-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE maya_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE maya_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE maya_personal_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE selfie_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lora_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_personal_brand ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_styleguides ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- User profiles policies
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Subscriptions policies
CREATE POLICY "Users can view their own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription" ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Maya chats policies
CREATE POLICY "Users can view their own chats" ON maya_chats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chats" ON maya_chats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats" ON maya_chats
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats" ON maya_chats
  FOR DELETE USING (auth.uid() = user_id);

-- Maya chat messages policies
CREATE POLICY "Users can view messages from their chats" ON maya_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM maya_chats 
      WHERE maya_chats.id = maya_chat_messages.chat_id 
      AND maya_chats.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to their chats" ON maya_chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM maya_chats 
      WHERE maya_chats.id = maya_chat_messages.chat_id 
      AND maya_chats.user_id = auth.uid()
    )
  );

-- Maya personal memory policies
CREATE POLICY "Users can view their own memory" ON maya_personal_memory
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own memory" ON maya_personal_memory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memory" ON maya_personal_memory
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memory" ON maya_personal_memory
  FOR DELETE USING (auth.uid() = user_id);

-- Training runs policies
CREATE POLICY "Users can view their own training runs" ON training_runs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training runs" ON training_runs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training runs" ON training_runs
  FOR UPDATE USING (auth.uid() = user_id);

-- Selfie uploads policies
CREATE POLICY "Users can view their own selfies" ON selfie_uploads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own selfies" ON selfie_uploads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own selfies" ON selfie_uploads
  FOR DELETE USING (auth.uid() = user_id);

-- LoRA weights policies
CREATE POLICY "Users can view their own LoRA weights" ON lora_weights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM training_runs 
      WHERE training_runs.id = lora_weights.training_run_id 
      AND training_runs.user_id = auth.uid()
    )
  );

-- User models policies
CREATE POLICY "Users can view their own models" ON user_models
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own models" ON user_models
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own models" ON user_models
  FOR UPDATE USING (auth.uid() = user_id);

-- Generated images policies
CREATE POLICY "Users can view their own images" ON generated_images
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own images" ON generated_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images" ON generated_images
  FOR DELETE USING (auth.uid() = user_id);

-- Concept cards policies
CREATE POLICY "Users can view their own concept cards" ON concept_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own concept cards" ON concept_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own concept cards" ON concept_cards
  FOR UPDATE USING (auth.uid() = user_id);

-- Photo selections policies
CREATE POLICY "Users can view their own selections" ON photo_selections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own selections" ON photo_selections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own selections" ON photo_selections
  FOR DELETE USING (auth.uid() = user_id);

-- User personal brand policies
CREATE POLICY "Users can view their own brand" ON user_personal_brand
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own brand" ON user_personal_brand
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own brand" ON user_personal_brand
  FOR UPDATE USING (auth.uid() = user_id);

-- User styleguides policies
CREATE POLICY "Users can view their own styleguides" ON user_styleguides
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own styleguides" ON user_styleguides
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own styleguides" ON user_styleguides
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own styleguides" ON user_styleguides
  FOR DELETE USING (auth.uid() = user_id);
