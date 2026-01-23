-- Feed Planner Admin Control Tables
-- Creates database tables for style definitions and prompt templates

BEGIN;

-- Table 1: feed_style_definitions
CREATE TABLE IF NOT EXISTS feed_style_definitions (
  id SERIAL PRIMARY KEY,
  visual_aesthetic VARCHAR(100) NOT NULL,
  feed_style VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  mood VARCHAR(50) NOT NULL,
  color_palette JSONB,
  color_hex_codes JSONB,
  lighting_description TEXT,
  mood_description TEXT,
  background_style TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_feed_style_definition UNIQUE (visual_aesthetic, feed_style)
);

CREATE INDEX IF NOT EXISTS idx_feed_style_definitions_category ON feed_style_definitions(category);
CREATE INDEX IF NOT EXISTS idx_feed_style_definitions_mood ON feed_style_definitions(mood);
CREATE INDEX IF NOT EXISTS idx_feed_style_definitions_enabled ON feed_style_definitions(enabled);

COMMENT ON TABLE feed_style_definitions IS 'Defines feed style combinations (UI labels + internal category/mood).';
COMMENT ON COLUMN feed_style_definitions.visual_aesthetic IS 'UI label, e.g. "Edgy", "Luxury".';
COMMENT ON COLUMN feed_style_definitions.feed_style IS 'UI label, e.g. "Dark & Moody".';
COMMENT ON COLUMN feed_style_definitions.category IS 'Internal category key, e.g. "edgy".';
COMMENT ON COLUMN feed_style_definitions.mood IS 'Internal mood key, e.g. "luxury".';

-- Table 2: fashion_style_definitions
CREATE TABLE IF NOT EXISTS fashion_style_definitions (
  id SERIAL PRIMARY KEY,
  fashion_style_name VARCHAR(100) NOT NULL,
  category_compatibility JSONB,
  outfit_base_options JSONB,
  outfit_layer_options JSONB,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_fashion_style_definition UNIQUE (fashion_style_name)
);

CREATE INDEX IF NOT EXISTS idx_fashion_style_definitions_enabled ON fashion_style_definitions(enabled);

COMMENT ON TABLE fashion_style_definitions IS 'Defines fashion styles and compatibility rules.';
COMMENT ON COLUMN fashion_style_definitions.fashion_style_name IS 'UI label, e.g. "Trendy", "Athletic".';

-- Table 3: feed_position_templates
CREATE TABLE IF NOT EXISTS feed_position_templates (
  id SERIAL PRIMARY KEY,
  visual_aesthetic VARCHAR(100) NOT NULL,
  feed_style VARCHAR(100) NOT NULL,
  fashion_style VARCHAR(100) NOT NULL,
  position INTEGER NOT NULL,
  activity VARCHAR(100),
  outfit_description TEXT,
  location_type VARCHAR(100),
  location_description TEXT,
  camera_framing VARCHAR(50),
  objects JSONB,
  lighting_type VARCHAR(100),
  pose_description TEXT,
  narrative TEXT,
  final_prompt_override TEXT,
  approved BOOLEAN DEFAULT false,
  last_tested_at TIMESTAMP WITH TIME ZONE,
  test_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_feed_position_template UNIQUE (visual_aesthetic, feed_style, fashion_style, position)
);

CREATE INDEX IF NOT EXISTS idx_feed_position_templates_combo ON feed_position_templates(visual_aesthetic, feed_style, fashion_style);
CREATE INDEX IF NOT EXISTS idx_feed_position_templates_position ON feed_position_templates(position);

COMMENT ON TABLE feed_position_templates IS 'Per-position templates for 3x3 feed generation.';
COMMENT ON COLUMN feed_position_templates.final_prompt_override IS 'Optional hand-authored prompt override for a position.';
COMMENT ON COLUMN feed_position_templates.outfit_description IS 'Human-readable outfit description for the position.';

-- Table 4: outfit_library
CREATE TABLE IF NOT EXISTS outfit_library (
  id SERIAL PRIMARY KEY,
  outfit_name VARCHAR(150) NOT NULL,
  fashion_style VARCHAR(100),
  category_fit JSONB,
  outfit_base VARCHAR(100),
  outfit_style VARCHAR(100),
  outfit_layer VARCHAR(100),
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_outfit_name_style UNIQUE (outfit_name, fashion_style)
);

CREATE INDEX IF NOT EXISTS idx_outfit_library_enabled ON outfit_library(enabled);
CREATE INDEX IF NOT EXISTS idx_outfit_library_fashion_style ON outfit_library(fashion_style);

COMMENT ON TABLE outfit_library IS 'Reusable outfit definitions for prompt assembly.';

-- Table 5: location_library
CREATE TABLE IF NOT EXISTS location_library (
  id SERIAL PRIMARY KEY,
  location_name VARCHAR(150) NOT NULL,
  location_type VARCHAR(100),
  category_fit JSONB,
  description TEXT,
  indoor BOOLEAN,
  public BOOLEAN,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_location_name_type UNIQUE (location_name, location_type)
);

CREATE INDEX IF NOT EXISTS idx_location_library_enabled ON location_library(enabled);
CREATE INDEX IF NOT EXISTS idx_location_library_type ON location_library(location_type);

COMMENT ON TABLE location_library IS 'Reusable location definitions for prompt assembly.';

-- Table 6: object_library
CREATE TABLE IF NOT EXISTS object_library (
  id SERIAL PRIMARY KEY,
  object_name VARCHAR(150) NOT NULL,
  object_type VARCHAR(100),
  category_fit JSONB,
  description TEXT,
  position_type VARCHAR(50),
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_object_name_type UNIQUE (object_name, object_type)
);

CREATE INDEX IF NOT EXISTS idx_object_library_enabled ON object_library(enabled);
CREATE INDEX IF NOT EXISTS idx_object_library_type ON object_library(object_type);

COMMENT ON TABLE object_library IS 'Reusable object definitions for flatlays and detail shots.';

COMMIT;
