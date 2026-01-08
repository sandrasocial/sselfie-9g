# SSELFIE Database Schema

**Database:** Neon PostgreSQL  
**Last Updated:** Auto-generated from migration files  
**Purpose:** Reference for insights, retention, and growth automation

---

## Core User Tables

### `users`
Primary user accounts (linked to Supabase Auth)

- `id` (TEXT, PRIMARY KEY) - Supabase UUID stored as text
- `email` (TEXT, UNIQUE)
- `display_name` (TEXT)
- `profile_image_url` (TEXT)
- `stripe_customer_id` (TEXT)
- `stripe_subscription_id` (TEXT)
- `plan` (TEXT, DEFAULT 'free')
- `role` (TEXT, DEFAULT 'user')
- `monthly_generation_limit` (INTEGER, DEFAULT 50)
- `generations_used_this_month` (INTEGER, DEFAULT 0)
- `gender` (TEXT)
- `profession` (TEXT)
- `brand_style` (TEXT)
- `photo_goals` (TEXT)
- `onboarding_completed` (BOOLEAN, DEFAULT false)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `last_login_at` (TIMESTAMPTZ)
- `auth_id` (TEXT) - Supabase auth user ID

### `user_profiles`
Extended user profile information

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `full_name` (TEXT)
- `phone` (TEXT)
- `location` (TEXT)
- `instagram_handle` (TEXT)
- `website_url` (TEXT)
- `bio` (TEXT)
- `brand_vibe` (TEXT)
- `goals` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### `user_personal_brand`
Personal brand configuration

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users, UNIQUE)
- `brand_name` (TEXT)
- `brand_values` (TEXT[])
- `target_audience` (TEXT)
- `brand_personality` (TEXT)
- `color_palette` (JSONB)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

---

## Subscription & Payments

### `subscriptions`
Active subscriptions and membership status

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `stripe_subscription_id` (TEXT, UNIQUE)
- `stripe_customer_id` (TEXT)
- `plan_name` (TEXT) - e.g., 'sselfie_studio_membership', 'pro'
- `status` (TEXT) - 'active', 'cancelled', 'expired', 'trialing'
- `current_period_start` (TIMESTAMPTZ)
- `current_period_end` (TIMESTAMPTZ)
- `cancel_at_period_end` (BOOLEAN, DEFAULT false)
- `product_type` (TEXT) - 'sselfie_studio_membership', 'one_time_session', etc.
- `is_test_mode` (BOOLEAN, DEFAULT false)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### `stripe_payments`
All Stripe payment transactions (revenue tracking)

- `id` (SERIAL, PRIMARY KEY)
- `stripe_payment_id` (TEXT, UNIQUE) - payment_intent_id, charge_id, or invoice_id
- `stripe_invoice_id` (TEXT)
- `stripe_subscription_id` (TEXT)
- `stripe_customer_id` (TEXT)
- `user_id` (TEXT, REFERENCES users)
- `amount_cents` (INTEGER) - Payment amount in cents
- `currency` (TEXT, DEFAULT 'usd')
- `status` (TEXT) - 'succeeded', 'pending', 'failed', 'refunded'
- `payment_type` (TEXT) - 'subscription', 'one_time_session', 'credit_topup', 'refund'
- `product_type` (TEXT)
- `description` (TEXT)
- `metadata` (JSONB)
- `payment_date` (TIMESTAMPTZ)
- `is_test_mode` (BOOLEAN, DEFAULT false)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

---

## Credits System

### `user_credits`
Current credit balances per user

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users, UNIQUE)
- `balance` (INTEGER, DEFAULT 0) - Current credit balance
- `total_purchased` (INTEGER, DEFAULT 0) - Lifetime credits purchased
- `total_used` (INTEGER, DEFAULT 0) - Lifetime credits used
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### `credit_transactions`
All credit transactions (purchases and usage)

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `amount` (INTEGER) - Positive for purchases, negative for usage
- `transaction_type` (TEXT) - 'purchase', 'subscription_grant', 'training', 'image', 'animation', 'refund', 'bonus'
- `description` (TEXT)
- `reference_id` (TEXT) - Link to related entity (training_id, image_id, etc.)
- `stripe_payment_id` (TEXT)
- `payment_amount` (INTEGER) - Payment amount in cents (for purchases)
- `product_type` (TEXT) - Product purchased
- `balance_after` (INTEGER) - Balance after this transaction
- `created_at` (TIMESTAMPTZ)

