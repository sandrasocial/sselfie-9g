-- Add vector search metadata to competitor_content_analysis table
ALTER TABLE competitor_content_analysis
ADD COLUMN IF NOT EXISTS vector_indexed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS vector_id TEXT,
ADD COLUMN IF NOT EXISTS embedding_model TEXT DEFAULT 'text-embedding-3-small';

-- Add vector search metadata to maya_chat_messages for campaign history
ALTER TABLE maya_chat_messages
ADD COLUMN IF NOT EXISTS vector_indexed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS vector_id TEXT,
ADD COLUMN IF NOT EXISTS is_campaign BOOLEAN DEFAULT FALSE;

-- Create index for faster vector lookups
CREATE INDEX IF NOT EXISTS idx_competitor_content_vector ON competitor_content_analysis(vector_indexed, vector_id);
CREATE INDEX IF NOT EXISTS idx_maya_messages_vector ON maya_chat_messages(vector_indexed, vector_id);
CREATE INDEX IF NOT EXISTS idx_maya_messages_campaign ON maya_chat_messages(is_campaign) WHERE is_campaign = TRUE;

-- Add content type to generated_images for better categorization
ALTER TABLE generated_images
ADD COLUMN IF NOT EXISTS content_category TEXT,
ADD COLUMN IF NOT EXISTS content_tags TEXT[];

CREATE INDEX IF NOT EXISTS idx_generated_images_category ON generated_images(content_category);
