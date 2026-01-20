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

function parseAestheticList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean)
      }
    } catch {
      return value.trim() ? [value.trim()] : []
    }
  }
  return []
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
  const location = deriveLocationFromActivity(activity, category, resolvedFashionStyle)
  const aestheticOptions = parseAestheticList(feedLayout?.visual_aesthetic)
  const accentAesthetic = aestheticOptions
    .map((value) => value.toLowerCase().trim())
    .find((value) => value && value !== category)
  if (accentAesthetic && !location.description.includes(accentAesthetic)) {
    location.description = `${location.description} with subtle ${accentAesthetic} accents`
  }
  
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
  const normalizedStyle = fashionStyle.toLowerCase()
  const strategicPositions = [2, 4, 6, 8]
  const strategicOverrides: Record<string, Record<number, string>> = {
    athletic: {
      2: 'post_workout_coffee',
      4: 'wellness_break',
      6: 'gym_session',
      8: 'morning_yoga'
    },
    business: {
      2: 'coffee_shop_work',
      4: 'client_meeting',
      6: 'after_work_drinks',
      8: 'coffee_shop_work'
    },
    bohemian: {
      2: 'weekend_market',
      4: 'art_gallery_visit',
      6: 'meditation_session',
      8: 'weekend_market'
    },
    classic: {
      2: 'travel_arrival',
      4: 'evening_dinner',
      6: 'hotel_checkin',
      8: 'travel_arrival'
    },
    trendy: {
      2: 'brunch_with_friends',
      4: 'night_out',
      6: 'city_exploration',
      8: 'after_work_drinks'
    },
    casual: {
      2: 'brunch_with_friends',
      4: 'remote_work_break',
      6: 'cozy_evening',
      8: 'weekend_market'
    }
  }

  if (strategicPositions.includes(position)) {
    const override = strategicOverrides[normalizedStyle]?.[position]
    if (override) {
      console.log(`[SCENE RESOLVER] Position ${position}: Strategic activity assigned (${override}) for ${normalizedStyle}`)
      return override
    }
  }
  
  // Position-based activity patterns (human behavior, not aesthetic)
  const positionPatterns: Record<number, string[]> = {
    1: ['morning_routine', 'coffee_shop_work', 'gym_session', 'travel_arrival', 'outdoor_run'],
    2: ['post_workout_coffee', 'remote_work_break', 'brunch_with_friends', 'city_exploration'],
    3: ['coffee_shop_work', 'wellness_break', 'evening_dinner', 'hotel_checkin', 'outdoor_run'],
    4: ['remote_work_break', 'meditation_session', 'art_gallery_visit', 'beach_day'],
    5: ['cozy_evening', 'cooking_at_home', 'weekend_market', 'airport_layover'],
    6: ['reading_session', 'self_care_evening', 'night_out', 'city_exploration'],
    7: ['morning_yoga', 'client_meeting', 'evening_dinner', 'travel_arrival', 'outdoor_run'],
    8: ['wellness_break', 'after_work_drinks', 'commute_home', 'hotel_checkin'],
    9: ['cozy_evening', 'self_care_evening', 'night_out', 'beach_day', 'outdoor_run']
  }
  
  // Fashion style influences activity selection
  const styleActivityMap: Record<string, string[]> = {
    'athletic': ['post_workout_coffee', 'gym_session', 'morning_yoga', 'wellness_break', 'outdoor_run'],
    'business': ['coffee_shop_work', 'client_meeting', 'remote_work_break', 'after_work_drinks'],
    'casual': ['coffee_shop_work', 'brunch_with_friends', 'cozy_evening', 'weekend_market'],
    'bohemian': ['art_gallery_visit', 'weekend_market', 'meditation_session', 'city_exploration'],
    'classic': ['evening_dinner', 'client_meeting', 'travel_arrival', 'hotel_checkin'],
    'trendy': ['night_out', 'city_exploration', 'brunch_with_friends', 'art_gallery_visit']
  }
  
  // Get position candidates
  const positionCandidates = positionPatterns[position] || positionPatterns[1]
  
  // Get style candidates
  const styleCandidates = styleActivityMap[normalizedStyle] || styleActivityMap['casual']
  
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
  category: string,
  fashionStyle: string
): FeedPlannerScene['location'] {
  const styleKey = fashionStyle.toLowerCase()
  const categoryDescriptorMap: Record<string, string> = {
    luxury: 'upscale',
    minimal: 'clean',
    beige: 'warm beige',
    warm: 'warm',
    edgy: 'industrial',
    professional: 'polished'
  }
  const categoryDescriptor = categoryDescriptorMap[category] || 'clean'
  const decorate = (description: string) =>
    description.includes(categoryDescriptor) ? description : `${categoryDescriptor} ${description}`

  const activityLocationMap: Record<string, FeedPlannerScene['location']> = {
    'post_workout_coffee': {
      type: 'coffee_shop',
      description: decorate('local coffee shop with natural light'),
      indoor: true,
      public: true
    },
    'coffee_shop_work': {
      type: 'coffee_shop',
      description: decorate('coffee shop with workspace atmosphere'),
      indoor: true,
      public: true
    },
    'remote_work_break': {
      type: 'home_living_room',
      description: decorate('home living room with natural light'),
      indoor: true,
      public: false
    },
    'gym_session': {
      type: 'gym',
      description: decorate('modern gym with natural lighting'),
      indoor: true,
      public: true
    },
    'morning_yoga': {
      type: 'yoga_studio',
      description: decorate('yoga studio with natural window light'),
      indoor: true,
      public: true
    },
    'wellness_break': {
      type: 'wellness_center',
      description: decorate('wellness center with natural light'),
      indoor: true,
      public: true
    },
    'outdoor_run': {
      type: 'outdoor_path',
      description: decorate('outdoor running path with open space'),
      indoor: false,
      public: true
    },
    'brunch_with_friends': {
      type: 'restaurant',
      description: decorate('brunch restaurant with natural light'),
      indoor: true,
      public: true
    },
    'evening_dinner': {
      type: 'restaurant',
      description: decorate('restaurant with warm lighting'),
      indoor: true,
      public: true
    },
    'night_out': {
      type: 'bar',
      description: decorate('bar with ambient lighting'),
      indoor: true,
      public: true
    },
    'travel_arrival': {
      type: 'hotel_lobby',
      description: decorate('hotel lobby with natural light'),
      indoor: true,
      public: true
    },
    'hotel_checkin': {
      type: 'hotel_lobby',
      description: decorate('hotel lobby with natural light'),
      indoor: true,
      public: true
    },
    'city_exploration': {
      type: 'city_street',
      description: decorate('city street with natural daylight'),
      indoor: false,
      public: true
    },
    'beach_day': {
      type: 'beach',
      description: decorate('beach with natural daylight'),
      indoor: false,
      public: true
    },
    'cozy_evening': {
      type: 'home_living_room',
      description: decorate('home living room with warm lighting'),
      indoor: true,
      public: false
    },
    'cooking_at_home': {
      type: 'home_kitchen',
      description: decorate('home kitchen with natural light'),
      indoor: true,
      public: false
    },
    'reading_session': {
      type: 'home_living_room',
      description: decorate('home living room with natural light'),
      indoor: true,
      public: false
    },
    'self_care_evening': {
      type: 'home_bathroom',
      description: decorate('home bathroom with natural light'),
      indoor: true,
      public: false
    },
    'morning_routine': {
      type: 'home_bathroom',
      description: decorate('home bathroom with natural light'),
      indoor: true,
      public: false
    },
    'client_meeting': {
      type: 'office',
      description: decorate('office with natural light'),
      indoor: true,
      public: true
    },
    'after_work_drinks': {
      type: 'bar',
      description: decorate('bar with warm lighting'),
      indoor: true,
      public: true
    },
    'commute_home': {
      type: 'city_street',
      description: decorate('city street with evening light'),
      indoor: false,
      public: true
    },
    'weekend_market': {
      type: 'market',
      description: decorate('outdoor market with natural light'),
      indoor: false,
      public: true
    },
    'art_gallery_visit': {
      type: 'art_gallery',
      description: decorate('art gallery with natural light'),
      indoor: true,
      public: true
    },
    'meditation_session': {
      type: 'wellness_center',
      description: decorate('wellness center with natural light'),
      indoor: true,
      public: true
    },
    'airport_layover': {
      type: 'airport',
      description: decorate('airport with natural light'),
      indoor: true,
      public: true
    }
  }
  
  // Get location from activity
  const location = activityLocationMap[activity] || activityLocationMap['coffee_shop_work']

  const styleOverrides: Record<string, Record<string, FeedPlannerScene['location']>> = {
    athletic: {
      remote_work_break: {
        type: 'wellness_center',
        description: decorate('wellness lounge with natural light'),
        indoor: true,
        public: true
      },
      cozy_evening: {
        type: 'gym',
        description: decorate('modern gym with evening lighting'),
        indoor: true,
        public: true
      },
      reading_session: {
        type: 'outdoor_path',
        description: decorate('outdoor path with open space'),
        indoor: false,
        public: true
      },
      cooking_at_home: {
        type: 'juice_bar',
        description: decorate('juice bar with bright natural light'),
        indoor: true,
        public: true
      }
    },
    business: {
      remote_work_break: {
        type: 'office',
        description: decorate('office lounge with polished details'),
        indoor: true,
        public: true
      }
    }
  }

  const override = styleOverrides[styleKey]?.[activity]
  if (override) {
    return override
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
    'outdoor_run': { base: 'athletic_base', layer: 'outerwear' },
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
  const styleKey = fashionStyle.toLowerCase()
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
    'outdoor_run': [
      { type: 'water_bottle', description: 'water bottle', position: 'hand' },
      { type: 'headphones', description: 'wireless headphones', position: 'hand' },
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
    switch (styleKey) {
      case 'business':
        objects = [
          { type: 'laptop', description: 'laptop', position: 'table' },
          { type: 'notebook', description: 'leather notebook', position: 'table' },
          { type: 'pen', description: 'minimal pen', position: 'table' }
        ]
        break
      case 'bohemian':
        objects = [
          { type: 'hat', description: 'woven straw hat with ribbon', position: 'table' },
          { type: 'jewelry', description: 'layered gold necklaces and rings', position: 'table' },
          { type: 'book', description: 'vintage book', position: 'table' }
        ]
        break
      case 'athletic':
        objects = [
          { type: 'smoothie_bowl', description: 'smoothie bowl topped with fresh berries and granola', position: 'table' },
          { type: 'yoga_mat', description: 'rolled yoga mat', position: 'table' },
          { type: 'water_bottle', description: 'sleek water bottle', position: 'table' }
        ]
        break
      case 'classic':
        objects = [
          { type: 'handbag', description: 'structured handbag', position: 'table' },
          { type: 'jewelry', description: 'gold jewelry and watch', position: 'table' },
          { type: 'sunglasses', description: 'classic sunglasses', position: 'table' }
        ]
        break
      case 'trendy':
        objects = [
          { type: 'sunglasses', description: 'statement sunglasses', position: 'table' },
          { type: 'bag', description: 'mini bag', position: 'table' },
          { type: 'phone', description: 'iPhone', position: 'table' }
        ]
        break
      default:
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
    const cupType = styleKey === 'athletic' ? 'smoothie_cup' : 'tea'
    const cupDescription = styleKey === 'athletic' ? 'smoothie cup' : 'warm ceramic tea cup'
    const hasCup = objects.some(obj => obj.type === 'coffee_cup' || obj.type === 'tea' || obj.type === 'smoothie_cup')
    if (!hasCup) {
      objects.unshift({
        type: cupType,
        description: cupDescription,
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
    'outdoor_run': { type: 'overcast_daylight', quality: 'uneven' },
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
    'outdoor_run': { type: 'walking_toward_camera', description: 'moving forward with athletic energy' },
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
    'outdoor_run': 'Outdoor run',
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
  const styleKey = fashionStyle.toLowerCase()
  if (styleKey === 'classic') {
    return 'Timeless & Refined'
  } else if (styleKey === 'business') {
    return 'Lead with Confidence'
  } else if (styleKey === 'trendy') {
    return 'Bold & Current'
  } else if (styleKey === 'bohemian') {
    return 'Free Spirit'
  } else if (styleKey === 'athletic') {
    return 'Strong & Well'
  } else if (fashionStyle.includes('luxury') || fashionStyle.includes('elevated')) {
    return 'Live Luxuriously'
  } else if (category === 'minimal' || mood === 'minimal') {
    return 'Simply Elegant'
  } else if (category === 'beige' || mood === 'beige') {
    return 'Warmth & Grace'
  } else {
    return 'Be Yourself'
  }
}