---

## Training & Models

### `training_runs`
AI model training sessions

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `replicate_model_id` (TEXT)
- `trigger_word` (TEXT)
- `training_status` (TEXT, DEFAULT 'pending') - 'pending', 'training', 'completed', 'failed'
- `model_name` (TEXT)
- `replicate_version_id` (TEXT)
- `training_progress` (INTEGER, DEFAULT 0)
- `estimated_completion_time` (TIMESTAMPTZ)
- `failure_reason` (TEXT)
- `trained_model_path` (TEXT)
- `lora_weights_url` (TEXT)
- `training_id` (TEXT)
- `is_luxury` (BOOLEAN, DEFAULT false)
- `model_type` (TEXT)
- `finetune_id` (TEXT)
- `is_test` (BOOLEAN, DEFAULT false)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `started_at` (TIMESTAMPTZ)
- `completed_at` (TIMESTAMPTZ)

### `selfie_uploads`
Training image uploads

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `training_run_id` (INTEGER, REFERENCES training_runs)
- `image_url` (TEXT)
- `uploaded_at` (TIMESTAMPTZ)

### `lora_weights`
LoRA model weights storage

- `id` (SERIAL, PRIMARY KEY)
- `training_run_id` (INTEGER, REFERENCES training_runs)
- `weights_url` (TEXT)
- `version` (TEXT)
- `created_at` (TIMESTAMPTZ)

### `user_models`
Active user models

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `training_run_id` (INTEGER, REFERENCES training_runs)
- `model_name` (TEXT)
- `trigger_word` (TEXT)
- `is_active` (BOOLEAN, DEFAULT true)
- `created_at` (TIMESTAMPTZ)

---

## Image Generation

### `generated_images`
Classic mode generated images

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `model_id` (INTEGER, REFERENCES training_runs)
- `category` (TEXT)
- `subcategory` (TEXT)
- `prompt` (TEXT)
- `image_urls` (TEXT[]) - Array of image URLs
- `selected_url` (TEXT)
- `saved` (BOOLEAN, DEFAULT false)
- `created_at` (TIMESTAMPTZ)

### `ai_images`
Pro mode generated images (gallery)

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `image_url` (TEXT)
- `prompt` (TEXT)
- `description` (TEXT)
- `category` (TEXT)
- `style` (TEXT)
- `is_selected` (BOOLEAN, DEFAULT false)
- `is_favorite` (BOOLEAN, DEFAULT false)
- `prediction_id` (TEXT)
- `generation_status` (TEXT) - 'pending', 'generating', 'completed', 'failed'
- `created_at` (TIMESTAMPTZ)

### `generated_videos`
Generated video content

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `image_id` (INTEGER, REFERENCES ai_images)
- `video_url` (TEXT)
- `status` (TEXT) - 'pending', 'generating', 'completed', 'failed'
- `created_at` (TIMESTAMPTZ)

### `photo_selections`
User favorites and collections

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `image_id` (INTEGER, REFERENCES generated_images)
- `selection_type` (TEXT) - 'favorite', 'download', 'share'
- `created_at` (TIMESTAMPTZ)

---

## Maya AI Chat

### `maya_chats`
Chat sessions with Maya

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `title` (TEXT)
- `chat_type` (TEXT) - 'maya', 'feed_designer', 'feed_planner', 'pro', 'prompt_builder'
- `feed_layout_id` (INTEGER, REFERENCES feed_layouts)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `last_activity` (TIMESTAMPTZ)

### `maya_chat_messages`
Chat messages

- `id` (SERIAL, PRIMARY KEY)
- `chat_id` (INTEGER, REFERENCES maya_chats)
- `role` (TEXT) - 'user', 'assistant'
- `content` (TEXT)
- `concept_cards` (JSONB)
- `styling_details` (JSONB)
- `created_at` (TIMESTAMPTZ)

### `maya_personal_memory`
Maya's memory of user preferences

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users, UNIQUE)
- `memory_data` (JSONB, DEFAULT '{}')
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### `maya_concepts`
Concept cards generated by Maya

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `title` (TEXT)
- `description` (TEXT)
- `type` (TEXT) - Category/type
- `prompt` (TEXT)
- `created_at` (TIMESTAMPTZ)

