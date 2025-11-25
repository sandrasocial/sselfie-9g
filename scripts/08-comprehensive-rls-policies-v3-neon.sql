-- ============================================================================
-- COMPREHENSIVE ROW LEVEL SECURITY (RLS) POLICIES FOR NEON DATABASE
-- ============================================================================
-- 
-- This script implements RLS policies for a Neon PostgreSQL database
-- where authentication is handled by Supabase but data is stored in Neon.
-- 
-- ARCHITECTURE:
-- - Supabase handles authentication (JWT tokens, sessions)
-- - Application middleware validates Supabase auth
-- - Application sets session variable: SET LOCAL app.current_user_id = 'user_id'
-- - RLS policies check this session variable
-- 
-- DEPLOYMENT STRATEGY:
-- For maximum security in production, this uses application-level RLS
-- where the app sets session context before queries.
-- 
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTION: Get Current User ID from Session
-- ============================================================================

-- Create a function to get the current user ID from session variable
CREATE OR REPLACE FUNCTION app_current_user_id() 
RETURNS TEXT AS $$
BEGIN
  -- Get the user ID that was set by the application
  RETURN NULLIF(current_setting('app.current_user_id', TRUE), '');
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Create a function to check if current session is admin
CREATE OR REPLACE FUNCTION app_is_admin() 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(current_setting('app.is_admin', TRUE), 'false')::BOOLEAN;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- CORE USER TABLES
-- ============================================================================

-- Users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT
  USING (id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE
  USING (id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Service role can insert users" ON users;
CREATE POLICY "Service role can insert users" ON users
  FOR INSERT
  WITH CHECK (app_is_admin());

-- ============================================================================
-- CREDITS & FINANCIAL DATA
-- ============================================================================

-- User credits
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own credits" ON user_credits;
CREATE POLICY "Users can view own credits" ON user_credits
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Service role can manage credits" ON user_credits;
CREATE POLICY "Service role can manage credits" ON user_credits
  FOR ALL
  USING (app_is_admin());

-- Credit transactions
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON credit_transactions;
CREATE POLICY "Users can view own transactions" ON credit_transactions
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Service role can manage transactions" ON credit_transactions;
CREATE POLICY "Service role can manage transactions" ON credit_transactions
  FOR ALL
  USING (app_is_admin());

-- Subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;
CREATE POLICY "Service role can manage subscriptions" ON subscriptions
  FOR ALL
  USING (app_is_admin());

-- ============================================================================
-- AI IMAGES & GENERATIONS
-- ============================================================================

-- AI images
ALTER TABLE ai_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own images" ON ai_images;
CREATE POLICY "Users can view own images" ON ai_images
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Users can create own images" ON ai_images;
CREATE POLICY "Users can create own images" ON ai_images
  FOR INSERT
  WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Users can update own images" ON ai_images;
CREATE POLICY "Users can update own images" ON ai_images
  FOR UPDATE
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Users can delete own images" ON ai_images;
CREATE POLICY "Users can delete own images" ON ai_images
  FOR DELETE
  USING (user_id = app_current_user_id() OR app_is_admin());

-- Studio generations
ALTER TABLE studio_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own generations" ON studio_generations;
CREATE POLICY "Users can view own generations" ON studio_generations
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Users can manage own generations" ON studio_generations;
CREATE POLICY "Users can manage own generations" ON studio_generations
  FOR ALL
  USING (user_id = app_current_user_id() OR app_is_admin());

-- ============================================================================
-- MAYA CHAT & AI INTERACTIONS
-- ============================================================================

-- Maya chats
ALTER TABLE maya_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own chats" ON maya_chats;
CREATE POLICY "Users can view own chats" ON maya_chats
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Users can create own chats" ON maya_chats;
CREATE POLICY "Users can create own chats" ON maya_chats
  FOR INSERT
  WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Users can update own chats" ON maya_chats;
CREATE POLICY "Users can update own chats" ON maya_chats
  FOR UPDATE
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Users can delete own chats" ON maya_chats;
CREATE POLICY "Users can delete own chats" ON maya_chats
  FOR DELETE
  USING (user_id = app_current_user_id() OR app_is_admin());

-- Maya messages (cascades from chat ownership)
ALTER TABLE maya_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own chat messages" ON maya_messages;
CREATE POLICY "Users can view own chat messages" ON maya_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM maya_chats 
      WHERE maya_chats.id = maya_messages.chat_id 
      AND maya_chats.user_id = app_current_user_id()
    ) OR app_is_admin()
  );

