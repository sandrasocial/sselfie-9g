-- SSELFIE 2026 Masterclass income-ready implementation module
-- Adds compliant, action-based lessons to Branded by SSELFIE.
-- These lessons teach offer clarity, content-to-cash behavior, and a 30-day execution sprint.
-- They do not promise or guarantee income.

DO $$
DECLARE
  course_id_var INTEGER;
BEGIN
  SELECT id INTO course_id_var
  FROM academy_courses
  WHERE product_id = 'branded_by_sselfie'
     OR LOWER(TRIM(title)) LIKE '%branded by sselfie%'
  ORDER BY id ASC
  LIMIT 1;

  IF course_id_var IS NULL THEN
    RAISE NOTICE 'Branded by SSELFIE course not found. Skipping income-ready module seed.';
    RETURN;
  END IF;

  INSERT INTO academy_lessons (
    course_id,
    title,
    description,
    lesson_number,
    lesson_type,
    video_url,
    duration_minutes,
    duration_seconds,
    content,
    created_at,
    updated_at
  )
  SELECT
    course_id_var,
    'Offer Map & What I Sell Script',
    'Turn your positioning into a simple offer sentence and first invitation.',
    16,
    'interactive',
    NULL,
    8,
    480,
    $json$
    {
      "key_takeaways": [
        "Income-ready visibility starts with clarity: who you help, what problem you solve, and what next step someone can take.",
        "An offer sentence does not need to be perfect. It needs to be understandable enough for a real person to respond.",
        "Do not promise outcomes you cannot control. Promise the process, the support, and the specific deliverable."
      ],
      "action_step": {
        "bare_minimum": "Write one sentence: I help [who] with [problem] so they can [realistic next result].",
        "bold_move": "Write 3 versions of your offer sentence and send the clearest one to one trusted person for feedback.",
        "bonus_vibe": "Turn the offer sentence into a soft Instagram Story invitation: If you are working on this, reply with the word READY."
      },
      "reflection_prompt": "What do you help people move away from, and what realistic next result can you help them create?",
      "profile_field": "mission_statement",
      "profile_question": "Write your clearest current offer sentence. Who do you help, what do you help with, and what realistic result or next step do you support?",
      "resources": []
    }
    $json$::jsonb,
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1
    FROM academy_lessons
    WHERE course_id = course_id_var
      AND title = 'Offer Map & What I Sell Script'
  );

  INSERT INTO academy_lessons (
    course_id,
    title,
    description,
    lesson_number,
    lesson_type,
    video_url,
    duration_minutes,
    duration_seconds,
    content,
    created_at,
    updated_at
  )
  SELECT
    course_id_var,
    'Content-To-Cash Conversation System',
    'Use content to invite conversations without pressure, hype, or income claims.',
    17,
    'interactive',
    NULL,
    10,
    600,
    $json$
    {
      "key_takeaways": [
        "Content does not make money by existing. It creates trust, clarity, and conversations that can lead to a sale.",
        "Every selling post needs one calm next step: reply, book, download, join, or ask a question.",
        "Track conversations, replies, and follow-ups before judging whether your offer is working."
      ],
      "action_step": {
        "bare_minimum": "Write one content post that teaches a useful idea and ends with a soft invitation to reply.",
        "bold_move": "Send a thoughtful follow-up to 3 warm people who have already shown interest in your topic.",
        "bonus_vibe": "Create a simple conversation tracker with columns for name, context, next step, and follow-up date."
      },
      "reflection_prompt": "Where does your current content lead people? What is the simplest next step you can invite them to take?",
      "profile_field": null,
      "profile_question": null,
      "resources": []
    }
    $json$::jsonb,
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1
    FROM academy_lessons
    WHERE course_id = course_id_var
      AND title = 'Content-To-Cash Conversation System'
  );

  INSERT INTO academy_lessons (
    course_id,
    title,
    description,
    lesson_number,
    lesson_type,
    video_url,
    duration_minutes,
    duration_seconds,
    content,
    created_at,
    updated_at
  )
  SELECT
    course_id_var,
    '30-Day Revenue Readiness Sprint',
    'Publish, invite, follow up, and measure the actions that create sales readiness.',
    18,
    'interactive',
    NULL,
    12,
    720,
    $json$
    {
      "key_takeaways": [
        "A 30-day sprint gives you evidence: what people save, reply to, ask about, and click.",
        "Revenue readiness is built through repeated useful content, clear invitations, and respectful follow-up.",
        "No sprint can guarantee income. It can give you the assets, habits, and data to make better selling decisions."
      ],
      "action_step": {
        "bare_minimum": "Plan 5 posts for the next 7 days: proof, teaching, story, behind the scenes, and invitation.",
        "bold_move": "Run the sprint for 30 days and track posts, replies, conversations, offers made, and lessons learned.",
        "bonus_vibe": "At the end of each week, review what created saves, replies, and conversations. Adjust the next week based on evidence."
      },
      "reflection_prompt": "What will you measure for the next 30 days besides likes? Name the behaviors that show real buying interest.",
      "profile_field": "content_themes",
      "profile_question": "Write your 30-day visibility rhythm: what you will post, how often, what invitation you will use, and what you will track.",
      "resources": []
    }
    $json$::jsonb,
    NOW(),
    NOW()
  WHERE NOT EXISTS (
    SELECT 1
    FROM academy_lessons
    WHERE course_id = course_id_var
      AND title = '30-Day Revenue Readiness Sprint'
  );

  UPDATE academy_courses
  SET total_lessons = GREATEST(COALESCE(total_lessons, 0), 18),
      updated_at = NOW()
  WHERE id = course_id_var;
END $$;
