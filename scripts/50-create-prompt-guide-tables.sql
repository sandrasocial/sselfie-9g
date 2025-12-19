-- Prompt Guide Builder Tables

-- Prompt guides - Container for collections of prompts
CREATE TABLE IF NOT EXISTS prompt_guides (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- e.g., "Chanel Luxury", "ALO Workout", "Travel"
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP,
  total_prompts INTEGER DEFAULT 0,
  total_approved INTEGER DEFAULT 0
);

-- Prompt guide items - Individual prompts with approved images
CREATE TABLE IF NOT EXISTS prompt_guide_items (
  id SERIAL PRIMARY KEY,
  guide_id INTEGER REFERENCES prompt_guides(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  concept_title VARCHAR(255),
  concept_description TEXT,
  category VARCHAR(100),
  image_url TEXT, -- approved image from generation
  replicate_prediction_id TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  sort_order INTEGER DEFAULT 0,
  generation_settings JSONB, -- store quality settings used
  created_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  approved_by TEXT REFERENCES users(id)
);

-- Prompt pages - Public URL-based pages for guides
CREATE TABLE IF NOT EXISTS prompt_pages (
  id SERIAL PRIMARY KEY,
  guide_id INTEGER REFERENCES prompt_guides(id) ON DELETE CASCADE,
  slug VARCHAR(255) UNIQUE NOT NULL, -- URL slug for public access
  title VARCHAR(255) NOT NULL,
  welcome_message TEXT, -- Sandra's intro message
  email_capture_type VARCHAR(50) DEFAULT 'modal' CHECK (email_capture_type IN ('modal', 'inline', 'top')),
  email_list_tag VARCHAR(100), -- Resend tag for this guide
  upsell_link TEXT, -- direct checkout or landing page URL
  upsell_text TEXT, -- CTA copy
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  view_count INTEGER DEFAULT 0,
  email_capture_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  published_at TIMESTAMP
);

-- Writing assistant outputs - Saved content from writing assistant
CREATE TABLE IF NOT EXISTS writing_assistant_outputs (
  id SERIAL PRIMARY KEY,
  content_pillar VARCHAR(100), -- 'prompts', 'story', 'future_self', 'photoshoot'
  output_type VARCHAR(50), -- 'caption', 'overlay', 'voiceover', 'hashtags'
  content TEXT NOT NULL,
  context JSONB, -- additional metadata like prompt used, images referenced
  calendar_scheduled BOOLEAN DEFAULT false,
  scheduled_date TIMESTAMP,
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_prompt_guides_status ON prompt_guides(status);
CREATE INDEX IF NOT EXISTS idx_prompt_guide_items_guide_id ON prompt_guide_items(guide_id);
CREATE INDEX IF NOT EXISTS idx_prompt_guide_items_status ON prompt_guide_items(status);
CREATE INDEX IF NOT EXISTS idx_prompt_pages_slug ON prompt_pages(slug);
CREATE INDEX IF NOT EXISTS idx_prompt_pages_guide_id ON prompt_pages(guide_id);
CREATE INDEX IF NOT EXISTS idx_writing_assistant_pillar ON writing_assistant_outputs(content_pillar);
