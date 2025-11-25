-- ============================================
-- NEON RLS POLICIES - CORRECTED FOR ACTUAL SCHEMA
-- ============================================
-- This script enables RLS and creates policies for tables that actually exist
-- It uses TEXT-based user_id matching (not INTEGER)
-- ============================================

-- ============================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================

-- Create helper function to get current user ID from session variable
CREATE OR REPLACE FUNCTION app_current_user_id()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_user_id', TRUE);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Create helper function to check if current user is admin
CREATE OR REPLACE FUNCTION app_is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN current_setting('app.is_admin', TRUE)::BOOLEAN;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- CORE USER DATA TABLES
-- ============================================

-- Users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (id = app_current_user_id() OR app_is_admin());

-- User credits
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credits" ON user_credits
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own credits" ON user_credits
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- Credit transactions
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON credit_transactions
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own transactions" ON credit_transactions
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

-- ============================================
-- SUBSCRIPTION & PAYMENT TABLES
-- ============================================

-- Subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own subscriptions" ON subscriptions
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own subscriptions" ON subscriptions
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- ============================================
-- AI IMAGE GENERATION TABLES
-- ============================================

-- AI Images (your main image table)
ALTER TABLE ai_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own images" ON ai_images
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own images" ON ai_images
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own images" ON ai_images
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can delete own images" ON ai_images
  FOR DELETE USING (user_id = app_current_user_id() OR app_is_admin());

-- Image variants
ALTER TABLE image_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own image variants" ON image_variants
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own image variants" ON image_variants
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own image variants" ON image_variants
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can delete own image variants" ON image_variants
  FOR DELETE USING (user_id = app_current_user_id() OR app_is_admin());

-- Generated images
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generated images" ON generated_images
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own generated images" ON generated_images
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own generated images" ON generated_images
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- Generated videos
ALTER TABLE generated_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own videos" ON generated_videos
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own videos" ON generated_videos
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own videos" ON generated_videos
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- Generation trackers
ALTER TABLE generation_trackers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generation trackers" ON generation_trackers
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own generation trackers" ON generation_trackers
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own generation trackers" ON generation_trackers
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- ============================================
-- MAYA AI CHAT SYSTEM
-- ============================================

-- Maya chats
ALTER TABLE maya_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own maya chats" ON maya_chats
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own maya chats" ON maya_chats
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own maya chats" ON maya_chats
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can delete own maya chats" ON maya_chats
  FOR DELETE USING (user_id = app_current_user_id() OR app_is_admin());

-- Maya chat messages (cascade from chat ownership)
ALTER TABLE maya_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in own chats" ON maya_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM maya_chats 
      WHERE maya_chats.id = maya_chat_messages.chat_id 
      AND maya_chats.user_id = app_current_user_id()
    ) OR app_is_admin()
  );

CREATE POLICY "Users can insert messages in own chats" ON maya_chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM maya_chats 
      WHERE maya_chats.id = maya_chat_messages.chat_id 
      AND maya_chats.user_id = app_current_user_id()
    ) OR app_is_admin()
  );

CREATE POLICY "Users can update messages in own chats" ON maya_chat_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM maya_chats 
      WHERE maya_chats.id = maya_chat_messages.chat_id 
      AND maya_chats.user_id = app_current_user_id()
    ) OR app_is_admin()
  );

-- Maya concepts
ALTER TABLE maya_concepts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own maya concepts" ON maya_concepts
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own maya concepts" ON maya_concepts
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own maya concepts" ON maya_concepts
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- Maya personal memory
ALTER TABLE maya_personal_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own maya memory" ON maya_personal_memory
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own maya memory" ON maya_personal_memory
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own maya memory" ON maya_personal_memory
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- Maya profile
ALTER TABLE maya_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own maya profile" ON maya_profile
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own maya profile" ON maya_profile
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own maya profile" ON maya_profile
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- ============================================
-- TRAINING & MODEL TABLES
-- ============================================

-- Training runs
ALTER TABLE training_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training runs" ON training_runs
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own training runs" ON training_runs
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own training runs" ON training_runs
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- User models
ALTER TABLE user_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own models" ON user_models
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own models" ON user_models
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own models" ON user_models
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- Selfie uploads
ALTER TABLE selfie_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own selfie uploads" ON selfie_uploads
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own selfie uploads" ON selfie_uploads
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own selfie uploads" ON selfie_uploads
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can delete own selfie uploads" ON selfie_uploads
  FOR DELETE USING (user_id = app_current_user_id() OR app_is_admin());

-- ============================================
-- FEED & CONTENT PLANNING
-- ============================================

-- Feed layouts
ALTER TABLE feed_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feed layouts" ON feed_layouts
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own feed layouts" ON feed_layouts
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own feed layouts" ON feed_layouts
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can delete own feed layouts" ON feed_layouts
  FOR DELETE USING (user_id = app_current_user_id() OR app_is_admin());

