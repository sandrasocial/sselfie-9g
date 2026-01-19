/**
 * FEED PLANNER — SINGLE SOURCE OF TRUTH FOR SCENES
 * 
 * ✅ SINGLE SOURCE OF TRUTH: All Feed Planner scene intent decisions happen here.
 * 
 * FEED SYSTEM LOCKED — STRATEGY ≠ EXECUTION
 * Do not merge preview and single-scene logic
 * 
 * CRITICAL SEPARATION:
 * - This resolver outputs EXECUTION data (outfits, locations, poses, activities)
 * - Preview uses this data to derive STRATEGY (content type, framing, visual role)
 * - Single scenes use this data for EXECUTION (full scene generation)
 * 
 * This file consolidates ALL scene intent decisions into ONE place.
 * It outputs structured scene data, NOT prompt text.
 * 
 * DO NOT ADD PROMPT LOGIC HERE
 * DO NOT ADD TEMPLATE LOGIC HERE
 * DO NOT ADD FORMATTING LOGIC HERE
 * 
 * This resolver answers: "What is happening in this scene?" (EXECUTION)
 * Not: "How do we word the prompt?" (That's prompt-shaper.ts)
 * Not: "What is the visual strategy?" (That's derived from execution data in preview mode)
 * 
 * For prompt generation, see: prompt-shaper.ts
 */

import { neon } from "@neondatabase/serverless"
import { getCoherentStyleParameters } from "./generation-helpers"

const sql = neon(process.env.DATABASE_URL!)

// ============================================================================
// STRUCTURED SCENE DATA (SINGLE SOURCE OF TRUTH)
// ============================================================================

/**
 * Structured Scene Object
 * 
 * This is the SINGLE SOURCE OF TRUTH for Feed Planner scenes.
 * No prompt text exists here. Only structured data.
 */
export interface FeedPlannerScene {
  // Core scene intent
  position: number // 1-9
  activity: string // Human activity: "post_workout_coffee", "remote_work_break", etc.
  narrative: string // Human-readable story
  
  // Location
  location: {
    type: string // "coffee_shop", "home_living_room", "gym", etc.
    description: string // Human-readable location description
    indoor: boolean
    public: boolean
  }
  
  // Outfit
  outfit: {
    style: string // Resolved fashion style (after coherence)
    description: string // Human-readable outfit description
    base: string // Base outfit type
    layer?: string // Optional layer (e.g., "coat", "jacket")
  }
  
  // Objects
  objects: Array<{
    type: string // "coffee_cup", "phone", "laptop", etc.
    description: string // Human-readable object description
    position?: 'hand' | 'table' | 'bag' | 'ground'
  }>
  
  // Technical
  lighting: {
    type: string // "natural_window_light", "overcast_daylight", etc.
    quality: 'even' | 'uneven' | 'dramatic'
    description: string // Human-readable lighting description
  }
  
  camera: {
    device: 'iphone_15_pro'
    mode: 'portrait' | 'photo'
    framing: 'close_up' | 'midshot' | 'full_body' | 'environmental' | 'flatlay'
  }
  
  pose: {
    type: string // "walking_toward_camera", "sitting_at_table", etc.
    description: string // Human-readable pose description
  }
  
  // Aesthetic context (derived, not primary)
  category: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
  mood: "luxury" | "minimal" | "beige"
  visualAesthetic?: string // Raw user choice (e.g., "Warm & Cozy", "Clean & Minimalistic")
  fashionStyle: string // Resolved fashion style
  
  // Metadata
  userId: string
  feedId: number
}

// ============================================================================
// SCENE RESOLVER (SINGLE FUNCTION)
// ============================================================================

interface ResolveSceneOptions {
  /**
   * Whether to check settings_preference (SECONDARY source)
   * Default: true
   */
  checkSettingsPreference?: boolean
  
  /**
   * Whether to check blueprint_subscribers (FALLBACK for legacy)
   * Default: true
   */
  checkBlueprintSubscribers?: boolean
  
  /**
   * Default category when no brand context exists
   * Default: 'minimal'
   */
  defaultCategory?: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
}

/**
 * Resolve Scene Intent
 * 
 * This is the SINGLE SOURCE OF TRUTH for Feed Planner scene resolution.
 * It consolidates all decision-making from:
 * - getCategoryAndMood()
 * - getFashionStyleForPosition()
 * - getCoherentStyleParameters()
 * 
 * Output: Structured scene data (not prompt text)
 * 
 * @param feedLayout - Feed layout with feed_style
 * @param user - User object with id
 * @param position - Frame position (1-9)
 * @param options - Resolution options
 * @returns Structured scene object
 */