### `concept_cards`
Legacy concept cards table

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `chat_id` (INTEGER, REFERENCES maya_chats)
- `title` (TEXT)
- `description` (TEXT)
- `aesthetic` (TEXT)
- `prompt` (TEXT)
- `image_url` (TEXT)
- `created_at` (TIMESTAMPTZ)

---

## Feed Planner

### `feed_layouts`
Instagram feed layouts (9-post grids)

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `name` (TEXT)
- `description` (TEXT)
- `status` (TEXT, DEFAULT 'draft') - 'draft', 'published'
- `grid_order` (JSONB) - Array of image IDs in order
- `profile_data` (JSONB) - {profileImage, name, handle, bio, highlights}
- `brand_vibe` (TEXT)
- `business_type` (TEXT)
- `color_palette` (TEXT)
- `visual_rhythm` (TEXT)
- `feed_story` (TEXT)
- `research_insights` (TEXT)
- `hashtags` (TEXT[])
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### `feed_posts`
Individual posts in a feed

- `id` (SERIAL, PRIMARY KEY)
- `feed_layout_id` (INTEGER, REFERENCES feed_layouts)
- `user_id` (TEXT, REFERENCES users)
- `position` (INTEGER) - 1-9 for grid position
- `image_id` (INTEGER, REFERENCES generated_images)
- `title` (TEXT)
- `description` (TEXT)
- `prompt` (TEXT)
- `category` (TEXT)
- `caption` (TEXT)
- `hashtags` (TEXT[])
- `text_overlay` (JSONB)
- `generation_status` (TEXT) - 'pending', 'generating', 'completed', 'failed'
- `prediction_id` (TEXT)
- `is_pro_mode` (BOOLEAN, DEFAULT false)
- `created_at` (TIMESTAMPTZ)

### `feed_strategy`
Complete feed strategy documents

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `feed_layout_id` (INTEGER, REFERENCES feed_layouts)
- `brand_positioning` (TEXT)
- `content_pillars` (JSONB) - Array of content pillars
- `posting_schedule` (JSONB)
- `growth_tactics` (JSONB)
- `competitive_advantages` (JSONB)
- `hook_formulas` (JSONB)
- `caption_templates` (JSONB)
- `hashtag_strategy` (JSONB)
- `content_format_mix` (JSONB)
- `strategy_version` (INTEGER, DEFAULT 1)
- `is_active` (BOOLEAN, DEFAULT true)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### `instagram_bios`
Instagram bio configurations

- `id` (SERIAL, PRIMARY KEY)
- `feed_layout_id` (INTEGER, REFERENCES feed_layouts)
- `user_id` (TEXT, REFERENCES users)
- `bio_text` (TEXT)
- `emoji_style` (TEXT)
- `link_text` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### `instagram_highlights`
Instagram story highlights

- `id` (SERIAL, PRIMARY KEY)
- `feed_layout_id` (INTEGER, REFERENCES feed_layouts)
- `user_id` (TEXT, REFERENCES users)
- `title` (TEXT)
- `image_url` (TEXT)
- `icon_style` (TEXT)
- `prompt` (TEXT)
- `generation_status` (TEXT, DEFAULT 'pending')
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### `carousel_posts`
Carousel post configurations

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `title` (TEXT)
- `caption` (TEXT)
- `hashtags` (TEXT[])
- `image_ids` (INTEGER[]) - Array of generated_images IDs
- `text_overlays` (JSONB)
- `created_at` (TIMESTAMPTZ)

---

## Pro Photoshoot

### `pro_photoshoot_sessions`
Pro photoshoot sessions (admin feature)

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `original_image_id` (INTEGER, REFERENCES ai_images)
- `total_grids` (INTEGER, DEFAULT 8)
- `session_status` (TEXT, DEFAULT 'active') - 'active', 'completed', 'cancelled'
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `completed_at` (TIMESTAMPTZ)

### `pro_photoshoot_grids`
3x3 grids generated for Pro Photoshoot

- `id` (SERIAL, PRIMARY KEY)
- `session_id` (INTEGER, REFERENCES pro_photoshoot_sessions)
- `grid_number` (INTEGER) - 1-8
- `prediction_id` (TEXT)
- `grid_url` (TEXT) - Full grid image URL
- `generation_status` (TEXT, DEFAULT 'pending') - 'pending', 'generating', 'completed', 'failed'
- `prompt` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `completed_at` (TIMESTAMPTZ)

