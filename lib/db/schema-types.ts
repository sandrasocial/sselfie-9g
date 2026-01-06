/**
 * Database Schema Types - ACTUAL SCHEMA
 * 
 * ⚠️ IMPORTANT: These types match the ACTUAL database schema in scripts/00-create-all-tables.sql
 * 
 * CRITICAL RULES:
 * - Most table IDs are SERIAL (INTEGER), NOT UUID
 * - user_id columns are TEXT (stores Supabase UUID as string), NOT UUID
 * - users.id is TEXT (stores Supabase UUID as string), NOT UUID
 * - Never use UUID types unless explicitly verified
 * 
 * @see DATABASE_SCHEMA.md for full documentation
 */

// ============================================================================
// Core User Tables
// ============================================================================

export interface User {
  id: string  // TEXT (stores Supabase UUID as string), NOT UUID type
  email: string | null
  display_name: string | null
  profile_image_url: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan: string
  role: string
  monthly_generation_limit: number
  generations_used_this_month: number
  gender: string | null
  profession: string | null
  brand_style: string | null
  photo_goals: string | null
  onboarding_completed: boolean
  created_at: string
  updated_at: string
  last_login_at: string | null
}

export interface UserProfile {
  id: number  // SERIAL (INTEGER)
  user_id: string  // TEXT
  full_name: string | null
  phone: string | null
  location: string | null
  instagram_handle: string | null
  website_url: string | null
  bio: string | null
  brand_vibe: string | null
  goals: string | null
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: number  // SERIAL (INTEGER)
  user_id: string  // TEXT
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  plan_name: string
  status: string
  current_period_start: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

// ============================================================================
// Maya Chat Tables
// ============================================================================

export interface MayaChat {
  id: number  // SERIAL (INTEGER), NOT UUID
  user_id: string  // TEXT, NOT UUID
  title: string | null
  chat_type?: string  // 'maya' | 'feed-planner' | 'pro'
  created_at: string
  updated_at: string
}

export interface MayaChatMessage {
  id: number  // SERIAL (INTEGER), NOT UUID
  chat_id: number  // INTEGER, NOT UUID
  role: 'user' | 'assistant'
  content: string
  concept_cards?: any  // JSONB array
  styling_details?: any  // JSONB (legacy - use feed_cards)
  feed_cards?: any  // JSONB array
  created_at: string
}

export interface MayaPersonalMemory {
  id: number  // SERIAL (INTEGER)
  user_id: string  // TEXT
  memory_data: Record<string, any>  // JSONB
  created_at: string
  updated_at: string
}

// ============================================================================
// Image Generation Tables
// ============================================================================

export interface GeneratedImage {
  id: number  // SERIAL (INTEGER), NOT UUID
  user_id: string  // TEXT, NOT UUID
  model_id: number | null  // INTEGER
  category: string
  subcategory: string
  prompt: string
  image_urls: string[]  // TEXT[] array, NOT single image_url
  selected_url: string | null  // TEXT, NOT image_url
  saved: boolean
  created_at: string
  // NOTE: Does NOT have concept_card_id column
}

export interface AIImage {
  id: number  // SERIAL (INTEGER), NOT UUID
  user_id: string  // TEXT, NOT UUID
  image_url: string
  prompt: string | null
  generated_prompt: string | null
  prediction_id: string | null  // TEXT (for Pro Mode)
  generation_status: string | null
  source: string | null
  category: string | null
  created_at: string
}

export interface ConceptCard {
  id: number  // SERIAL (INTEGER), NOT UUID
  user_id: string  // TEXT, NOT UUID
  chat_id: number  // INTEGER, NOT UUID
  title: string
  description: string | null
  aesthetic: string | null
  prompt: string
  image_url: string | null
  created_at: string
}

// ============================================================================
// Training Tables
// ============================================================================

export interface TrainingRun {
  id: number  // SERIAL (INTEGER)
  user_id: string  // TEXT
  replicate_model_id: string | null
  trigger_word: string
  training_status: string
  model_name: string | null
  replicate_version_id: string | null
  training_progress: number
  estimated_completion_time: string | null
  failure_reason: string | null
  trained_model_path: string | null
  lora_weights_url: string | null
  training_id: string | null
  is_luxury: boolean
  model_type: string | null
  finetune_id: string | null
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null
}

export interface UserModel {
  id: number  // SERIAL (INTEGER)
  user_id: string  // TEXT
  training_run_id: number | null  // INTEGER
  model_name: string
  trigger_word: string
  is_active: boolean
  created_at: string
}

export interface SelfieUpload {
  id: number  // SERIAL (INTEGER)
  user_id: string  // TEXT
  training_run_id: number  // INTEGER
  image_url: string
  uploaded_at: string
}

export interface LoraWeight {
  id: number  // SERIAL (INTEGER)
  training_run_id: number  // INTEGER
  weights_url: string
  version: string | null
  created_at: string
}

// ============================================================================
// Other Tables
// ============================================================================

export interface PhotoSelection {
  id: number  // SERIAL (INTEGER)
  user_id: string  // TEXT
  image_id: number  // INTEGER
  selection_type: 'favorite' | 'download' | 'share'
  created_at: string
}

export interface UserPersonalBrand {
  id: number  // SERIAL (INTEGER)
  user_id: string  // TEXT
  brand_name: string | null
  brand_values: string[] | null
  target_audience: string | null
  brand_personality: string | null
  color_palette: Record<string, any> | null  // JSONB
  created_at: string
  updated_at: string
}

export interface UserStyleguide {
  id: number  // SERIAL (INTEGER)
  user_id: string  // TEXT
  name: string
  description: string | null
  style_rules: Record<string, any>  // JSONB
  created_at: string
  updated_at: string
}

export interface BrandAsset {
  id: number  // SERIAL (INTEGER)
  user_id: string  // TEXT
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  description: string | null
  created_at: string
}

export interface WritingAssistantOutput {
  id: number  // SERIAL (INTEGER), NOT UUID
  user_id: string  // TEXT
  content_pillar: string | null
  output_type: string | null
  content: string
  context: Record<string, any> | null  // JSONB
  created_at: string
}

export interface FreebieSubscriber {
  id: number  // SERIAL (INTEGER), NOT UUID
  email: string
  name: string | null
  access_token: string
  guide_opened: boolean
  guide_opened_at: string | null
  scroll_progress: number
  cta_clicks: number
  converted: boolean
  converted_at: string | null
  created_at: string
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Type guard to check if an ID is a valid INTEGER (SERIAL)
 */
export function isSerialId(id: any): id is number {
  return typeof id === 'number' || (typeof id === 'string' && !isNaN(parseInt(id, 10)))
}

/**
 * Type guard to check if an ID is a valid TEXT (user ID)
 */
export function isTextId(id: any): id is string {
  return typeof id === 'string'
}

/**
 * Safely convert ID to INTEGER for queries
 */
export function toSerialId(id: string | number): number {
  return typeof id === 'number' ? id : parseInt(id, 10)
}

/**
 * Safely convert ID to TEXT for queries
 */
export function toTextId(id: string | number): string {
  return typeof id === 'string' ? id : String(id)
}

