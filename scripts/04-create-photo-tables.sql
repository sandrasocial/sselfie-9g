-- ⚠️ DEPRECATED: This schema was NEVER APPLIED to the database
-- 
-- The actual database uses SERIAL (INTEGER) for IDs and TEXT for user_id.
-- See scripts/00-create-all-tables.sql for the ACTUAL schema.
-- 
-- DO NOT USE THIS FILE - It uses UUID types that don't match the database.
-- This file is kept for reference only.
-- 
-- Key differences:
-- - generated_images.id is SERIAL (INTEGER), NOT UUID
-- - generated_images.user_id is TEXT, NOT UUID
-- - generated_images does NOT have concept_card_id column
-- - generated_images has image_urls (TEXT[]) and selected_url (TEXT), NOT image_url

-- Photo Generation & Gallery Tables

-- Generated images
CREATE TABLE IF NOT EXISTS generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  concept_card_id UUID,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  replicate_prediction_id TEXT,
  model_version TEXT,
  width INTEGER,
  height INTEGER,
  seed INTEGER,
  guidance_scale DECIMAL(4,2),
  num_inference_steps INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Concept cards (photo ideas from Maya)
CREATE TABLE IF NOT EXISTS concept_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  chat_id UUID REFERENCES maya_chats(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,
  aesthetic_recipe TEXT,
  reference_image_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'archived')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Photo selections (favorites, collections)
CREATE TABLE IF NOT EXISTS photo_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  image_id UUID REFERENCES generated_images(id) ON DELETE CASCADE,
  selection_type TEXT NOT NULL CHECK (selection_type IN ('favorite', 'collection', 'portfolio')),
  collection_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, image_id, selection_type, collection_name)
);

-- Add foreign key for concept_card_id
ALTER TABLE generated_images 
  ADD CONSTRAINT fk_generated_images_concept_card 
  FOREIGN KEY (concept_card_id) 
  REFERENCES concept_cards(id) 
  ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON generated_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_concept_cards_user_id ON concept_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_concept_cards_chat_id ON concept_cards(chat_id);
CREATE INDEX IF NOT EXISTS idx_photo_selections_user_id ON photo_selections(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_selections_image_id ON photo_selections(image_id);