### `pro_photoshoot_frames`
Individual frames extracted from grids (9 per grid)

- `id` (SERIAL, PRIMARY KEY)
- `grid_id` (INTEGER, REFERENCES pro_photoshoot_grids)
- `frame_number` (INTEGER) - 1-9
- `frame_url` (TEXT) - Individual frame image URL
- `gallery_image_id` (INTEGER, REFERENCES ai_images)
- `created_at` (TIMESTAMPTZ)

---

## Academy

### `academy_courses`
Course catalog

- `id` (SERIAL, PRIMARY KEY)
- `title` (TEXT)
- `description` (TEXT)
- `duration_minutes` (INTEGER)
- `level` (TEXT) - 'Beginner', 'Intermediate', 'Advanced'
- `category` (TEXT)
- `tier` (TEXT) - 'foundation', 'professional', 'enterprise'
- `thumbnail_url` (TEXT)
- `instructor_name` (TEXT)
- `total_lessons` (INTEGER, DEFAULT 0)
- `order_index` (INTEGER, DEFAULT 0)
- `status` (TEXT, DEFAULT 'published') - 'draft', 'published', 'archived'
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### `academy_lessons`
Lessons within courses

- `id` (SERIAL, PRIMARY KEY)
- `course_id` (INTEGER, REFERENCES academy_courses)
- `title` (TEXT)
- `description` (TEXT)
- `lesson_number` (INTEGER)
- `lesson_type` (TEXT, DEFAULT 'video') - 'video', 'interactive'
- `video_url` (TEXT)
- `duration_minutes` (INTEGER)
- `duration_seconds` (INTEGER)
- `content` (JSONB) - For interactive lessons
- `resources` (JSONB) - Downloadable resources
- `order_index` (INTEGER)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### `user_academy_enrollments`
User course enrollments

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `course_id` (INTEGER, REFERENCES academy_courses)
- `enrolled_at` (TIMESTAMPTZ)
- `completed_at` (TIMESTAMPTZ)
- `progress_percentage` (INTEGER, DEFAULT 0) - 0-100
- `last_accessed_at` (TIMESTAMPTZ)

### `user_lesson_progress`
User lesson progress tracking

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `lesson_id` (INTEGER, REFERENCES academy_lessons)
- `watch_time_seconds` (INTEGER, DEFAULT 0)
- `completed_steps` (JSONB, DEFAULT '[]')
- `status` (TEXT, DEFAULT 'not_started') - 'not_started', 'in_progress', 'completed'
- `completed_at` (TIMESTAMPTZ)
- `last_accessed_at` (TIMESTAMPTZ)

### `academy_exercises`
Exercises/quizzes attached to lessons

- `id` (SERIAL, PRIMARY KEY)
- `lesson_id` (INTEGER, REFERENCES academy_lessons)
- `exercise_type` (TEXT) - 'multiple_choice', 'text_input', 'checkbox', 'image_selection'
- `question` (TEXT)
- `options` (JSONB)
- `correct_answer` (TEXT)
- `explanation` (TEXT)
- `order_index` (INTEGER, DEFAULT 0)
- `created_at` (TIMESTAMPTZ)

### `academy_exercise_submissions`
User exercise submissions

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `exercise_id` (INTEGER, REFERENCES academy_exercises)
- `answer` (TEXT)
- `is_correct` (BOOLEAN)
- `submitted_at` (TIMESTAMPTZ)

### `academy_certificates`
Course completion certificates

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `course_id` (INTEGER, REFERENCES academy_courses)
- `certificate_url` (TEXT)
- `issued_at` (TIMESTAMPTZ)

### `academy_templates`
Downloadable templates

- `id` (SERIAL, PRIMARY KEY)
- `title` (TEXT)
- `description` (TEXT)
- `thumbnail_url` (TEXT)
- `resource_type` (TEXT)
- `resource_url` (TEXT)
- `category` (TEXT)
- `order_index` (INTEGER)
- `download_count` (INTEGER, DEFAULT 0)
- `status` (TEXT, DEFAULT 'published')
- `created_at` (TIMESTAMPTZ)