DROP POLICY IF EXISTS "Users can create messages in own chats" ON maya_messages;
CREATE POLICY "Users can create messages in own chats" ON maya_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM maya_chats 
      WHERE maya_chats.id = maya_messages.chat_id 
      AND maya_chats.user_id = app_current_user_id()
    ) OR app_is_admin()
  );

DROP POLICY IF EXISTS "Users can update own messages" ON maya_messages;
CREATE POLICY "Users can update own messages" ON maya_messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM maya_chats 
      WHERE maya_chats.id = maya_messages.chat_id 
      AND maya_chats.user_id = app_current_user_id()
    ) OR app_is_admin()
  );

DROP POLICY IF EXISTS "Users can delete own messages" ON maya_messages;
CREATE POLICY "Users can delete own messages" ON maya_messages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM maya_chats 
      WHERE maya_chats.id = maya_messages.chat_id 
      AND maya_chats.user_id = app_current_user_id()
    ) OR app_is_admin()
  );

-- ============================================================================
-- TRAINING & MODEL DATA
-- ============================================================================

-- Selfie uploads
ALTER TABLE selfie_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own selfies" ON selfie_uploads;
CREATE POLICY "Users can view own selfies" ON selfie_uploads
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Users can manage own selfies" ON selfie_uploads;
CREATE POLICY "Users can manage own selfies" ON selfie_uploads
  FOR ALL
  USING (user_id = app_current_user_id() OR app_is_admin());

-- Model trainings
ALTER TABLE model_trainings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own trainings" ON model_trainings;
CREATE POLICY "Users can view own trainings" ON model_trainings
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Users can manage own trainings" ON model_trainings;
CREATE POLICY "Users can manage own trainings" ON model_trainings
  FOR ALL
  USING (user_id = app_current_user_id() OR app_is_admin());

-- ============================================================================
-- BRAND & CONTENT DATA
-- ============================================================================

-- User personal brand
ALTER TABLE user_personal_brand ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own brand" ON user_personal_brand;
CREATE POLICY "Users can view own brand" ON user_personal_brand
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Users can manage own brand" ON user_personal_brand;
CREATE POLICY "Users can manage own brand" ON user_personal_brand
  FOR ALL
  USING (user_id = app_current_user_id() OR app_is_admin());

-- Brand assets
ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own assets" ON brand_assets;
CREATE POLICY "Users can view own assets" ON brand_assets
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Users can manage own assets" ON brand_assets;
CREATE POLICY "Users can manage own assets" ON brand_assets
  FOR ALL
  USING (user_id = app_current_user_id() OR app_is_admin());

-- Content pillars
ALTER TABLE content_pillars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own pillars" ON content_pillars;
CREATE POLICY "Users can view own pillars" ON content_pillars
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Users can manage own pillars" ON content_pillars;
CREATE POLICY "Users can manage own pillars" ON content_pillars
  FOR ALL
  USING (user_id = app_current_user_id() OR app_is_admin());

-- ============================================================================
-- FEED & CONTENT GENERATION
-- ============================================================================

-- Feed items
ALTER TABLE feed_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own feed items" ON feed_items;
CREATE POLICY "Users can view own feed items" ON feed_items
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Users can manage own feed items" ON feed_items;
CREATE POLICY "Users can manage own feed items" ON feed_items
  FOR ALL
  USING (user_id = app_current_user_id() OR app_is_admin());

