-- Seed script for Branded by SSELFIE course
-- Run this script to populate the course structure
-- Then upload videos through the admin dashboard at /admin/academy

-- Insert the main course
INSERT INTO academy_courses (
  title,
  description,
  thumbnail_url,
  tier,
  order_index,
  status,
  instructor_name,
  category,
  level,
  total_lessons,
  created_at,
  updated_at
) VALUES (
  'Branded by SSELFIE',
  'Master the art of personal branding and become the confident face of your brand. Learn how to show up authentically on camera, design a cohesive brand aesthetic, and create content that builds trust and attracts your ideal audience.',
  'https://cdn.courses.apisystem.tech/memberships/JwVw7U0ioch1NVP7AhXu/post/REALESTATE--2--mcqn.png',
  'foundation',
  1,
  'published',
  'Sandra Sævarsdóttir',
  'Personal Branding',
  'Beginner',
  15,
  NOW(),
  NOW()
);

-- Get the course ID for lesson insertion
DO $$
DECLARE
  course_id_var INTEGER;
BEGIN
  SELECT id INTO course_id_var FROM academy_courses WHERE title = 'Branded by SSELFIE';

  -- MODULE ONE: CONFIDENCE
  
  -- Welcome Video
  INSERT INTO academy_lessons (
    course_id,
    title,
    description,
    lesson_number,
    lesson_type,
    video_url,
    duration_minutes,
    created_at,
    updated_at
  ) VALUES (
    course_id_var,
    'Start Here: Welcome to Branded By SSELFIE',
    'Become the face of your brand',
    1,
    'video',
    'PLACEHOLDER_VIDEO_URL', -- Upload through admin dashboard
    4, -- 3:47 rounded up
    NOW(),
    NOW()
  );

  -- Lesson 1
  INSERT INTO academy_lessons (
    course_id,
    title,
    description,
    lesson_number,
    lesson_type,
    video_url,
    duration_minutes,
    created_at,
    updated_at
  ) VALUES (
    course_id_var,
    'Introduction to Personal Branding',
    'Unstoppable confidence online',
    2,
    'video',
    'PLACEHOLDER_VIDEO_URL',
    3, -- 2:54 rounded up
    NOW(),
    NOW()
  );

  -- Lesson 2
  INSERT INTO academy_lessons (
    course_id,
    title,
    description,
    lesson_number,
    lesson_type,
    video_url,
    duration_minutes,
    created_at,
    updated_at
  ) VALUES (
    course_id_var,
    'Confidence on Camera',
    'Start showing up',
    3,
    'video',
    'PLACEHOLDER_VIDEO_URL',
    8, -- 7:31 rounded up
    NOW(),
    NOW()
  );

  -- Lesson 3
  INSERT INTO academy_lessons (
    course_id,
    title,
    description,
    lesson_number,
    lesson_type,
    video_url,
    duration_minutes,
    created_at,
    updated_at
  ) VALUES (
    course_id_var,
    'Your Energy on Camera',
    'How to shift your energy on camera (and in life)',
    4,
    'video',
    'PLACEHOLDER_VIDEO_URL',
    8, -- 7:31 rounded up
    NOW(),
    NOW()
  );

  -- Lesson 4
  INSERT INTO academy_lessons (
    course_id,
    title,
    description,
    lesson_number,
    lesson_type,
    video_url,
    duration_minutes,
    created_at,
    updated_at
  ) VALUES (
    course_id_var,
    'The Camera Hack',
    'Get over the fear of being on camera',
    5,
    'video',
    'PLACEHOLDER_VIDEO_URL',
    4, -- 3:32 rounded up
    NOW(),
    NOW()
  );

  -- MODULE TWO: BRANDING

  -- Lesson 5
  INSERT INTO academy_lessons (
    course_id,
    title,
    description,
    lesson_number,
    lesson_type,
    video_url,
    duration_minutes,
    created_at,
    updated_at
  ) VALUES (
    course_id_var,
    'Personal Branding 101',
    'Who you are online',
    6,
    'video',
    'PLACEHOLDER_VIDEO_URL',
    9, -- 8:45 rounded up
    NOW(),
    NOW()
  );

  -- Lesson 6
  INSERT INTO academy_lessons (
    course_id,
    title,
    description,
    lesson_number,
    lesson_type,
    video_url,
    duration_minutes,
    created_at,
    updated_at
  ) VALUES (
    course_id_var,
    'Design Your Brand',
    'Build a strong brand aesthetic',
    7,
    'video',
    'PLACEHOLDER_VIDEO_URL',
    8, -- 7:04 rounded up
    NOW(),
    NOW()
  );

  -- Lesson 7
  INSERT INTO academy_lessons (
    course_id,
    title,
    description,
    lesson_number,
    lesson_type,
    video_url,
    duration_minutes,
    created_at,
    updated_at
  ) VALUES (
    course_id_var,
    'Design Your Instagram Feed',
    'Plan your first 9-post feed to align with your brand vibe',
    8,
    'video',
    'PLACEHOLDER_VIDEO_URL',
    5, -- 4:27 rounded up
    NOW(),
    NOW()
  );

  -- Lesson 8
  INSERT INTO academy_lessons (
    course_id,
    title,
    description,
    lesson_number,
    lesson_type,
    video_url,
    duration_minutes,
    created_at,
    updated_at
  ) VALUES (
    course_id_var,
    'Create Your Brand Pillars',
    'From posting randomly ➔ to posting with purpose',
    9,
    'video',
    'PLACEHOLDER_VIDEO_URL',
    5, -- 4:18 rounded up
    NOW(),
    NOW()
  );

  -- MODULE THREE: CONTENT

  -- Lesson 9
  INSERT INTO academy_lessons (
    course_id,
    title,
    description,
    lesson_number,
    lesson_type,
    video_url,
    duration_minutes,
    created_at,
    updated_at
  ) VALUES (
    course_id_var,
    'Start Showing Up',
    'Sharing your journey online',
    10,
    'video',
    'PLACEHOLDER_VIDEO_URL',
    3, -- 2:58 rounded up
    NOW(),
    NOW()
  );

  -- Lesson 10
  INSERT INTO academy_lessons (
    course_id,
    title,
    description,
    lesson_number,
    lesson_type,
    video_url,
    duration_minutes,
    created_at,
    updated_at
  ) VALUES (
    course_id_var,
    'The Content System',
    'Posting formula to grow your personal brand',
    11,
    'video',
    'PLACEHOLDER_VIDEO_URL',
    4, -- 3:55 rounded up
    NOW(),
    NOW()
  );

  -- Lesson 11
  INSERT INTO academy_lessons (
    course_id,
    title,
    description,
    lesson_number,
    lesson_type,
    video_url,
    duration_minutes,
    created_at,
    updated_at
  ) VALUES (
    course_id_var,
    'High Quality Selfies',
    'Photos that feel like YOU',
    12,
    'video',
    'PLACEHOLDER_VIDEO_URL',
    5, -- 4:16 rounded up
    NOW(),
    NOW()
  );

  -- Lesson 12
  INSERT INTO academy_lessons (
    course_id,
    title,
    description,
    lesson_number,
    lesson_type,
    video_url,
    duration_minutes,
    created_at,
    updated_at
  ) VALUES (
    course_id_var,
    'Instagram Reels',
    'B-roll that builds trust',
    13,
    'video',
    'PLACEHOLDER_VIDEO_URL',
    4, -- 3:57 rounded up
    NOW(),
    NOW()
  );

  -- Lesson 13
  INSERT INTO academy_lessons (
    course_id,
    title,
    description,
    lesson_number,
    lesson_type,
    video_url,
    duration_minutes,
    created_at,
    updated_at
  ) VALUES (
    course_id_var,
    'Content Planning',
    'Plan your Instagram posts',
    14,
    'video',
    'PLACEHOLDER_VIDEO_URL',
    8, -- 7:54 rounded up
    NOW(),
    NOW()
  );

  -- Lesson 14
  INSERT INTO academy_lessons (
    course_id,
    title,
    description,
    lesson_number,
    lesson_type,
    video_url,
    duration_minutes,
    created_at,
    updated_at
  ) VALUES (
    course_id_var,
    'The Selfie Strategy',
    'How to use your selfies as a branding tool',
    15,
    'video',
    'PLACEHOLDER_VIDEO_URL',
    5, -- 4:16 rounded up
    NOW(),
    NOW()
  );

END $$;