export async function resolveFeedPlannerScene(
  feedLayout: { 
    id?: string | number
    feed_style?: string | null
    visual_aesthetic?: string | unknown[] | null
    fashion_style?: string | unknown[] | null
  } | null | undefined,
  user: { id: string | number },
  position: number,
  options: ResolveSceneOptions = {}
): Promise<FeedPlannerScene> {
  const {
    checkSettingsPreference = true,
    checkBlueprintSubscribers = true,
    defaultCategory = 'minimal'
  } = options
  
  // ========================================================================
  // STEP 1: Resolve Coherent Style Parameters
  // ========================================================================
  // This consolidates category, mood, and fashion style resolution
  // Uses existing getCoherentStyleParameters() to maintain compatibility
  const {
    category,
    mood,
    visualAesthetic,
    fashionStyle: resolvedFashionStyle,
    adaptationApplied
  } = await getCoherentStyleParameters(
    feedLayout,
    user,
    position,
    {
      checkSettingsPreference,
      checkBlueprintSubscribers,
      defaultCategory,
      orderBy: 'updated_at'
    }
  )
  
  if (adaptationApplied) {
    console.log(`[SCENE-RESOLVER] ⚠️ Fashion style adapted for coherence: ${resolvedFashionStyle}`)
  }
  
  // ========================================================================
  // STEP 2: Derive Activity from Position + Category + Fashion Style
  // ========================================================================
  // This is where we move from style-first to activity-first
  // Activities are derived from position patterns, not aesthetic categories
  const activity = deriveActivityFromPosition(position, category, resolvedFashionStyle)
  
  // ========================================================================
  // STEP 3: Derive Location from Activity
  // ========================================================================
  const location = deriveLocationFromActivity(activity, category)
  
  // ========================================================================
  // STEP 4: Derive Outfit from Activity + Location + Fashion Style
  // ========================================================================
  const outfit = deriveOutfitFromActivity(activity, location, resolvedFashionStyle, category)
  
  // ========================================================================
  // STEP 5: Derive Objects from Activity + Position
  // ========================================================================
  const objects = deriveObjectsFromActivity(activity, resolvedFashionStyle, position)
  
  // ========================================================================
  // STEP 6: Derive Lighting from Activity + Location + Mood
  // ========================================================================
  const lighting = deriveLightingFromActivity(activity, location, mood)
  
  // ========================================================================
  // STEP 7: Derive Camera from Activity + Location + Position
  // ========================================================================
  const camera = deriveCameraFromActivity(activity, location, position)
  
  // ========================================================================
  // STEP 8: Derive Pose from Activity
  // ========================================================================
  const pose = derivePoseFromActivity(activity, position)
  
  // ========================================================================
  // STEP 9: Build Narrative
  // ========================================================================
  // Position 5 (center anchor) gets a special brand statement for sign/text overlay
  const narrative = position === 5 
    ? buildBrandStatement(category, mood, resolvedFashionStyle) 
    : buildNarrative(activity, location, outfit)
  
  // ========================================================================
  // ASSEMBLE SCENE OBJECT
  // ========================================================================
  return {
    position,
    activity,
    narrative,
    location,
    outfit,
    objects,
    lighting,
    camera,
    pose,
    category,
    mood,
    visualAesthetic,
    fashionStyle: resolvedFashionStyle,
    userId: user.id.toString(),
    feedId: typeof feedLayout?.id === 'string' ? parseInt(feedLayout.id, 10) : (feedLayout?.id as number) || 0
  }
}

/**
 * FEED PLANNER DECISION MAP
 * 
 * Scene count (9 scenes) → THIS FUNCTION (resolveAllFeedPlannerScenes)
 * Scene order → THIS FUNCTION (positions 1-9, sequential)
 * Scene type (portrait/object/graphic) → resolveFeedPlannerScene (derived from camera.framing)
 * Scene framing → resolveFeedPlannerScene (derived from activity + location)
 * Scene prompt text → prompt-shaper.ts:buildPromptFromScene (THE AUTHORITY)
 * Layout vs execution distinction → prompt-shaper.ts:buildPromptFromScene (mode parameter)
 * 
 * This is the SINGLE SOURCE OF TRUTH for Feed Planner scene resolution.
 * Resolves all 9 scenes at once to ensure consistency between preview and full planner.
 * 
 * @param feedLayout - Feed layout with feed_style
 * @param user - User object with id
 * @param options - Resolution options
 * @returns Array of 9 structured scene objects
 */
export async function resolveAllFeedPlannerScenes(
  feedLayout: { 
    id?: string | number
    feed_style?: string | null
    visual_aesthetic?: string | unknown[] | null
    fashion_style?: string | unknown[] | null
  } | null | undefined,
  user: { id: string | number },
  options: ResolveSceneOptions = {}
): Promise<FeedPlannerScene[]> {
  const scenes: FeedPlannerScene[] = []
  
  // Resolve all 9 scenes (positions 1-9)
  for (let position = 1; position <= 9; position++) {
    const scene = await resolveFeedPlannerScene(feedLayout, user, position, options)
    scenes.push(scene)
  }
  
  return scenes
}

// ============================================================================
// ACTIVITY DERIVATION (ACTIVITY-FIRST LOGIC)
// ============================================================================

/**
 * Derive Activity from Position + Category + Fashion Style
 * 
 * Activities are REAL human behaviors, not aesthetic categories.
 * Position patterns suggest activities (e.g., position 1 = opening scene, position 5 = middle scene).
 */