-- Feed strategies
ALTER TABLE feed_strategies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own strategies" ON feed_strategies;
CREATE POLICY "Users can view own strategies" ON feed_strategies
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Users can manage own strategies" ON feed_strategies;
CREATE POLICY "Users can manage own strategies" ON feed_strategies
  FOR ALL
  USING (user_id = app_current_user_id() OR app_is_admin());

-- Generated concepts
ALTER TABLE generated_concepts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own concepts" ON generated_concepts;
CREATE POLICY "Users can view own concepts" ON generated_concepts
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Users can manage own concepts" ON generated_concepts;
CREATE POLICY "Users can manage own concepts" ON generated_concepts
  FOR ALL
  USING (user_id = app_current_user_id() OR app_is_admin());

-- ============================================================================
-- PHOTOSHOOTS & B-ROLL
-- ============================================================================

-- Photoshoots
ALTER TABLE photoshoots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own photoshoots" ON photoshoots;
CREATE POLICY "Users can view own photoshoots" ON photoshoots
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Users can manage own photoshoots" ON photoshoots;
CREATE POLICY "Users can manage own photoshoots" ON photoshoots
  FOR ALL
  USING (user_id = app_current_user_id() OR app_is_admin());

-- Photoshoot images (cascades from photoshoot ownership)
ALTER TABLE photoshoot_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view images from own photoshoots" ON photoshoot_images;
CREATE POLICY "Users can view images from own photoshoots" ON photoshoot_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM photoshoots 
      WHERE photoshoots.id = photoshoot_images.photoshoot_id 
      AND photoshoots.user_id = app_current_user_id()
    ) OR app_is_admin()
  );

DROP POLICY IF EXISTS "Users can manage images in own photoshoots" ON photoshoot_images;
CREATE POLICY "Users can manage images in own photoshoots" ON photoshoot_images
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM photoshoots 
      WHERE photoshoots.id = photoshoot_images.photoshoot_id 
      AND photoshoots.user_id = app_current_user_id()
    ) OR app_is_admin()
  );

-- B-roll images
ALTER TABLE b_roll_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own b-roll" ON b_roll_images;
CREATE POLICY "Users can view own b-roll" ON b_roll_images
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Users can manage own b-roll" ON b_roll_images;
CREATE POLICY "Users can manage own b-roll" ON b_roll_images
  FOR ALL
  USING (user_id = app_current_user_id() OR app_is_admin());

-- ============================================================================
-- FEEDBACK & USER INTERACTIONS
-- ============================================================================

-- Feedback
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own feedback" ON feedback;
CREATE POLICY "Users can view own feedback" ON feedback
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Users can create feedback" ON feedback;
CREATE POLICY "Users can create feedback" ON feedback
  FOR INSERT
  WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Admins can manage all feedback" ON feedback;
CREATE POLICY "Admins can manage all feedback" ON feedback
  FOR ALL
  USING (app_is_admin());

-- Testimonials
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own testimonials" ON testimonials;
CREATE POLICY "Users can view own testimonials" ON testimonials
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Users can create testimonials" ON testimonials;
CREATE POLICY "Users can create testimonials" ON testimonials
  FOR INSERT
  WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Admins can manage testimonials" ON testimonials;
CREATE POLICY "Admins can manage testimonials" ON testimonials
  FOR ALL
  USING (app_is_admin());

-- ============================================================================
-- STUDIO FEATURES
-- ============================================================================

-- Studio favorites
ALTER TABLE studio_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own favorites" ON studio_favorites;
CREATE POLICY "Users can view own favorites" ON studio_favorites
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Users can manage own favorites" ON studio_favorites;
CREATE POLICY "Users can manage own favorites" ON studio_favorites
  FOR ALL
  USING (user_id = app_current_user_id() OR app_is_admin());

