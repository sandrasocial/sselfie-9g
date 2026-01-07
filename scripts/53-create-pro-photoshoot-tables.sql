-- Pro Photoshoot Tables
-- Stores Pro Photoshoot sessions, grids, and frames (admin-only feature)

-- Sessions table: tracks overall photoshoot session
CREATE TABLE IF NOT EXISTS pro_photoshoot_sessions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_image_id INTEGER NOT NULL REFERENCES ai_images(id) ON DELETE CASCADE,
  total_grids INTEGER NOT NULL DEFAULT 8,
  session_status TEXT NOT NULL DEFAULT 'active' CHECK (session_status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Grids table: stores each 3x3 grid generated
CREATE TABLE IF NOT EXISTS pro_photoshoot_grids (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES pro_photoshoot_sessions(id) ON DELETE CASCADE,
  grid_number INTEGER NOT NULL CHECK (grid_number >= 1 AND grid_number <= 8),
  prediction_id TEXT,
  grid_url TEXT, -- Full grid image URL (Vercel Blob)
  generation_status TEXT NOT NULL DEFAULT 'pending' CHECK (generation_status IN ('pending', 'generating', 'completed', 'failed')),
  prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(session_id, grid_number)
);

-- Frames table: stores individual frames (9 per grid)
CREATE TABLE IF NOT EXISTS pro_photoshoot_frames (
  id SERIAL PRIMARY KEY,
  grid_id INTEGER NOT NULL REFERENCES pro_photoshoot_grids(id) ON DELETE CASCADE,
  frame_number INTEGER NOT NULL CHECK (frame_number >= 1 AND frame_number <= 9),
  frame_url TEXT NOT NULL, -- Individual frame image URL (Vercel Blob)
  gallery_image_id INTEGER REFERENCES ai_images(id) ON DELETE SET NULL, -- Link to ai_images gallery entry
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(grid_id, frame_number)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pro_photoshoot_sessions_user_id ON pro_photoshoot_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_pro_photoshoot_sessions_status ON pro_photoshoot_sessions(session_status);
CREATE INDEX IF NOT EXISTS idx_pro_photoshoot_sessions_original_image ON pro_photoshoot_sessions(original_image_id);
CREATE INDEX IF NOT EXISTS idx_pro_photoshoot_grids_session_id ON pro_photoshoot_grids(session_id);
CREATE INDEX IF NOT EXISTS idx_pro_photoshoot_grids_prediction_id ON pro_photoshoot_grids(prediction_id);
CREATE INDEX IF NOT EXISTS idx_pro_photoshoot_grids_status ON pro_photoshoot_grids(generation_status);
CREATE INDEX IF NOT EXISTS idx_pro_photoshoot_frames_grid_id ON pro_photoshoot_frames(grid_id);
CREATE INDEX IF NOT EXISTS idx_pro_photoshoot_frames_gallery_image ON pro_photoshoot_frames(gallery_image_id);

-- Comments
COMMENT ON TABLE pro_photoshoot_sessions IS 'Pro Photoshoot sessions (admin-only feature)';
COMMENT ON TABLE pro_photoshoot_grids IS '3x3 grids generated for Pro Photoshoot';
COMMENT ON TABLE pro_photoshoot_frames IS 'Individual frames extracted from grids (9 per grid)';