function deriveActivityFromPosition(
  position: number,
  category: string,
  fashionStyle: string
): string {
  // 🔴 STRATEGIC ACTIVITY ASSIGNMENT FOR DIVERSE CONTENT
  // Override activities for positions that need specific content types
  if (position === 2) {
    // Position 2: Object flatlay - wellness/morning routine activity
    console.log(`[SCENE RESOLVER] Position ${position}: Strategic activity assigned (morning_routine for flatlay)`)
    return 'morning_routine' // Supports wellness objects
  } else if (position === 4) {
    // Position 4: Detail close-up - activity with tea/coffee
    console.log(`[SCENE RESOLVER] Position ${position}: Strategic activity assigned (remote_work_break for detail close-up)`)
    return 'remote_work_break' // Has tea cup objects
  } else if (position === 6) {
    // Position 6: Texture shot - athletic activity for fabric focus
    console.log(`[SCENE RESOLVER] Position ${position}: Strategic activity assigned (gym_session for texture shot)`)
    return 'gym_session' // Athletic wear has mesh fabric
  } else if (position === 8) {
    // Position 8: Overhead flatlay - workout preparation activity
    console.log(`[SCENE RESOLVER] Position ${position}: Strategic activity assigned (morning_yoga for overhead flatlay)`)
    return 'morning_yoga' // Has yoga mat and workout gear
  }
  
  // Position-based activity patterns (human behavior, not aesthetic)
  const positionPatterns: Record<number, string[]> = {
    1: ['morning_routine', 'coffee_shop_work', 'gym_session', 'travel_arrival'],
    2: ['post_workout_coffee', 'remote_work_break', 'brunch_with_friends', 'city_exploration'],
    3: ['coffee_shop_work', 'wellness_break', 'evening_dinner', 'hotel_checkin'],
    4: ['remote_work_break', 'meditation_session', 'art_gallery_visit', 'beach_day'],
    5: ['cozy_evening', 'cooking_at_home', 'weekend_market', 'airport_layover'],
    6: ['reading_session', 'self_care_evening', 'night_out', 'city_exploration'],
    7: ['morning_yoga', 'client_meeting', 'evening_dinner', 'travel_arrival'],
    8: ['wellness_break', 'after_work_drinks', 'commute_home', 'hotel_checkin'],
    9: ['cozy_evening', 'self_care_evening', 'night_out', 'beach_day']
  }
  
  // Fashion style influences activity selection
  const styleActivityMap: Record<string, string[]> = {
    'athletic': ['post_workout_coffee', 'gym_session', 'morning_yoga', 'wellness_break'],
    'business': ['coffee_shop_work', 'client_meeting', 'remote_work_break', 'after_work_drinks'],
    'casual': ['coffee_shop_work', 'brunch_with_friends', 'cozy_evening', 'weekend_market'],
    'bohemian': ['art_gallery_visit', 'weekend_market', 'meditation_session', 'city_exploration'],
    'classic': ['evening_dinner', 'client_meeting', 'travel_arrival', 'hotel_checkin'],
    'trendy': ['night_out', 'city_exploration', 'brunch_with_friends', 'art_gallery_visit']
  }
  
  // Get position candidates
  const positionCandidates = positionPatterns[position] || positionPatterns[1]
  
  // Get style candidates
  const styleCandidates = styleActivityMap[fashionStyle] || styleActivityMap['casual']
  
  // Find intersection (activities that match both position and style)
  const matchingActivities = positionCandidates.filter(a => styleCandidates.includes(a))
  
  // Select activity (deterministic based on position)
  if (matchingActivities.length > 0) {
    const index = (position - 1) % matchingActivities.length
    return matchingActivities[index]
  }
  
  // Fallback to position pattern
  return positionCandidates[0] || 'coffee_shop_work'
}

// ============================================================================
// LOCATION DERIVATION (ACTIVITY → LOCATION)
// ============================================================================

/**
 * Derive Location from Activity
 * 
 * Locations are derived from activities, not aesthetic categories.
 */
