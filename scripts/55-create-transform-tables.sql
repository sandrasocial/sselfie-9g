-- Transform mini-product tables
-- Daily prompts Sandra writes, shown in the tool each day

CREATE TABLE IF NOT EXISTS transform_daily_prompts (
  id SERIAL PRIMARY KEY,
  prompt_date DATE UNIQUE NOT NULL,
  title VARCHAR(120) NOT NULL,
  prompt_text TEXT NOT NULL,
  style_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track generations so users can see their history (lightweight, no gallery)
CREATE TABLE IF NOT EXISTS transform_generations (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  prediction_id VARCHAR(255) NOT NULL UNIQUE,
  input_image_url TEXT NOT NULL,
  output_image_url TEXT,
  prompt_title VARCHAR(120),
  prompt_text TEXT NOT NULL,
  status VARCHAR(32) DEFAULT 'processing',
  credits_used INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS transform_generations_user_id_idx ON transform_generations (user_id);
CREATE INDEX IF NOT EXISTS transform_generations_prediction_id_idx ON transform_generations (prediction_id);

-- Seed the first 7 days of prompts so the tool is live immediately
INSERT INTO transform_daily_prompts (prompt_date, title, prompt_text, style_notes) VALUES
(CURRENT_DATE, 'The Parisian Editorial',
'Edit the uploaded photo into a warm Parisian editorial aesthetic. Preserve the person''s exact face, identity, age, body, expression, pose, and recognizable features. Do not create a new person, replace the face, change facial structure, or make the image look like an AI avatar. Improve the light with soft afternoon warmth, subtle film grain, gentle contrast, polished skin tone, and a refined magazine-style color grade. Keep the result believable as the same real photo, just more editorial.',
'Warm light, soft grain, magazine polish'),

(CURRENT_DATE + 1, 'Studio Headshot',
'Edit the uploaded photo into a clean studio headshot aesthetic. Preserve the person''s exact face, identity, age, body, expression, pose, and recognizable features. Do not create a new person, replace the face, change facial structure, or over-retouch. Brighten the image with soft studio-style light, clean neutral background polish, natural skin texture, crisp details, and a professional portrait finish. Keep the result believable and recognizably the same person.',
'Clean light, sharp detail, professional finish'),

(CURRENT_DATE + 2, 'Golden Hour Lifestyle',
'Edit the uploaded photo into a golden hour lifestyle aesthetic. Preserve the person''s exact face, identity, age, body, expression, pose, and recognizable features. Do not create a new person, replace the face, change facial structure, or make the scene unrealistic. Add warm backlit glow, soft skin luminosity, natural contrast, gentle highlights, and a relaxed editorial color grade. Keep the result realistic, postable, and clearly based on the original photo.',
'Warm glow, natural color, relaxed polish'),

(CURRENT_DATE + 3, 'Dark Editorial',
'Edit the uploaded photo into a dark editorial aesthetic. Preserve the person''s exact face, identity, age, body, expression, pose, and recognizable features. Do not create a new person, replace the face, change facial structure, or make the image look artificial. Add controlled shadows, refined contrast, cool neutral color, subtle skin polish, and a high-fashion portrait mood. Keep the edit tasteful, realistic, and still clearly the same original person.',
'Moody contrast, cool grade, high-fashion mood'),

(CURRENT_DATE + 4, 'Coffee Shop Story',
'Edit the uploaded photo into a soft coffee shop lifestyle aesthetic. Preserve the person''s exact face, identity, age, body, expression, pose, and recognizable features. Do not create a new person, replace the face, change facial structure, or add distracting fake details. Add natural window-light softness, warm neutral tones, gentle depth, clean contrast, and an easy editorial lifestyle finish. Keep the photo believable and recognizably the same person.',
'Soft window light, warm neutral, lifestyle finish'),

(CURRENT_DATE + 5, 'Scandinavian Minimalist',
'Edit the uploaded photo into a Scandinavian minimalist aesthetic. Preserve the person''s exact face, identity, age, body, expression, pose, and recognizable features. Do not create a new person, replace the face, change facial structure, or over-smooth the skin. Clean up the color with soft whites, light stone neutrals, natural window-light feeling, low visual clutter, and quiet editorial polish. Keep the edit realistic and grounded in the original photo.',
'Soft whites, light stone, minimal polish'),

(CURRENT_DATE + 6, 'Brand Founder Portrait',
'Edit the uploaded photo into a confident founder portrait aesthetic. Preserve the person''s exact face, identity, age, body, expression, pose, and recognizable features. Do not create a new person, replace the face, change facial structure, or make the edit look corporate or fake. Add soft natural light, clean neutral tones, sharper detail, subtle skin polish, and a calm confident editorial finish. Keep the result personal, warm, and realistic.',
'Confident, natural light, refined portrait')

ON CONFLICT (prompt_date) DO NOTHING;
