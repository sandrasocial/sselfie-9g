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
'A woman photographed in soft editorial style on a Parisian street. Warm afternoon light. She is wearing a tailored beige coat with a silk scarf. The scene has film grain texture and a slight colour fade. Expression is calm and confident. Background is blurred cobblestone and cafe awnings. The composition is close to her face with shoulders visible. The image looks like it came from a high-fashion magazine shoot.',
'Warm, film-grain, editorial'),

(CURRENT_DATE + 1, 'Studio Headshot',
'A professional studio headshot with clean white background and soft diffused lighting from the left. The subject looks directly into camera with a warm, confident expression. Sharp focus on eyes. Neutral skin tones. Minimal makeup look. Hair pulled back softly. The image reads as a premium LinkedIn or speaker profile photo. No props. Clean and polished.',
'Clean, professional, studio'),

(CURRENT_DATE + 2, 'Golden Hour Lifestyle',
'A warm golden hour lifestyle portrait. The subject is outdoors in soft backlight, sun low behind them creating a warm halo effect. They are smiling naturally, relaxed body language. Wearing simple linen clothing in cream or white tones. Background is blurred greenery and warm light. The photo feels authentic, like a real moment rather than a pose. Skin glows in the warm light.',
'Warm, glowing, outdoor lifestyle'),

(CURRENT_DATE + 3, 'Dark Editorial',
'A moody editorial portrait with dark background. Deep shadows. The subject is lit with a single dramatic light source from the side creating strong contrast across the face. Expression is serious and direct. The colour grade is cool and desaturated. The overall mood is high-fashion and intentional. Shot in portrait orientation with tight crop.',
'Dark, dramatic, high-fashion'),

(CURRENT_DATE + 4, 'Coffee Shop Story',
'A natural lifestyle photo inside a bright minimal coffee shop. The subject is seated at a white marble table, holding a coffee cup, looking out a window. Natural daylight from a large window. Bright airy mood. Light clothing. The background is softly blurred with warm tones. The photo feels candid and real, like a moment caught mid-thought. Neutral colour grading.',
'Bright, airy, lifestyle'),

(CURRENT_DATE + 5, 'Scandinavian Minimalist',
'A minimalist Scandinavian interior portrait. The subject is standing beside a large window in a white room. Natural soft light fills the space. Wearing a simple oversized white or cream knit sweater. Expression is calm. The colour palette is all white, cream, and light grey. The image has a clean, editorial Scandinavian design aesthetic. Quiet, considered, beautiful.',
'Minimal, Scandinavian, clean'),

(CURRENT_DATE + 6, 'Brand Founder Portrait',
'A strong, confident brand founder portrait. The subject is standing or leaning against a clean modern wall. Well-lit with soft natural light. Business casual clothing in a neutral palette. Direct eye contact with the camera. The expression says capability and warmth. The image could be used on a website about page or for press. Professional but not stiff.',
'Brand, founder, authority')

ON CONFLICT (prompt_date) DO NOTHING;