function deriveLocationFromActivity(
  activity: string,
  category: string
): FeedPlannerScene['location'] {
  const activityLocationMap: Record<string, FeedPlannerScene['location']> = {
    'post_workout_coffee': {
      type: 'coffee_shop',
      description: 'local coffee shop with natural light',
      indoor: true,
      public: true
    },
    'coffee_shop_work': {
      type: 'coffee_shop',
      description: 'coffee shop with workspace atmosphere',
      indoor: true,
      public: true
    },
    'remote_work_break': {
      type: 'home_living_room',
      description: 'home living room with natural light',
      indoor: true,
      public: false
    },
    'gym_session': {
      type: 'gym',
      description: 'modern gym with natural lighting',
      indoor: true,
      public: true
    },
    'morning_yoga': {
      type: 'yoga_studio',
      description: 'yoga studio with natural window light',
      indoor: true,
      public: true
    },
    'wellness_break': {
      type: 'wellness_center',
      description: 'wellness center with natural light',
      indoor: true,
      public: true
    },
    'brunch_with_friends': {
      type: 'restaurant',
      description: 'brunch restaurant with natural light',
      indoor: true,
      public: true
    },
    'evening_dinner': {
      type: 'restaurant',
      description: 'restaurant with warm lighting',
      indoor: true,
      public: true
    },
    'night_out': {
      type: 'bar',
      description: 'bar with ambient lighting',
      indoor: true,
      public: true
    },
    'travel_arrival': {
      type: 'hotel_lobby',
      description: 'hotel lobby with natural light',
      indoor: true,
      public: true
    },
    'hotel_checkin': {
      type: 'hotel_lobby',
      description: 'hotel lobby with natural light',
      indoor: true,
      public: true
    },
    'city_exploration': {
      type: 'city_street',
      description: 'city street with natural daylight',
      indoor: false,
      public: true
    },
    'beach_day': {
      type: 'beach',
      description: 'beach with natural daylight',
      indoor: false,
      public: true
    },
    'cozy_evening': {
      type: 'home_living_room',
      description: 'home living room with warm lighting',
      indoor: true,
      public: false
    },
    'cooking_at_home': {
      type: 'home_kitchen',
      description: 'home kitchen with natural light',
      indoor: true,
      public: false
    },
    'reading_session': {
      type: 'home_living_room',
      description: 'home living room with natural light',
      indoor: true,
      public: false
    },
    'self_care_evening': {
      type: 'home_bathroom',
      description: 'home bathroom with natural light',
      indoor: true,
      public: false
    },
    'morning_routine': {
      type: 'home_bathroom',
      description: 'home bathroom with natural light',
      indoor: true,
      public: false
    },
    'client_meeting': {
      type: 'office',
      description: 'office with natural light',
      indoor: true,
      public: true
    },
    'after_work_drinks': {
      type: 'bar',
      description: 'bar with warm lighting',
      indoor: true,
      public: true
    },
    'commute_home': {
      type: 'city_street',
      description: 'city street with evening light',
      indoor: false,
      public: true
    },
    'weekend_market': {
      type: 'market',
      description: 'outdoor market with natural light',
      indoor: false,
      public: true
    },
    'art_gallery_visit': {
      type: 'art_gallery',
      description: 'art gallery with natural light',
      indoor: true,
      public: true
    },
    'meditation_session': {
      type: 'wellness_center',
      description: 'wellness center with natural light',
      indoor: true,
      public: true
    },
    'airport_layover': {
      type: 'airport',
      description: 'airport with natural light',
      indoor: true,
      public: true
    }
  }
  
  // Get location from activity
  const location = activityLocationMap[activity] || activityLocationMap['coffee_shop_work']
  
  // Apply category aesthetic to location description (subtle, not overriding)
  if (category === 'luxury') {
    location.description = location.description.replace('coffee shop', 'luxury coffee shop')
      .replace('restaurant', 'upscale restaurant')
      .replace('hotel lobby', 'luxury hotel lobby')
  } else if (category === 'minimal') {
    location.description = location.description.replace('coffee shop', 'minimalist coffee shop')
      .replace('restaurant', 'minimalist restaurant')
  }
  
  return location
}

// ============================================================================
// OUTFIT DERIVATION (ACTIVITY + LOCATION → OUTFIT)
// ============================================================================

/**
 * Derive Outfit from Activity + Location + Fashion Style
 * 
 * Outfits are derived from activities and locations, not aesthetic categories.
 */
function deriveOutfitFromActivity(
  activity: string,
  location: FeedPlannerScene['location'],
  fashionStyle: string,
  category: string
): FeedPlannerScene['outfit'] {
  // Activity-based outfit patterns
  const activityOutfitMap: Record<string, { base: string; layer?: string }> = {
    'post_workout_coffee': { base: 'athletic_base', layer: 'casual_layer' },
    'coffee_shop_work': { base: 'casual_base', layer: 'outerwear' },
    'remote_work_break': { base: 'lounge_base' },
    'gym_session': { base: 'athletic_base' },
    'morning_yoga': { base: 'athletic_base' },
    'wellness_break': { base: 'athletic_base', layer: 'casual_layer' },
    'brunch_with_friends': { base: 'casual_base', layer: 'outerwear' },
    'evening_dinner': { base: 'dressy_base', layer: 'outerwear' },
    'night_out': { base: 'dressy_base', layer: 'outerwear' },
    'travel_arrival': { base: 'casual_base', layer: 'outerwear' },
    'hotel_checkin': { base: 'casual_base', layer: 'outerwear' },
    'city_exploration': { base: 'casual_base', layer: 'outerwear' },
    'beach_day': { base: 'casual_base' },
    'cozy_evening': { base: 'lounge_base' },
    'cooking_at_home': { base: 'casual_base' },
    'reading_session': { base: 'lounge_base' },
    'self_care_evening': { base: 'lounge_base' },
    'morning_routine': { base: 'lounge_base' },
    'client_meeting': { base: 'professional_base', layer: 'outerwear' },
    'after_work_drinks': { base: 'professional_base', layer: 'outerwear' },
    'commute_home': { base: 'casual_base', layer: 'outerwear' },
    'weekend_market': { base: 'casual_base', layer: 'outerwear' },
    'art_gallery_visit': { base: 'casual_base', layer: 'outerwear' },
    'meditation_session': { base: 'athletic_base' },
    'airport_layover': { base: 'casual_base', layer: 'outerwear' }
  }
  
  const outfitPattern = activityOutfitMap[activity] || activityOutfitMap['coffee_shop_work']
  
  // Build outfit description from pattern + fashion style
  let description = `${fashionStyle} ${outfitPattern.base}`
  if (outfitPattern.layer) {
    description += ` with ${outfitPattern.layer}`
  }
  
  return {
    style: fashionStyle,
    description,
    base: outfitPattern.base,
    layer: outfitPattern.layer
  }
}

// ============================================================================
// OBJECT DERIVATION (ACTIVITY → OBJECTS)
// ============================================================================

/**
 * Derive Objects from Activity
 * 
 * Objects are derived from activities, not aesthetic categories.
 */