### `academy_flatlay_images`
Flatlay image resources

- `id` (SERIAL, PRIMARY KEY)
- `title` (TEXT)
- `description` (TEXT)
- `image_url` (TEXT)
- `category` (TEXT)
- `order_index` (INTEGER)
- `created_at` (TIMESTAMPTZ)

### `academy_monthly_drops`
Monthly content drops

- `id` (SERIAL, PRIMARY KEY)
- `title` (TEXT)
- `description` (TEXT)
- `resource_url` (TEXT)
- `month` (TEXT)
- `year` (INTEGER)
- `order_index` (INTEGER)
- `created_at` (TIMESTAMPTZ)

---

## Prompt Guides

### `prompt_guides`
Prompt guide collections

- `id` (SERIAL, PRIMARY KEY)
- `title` (TEXT)
- `description` (TEXT)
- `category` (TEXT)
- `status` (TEXT, DEFAULT 'draft') - 'draft', 'published'
- `created_by` (TEXT, REFERENCES users)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `published_at` (TIMESTAMPTZ)
- `total_prompts` (INTEGER, DEFAULT 0)
- `total_approved` (INTEGER, DEFAULT 0)

### `prompt_guide_items`
Individual prompts in guides

- `id` (SERIAL, PRIMARY KEY)
- `guide_id` (INTEGER, REFERENCES prompt_guides)
- `prompt_text` (TEXT)
- `concept_title` (TEXT)
- `concept_description` (TEXT)
- `category` (TEXT)
- `image_url` (TEXT)
- `replicate_prediction_id` (TEXT)
- `status` (TEXT, DEFAULT 'pending') - 'pending', 'approved', 'rejected'
- `sort_order` (INTEGER, DEFAULT 0)
- `generation_settings` (JSONB)
- `created_at` (TIMESTAMPTZ)
- `approved_at` (TIMESTAMPTZ)
- `approved_by` (TEXT, REFERENCES users)

### `prompt_pages`
Public URL-based pages for guides

- `id` (SERIAL, PRIMARY KEY)
- `guide_id` (INTEGER, REFERENCES prompt_guides)
- `slug` (TEXT, UNIQUE)
- `title` (TEXT)
- `welcome_message` (TEXT)
- `email_capture_type` (TEXT, DEFAULT 'modal') - 'modal', 'inline', 'top'
- `email_list_tag` (TEXT)
- `upsell_link` (TEXT)
- `upsell_text` (TEXT)
- `status` (TEXT, DEFAULT 'draft') - 'draft', 'published'
- `view_count` (INTEGER, DEFAULT 0)
- `email_capture_count` (INTEGER, DEFAULT 0)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `published_at` (TIMESTAMPTZ)

---

## Email & Marketing

