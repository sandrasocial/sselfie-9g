-- Create testimonials table to store customer feedback
CREATE TABLE IF NOT EXISTS admin_testimonials (
  id SERIAL PRIMARY KEY,
  customer_name TEXT,
  customer_email TEXT,
  testimonial_text TEXT NOT NULL,
  testimonial_type TEXT CHECK (testimonial_type IN ('review', 'dm', 'email', 'social')),
  platform TEXT, -- instagram, email, website, etc
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  screenshot_url TEXT,
  product_mentioned TEXT, -- which SSELFIE feature they loved
  key_benefits JSONB, -- extracted benefits/wins
  emotional_tone TEXT, -- excited, grateful, transformative, etc
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  collected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_testimonials_type ON admin_testimonials(testimonial_type);
CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON admin_testimonials(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_testimonials_published ON admin_testimonials(is_published) WHERE is_published = true;

-- Insert the testimonials you shared
INSERT INTO admin_testimonials (
  customer_name,
  testimonial_text,
  testimonial_type,
  platform,
  rating,
  screenshot_url,
  product_mentioned,
  key_benefits,
  emotional_tone,
  is_featured
) VALUES
(
  'Anonymous',
  'This is incredible...I started just having fun with the photos but then I started tweaking the way I looked and asking Maya to make adjustments and WOW!!! It''s so good! Love that you can turn the pics into video and I''m diving into the course now...only watched the intro and already love what I''m hearing!! Thank you for pushing past all the challenges to get to this point! I am going to do the same no matter how hard this transformation will be!',
  'review',
  'website',
  5,
  '/images/skjermbilde-202025-11-15-20kl.png',
  'AI Photoshoot + Maya + Course',
  '{"tweaking": true, "video_feature": true, "course_value": true, "transformation": true}',
  'excited',
  true
),
(
  'Laurie Garcia (@lgarcia0927)',
  'Ohhhemmmgeeee girl!!! This is uhhhhmazing!! I gave Maya my story and she nailed it!!! In college and Uni I took creative writing and I''ve always been a coach developing people and their careers...You think you''re naturally just good at this sort of thing but social media and AI are a whole different ball game!!!I''m not from the generation that understands how to deliver without a physical audience..Virtually training employees is even significantly different than reaching people on social media. Girl!! You DID it!!! I knew you would!! It''s so awesome and I haven''t even uploaded any pics yet!! I can''t wait for you to see!!',
  'dm',
  'instagram',
  5,
  '/images/img-8641.png',
  'Maya AI',
  '{"story_understanding": true, "ai_guidance": true, "ease_of_use": true, "confidence_boost": true}',
  'transformative',
  true
),
(
  'Anonymous',
  'I have been playing with this for a few days..... and I am blown away. I cannot wait to see how far this app goes... GIRL you did it. I am so picky its not even funny.. but this... my GOD!',
  'dm',
  'instagram',
  5,
  '/images/img-8640.jpg',
  'AI Photoshoot',
  '{"quality": true, "exceeded_expectations": true, "picky_customer_satisfied": true}',
  'excited',
  true
),
(
  'Anonymous',
  'Who said dreams have an expiration date? This is a great way to include myself along with some bra photography I have posted of my hobbies, aviation, equestrian activities and dance. Since I am single I don''t often have a quality image of myself so this solves that problem.',
  'review',
  'website',
  5,
  '/images/skjermbilde-202025-11-15-20kl.png',
  'AI Photoshoot',
  '{"self_image_problem_solved": true, "lifestyle_versatility": true, "personal_brand": true}',
  'grateful',
  true
),
(
  'Anonymous',
  'Best AI photo shoot ever. This is incredible...I started just having fun with the photos but then I started tweaking the way I looked and asking Maya to make adjustments and WOW!!! It''s so good! Love that you can turn the pics into video and I''m diving into the course now...only watched the intro and already love what I''m hearing!! Thank you for pushing past all the challenges to get to this point! I am going to do the same no matter how hard this transformation will be!',
  'review',
  'website',
  5,
  '/images/skjermbilde-202025-11-15-20kl.png',
  'AI Photoshoot + Maya',
  '{"fun_factor": true, "customization": true, "video_feature": true, "inspirational": true}',
  'excited',
  true
),
(
  'Anonymous',
  'Oh yes - 50 & fabulous. Best one so far ... love that it looks real and me',
  'dm',
  'instagram',
  5,
  '/images/img-8509-202.jpg',
  'AI Photoshoot',
  '{"realistic_results": true, "age_positive": true, "authenticity": true}',
  'grateful',
  true
),
(
  'Anonymous',
  'And another thing.. i approached some content creators I follow for a bit of insight and support to get started and where they started.. no one answers..you are the first one and that says a lot',
  'dm',
  'instagram',
  5,
  '/images/img-8645.jpg',
  'Customer Support',
  '{"responsive_support": true, "community": true, "accessibility": true, "personal_touch": true}',
  'grateful',
  true
);