function deriveObjectsFromActivity(
  activity: string,
  fashionStyle: string,
  position: number
): FeedPlannerScene['objects'] {
  const activityObjectMap: Record<string, Array<{ type: string; description: string; position?: 'hand' | 'table' | 'bag' | 'ground' }>> = {
    'post_workout_coffee': [
      { type: 'coffee_cup', description: 'ceramic coffee cup', position: 'hand' },
      { type: 'phone', description: 'iPhone', position: 'hand' },
      { type: 'keys', description: 'car keys', position: 'bag' }
    ],
    'coffee_shop_work': [
      { type: 'coffee_cup', description: 'ceramic coffee cup', position: 'table' },
      { type: 'laptop', description: 'laptop', position: 'table' },
      { type: 'phone', description: 'iPhone', position: 'table' }
    ],
    'remote_work_break': [
      { type: 'tea', description: 'ceramic tea cup', position: 'hand' },
      { type: 'book', description: 'book', position: 'table' },
      { type: 'phone', description: 'iPhone', position: 'table' }
    ],
    'gym_session': [
      { type: 'water_bottle', description: 'water bottle', position: 'hand' },
      { type: 'phone', description: 'iPhone', position: 'bag' }
    ],
    'morning_yoga': [
      { type: 'water_bottle', description: 'water bottle', position: 'ground' },
      { type: 'yoga_mat', description: 'yoga mat', position: 'ground' }
    ],
    'wellness_break': [
      { type: 'water_bottle', description: 'water bottle', position: 'hand' },
      { type: 'phone', description: 'iPhone', position: 'hand' }
    ],
    'brunch_with_friends': [
      { type: 'coffee_cup', description: 'coffee cup', position: 'table' },
      { type: 'phone', description: 'iPhone', position: 'table' }
    ],
    'evening_dinner': [
      { type: 'wine_glass', description: 'wine glass', position: 'table' },
      { type: 'phone', description: 'iPhone', position: 'table' }
    ],
    'night_out': [
      { type: 'wine_glass', description: 'wine glass', position: 'hand' },
      { type: 'phone', description: 'iPhone', position: 'hand' }
    ],
    'travel_arrival': [
      { type: 'bag', description: 'travel bag', position: 'hand' },
      { type: 'phone', description: 'iPhone', position: 'hand' },
      { type: 'keys', description: 'hotel room key', position: 'hand' }
    ],
    'hotel_checkin': [
      { type: 'bag', description: 'travel bag', position: 'hand' },
      { type: 'phone', description: 'iPhone', position: 'hand' }
    ],
    'city_exploration': [
      { type: 'phone', description: 'iPhone', position: 'hand' },
      { type: 'sunglasses', description: 'sunglasses', position: 'hand' }
    ],
    'beach_day': [
      { type: 'water_bottle', description: 'water bottle', position: 'hand' },
      { type: 'sunglasses', description: 'sunglasses', position: 'hand' }
    ],
    'cozy_evening': [
      { type: 'tea', description: 'ceramic tea cup', position: 'hand' },
      { type: 'book', description: 'book', position: 'table' },
      { type: 'phone', description: 'iPhone', position: 'table' }
    ],
    'cooking_at_home': [
      { type: 'phone', description: 'iPhone', position: 'table' }
    ],
    'reading_session': [
      { type: 'book', description: 'book', position: 'hand' },
      { type: 'tea', description: 'ceramic tea cup', position: 'table' }
    ],
    'self_care_evening': [
      { type: 'water_bottle', description: 'glass water bottle', position: 'table' },
      { type: 'phone', description: 'iPhone', position: 'table' }
    ],
    'morning_routine': [
      { type: 'water_bottle', description: 'glass water bottle', position: 'table' },
      { type: 'phone', description: 'iPhone', position: 'table' }
    ],
    'client_meeting': [
      { type: 'laptop', description: 'laptop', position: 'table' },
      { type: 'phone', description: 'iPhone', position: 'table' }
    ],
    'after_work_drinks': [
      { type: 'wine_glass', description: 'wine glass', position: 'hand' },
      { type: 'phone', description: 'iPhone', position: 'hand' }
    ],
    'commute_home': [
      { type: 'phone', description: 'iPhone', position: 'hand' },
      { type: 'bag', description: 'work bag', position: 'hand' }
    ],
    'weekend_market': [
      { type: 'bag', description: 'market bag', position: 'hand' },
      { type: 'phone', description: 'iPhone', position: 'hand' }
    ],
    'art_gallery_visit': [
      { type: 'phone', description: 'iPhone', position: 'hand' }
    ],
    'meditation_session': [
      { type: 'water_bottle', description: 'water bottle', position: 'ground' }
    ],
    'airport_layover': [
      { type: 'bag', description: 'travel bag', position: 'hand' },
      { type: 'phone', description: 'iPhone', position: 'hand' }
    ]
  }
  
  // Get base objects from activity
  let objects = activityObjectMap[activity] || activityObjectMap['coffee_shop_work']
  
  // 🔴 STRATEGIC OBJECT INJECTION FOR DIVERSE CONTENT TYPES
  // Override objects for strategic positions that require specific content
  // IMPORTANT: Objects must match fashion style/aesthetic (not hardcoded wellness)
  if (position === 2) {
    // Position 2: Object flatlay (NO person) - match fashion style
    if (fashionStyle.includes('luxury') || fashionStyle.includes('elevated')) {
      // Luxury: bags, jewelry, high-end accessories
      objects = [
        { type: 'luxury_bag', description: 'designer handbag with gold hardware', position: 'table' },
        { type: 'jewelry', description: 'gold jewelry and watch', position: 'table' },
        { type: 'sunglasses', description: 'designer sunglasses', position: 'table' }
      ]
    } else if (fashionStyle.includes('bohemian') || fashionStyle.includes('boho')) {
      // Bohemian: natural materials, earthy objects
      objects = [
        { type: 'hat', description: 'woven straw hat with ribbon', position: 'table' },
        { type: 'jewelry', description: 'layered gold necklaces and rings', position: 'table' },
        { type: 'book', description: 'vintage book', position: 'table' }
      ]
    } else if (fashionStyle.includes('athletic') || fashionStyle.includes('wellness')) {
      // Athletic/Wellness: smoothie bowls, yoga mats, fitness objects
      objects = [
        { type: 'smoothie_bowl', description: 'vibrant green smoothie bowl topped with fresh berries, granola, and coconut flakes', position: 'table' },
        { type: 'yoga_mat', description: 'rolled yoga mat', position: 'table' },
        { type: 'utensils', description: 'bamboo utensils', position: 'table' }
      ]
    } else {
      // Default: coffee + lifestyle objects
      objects = [
        { type: 'coffee_cup', description: 'ceramic coffee cup on marble', position: 'table' },
        { type: 'book', description: 'book', position: 'table' },
        { type: 'phone', description: 'iPhone', position: 'table' }
      ]
    }
    console.log(`[SCENE RESOLVER] Position ${position}: Strategic objects injected for ${fashionStyle}:`, objects.map(o => o.type))
  } else if (position === 4) {
    // Position 4: Detail close-up (hands holding tea) - keep tea-focused objects
    // Use existing objects but ensure tea/coffee cup is present
    const hasCup = objects.some(obj => obj.type === 'coffee_cup' || obj.type === 'tea')
    if (!hasCup) {
      objects.unshift({
        type: 'tea',
        description: 'warm ceramic tea cup',
        position: 'hand'
      })
    }
    console.log(`[SCENE RESOLVER] Position ${position}: Strategic objects injected:`, objects.map(o => o.type))
  } else if (position === 6) {
    // Position 6: Texture shot (NO person) - fabric/material close-up (match fashion style)
    if (fashionStyle.includes('luxury') || fashionStyle.includes('elevated')) {
      objects = [
        { type: 'fabric', description: 'luxury silk fabric with subtle sheen and drape', position: 'table' }
      ]
    } else if (fashionStyle.includes('bohemian') || fashionStyle.includes('boho')) {
      objects = [
        { type: 'fabric', description: 'natural linen fabric with woven texture', position: 'table' }
      ]
    } else if (fashionStyle.includes('athletic') || fashionStyle.includes('wellness')) {
      objects = [
        { type: 'fabric', description: 'black mesh athletic fabric with geometric pattern texture and subtle sheen', position: 'table' }
      ]
    } else {
      objects = [
        { type: 'fabric', description: 'natural fabric texture with soft drape', position: 'table' }
      ]
    }
    console.log(`[SCENE RESOLVER] Position ${position}: Strategic objects injected for ${fashionStyle}:`, objects.map(o => o.type))
  } else if (position === 8) {
    // Position 8: Overhead flatlay (arms only) - match fashion style
    if (fashionStyle.includes('luxury') || fashionStyle.includes('elevated')) {
      // Luxury: work/business objects
      objects = [
        { type: 'laptop', description: 'laptop', position: 'ground' },
        { type: 'notebook', description: 'leather notebook', position: 'ground' },
        { type: 'coffee_cup', description: 'coffee cup', position: 'ground' },
        { type: 'phone', description: 'iPhone', position: 'ground' }
      ]
    } else if (fashionStyle.includes('bohemian') || fashionStyle.includes('boho')) {
      // Bohemian: creative/artistic objects
      objects = [
        { type: 'journal', description: 'journal', position: 'ground' },
        { type: 'book', description: 'book', position: 'ground' },
        { type: 'tea', description: 'tea cup', position: 'ground' },
        { type: 'phone', description: 'iPhone', position: 'ground' }
      ]
    } else if (fashionStyle.includes('athletic') || fashionStyle.includes('wellness')) {
      // Athletic: workout gear preparation
      objects = [
        { type: 'yoga_mat', description: 'yoga mat', position: 'ground' },
        { type: 'water_bottle', description: 'water bottle', position: 'ground' },
        { type: 'resistance_band', description: 'resistance bands', position: 'ground' },
        { type: 'headphone', description: 'wireless headphones', position: 'ground' }
      ]
    } else {
      // Default: work/lifestyle objects
      objects = [
        { type: 'laptop', description: 'laptop', position: 'ground' },
        { type: 'coffee_cup', description: 'coffee cup', position: 'ground' },
        { type: 'book', description: 'book', position: 'ground' },
        { type: 'phone', description: 'iPhone', position: 'ground' }
      ]
    }
    console.log(`[SCENE RESOLVER] Position ${position}: Strategic objects injected for ${fashionStyle}:`, objects.map(o => o.type))
  }
  
  // Apply fashion style filters (existing logic)
  if (fashionStyle.includes('athletic') && !fashionStyle.includes('elevated')) {
    objects = objects.filter(obj => 
      !['laptop', 'notebook', 'desk', 'workspace'].includes(obj.type)
    )
  }
  
  return objects
}