### `email_sends`
Email send tracking

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `email_type` (TEXT)
- `subject` (TEXT)
- `status` (TEXT) - 'sent', 'delivered', 'bounced', 'failed'
- `sent_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)

### `email_campaigns`
Email campaign tracking

- `id` (SERIAL, PRIMARY KEY)
- `campaign_name` (TEXT)
- `subject_line` (TEXT)
- `body_html` (TEXT)
- `target_audience` (JSONB)
- `status` (TEXT)
- `sent_count` (INTEGER, DEFAULT 0)
- `open_count` (INTEGER, DEFAULT 0)
- `click_count` (INTEGER, DEFAULT 0)
- `created_at` (TIMESTAMPTZ)
- `sent_at` (TIMESTAMPTZ)

### `admin_email_drafts`
AI-generated email drafts

- `id` (SERIAL, PRIMARY KEY)
- `campaign_name` (TEXT)
- `subject_line` (TEXT)
- `preview_text` (TEXT)
- `body_text` (TEXT)
- `body_html` (TEXT)
- `target_audience` (JSONB)
- `image_urls` (TEXT[])
- `created_by` (TEXT, DEFAULT 'maya_agent')
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### `blueprint_subscribers`
Blueprint email capture

- `id` (SERIAL, PRIMARY KEY)
- `email` (TEXT)
- `name` (TEXT)
- `instagram_handle` (TEXT)
- `subscribed_at` (TIMESTAMPTZ)

### `freebie_subscribers`
Freebie email capture

- `id` (SERIAL, PRIMARY KEY)
- `email` (TEXT)
- `name` (TEXT)
- `subscribed_at` (TIMESTAMPTZ)

### `waitlist`
Waitlist signups

- `id` (SERIAL, PRIMARY KEY)
- `email` (TEXT)
- `name` (TEXT)
- `created_at` (TIMESTAMPTZ)

---

## Admin & Analytics

### `admin_feature_flags`
Feature flag configuration

- `id` (SERIAL, PRIMARY KEY)
- `flag_name` (TEXT, UNIQUE)
- `is_enabled` (BOOLEAN, DEFAULT false)
- `description` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### `admin_cron_runs`
Cron job execution tracking

- `id` (SERIAL, PRIMARY KEY)
- `cron_name` (TEXT)
- `status` (TEXT) - 'success', 'failed', 'running'
- `started_at` (TIMESTAMPTZ)
- `completed_at` (TIMESTAMPTZ)
- `error_message` (TEXT)
- `created_at` (TIMESTAMPTZ)

### `admin_email_errors`
Email error tracking

- `id` (SERIAL, PRIMARY KEY)
- `email_type` (TEXT)
- `recipient_email` (TEXT)
- `error_message` (TEXT)
- `error_code` (TEXT)
- `created_at` (TIMESTAMPTZ)

### `mission_control_tasks`
Mission control task tracking

- `id` (SERIAL, PRIMARY KEY)
- `task_name` (TEXT)
- `task_type` (TEXT)
- `status` (TEXT) - 'pending', 'in_progress', 'completed', 'failed'
- `priority` (INTEGER, DEFAULT 0)
- `due_date` (TIMESTAMPTZ)
- `completed_at` (TIMESTAMPTZ)
- `notes` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### `alex_suggestion_history`
Alex AI suggestion tracking

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `suggestion_type` (TEXT)
- `suggestion_text` (TEXT)
- `reasoning` (TEXT)
- `priority` (INTEGER, DEFAULT 0)
- `dismissed` (BOOLEAN, DEFAULT false)
- `dismissed_at` (TIMESTAMPTZ)
- `acted_upon` (BOOLEAN, DEFAULT false)
- `acted_upon_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)

### `admin_agent_messages`
Admin agent message history

- `id` (SERIAL, PRIMARY KEY)
- `message_type` (TEXT)
- `content` (TEXT)
- `metadata` (JSONB)
- `created_at` (TIMESTAMPTZ)

---

## Content & Creative

### `instagram_captions`
Instagram caption templates

- `id` (SERIAL, PRIMARY KEY)
- `title` (TEXT)
- `caption_text` (TEXT)
- `hashtags` (TEXT[])
- `category` (TEXT)
- `created_at` (TIMESTAMPTZ)

### `content_calendars`
Content calendar configurations

- `id` (SERIAL, PRIMARY KEY)
- `title` (TEXT)
- `description` (TEXT)
- `duration` (TEXT)
- `start_date` (DATE)
- `end_date` (DATE)
- `platform` (TEXT)
- `calendar_data` (JSONB)
- `content_pillars` (TEXT[])
- `total_posts` (INTEGER)
- `created_by` (TEXT, REFERENCES users)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### `maya_prompt_suggestions`
Maya prompt suggestions library

- `id` (SERIAL, PRIMARY KEY)
- `prompt_text` (TEXT)
- `prompt_title` (TEXT)
- `category` (TEXT)
- `season` (TEXT)
- `style` (TEXT)
- `mood` (TEXT)
- `tags` (TEXT[])
- `use_case` (TEXT)
- `created_by` (TEXT, REFERENCES users)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### `writing_assistant_outputs`
Writing assistant saved content

- `id` (SERIAL, PRIMARY KEY)
- `content_pillar` (TEXT) - 'prompts', 'story', 'future_self', 'photoshoot'
- `output_type` (TEXT) - 'caption', 'overlay', 'voiceover', 'hashtags'
- `content` (TEXT)
- `context` (JSONB)
- `calendar_scheduled` (BOOLEAN, DEFAULT false)
- `scheduled_date` (TIMESTAMPTZ)
- `created_by` (TEXT, REFERENCES users)
- `created_at` (TIMESTAMPTZ)

---

## Feedback & Testimonials