-- Studio activity
ALTER TABLE studio_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own activity" ON studio_activity;
CREATE POLICY "Users can view own activity" ON studio_activity
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Service role can log activity" ON studio_activity;
CREATE POLICY "Service role can log activity" ON studio_activity
  FOR INSERT
  WITH CHECK (app_is_admin());

-- ============================================================================
-- ACADEMY & LEARNING
-- ============================================================================

-- Course enrollments
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own enrollments" ON course_enrollments;
CREATE POLICY "Users can view own enrollments" ON course_enrollments
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Users can manage own enrollments" ON course_enrollments;
CREATE POLICY "Users can manage own enrollments" ON course_enrollments
  FOR ALL
  USING (user_id = app_current_user_id() OR app_is_admin());

-- Lesson progress
ALTER TABLE lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own progress" ON lesson_progress;
CREATE POLICY "Users can view own progress" ON lesson_progress
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Users can manage own progress" ON lesson_progress;
CREATE POLICY "Users can manage own progress" ON lesson_progress
  FOR ALL
  USING (user_id = app_current_user_id() OR app_is_admin());

-- Exercise submissions
ALTER TABLE exercise_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own submissions" ON exercise_submissions;
CREATE POLICY "Users can view own submissions" ON exercise_submissions
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Users can manage own submissions" ON exercise_submissions;
CREATE POLICY "Users can manage own submissions" ON exercise_submissions
  FOR ALL
  USING (user_id = app_current_user_id() OR app_is_admin());

-- Certificates
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own certificates" ON certificates;
CREATE POLICY "Users can view own certificates" ON certificates
  FOR SELECT
  USING (user_id = app_current_user_id() OR app_is_admin());

DROP POLICY IF EXISTS "Service role can issue certificates" ON certificates;
CREATE POLICY "Service role can issue certificates" ON certificates
  FOR INSERT
  WITH CHECK (app_is_admin());

-- ============================================================================
-- ADMIN & AGENT FEATURES
-- ============================================================================

-- Admin chats
ALTER TABLE admin_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage chats" ON admin_chats;
CREATE POLICY "Admins can manage chats" ON admin_chats
  FOR ALL
  USING (app_is_admin());

-- Admin messages
ALTER TABLE admin_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage messages" ON admin_messages;
CREATE POLICY "Admins can manage messages" ON admin_messages
  FOR ALL
  USING (app_is_admin());

-- Agent memory
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage agent memory" ON agent_memory;
CREATE POLICY "Admins can manage agent memory" ON agent_memory
  FOR ALL
  USING (app_is_admin());

-- Competitors
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage competitors" ON competitors;
CREATE POLICY "Admins can manage competitors" ON competitors
  FOR ALL
  USING (app_is_admin());

-- Email templates
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage email templates" ON email_templates;
CREATE POLICY "Admins can manage email templates" ON email_templates
  FOR ALL
  USING (app_is_admin());

-- Email campaigns
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage campaigns" ON email_campaigns;
CREATE POLICY "Admins can manage campaigns" ON email_campaigns
  FOR ALL
  USING (app_is_admin());

-- ============================================================================
-- PUBLIC / SHARED CONTENT
-- ============================================================================

-- These tables can be read by all users but only managed by admins

-- Courses (public readable)
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view courses" ON courses;
CREATE POLICY "Anyone can view courses" ON courses
  FOR SELECT
  TO PUBLIC
  USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage courses" ON courses;
CREATE POLICY "Admins can manage courses" ON courses
  FOR ALL
  USING (app_is_admin());

-- Lessons (public readable)
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view lessons" ON lessons;
CREATE POLICY "Anyone can view lessons" ON lessons
  FOR SELECT
  TO PUBLIC
  USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage lessons" ON lessons;
CREATE POLICY "Admins can manage lessons" ON lessons
  FOR ALL
  USING (app_is_admin());