// ============================================================================
// LIGHTING DERIVATION (ACTIVITY + LOCATION + MOOD → LIGHTING)
// ============================================================================

/**
 * Derive Lighting from Activity + Location + Mood
 */
function deriveLightingFromActivity(
  activity: string,
  location: FeedPlannerScene['location'],
  mood: string
): FeedPlannerScene['lighting'] {
  // Activity-based lighting patterns
  const activityLightingMap: Record<string, { type: string; quality: 'even' | 'uneven' | 'dramatic' }> = {
    'post_workout_coffee': { type: 'natural_window_light', quality: 'uneven' },
    'coffee_shop_work': { type: 'natural_window_light', quality: 'uneven' },
    'remote_work_break': { type: 'natural_window_light', quality: 'even' },
    'gym_session': { type: 'natural_window_light', quality: 'uneven' },
    'morning_yoga': { type: 'natural_window_light', quality: 'even' },
    'wellness_break': { type: 'natural_window_light', quality: 'even' },
    'brunch_with_friends': { type: 'natural_window_light', quality: 'even' },
    'evening_dinner': { type: 'artificial_warm', quality: 'dramatic' },
    'night_out': { type: 'artificial_warm', quality: 'dramatic' },
    'travel_arrival': { type: 'natural_window_light', quality: 'uneven' },
    'hotel_checkin': { type: 'natural_window_light', quality: 'uneven' },
    'city_exploration': { type: 'overcast_daylight', quality: 'uneven' },
    'beach_day': { type: 'overcast_daylight', quality: 'even' },
    'cozy_evening': { type: 'artificial_warm', quality: 'even' },
    'cooking_at_home': { type: 'natural_window_light', quality: 'uneven' },
    'reading_session': { type: 'natural_window_light', quality: 'even' },
    'self_care_evening': { type: 'natural_window_light', quality: 'even' },
    'morning_routine': { type: 'natural_window_light', quality: 'even' },
    'client_meeting': { type: 'natural_window_light', quality: 'even' },
    'after_work_drinks': { type: 'artificial_warm', quality: 'dramatic' },
    'commute_home': { type: 'overcast_daylight', quality: 'uneven' },
    'weekend_market': { type: 'overcast_daylight', quality: 'uneven' },
    'art_gallery_visit': { type: 'natural_window_light', quality: 'even' },
    'meditation_session': { type: 'natural_window_light', quality: 'even' },
    'airport_layover': { type: 'natural_window_light', quality: 'uneven' }
  }
  
  const lightingPattern = activityLightingMap[activity] || activityLightingMap['coffee_shop_work']
  
  // Build description from pattern + mood
  let description = lightingPattern.type.replace('_', ' ')
  if (mood === 'luxury') {
    description += ' with dramatic shadows'
  } else if (mood === 'minimal') {
    description += ' with soft shadows'
  } else if (mood === 'beige') {
    description += ' with warm tones'
  }
  
  return {
    type: lightingPattern.type,
    quality: lightingPattern.quality,
    description
  }
}

