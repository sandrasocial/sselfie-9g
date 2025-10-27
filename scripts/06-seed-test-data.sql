-- Seed test data for development

-- Insert a test user
INSERT INTO users (id, email, name, avatar_url)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'test@sselfie.com', 'Test User', '/placeholder.svg?height=100&width=100')
ON CONFLICT (email) DO NOTHING;

-- Insert test user profile
INSERT INTO user_profiles (user_id, bio, gender, preferences)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'AI photography enthusiast', 'female', '{"notifications": true, "theme": "dark"}')
ON CONFLICT (user_id) DO NOTHING;

-- Insert test subscription
INSERT INTO subscriptions (user_id, tier, status, current_period_start, current_period_end)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 'pro', 'active', NOW(), NOW() + INTERVAL '30 days')
ON CONFLICT DO NOTHING;

-- Insert test Maya chat
INSERT INTO maya_chats (id, user_id, title)
VALUES 
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'My First Chat with Maya')
ON CONFLICT DO NOTHING;

-- Insert test chat messages
INSERT INTO maya_chat_messages (chat_id, role, content)
VALUES 
  ('00000000-0000-0000-0000-000000000002', 'user', 'Hi Maya! I want to create professional headshots.'),
  ('00000000-0000-0000-0000-000000000002', 'assistant', 'Hello! I''d love to help you create stunning professional headshots. Let me understand your vision better - what industry are you in, and what kind of impression do you want to make?')
ON CONFLICT DO NOTHING;

-- Insert test concept card
INSERT INTO concept_cards (user_id, chat_id, title, description, prompt, aesthetic_recipe)
VALUES 
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 
   'Professional Headshot', 
   'Clean, professional corporate headshot with natural lighting',
   'professional corporate headshot, natural lighting, neutral background, confident expression',
   'Corporate Elegance')
ON CONFLICT DO NOTHING;

-- Insert test personal brand
INSERT INTO user_personal_brand (user_id, brand_name, brand_voice, brand_values, target_audience)
VALUES 
  ('00000000-0000-0000-0000-000000000001', 
   'My Personal Brand', 
   'Professional yet approachable',
   ARRAY['authenticity', 'innovation', 'excellence'],
   'Young professionals in tech')
ON CONFLICT (user_id) DO NOTHING;

SELECT 'Test data seeded successfully!' as message;