-- Feed posts
ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feed posts" ON feed_posts
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own feed posts" ON feed_posts
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own feed posts" ON feed_posts
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can delete own feed posts" ON feed_posts
  FOR DELETE USING (user_id = app_current_user_id() OR app_is_admin());

-- Carousel posts
ALTER TABLE carousel_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own carousel posts" ON carousel_posts
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own carousel posts" ON carousel_posts
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own carousel posts" ON carousel_posts
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- Feed strategy
ALTER TABLE feed_strategy ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feed strategy" ON feed_strategy
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own feed strategy" ON feed_strategy
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own feed strategy" ON feed_strategy
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- ============================================
-- PERSONAL BRAND & PROFILES
-- ============================================

-- User personal brand
ALTER TABLE user_personal_brand ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own personal brand" ON user_personal_brand
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own personal brand" ON user_personal_brand
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own personal brand" ON user_personal_brand
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- User profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- User style profile
ALTER TABLE user_style_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own style profile" ON user_style_profile
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own style profile" ON user_style_profile
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own style profile" ON user_style_profile
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- User style memory
ALTER TABLE user_style_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own style memory" ON user_style_memory
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own style memory" ON user_style_memory
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own style memory" ON user_style_memory
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- Onboarding data
ALTER TABLE onboarding_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding data" ON onboarding_data
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own onboarding data" ON onboarding_data
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own onboarding data" ON onboarding_data
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- Brand onboarding
ALTER TABLE brand_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own brand onboarding" ON brand_onboarding
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own brand onboarding" ON brand_onboarding
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own brand onboarding" ON brand_onboarding
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- ============================================
-- INSTAGRAM & SOCIAL MEDIA
-- ============================================

-- Instagram connections
ALTER TABLE instagram_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own instagram connections" ON instagram_connections
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own instagram connections" ON instagram_connections
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own instagram connections" ON instagram_connections
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- Instagram posts
ALTER TABLE instagram_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own instagram posts" ON instagram_posts
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own instagram posts" ON instagram_posts
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own instagram posts" ON instagram_posts
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- Instagram messages
ALTER TABLE instagram_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own instagram messages" ON instagram_messages
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own instagram messages" ON instagram_messages
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own instagram messages" ON instagram_messages
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- Instagram highlights
ALTER TABLE instagram_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own instagram highlights" ON instagram_highlights
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own instagram highlights" ON instagram_highlights
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own instagram highlights" ON instagram_highlights
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- Instagram bios
ALTER TABLE instagram_bios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own instagram bios" ON instagram_bios
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own instagram bios" ON instagram_bios
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own instagram bios" ON instagram_bios
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- ============================================
-- CONTENT PERFORMANCE & ANALYTICS
-- ============================================

-- Content performance history
ALTER TABLE content_performance_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own content performance" ON content_performance_history
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own content performance" ON content_performance_history
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

-- Prompt analysis
ALTER TABLE prompt_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prompt analysis" ON prompt_analysis
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own prompt analysis" ON prompt_analysis
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

-- User milestones
ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own milestones" ON user_milestones
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own milestones" ON user_milestones
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

-- ============================================
-- ACADEMY & EDUCATION
-- ============================================

-- User academy enrollments
ALTER TABLE user_academy_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own enrollments" ON user_academy_enrollments
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own enrollments" ON user_academy_enrollments
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own enrollments" ON user_academy_enrollments
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- User lesson progress
ALTER TABLE user_lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lesson progress" ON user_lesson_progress
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own lesson progress" ON user_lesson_progress
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own lesson progress" ON user_lesson_progress
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- User resource downloads
ALTER TABLE user_resource_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own resource downloads" ON user_resource_downloads
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own resource downloads" ON user_resource_downloads
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

-- ============================================
-- UTILITY & SUPPORT TABLES
-- ============================================

-- User usage
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage" ON user_usage
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own usage" ON user_usage
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can update own usage" ON user_usage
  FOR UPDATE USING (user_id = app_current_user_id() OR app_is_admin());

-- Brand assets
ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own brand assets" ON brand_assets
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own brand assets" ON brand_assets
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can delete own brand assets" ON brand_assets
  FOR DELETE USING (user_id = app_current_user_id() OR app_is_admin());

-- Brand evolution
ALTER TABLE brand_evolution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own brand evolution" ON brand_evolution
  FOR SELECT USING (user_id = app_current_user_id() OR app_is_admin());

CREATE POLICY "Users can insert own brand evolution" ON brand_evolution
  FOR INSERT WITH CHECK (user_id = app_current_user_id() OR app_is_admin());

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS policies successfully created for all user-facing tables';
  RAISE NOTICE '✅ Helper functions created: app_current_user_id(), app_is_admin()';
  RAISE NOTICE '⚠️  IMPORTANT: RLS in Neon requires setting session variables before queries';
  RAISE NOTICE '⚠️  See RLS-IMPLEMENTATION-GUIDE.md for integration instructions';
END $$;