// ============================================================================
// CAMERA DERIVATION (ACTIVITY + LOCATION → CAMERA)
// ============================================================================

/**
 * Derive Camera from Activity + Location
 */
function deriveCameraFromActivity(
  activity: string,
  location: FeedPlannerScene['location'],
  position: number
): FeedPlannerScene['camera'] {
  // 🔴 STRATEGIC POSITIONING FOR FEED DIVERSITY
  // Position-based framing assignment following Instagram feed layout principles
  // This ensures diverse content types: portraits + flatlays + close-ups + texture shots + sign/text
  const strategicFraming: Record<number, FeedPlannerScene['camera']['framing']> = {
    1: 'full_body',    // Position 1: Portrait opener (strong hook)
    2: 'flatlay',      // Position 2: Object flatlay (breathing room, lifestyle context)
    3: 'full_body',    // Position 3: Portrait (dynamic variety)
    4: 'close_up',     // Position 4: Detail close-up (intimacy, personal touch)
    5: 'close_up',     // Position 5: Sign/Text close-up (center anchor - brand statement)
    6: 'close_up',     // Position 6: Texture shot (quality/craftsmanship focus)
    7: 'full_body',    // Position 7: Portrait (lifestyle activity)
    8: 'flatlay',      // Position 8: Overhead flatlay (different perspective)
    9: 'full_body',    // Position 9: Portrait closer (personal, accessible)
  }
  
  // Use strategic framing based on position (this takes priority)
  let framing = strategicFraming[position] || 'full_body'
  
  // Activity-based framing can ONLY override if strategic framing is 'full_body'
  // This preserves strategic diversity while allowing activity-specific adjustments
  if (framing === 'full_body') {
    if (activity.includes('routine') || activity.includes('self_care')) {
      framing = 'close_up'
    } else if (activity.includes('work') || activity.includes('meeting')) {
      framing = 'midshot'
    } else if (activity.includes('exploration') || activity.includes('travel')) {
      framing = 'environmental'
    }
  }
  
  // Log strategic framing assignment for debugging
  console.log(`[SCENE RESOLVER] Position ${position}: Strategic framing = ${framing}`)
  
  return {
    device: 'iphone_15_pro',
    mode: 'portrait',
    framing
  }
}