### `feedback`
User feedback submissions

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `feedback_type` (TEXT)
- `message` (TEXT)
- `rating` (INTEGER)
- `image_urls` (TEXT[])
- `share_type` (TEXT)
- `created_at` (TIMESTAMPTZ)

### `testimonials`
Customer testimonials

- `id` (SERIAL, PRIMARY KEY)
- `customer_name` (TEXT)
- `testimonial_text` (TEXT)
- `rating` (INTEGER) - 1-5
- `is_featured` (BOOLEAN, DEFAULT false)
- `is_published` (BOOLEAN, DEFAULT true)
- `screenshot_url` (TEXT)
- `image_url_2` (TEXT)
- `image_url_3` (TEXT)
- `image_url_4` (TEXT)
- `collected_at` (TIMESTAMPTZ)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

---

## Other Tables

### `brand_assets`
User brand asset storage

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `file_name` (TEXT)
- `file_url` (TEXT)
- `file_type` (TEXT)
- `file_size` (INTEGER)
- `description` (TEXT)
- `created_at` (TIMESTAMPTZ)

### `user_styleguides`
User style guide configurations

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `name` (TEXT)
- `description` (TEXT)
- `style_rules` (JSONB, DEFAULT '{}')
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### `instagram_connections`
Instagram account connections

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `instagram_account_id` (TEXT)
- `access_token` (TEXT)
- `connected_at` (TIMESTAMPTZ)

### `generation_trackers`
Image generation tracking

- `id` (SERIAL, PRIMARY KEY)
- `user_id` (TEXT, REFERENCES users)
- `prediction_id` (TEXT)
- `status` (TEXT)
- `created_at` (TIMESTAMPTZ)

### `weekly_journal`
Weekly journal entries

- `id` (SERIAL, PRIMARY KEY)
- `week_start_date` (DATE)
- `content` (TEXT)
- `status` (TEXT) - 'draft', 'published'
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### `daily_captures`
Daily capture entries

- `id` (SERIAL, PRIMARY KEY)
- `journal_id` (INTEGER, REFERENCES weekly_journal)
- `date` (DATE)
- `content` (TEXT)
- `created_at` (TIMESTAMPTZ)

---

## Key Relationships

### User → Subscriptions
- `users.id` → `subscriptions.user_id` (One-to-Many)

### User → Credits
- `users.id` → `user_credits.user_id` (One-to-One)
- `users.id` → `credit_transactions.user_id` (One-to-Many)

### User → Training
- `users.id` → `training_runs.user_id` (One-to-Many)
- `training_runs.id` → `selfie_uploads.training_run_id` (One-to-Many)

### User → Images
- `users.id` → `generated_images.user_id` (One-to-Many)
- `users.id` → `ai_images.user_id` (One-to-Many)

### User → Maya
- `users.id` → `maya_chats.user_id` (One-to-Many)
- `maya_chats.id` → `maya_chat_messages.chat_id` (One-to-Many)

### User → Feeds
- `users.id` → `feed_layouts.user_id` (One-to-Many)
- `feed_layouts.id` → `feed_posts.feed_layout_id` (One-to-Many)
- `feed_layouts.id` → `feed_strategy.feed_layout_id` (One-to-One)

### User → Academy
- `users.id` → `user_academy_enrollments.user_id` (One-to-Many)
- `academy_courses.id` → `academy_lessons.course_id` (One-to-Many)

### Payments
- `users.id` → `stripe_payments.user_id` (One-to-Many)
- `stripe_payments.stripe_customer_id` → `users.stripe_customer_id` (Many-to-One)

---

## Key Metrics Tables

**Revenue:**
- `stripe_payments` - All payment transactions
- `credit_transactions` - Credit purchases

**User Activity:**
- `users` - User accounts and login tracking
- `maya_chats` - AI interaction frequency
- `generated_images` / `ai_images` - Image generation activity
- `training_runs` - Model training activity

**Engagement:**
- `user_academy_enrollments` - Course enrollment
- `user_lesson_progress` - Learning progress
- `feed_layouts` - Feed creation activity
- `maya_chat_messages` - Chat engagement

**Retention:**
- `subscriptions` - Active subscriptions
- `users.last_login_at` - Last activity
- `credit_transactions` - Credit usage patterns

---

**Note:** This schema is extracted from migration files. For the most up-to-date schema, run:
```bash
pg_dump -s your_database > docs/schema.sql
```
