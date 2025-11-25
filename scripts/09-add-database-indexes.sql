-- =====================================================
-- PERFORMANCE OPTIMIZATION: DATABASE INDEXES
-- =====================================================
-- These indexes improve query performance for frequently
-- accessed columns and foreign key relationships
-- =====================================================

-- =====================================================
-- PART 1: USER LOOKUP INDEXES
-- =====================================================

-- Primary user identification indexes
CREATE INDEX IF NOT EXISTS idx_users_supabase_user_id ON users(supabase_user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_stack_auth_id ON users(stack_auth_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users(stripe_customer_id);

-- User profile indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_personal_brand_user_id ON user_personal_brand(user_id);
CREATE INDEX IF NOT EXISTS idx_user_style_profile_user_id ON user_style_profile(user_id);

-- =====================================================
-- PART 2: FINANCIAL & CREDIT INDEXES
-- =====================================================

-- Credit-related indexes
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON credit_transactions(transaction_type);

-- Subscription indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);

-- =====================================================
-- PART 3: AI & IMAGE GENERATION INDEXES
-- =====================================================

-- AI images
CREATE INDEX IF NOT EXISTS idx_ai_images_user_id ON ai_images(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_images_created_at ON ai_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_images_category ON ai_images(category);
CREATE INDEX IF NOT EXISTS idx_ai_images_prediction_id ON ai_images(prediction_id);
CREATE INDEX IF NOT EXISTS idx_ai_images_status ON ai_images(generation_status);

-- Generated images
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON generated_images(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_images_model_id ON generated_images(model_id);

-- Generated videos
CREATE INDEX IF NOT EXISTS idx_generated_videos_user_id ON generated_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_videos_status ON generated_videos(status);
CREATE INDEX IF NOT EXISTS idx_generated_videos_image_id ON generated_videos(image_id);

-- Generation trackers
CREATE INDEX IF NOT EXISTS idx_generation_trackers_user_id ON generation_trackers(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_trackers_prediction_id ON generation_trackers(prediction_id);
CREATE INDEX IF NOT EXISTS idx_generation_trackers_status ON generation_trackers(status);

-- =====================================================
-- PART 4: MAYA AI INDEXES
-- =====================================================

-- Maya chats
CREATE INDEX IF NOT EXISTS idx_maya_chats_user_id ON maya_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_maya_chats_created_at ON maya_chats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maya_chats_last_activity ON maya_chats(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_maya_chats_feed_layout_id ON maya_chats(feed_layout_id);

-- Maya chat messages
CREATE INDEX IF NOT EXISTS idx_maya_chat_messages_chat_id ON maya_chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_maya_chat_messages_created_at ON maya_chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_maya_chat_messages_role ON maya_chat_messages(role);

-- Maya personal memory
CREATE INDEX IF NOT EXISTS idx_maya_personal_memory_user_id ON maya_personal_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_maya_personal_memory_personal_brand_id ON maya_personal_memory(personal_brand_id);

-- Maya profile
CREATE INDEX IF NOT EXISTS idx_maya_profile_user_id ON maya_profile(user_id);

-- Maya concepts
CREATE INDEX IF NOT EXISTS idx_maya_concepts_user_id ON maya_concepts(user_id);
CREATE INDEX IF NOT EXISTS idx_maya_concepts_is_template ON maya_concepts(is_template);
CREATE INDEX IF NOT EXISTS idx_maya_concepts_type ON maya_concepts(type);

-- =====================================================
-- PART 5: TRAINING & MODEL INDEXES
-- =====================================================

-- Training runs
CREATE INDEX IF NOT EXISTS idx_training_runs_user_id ON training_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_training_runs_status ON training_runs(status);
CREATE INDEX IF NOT EXISTS idx_training_runs_training_id ON training_runs(training_id);
CREATE INDEX IF NOT EXISTS idx_training_runs_created_at ON training_runs(created_at DESC);

-- Selfie uploads
CREATE INDEX IF NOT EXISTS idx_selfie_uploads_user_id ON selfie_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_selfie_uploads_processing_status ON selfie_uploads(processing_status);

-- User models
CREATE INDEX IF NOT EXISTS idx_user_models_user_id ON user_models(user_id);
CREATE INDEX IF NOT EXISTS idx_user_models_training_status ON user_models(training_status);
CREATE INDEX IF NOT EXISTS idx_user_models_replicate_version_id ON user_models(replicate_version_id);

-- LoRA weights
CREATE INDEX IF NOT EXISTS idx_lora_weights_training_run_id ON lora_weights(training_run_id);
CREATE INDEX IF NOT EXISTS idx_lora_weights_user_id ON lora_weights(user_id);

-- =====================================================
-- PART 6: FEED & CONTENT INDEXES
-- =====================================================

-- Feed layouts
CREATE INDEX IF NOT EXISTS idx_feed_layouts_user_id ON feed_layouts(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_layouts_status ON feed_layouts(status);
CREATE INDEX IF NOT EXISTS idx_feed_layouts_created_at ON feed_layouts(created_at DESC);

-- Feed posts
CREATE INDEX IF NOT EXISTS idx_feed_posts_user_id ON feed_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_feed_layout_id ON feed_posts(feed_layout_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_post_status ON feed_posts(post_status);
CREATE INDEX IF NOT EXISTS idx_feed_posts_scheduled_at ON feed_posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_feed_posts_position ON feed_posts(position);

-- Feed strategy
CREATE INDEX IF NOT EXISTS idx_feed_strategy_user_id ON feed_strategy(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_strategy_feed_layout_id ON feed_strategy(feed_layout_id);
CREATE INDEX IF NOT EXISTS idx_feed_strategy_is_active ON feed_strategy(is_active);

-- Carousel posts
CREATE INDEX IF NOT EXISTS idx_carousel_posts_user_id ON carousel_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_carousel_posts_feed_post_id ON carousel_posts(feed_post_id);

-- =====================================================
-- PART 7: INSTAGRAM & SOCIAL INDEXES
-- =====================================================

-- Instagram connections
CREATE INDEX IF NOT EXISTS idx_instagram_connections_user_id ON instagram_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_connections_is_active ON instagram_connections(is_active);
CREATE INDEX IF NOT EXISTS idx_instagram_connections_instagram_user_id ON instagram_connections(instagram_user_id);

-- Instagram posts
CREATE INDEX IF NOT EXISTS idx_instagram_posts_user_id ON instagram_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_connection_id ON instagram_posts(connection_id);
CREATE INDEX IF NOT EXISTS idx_instagram_posts_posted_at ON instagram_posts(posted_at DESC);

-- Instagram messages
CREATE INDEX IF NOT EXISTS idx_instagram_messages_user_id ON instagram_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_messages_needs_response ON instagram_messages(needs_response);
CREATE INDEX IF NOT EXISTS idx_instagram_messages_received_at ON instagram_messages(received_at DESC);

-- Instagram highlights
CREATE INDEX IF NOT EXISTS idx_instagram_highlights_user_id ON instagram_highlights(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_highlights_feed_layout_id ON instagram_highlights(feed_layout_id);

-- =====================================================
-- PART 8: AGENT & CONVERSATION INDEXES
-- =====================================================

-- Agent conversations
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user_id ON agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_agent_id ON agent_conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_created_at ON agent_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_is_active ON agent_conversations(is_active);

-- Claude conversations
CREATE INDEX IF NOT EXISTS idx_claude_conversations_user_id ON claude_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_claude_conversations_conversation_id ON claude_conversations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_claude_conversations_created_at ON claude_conversations(created_at DESC);

-- Claude messages
CREATE INDEX IF NOT EXISTS idx_claude_messages_conversation_id ON claude_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_claude_messages_created_at ON claude_messages(created_at DESC);

-- Agent session contexts
CREATE INDEX IF NOT EXISTS idx_agent_session_contexts_user_id ON agent_session_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_session_contexts_session_id ON agent_session_contexts(session_id);

-- =====================================================
-- PART 9: COMPETITOR ANALYSIS INDEXES
-- =====================================================

-- Competitors
CREATE INDEX IF NOT EXISTS idx_competitors_user_id ON competitors(user_id);
CREATE INDEX IF NOT EXISTS idx_competitors_instagram_handle ON competitors(instagram_handle);

-- Competitor snapshots
CREATE INDEX IF NOT EXISTS idx_competitor_snapshots_competitor_id ON competitor_snapshots(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_snapshots_snapshot_date ON competitor_snapshots(snapshot_date DESC);

-- Competitor content analysis
CREATE INDEX IF NOT EXISTS idx_competitor_content_analysis_competitor_id ON competitor_content_analysis(competitor_id);
CREATE INDEX IF NOT EXISTS idx_competitor_content_analysis_analysis_date ON competitor_content_analysis(analysis_date DESC);

-- =====================================================
-- PART 10: ONBOARDING & EDUCATION INDEXES
-- =====================================================

-- Onboarding data
CREATE INDEX IF NOT EXISTS idx_onboarding_data_user_id ON onboarding_data(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_data_completed ON onboarding_data(completed);

-- User academy enrollments
CREATE INDEX IF NOT EXISTS idx_user_academy_enrollments_user_id ON user_academy_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_academy_enrollments_course_id ON user_academy_enrollments(course_id);

-- User lesson progress
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_user_id ON user_lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_lesson_id ON user_lesson_progress(lesson_id);

-- =====================================================
-- PART 11: PROJECT & CONTENT INDEXES
-- =====================================================

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- Websites
CREATE INDEX IF NOT EXISTS idx_websites_user_id ON websites(user_id);
CREATE INDEX IF NOT EXISTS idx_websites_is_published ON websites(is_published);

-- Landing pages
CREATE INDEX IF NOT EXISTS idx_landing_pages_user_id ON landing_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_landing_pages_is_published ON landing_pages(is_published);

-- Photo sessions
CREATE INDEX IF NOT EXISTS idx_photo_sessions_user_id ON photo_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_sessions_status ON photo_sessions(status);

-- Session shots
CREATE INDEX IF NOT EXISTS idx_session_shots_session_id ON session_shots(session_id);

-- =====================================================
-- PART 12: ADMIN & FEEDBACK INDEXES
-- =====================================================

-- Feedback
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

-- Feedback AI responses
CREATE INDEX IF NOT EXISTS idx_feedback_ai_responses_feedback_id ON feedback_ai_responses(feedback_id);

-- =====================================================
-- VERIFICATION & SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Database Index Creation Complete!';
  RAISE NOTICE '✅ Created 100+ performance indexes';
  RAISE NOTICE '✅ Optimized: User lookups, Financial queries, AI generations, Chat history';
  RAISE NOTICE '✅ Query performance should be significantly improved';
END $$;