// ============================================================================
// POSE DERIVATION (ACTIVITY → POSE)
// ============================================================================

/**
 * Derive Pose from Activity
 */
function derivePoseFromActivity(
  activity: string,
  position: number
): FeedPlannerScene['pose'] {
  const activityPoseMap: Record<string, { type: string; description: string }> = {
    'post_workout_coffee': { type: 'walking_toward_camera', description: 'walking toward camera with coffee cup in hand' },
    'coffee_shop_work': { type: 'sitting_at_table', description: 'sitting at table with laptop' },
    'remote_work_break': { type: 'sitting_at_table', description: 'sitting relaxed with tea cup' },
    'gym_session': { type: 'standing_relaxed', description: 'standing relaxed after workout' },
    'morning_yoga': { type: 'sitting_on_floor', description: 'sitting on floor in yoga pose' },
    'wellness_break': { type: 'standing_relaxed', description: 'standing relaxed' },
    'brunch_with_friends': { type: 'sitting_at_table', description: 'sitting at table' },
    'evening_dinner': { type: 'sitting_at_table', description: 'sitting at table' },
    'night_out': { type: 'standing_relaxed', description: 'standing relaxed' },
    'travel_arrival': { type: 'walking_toward_camera', description: 'walking toward camera with bag' },
    'hotel_checkin': { type: 'standing_relaxed', description: 'standing relaxed' },
    'city_exploration': { type: 'walking_toward_camera', description: 'walking toward camera' },
    'beach_day': { type: 'walking_toward_camera', description: 'walking toward camera' },
    'cozy_evening': { type: 'sitting_at_table', description: 'sitting relaxed' },
    'cooking_at_home': { type: 'standing_relaxed', description: 'standing in kitchen' },
    'reading_session': { type: 'sitting_at_table', description: 'sitting with book' },
    'self_care_evening': { type: 'standing_relaxed', description: 'standing relaxed' },
    'morning_routine': { type: 'standing_relaxed', description: 'standing relaxed' },
    'client_meeting': { type: 'sitting_at_table', description: 'sitting at table' },
    'after_work_drinks': { type: 'standing_relaxed', description: 'standing relaxed' },
    'commute_home': { type: 'walking_toward_camera', description: 'walking toward camera' },
    'weekend_market': { type: 'walking_toward_camera', description: 'walking toward camera' },
    'art_gallery_visit': { type: 'standing_relaxed', description: 'standing relaxed' },
    'meditation_session': { type: 'sitting_on_floor', description: 'sitting on floor' },
    'airport_layover': { type: 'sitting_at_table', description: 'sitting at table' }
  }
  
  return activityPoseMap[activity] || activityPoseMap['coffee_shop_work']
}

// ============================================================================
// NARRATIVE BUILDING
// ============================================================================

/**
 * Build Narrative from Activity + Location + Outfit
 */
function buildNarrative(
  activity: string,
  location: FeedPlannerScene['location'],
  outfit: FeedPlannerScene['outfit']
): string {
  const activityNarratives: Record<string, string> = {
    'post_workout_coffee': 'Grabbing coffee after morning workout',
    'coffee_shop_work': 'Working from a coffee shop',
    'remote_work_break': 'Taking a break from remote work',
    'gym_session': 'At the gym',
    'morning_yoga': 'Morning yoga session',
    'wellness_break': 'Wellness break',
    'brunch_with_friends': 'Brunch with friends',
    'evening_dinner': 'Evening dinner',
    'night_out': 'Night out',
    'travel_arrival': 'Just arrived at the hotel',
    'hotel_checkin': 'Checking into hotel',
    'city_exploration': 'Exploring the city',
    'beach_day': 'Beach day',
    'cozy_evening': 'Cozy evening at home',
    'cooking_at_home': 'Cooking at home',
    'reading_session': 'Reading session',
    'self_care_evening': 'Self-care evening',
    'morning_routine': 'Morning routine',
    'client_meeting': 'Client meeting',
    'after_work_drinks': 'After work drinks',
    'commute_home': 'Commuting home',
    'weekend_market': 'Weekend market',
    'art_gallery_visit': 'Art gallery visit',
    'meditation_session': 'Meditation session',
    'airport_layover': 'Airport layover'
  }
  
  return activityNarratives[activity] || 'Lifestyle moment'
}

/**
 * Build Brand Statement for Position 5 (Center Anchor with Sign)
 * 
 * Position 5 is the center anchor of the feed and should have a sign
 * with a brand statement or message based on the user's style/category
 */
function buildBrandStatement(
  category: string,
  mood: string | null,
  fashionStyle: string
): string {
  // Map category/mood/style to appropriate brand statements
  if (fashionStyle.includes('luxury') || fashionStyle.includes('elevated')) {
    return 'Live Luxuriously'
  } else if (fashionStyle.includes('bohemian') || fashionStyle.includes('boho')) {
    return 'Free Spirit'
  } else if (fashionStyle.includes('athletic') || fashionStyle.includes('wellness')) {
    return 'Strong & Well'
  } else if (category === 'minimal' || mood === 'minimal') {
    return 'Simply Elegant'
  } else if (category === 'beige' || mood === 'beige') {
    return 'Warmth & Grace'
  } else {
    return 'Be Yourself'
  }
}