-- Templates (public readable)
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view templates" ON templates;
CREATE POLICY "Anyone can view templates" ON templates
  FOR SELECT
  TO PUBLIC
  USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage templates" ON templates;
CREATE POLICY "Admins can manage templates" ON templates
  FOR ALL
  USING (app_is_admin());

-- Monthly drops (public readable)
ALTER TABLE monthly_drops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view monthly drops" ON monthly_drops;
CREATE POLICY "Anyone can view monthly drops" ON monthly_drops
  FOR SELECT
  TO PUBLIC
  USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage monthly drops" ON monthly_drops;
CREATE POLICY "Admins can manage monthly drops" ON monthly_drops
  FOR ALL
  USING (app_is_admin());

-- Flatlay images (public readable)
ALTER TABLE flatlay_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view flatlay images" ON flatlay_images;
CREATE POLICY "Anyone can view flatlay images" ON flatlay_images
  FOR SELECT
  TO PUBLIC
  USING (TRUE);

DROP POLICY IF EXISTS "Admins can manage flatlay images" ON flatlay_images;
CREATE POLICY "Admins can manage flatlay images" ON flatlay_images
  FOR ALL
  USING (app_is_admin());

-- ============================================================================
-- REMAINING TABLES WITH USER_ID
-- ============================================================================

-- Apply standard user isolation to any remaining user-specific tables
DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename NOT IN (
      'users', 'user_credits', 'credit_transactions', 'subscriptions',
      'ai_images', 'studio_generations', 'maya_chats', 'maya_messages',
      'selfie_uploads', 'model_trainings', 'user_personal_brand', 'brand_assets',
      'content_pillars', 'feed_items', 'feed_strategies', 'generated_concepts',
      'photoshoots', 'photoshoot_images', 'b_roll_images', 'feedback', 'testimonials',
      'studio_favorites', 'studio_activity', 'course_enrollments', 'lesson_progress',
      'exercise_submissions', 'certificates', 'admin_chats', 'admin_messages',
      'agent_memory', 'competitors', 'email_templates', 'email_campaigns',
      'courses', 'lessons', 'templates', 'monthly_drops', 'flatlay_images'
    )
    AND EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = tablename 
      AND column_name = 'user_id'
    )
  LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl.tablename);
    
    -- Drop existing policies
    EXECUTE format('DROP POLICY IF EXISTS "Users can view own %s" ON %I', tbl.tablename, tbl.tablename);
    EXECUTE format('DROP POLICY IF EXISTS "Users can manage own %s" ON %I', tbl.tablename, tbl.tablename);
    
    -- Create view policy
    EXECUTE format(
      'CREATE POLICY "Users can view own %s" ON %I FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin())',
      tbl.tablename, tbl.tablename
    );
    
    -- Create manage policy
    EXECUTE format(
      'CREATE POLICY "Users can manage own %s" ON %I FOR ALL USING (user_id = app_current_user_id() OR app_is_admin())',
      tbl.tablename, tbl.tablename
    );
    
    RAISE NOTICE 'Applied RLS to table: %', tbl.tablename;
  END LOOP;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Count tables with RLS enabled
SELECT 
  'RLS Status' as check_type,
  COUNT(*) FILTER (WHERE rowsecurity = true) as enabled,
  COUNT(*) FILTER (WHERE rowsecurity = false) as disabled,
  COUNT(*) as total
FROM pg_tables
WHERE schemaname = 'public';

-- List tables without RLS
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false
ORDER BY tablename;

-- Wrap RAISE statements in DO block for proper SQL syntax
DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies applied successfully!';
  RAISE NOTICE '⚠️  IMPORTANT: Your application must set session variables before queries:';
  RAISE NOTICE '   SET LOCAL app.current_user_id = ''123'';';
  RAISE NOTICE '   SET LOCAL app.is_admin = ''true'';  -- for admin users';
END $$;
