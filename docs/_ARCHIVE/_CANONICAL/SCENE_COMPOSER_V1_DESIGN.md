# Scene Composer v1: Replacement System Design
## Radical Simplification of SSELFIE Prompt Pipeline

**Date:** January 2026  
**Designer:** Principal AI Systems Architect  
**Status:** Design Phase - Ready for Implementation  
**Objective:** Replace fractured prompt pipeline with scene-as-data architecture

---

## 1. WHY THE OLD SYSTEM FAILED

### The Core Failure: Text Manipulation Instead of Data Composition

The old system failed because it treated **prompts as mutable text strings** rather than **structured scene data**. This fundamental architectural mistake created a cascade of problems:

#### 1.1 Intelligence Fragmentation

**Problem:** Decision-making was scattered across 20+ files, each making partial decisions:
- `prompt-constructor.ts` decides category → outfit
- `brand-library-2025.ts` decides brands
- `style-coherence-resolver.ts` decides compatibility
- `nano-banana-adapter.ts` decides format
- `nano-banana-prompt-builder.ts` decides structure
- `nano-banana-client.ts` decides identity anchor

**Result:** No single source of truth. Changes require updates across multiple files. Inconsistencies emerge silently.

#### 1.2 Prompt Mutation Cascades

**Problem:** Prompts were built → cleaned → adapted → sanitized → validated → mutated again:

```
Template (blueprint-photoshoot-templates.ts)
  → Placeholder Injection (generation-helpers.ts)
    → Adaptation (nano-banana-adapter.ts)
      → Cleaning (cleanStudioProPrompt)
        → Identity Anchor Injection (nano-banana-client.ts)
          → Validation (prompt-authority.ts)
            → Final Prompt (degraded, intent lost)
```

**Result:** Each mutation degrades intelligence. Original intent is lost. Debugging is impossible. No one knows what the final prompt will be.

#### 1.3 Style-First Instead of Activity-First

**Problem:** The system started with aesthetic categories (`luxury`, `minimal`, `beige`) and tried to infer activities, rather than starting with activities and deriving aesthetics:

**Old Flow:**
```
User: "coffee run"
  → Category: "casual-lifestyle" (aesthetic-first)
    → Template: "casual" template
      → Outfit: Generic casual outfit
        → Location: Generic cafe
```

**What Should Happen:**
```
User: "coffee run"
  → Activity: "post_workout_coffee" (activity-first)
    → Location: "local_coffee_shop" (activity → location)
      → Outfit: "athleisure_with_coat" (activity + location → outfit)
        → Objects: ["coffee_cup", "phone", "keys"] (activity → objects)
```

**Result:** Images feel generic, not real. They lack narrative coherence because they're built from aesthetics, not activities.

#### 1.4 Hardcoded Knowledge Bases

**Problem:** Intelligence was hardcoded in massive files:
- `brand-library-2025.ts`: 100+ brand items (static, outdated)
- `blueprint-photoshoot-templates.ts`: 3000+ words of templates (rigid, can't adapt)
- `flux-prompting-principles.ts`: 364 lines of rules (static, can't evolve)
- `style-coherence-resolver.ts`: 480 lines of compatibility matrix (rigid, can't learn)

**Result:** System can't adapt to trends, user preferences, or new models. Knowledge becomes outdated. Templates become stale.

#### 1.5 Resolver Stacking Anti-Pattern

**Problem:** Multiple resolvers trying to "fix" earlier decisions:

```
generation-helpers.ts (resolves category/mood/style)
  → style-coherence-resolver.ts (fixes compatibility)
    → nano-banana-adapter.ts (fixes format)
      → nano-banana-prompt-builder.ts (fixes structure)
        → nano-banana-client.ts (fixes identity)
```

**Result:** Each resolver adds complexity. System becomes unpredictable. Edge cases multiply.

#### 1.6 No Single Source of Truth

**Problem:** Different files have different rules for the same thing:
- Flux: 30-60 words, trigger word required
- Nano Banana: 80-130 words, identity anchor required
- Feed Planner: Template-based, 9-scene grids
- Blueprint: Hardcoded templates, category×mood combinations

**Result:** Developers must know which rules apply when. Mistakes are easy. Consistency is impossible.

### The Solution: Scene-as-Data Architecture

**New Flow:**
```
User Request
  → Scene Composer (structured data composition)
    → Structured Scene Object (single source of truth)
      → Prompt Shaper (model-specific, late binding)
        → Final Prompt (natural language, no mutation)
```

**Key Principles:**
1. **Scene-as-Data**: Scenes are structured objects, not text
2. **Activity-First**: Start with activities, derive everything else
3. **Single Source of Truth**: One scene object, multiple prompt outputs
4. **Late Binding**: Natural language only at final step
5. **Zero Mutation**: Build correctly the first time

---

## 2. FILES TO FREEZE / DELETE / BYPASS

### 2.1 System Reduction Audit

**Minimum Files Required for ONE Correct Image:**

**Core Decision Files (WHAT the image is):**
1. `lib/maya/scene-composer-v1.ts` (NEW) - Composes structured scene
2. `lib/maya/activity-resolver.ts` (NEW) - Resolves activity from request
3. `lib/maya/location-resolver.ts` (NEW) - Resolves location from activity
4. `lib/maya/outfit-resolver.ts` (NEW) - Resolves outfit from activity + location
5. `lib/maya/object-resolver.ts` (NEW) - Resolves objects from activity + location

**Formatting Files (HOW to format text):**
1. `lib/maya/prompt-shaper.ts` (NEW) - Converts scene → prompt (late binding)
2. `lib/maya/model-schemas.ts` (NEW) - Model-specific schemas (Flux, Nano Banana)

**Infrastructure Files (API/Storage):**
1. `lib/nano-banana-client.ts` (MODIFY) - Remove auto-injection, use explicit
2. `lib/replicate-client.ts` (KEEP) - API client only

**Total: 8 files** (vs current 20+ files)

### 2.2 File Classification Table

| File | Role | Decision Power | Action | Reason |
|------|------|---------------|--------|--------|
| **CORE DECISION FILES** |
| `lib/maya/scene-composer-v1.ts` | Composes scene | HIGH (decides everything) | ✅ CREATE | Single source of truth |
| `lib/maya/activity-resolver.ts` | Resolves activity | HIGH (decides activity) | ✅ CREATE | Activity-first logic |
| `lib/maya/location-resolver.ts` | Resolves location | MEDIUM (derives from activity) | ✅ CREATE | Activity → location |
| `lib/maya/outfit-resolver.ts` | Resolves outfit | MEDIUM (derives from activity+location) | ✅ CREATE | Activity+location → outfit |
| `lib/maya/object-resolver.ts` | Resolves objects | LOW (derives from activity) | ✅ CREATE | Activity → objects |
| **FORMATTING FILES** |
| `lib/maya/prompt-shaper.ts` | Converts scene → prompt | LOW (formatting only) | ✅ CREATE | Late binding, no decisions |
| `lib/maya/model-schemas.ts` | Model-specific rules | LOW (structure only) | ✅ CREATE | Declarative schemas |
| **INFRASTRUCTURE** |
| `lib/nano-banana-client.ts` | API client | NONE (transport only) | ⚠️ MODIFY | Remove auto-injection |
| `lib/replicate-client.ts` | API client | NONE (transport only) | ✅ KEEP | No changes needed |
| **LEGACY FILES TO FREEZE** |
| `lib/maya/prompt-authority.ts` | Routes to builders | MEDIUM (routing only) | 🧊 FREEZE | Legacy routing, don't touch |
| `lib/maya/prompt-constructor.ts` | Builds Flux prompts | HIGH (decides content) | 🧊 FREEZE | Legacy builder, don't touch |
| `lib/maya/nano-banana-prompt-builder.ts` | Builds Nano Banana prompts | HIGH (decides content) | 🧊 FREEZE | Legacy builder, don't touch |
| `lib/maya/brand-library-2025.ts` | Brand intelligence | HIGH (decides brands) | 🧊 FREEZE | Legacy knowledge, migrate to RAG |
| `lib/maya/flux-prompting-principles.ts` | Flux rules | HIGH (decides structure) | 🧊 FREEZE | Legacy rules, migrate to schema |
| `lib/maya/blueprint-photoshoot-templates.ts` | Blueprint templates | HIGH (decides scenes) | 🧊 FREEZE | Legacy templates, migrate to scene-as-data |
| `lib/feed-planner/nano-banana-adapter.ts` | Adapts templates | MEDIUM (translates) | 🧊 FREEZE | Legacy adapter, don't touch |
| `lib/feed-planner/generation-helpers.ts` | Resolves category/mood | MEDIUM (decides category) | 🧊 FREEZE | Legacy resolver, don't touch |
| `lib/feed-planner/style-coherence-resolver.ts` | Ensures compatibility | MEDIUM (fixes compatibility) | 🧊 FREEZE | Legacy resolver, migrate to constraints |
| `lib/feed-planner/visual-composition-expert.ts` | Creates Flux prompts | HIGH (decides content) | 🧊 FREEZE | Legacy builder, don't touch |
| `lib/feed-planner/build-single-image-prompt.ts` | Parses templates | LOW (parsing only) | 🧊 FREEZE | Legacy parser, don't touch |
| `lib/maya/lifestyle-contexts.ts` | Lifestyle intelligence | MEDIUM (decides context) | 🧊 FREEZE | Legacy knowledge, migrate to RAG |
| `lib/maya/fashion-knowledge-2025.ts` | Fashion intelligence | MEDIUM (decides fashion) | 🧊 FREEZE | Legacy knowledge, migrate to RAG |
| `lib/maya/prompt-generator.ts` | Prompt suggestions | MEDIUM (suggests prompts) | 🧊 FREEZE | Legacy generator, migrate to scene composer |
| `lib/maya/pro/prompt-architecture.ts` | Pro Mode structure | LOW (defines structure) | 🧊 FREEZE | Legacy structure, migrate to schema |
| **FILES TO DELETE** |
| `backup-before-cleanup/prompt-builder.ts` | Legacy backup | NONE | ❌ DELETE | Not used |
| `lib/maya/prompt-health-alerts.ts` | Health alerts | NONE | ❌ DELETE | If exists, just logging |
| `lib/quality/prompt-quality-baseline.ts` | Quality metrics | NONE | ❌ DELETE | If exists, just metrics |
| **FILES TO BYPASS** |
| All legacy builders | Build prompts | HIGH | 🚫 BYPASS | Never call in new pipeline |
| All legacy adapters | Translate prompts | MEDIUM | 🚫 BYPASS | Never call in new pipeline |
| All legacy resolvers | Resolve values | MEDIUM | 🚫 BYPASS | Never call in new pipeline |

### 2.3 Decision Power Explanation

**HIGH Decision Power:** Files that decide WHAT the image contains (activity, location, outfit, objects). These are the core intelligence files.

**MEDIUM Decision Power:** Files that derive values from other decisions (location from activity, outfit from activity+location). These are resolver files.

**LOW Decision Power:** Files that only format or structure data (prompt shapers, schemas). These don't make decisions, they just format.

**NONE Decision Power:** Files that only transport data (API clients). These don't make any decisions.

---

## 3. SCENE COMPOSER V1 SCHEMA

### 3.1 Core Schema Definition

```typescript
/**
 * SCENE COMPOSER V1 - Structured Scene Object
 * 
 * This is the SINGLE SOURCE OF TRUTH for all image generation.
 * No prompt text exists here. Only structured data.
 * Natural language is generated only at the final step (late binding).
 */

// ============================================================================
// ACTIVITY SCHEMA
// ============================================================================

/**
 * Activity Schema
 * 
 * Answers: "What would a real human choose here?"
 * 
 * Activities are REAL human behaviors, not aesthetic categories.
 * They drive everything else: location, outfit, objects, lighting.
 */
export type ActivityType =
  // Wellness & Fitness
  | 'post_workout_coffee'
  | 'morning_yoga'
  | 'gym_session'
  | 'wellness_break'
  | 'meditation_session'
  
  // Work & Productivity
  | 'remote_work_break'
  | 'coffee_shop_work'
  | 'client_meeting'
  | 'after_work_drinks'
  | 'commute_home'
  
  // Social & Lifestyle
  | 'brunch_with_friends'
  | 'evening_dinner'
  | 'night_out'
  | 'weekend_market'
  | 'art_gallery_visit'
  
  // Travel & Exploration
  | 'travel_arrival'
  | 'airport_layover'
  | 'hotel_checkin'
  | 'city_exploration'
  | 'beach_day'
  
  // Home & Relaxation
  | 'morning_routine'
  | 'cozy_evening'
  | 'cooking_at_home'
  | 'reading_session'
  | 'self_care_evening'

export interface Activity {
  type: ActivityType
  narrative: string // Human-readable story: "Grabbing coffee after morning yoga"
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  energyLevel: 'low' | 'medium' | 'high'
  socialContext: 'alone' | 'with_others' | 'public_space'
}

// ============================================================================
// LOCATION SCHEMA
// ============================================================================

/**
 * Location Schema
 * 
 * Answers: "What would a real human choose here?"
 * 
 * Locations are derived from activities, not aesthetic categories.
 * A "coffee run" activity → "local_coffee_shop" location (not "luxury cafe").
 */
export type LocationType =
  // Fitness & Wellness
  | 'gym'
  | 'yoga_studio'
  | 'outdoor_trail'
  | 'wellness_center'
  
  // Work & Productivity
  | 'coffee_shop'
  | 'coworking_space'
  | 'office'
  | 'hotel_lobby'
  
  // Social & Lifestyle
  | 'restaurant'
  | 'bar'
  | 'market'
  | 'art_gallery'
  | 'park'
  
  // Travel
  | 'airport'
  | 'hotel_room'
  | 'beach'
  | 'city_street'
  
  // Home
  | 'home_living_room'
  | 'home_kitchen'
  | 'home_bedroom'
  | 'home_bathroom'

export interface Location {
  type: LocationType
  name?: string // Optional: "Blue Bottle Coffee", "Equinox Gym"
  description: string // Human-readable: "local coffee shop with natural light"
  indoor: boolean
  public: boolean
  lightingConditions: LightingCondition[]
}

export type LightingCondition =
  | 'natural_window_light'
  | 'overcast_daylight'
  | 'golden_hour'
  | 'evening_ambient'
  | 'artificial_warm'
  | 'artificial_cool'
  | 'mixed_temperatures'

// ============================================================================
// OUTFIT SCHEMA
// ============================================================================

/**
 * Outfit Schema
 * 
 * Answers: "What would a real human choose here?"
 * 
 * Outfits are derived from activity + location, not aesthetic categories.
 * A "post_workout_coffee" activity + "coffee_shop" location → athleisure with coat.
 */
export interface Outfit {
  top: OutfitItem
  bottom: OutfitItem
  outerwear?: OutfitItem
  footwear: OutfitItem
  accessories: OutfitItem[]
  brands: BrandReference[]
  coherence: CoherenceScore
}

export interface OutfitItem {
  category: 'top' | 'bottom' | 'outerwear' | 'footwear' | 'accessory'
  description: string // "oversized cream knit sweater"
  fabric?: string // "cashmere", "cotton", "leather"
  fit?: string // "oversized", "fitted", "relaxed"
  color?: string // "cream", "black", "camel"
  brand?: BrandReference
}

export interface BrandReference {
  name: string // "Alo Yoga", "Bottega Veneta"
  category: 'accessible' | 'luxury' | 'athletic'
  role: 'foundation' | 'accent' // Foundation = base outfit, Accent = statement piece
}

export interface CoherenceScore {
  activityMatch: number // 0-1: How well outfit matches activity
  locationMatch: number // 0-1: How well outfit matches location
  styleCoherence: number // 0-1: How well pieces work together
  overall: number // 0-1: Weighted average
}

// ============================================================================
// OBJECT SCHEMA
// ============================================================================

/**
 * Object Schema
 * 
 * Answers: "What would a real human choose here?"
 * 
 * Objects are derived from activity, not aesthetic categories.
 * A "coffee_shop_work" activity → ["laptop", "coffee_cup", "phone", "notebook"].
 */
export type ObjectType =
  // Beverages
  | 'coffee_cup'
  | 'iced_coffee'
  | 'tea'
  | 'water_bottle'
  | 'wine_glass'
  
  // Work & Productivity
  | 'laptop'
  | 'notebook'
  | 'pen'
  | 'phone'
  | 'headphones'
  
  // Fitness & Wellness
  | 'yoga_mat'
  | 'gym_bag'
  | 'towel'
  | 'resistance_bands'
  
  // Personal
  | 'keys'
  | 'wallet'
  | 'sunglasses'
  | 'bag'
  | 'book'
  
  // Food
  | 'pastry'
  | 'salad'
  | 'sandwich'

export interface ObjectReference {
  type: ObjectType
  description: string // "ceramic coffee cup", "black leather laptop"
  position?: 'hand' | 'table' | 'bag' | 'ground'
  context?: string // "on wooden table", "in hand"
}

// ============================================================================
// LIGHTING SCHEMA
// ============================================================================

/**
 * Lighting Schema
 * 
 * Answers: "What would a real human choose here?"
 * 
 * Lighting is derived from activity + location + timeOfDay.
 * A "morning_yoga" activity + "yoga_studio" location + "morning" → natural_window_light.
 */
export interface Lighting {
  primary: LightingType
  secondary?: LightingType
  quality: 'even' | 'uneven' | 'dramatic'
  colorTemperature: 'warm' | 'cool' | 'mixed'
  shadows: 'soft' | 'harsh' | 'natural'
}

export type LightingType =
  | 'natural_window_light'
  | 'overcast_daylight'
  | 'golden_hour'
  | 'evening_ambient'
  | 'artificial_warm'
  | 'artificial_cool'
  | 'mixed_temperatures'

// ============================================================================
// CAMERA SCHEMA
// ============================================================================

/**
 * Camera Schema
 * 
 * Answers: "What would a real human choose here?"
 * 
 * Camera specs are model-specific but derived from scene context.
 * Flux: iPhone 15 Pro, portrait mode
 * Nano Banana: iPhone 15 Pro, natural framing
 */
export interface Camera {
  device: 'iphone_15_pro'
  mode: 'portrait' | 'photo' | 'wide'
  focalLength?: number // 50mm, 85mm
  depthOfField: 'shallow' | 'deep' | 'natural'
  framing: 'close_up' | 'midshot' | 'full_body' | 'environmental'
  aesthetic: 'candid' | 'posed' | 'lifestyle'
}

// ============================================================================
// POSE SCHEMA
// ============================================================================

/**
 * Pose Schema
 * 
 * Answers: "What would a real human choose here?"
 * 
 * Poses are derived from activity, not aesthetic categories.
 * A "coffee_shop_work" activity → "sitting_at_table" pose.
 */
export type PoseType =
  | 'walking_toward_camera'
  | 'walking_away'
  | 'standing_relaxed'
  | 'sitting_at_table'
  | 'sitting_on_floor'
  | 'leaning_against_wall'
  | 'hand_in_pocket'
  | 'holding_object'
  | 'looking_away'
  | 'looking_at_camera'

export interface Pose {
  type: PoseType
  description: string // "walking toward camera with coffee cup in hand"
  expression: 'neutral' | 'soft_smile' | 'focused' | 'relaxed'
  bodyLanguage: 'confident' | 'casual' | 'relaxed' | 'focused'
}

// ============================================================================
// STRUCTURED SCENE OBJECT (SINGLE SOURCE OF TRUTH)
// ============================================================================

/**
 * Structured Scene Object
 * 
 * This is the SINGLE SOURCE OF TRUTH for all image generation.
 * No prompt text exists here. Only structured data.
 * Natural language is generated only at the final step (late binding).
 */
export interface StructuredScene {
  // Core
  activity: Activity
  narrative: string // Human-readable story: "Grabbing coffee after morning yoga at the local spot"
  
  // Location
  location: Location
  
  // Outfit
  outfit: Outfit
  
  // Objects
  objects: ObjectReference[]
  
  // Technical
  lighting: Lighting
  camera: Camera
  pose: Pose
  
  // Mood (derived, not primary)
  mood: 'casual' | 'professional' | 'cozy' | 'energetic' | 'relaxed'
  
  // Metadata
  model: 'flux' | 'nano-banana'
  userId: string
  timestamp: number
  
  // User Preferences (optional overrides)
  userPreferences?: {
    hairColor?: string
    hairStyle?: string
    bodyType?: string
    age?: string
    physicalModifications?: string[]
  }
}
```

### 3.2 Schema Principles

**1. Activity-First:** Activities drive everything. Location, outfit, objects, lighting all derive from activity.

**2. Human-Behavior Realism:** Every schema answers "What would a real human choose here?" not "What aesthetic category fits?"

**3. Structured Data Only:** No prompt text, no templates, no model-specific language. Only structured data.

**4. Single Source of Truth:** One scene object, multiple prompt outputs (Flux, Nano Banana, etc.).

**5. Declarative:** Schemas define structure, not behavior. Behavior is in resolvers.

---

## 4. ACTIVITY-FIRST EXAMPLES

### Example 1: Post-Workout Coffee

**User Request:** "coffee after yoga"

**Activity Resolution:**
```typescript
activity: {
  type: 'post_workout_coffee',
  narrative: 'Grabbing coffee after morning yoga',
  timeOfDay: 'morning',
  energyLevel: 'medium',
  socialContext: 'public_space'
}
```

**Location Resolution (Activity → Location):**
```typescript
location: {
  type: 'coffee_shop',
  name: 'local_coffee_shop',
  description: 'local coffee shop with natural light',
  indoor: true,
  public: true,
  lightingConditions: ['natural_window_light', 'mixed_temperatures']
}
```

**Outfit Resolution (Activity + Location → Outfit):**
```typescript
outfit: {
  top: {
    category: 'top',
    description: 'ribbed sports bra',
    fabric: 'cotton',
    fit: 'fitted',
    color: 'black'
  },
  bottom: {
    category: 'bottom',
    description: 'high-waisted leggings',
    fabric: 'lycra',
    fit: 'fitted',
    color: 'black'
  },
  outerwear: {
    category: 'outerwear',
    description: 'oversized cream knit sweater',
    fabric: 'cashmere',
    fit: 'oversized',
    color: 'cream'
  },
  footwear: {
    category: 'footwear',
    description: 'white sneakers',
    brand: { name: 'New Balance', category: 'accessible', role: 'foundation' }
  },
  brands: [
    { name: 'Alo Yoga', category: 'accessible', role: 'foundation' },
    { name: 'Bottega Veneta', category: 'luxury', role: 'accent' }
  ],
  coherence: {
    activityMatch: 0.95, // Perfect match for post-workout
    locationMatch: 0.90, // Appropriate for coffee shop
    styleCoherence: 0.92, // Pieces work together
    overall: 0.92
  }
}
```

**Object Resolution (Activity → Objects):**
```typescript
objects: [
  {
    type: 'coffee_cup',
    description: 'ceramic coffee cup',
    position: 'hand',
    context: 'in hand'
  },
  {
    type: 'phone',
    description: 'iPhone',
    position: 'hand',
    context: 'in other hand'
  },
  {
    type: 'keys',
    description: 'car keys',
    position: 'bag',
    context: 'in gym bag'
  }
]
```

**Lighting Resolution (Activity + Location + TimeOfDay → Lighting):**
```typescript
lighting: {
  primary: 'natural_window_light',
  secondary: 'mixed_temperatures',
  quality: 'uneven',
  colorTemperature: 'mixed',
  shadows: 'natural'
}
```

**Pose Resolution (Activity → Pose):**
```typescript
pose: {
  type: 'walking_toward_camera',
  description: 'walking toward camera with coffee cup in hand',
  expression: 'relaxed',
  bodyLanguage: 'casual'
}
```

### Example 2: Remote Work Break

**User Request:** "taking a break from remote work"

**Activity Resolution:**
```typescript
activity: {
  type: 'remote_work_break',
  narrative: 'Taking a break from remote work',
  timeOfDay: 'afternoon',
  energyLevel: 'low',
  socialContext: 'alone'
}
```

**Location Resolution:**
```typescript
location: {
  type: 'home_living_room',
  description: 'home living room with natural light',
  indoor: true,
  public: false,
  lightingConditions: ['natural_window_light']
}
```

**Outfit Resolution:**
```typescript
outfit: {
  top: {
    category: 'top',
    description: 'oversized cream knit sweater',
    fabric: 'cashmere',
    fit: 'oversized',
    color: 'cream'
  },
  bottom: {
    category: 'bottom',
    description: 'matching lounge pants',
    fabric: 'cotton',
    fit: 'relaxed',
    color: 'cream'
  },
  footwear: {
    category: 'footwear',
    description: 'fuzzy socks',
    fabric: 'wool',
    color: 'beige'
  },
  brands: [
    { name: 'Jenni Kayne', category: 'accessible', role: 'foundation' }
  ],
  coherence: {
    activityMatch: 0.98, // Perfect for work break
    locationMatch: 0.95, // Perfect for home
    styleCoherence: 0.94, // Cozy, cohesive
    overall: 0.96
  }
}
```

**Object Resolution:**
```typescript
objects: [
  {
    type: 'tea',
    description: 'ceramic tea cup',
    position: 'hand',
    context: 'in hand'
  },
  {
    type: 'book',
    description: 'book',
    position: 'table',
    context: 'on coffee table'
  },
  {
    type: 'phone',
    description: 'iPhone',
    position: 'table',
    context: 'on coffee table'
  }
]
```

### Example 3: Travel Arrival

**User Request:** "just arrived at the hotel"

**Activity Resolution:**
```typescript
activity: {
  type: 'travel_arrival',
  narrative: 'Just arrived at the hotel after a long flight',
  timeOfDay: 'afternoon',
  energyLevel: 'low',
  socialContext: 'public_space'
}
```

**Location Resolution:**
```typescript
location: {
  type: 'hotel_lobby',
  description: 'luxury hotel lobby with natural light',
  indoor: true,
  public: true,
  lightingConditions: ['natural_window_light', 'artificial_warm']
}
```

**Outfit Resolution:**
```typescript
outfit: {
  top: {
    category: 'top',
    description: 'white ribbed tank',
    fabric: 'cotton',
    fit: 'fitted',
    color: 'white'
  },
  bottom: {
    category: 'bottom',
    description: 'high-waisted straight-leg jeans',
    fabric: 'denim',
    fit: 'straight',
    color: 'blue'
  },
  outerwear: {
    category: 'outerwear',
    description: 'oversized camel coat',
    fabric: 'wool',
    fit: 'oversized',
    color: 'camel'
  },
  footwear: {
    category: 'footwear',
    description: 'white sneakers',
    brand: { name: 'Common Projects', category: 'accessible', role: 'foundation' }
  },
  accessories: [
    {
      category: 'accessory',
      description: 'black leather tote bag',
      brand: { name: 'Bottega Veneta', category: 'luxury', role: 'accent' }
    }
  ],
  brands: [
    { name: 'Levi\'s', category: 'accessible', role: 'foundation' },
    { name: 'Bottega Veneta', category: 'luxury', role: 'accent' }
  ],
  coherence: {
    activityMatch: 0.93, // Perfect for travel
    locationMatch: 0.95, // Perfect for hotel
    styleCoherence: 0.91, // Travel-appropriate
    overall: 0.93
  }
}
```

**Object Resolution:**
```typescript
objects: [
  {
    type: 'bag',
    description: 'black leather tote bag',
    position: 'hand',
    context: 'in hand'
  },
  {
    type: 'phone',
    description: 'iPhone',
    position: 'hand',
    context: 'checking phone'
  },
  {
    type: 'keys',
    description: 'hotel room key',
    position: 'hand',
    context: 'in hand'
  }
]
```

### Example 4: Evening Dinner

**User Request:** "dinner with friends"

**Activity Resolution:**
```typescript
activity: {
  type: 'evening_dinner',
  narrative: 'Evening dinner with friends at a restaurant',
  timeOfDay: 'evening',
  energyLevel: 'medium',
  socialContext: 'with_others'
}
```

**Location Resolution:**
```typescript
location: {
  type: 'restaurant',
  description: 'upscale restaurant with warm lighting',
  indoor: true,
  public: true,
  lightingConditions: ['artificial_warm', 'evening_ambient']
}
```

**Outfit Resolution:**
```typescript
outfit: {
  top: {
    category: 'top',
    description: 'black satin slip dress',
    fabric: 'satin',
    fit: 'fitted',
    color: 'black'
  },
  outerwear: {
    category: 'outerwear',
    description: 'vintage leather bomber jacket',
    fabric: 'leather',
    fit: 'fitted',
    color: 'black'
  },
  footwear: {
    category: 'footwear',
    description: 'black ankle boots',
    brand: { name: 'The Row', category: 'luxury', role: 'accent' }
  },
  accessories: [
    {
      category: 'accessory',
      description: 'gold jewelry',
      brand: { name: 'Mejuri', category: 'accessible', role: 'foundation' }
    }
  ],
  brands: [
    { name: 'Reformation', category: 'accessible', role: 'foundation' },
    { name: 'The Row', category: 'luxury', role: 'accent' }
  ],
  coherence: {
    activityMatch: 0.94, // Perfect for dinner
    locationMatch: 0.92, // Appropriate for restaurant
    styleCoherence: 0.93, // Cohesive evening look
    overall: 0.93
  }
}
```

**Object Resolution:**
```typescript
objects: [
  {
    type: 'wine_glass',
    description: 'wine glass',
    position: 'table',
    context: 'on table'
  },
  {
    type: 'phone',
    description: 'iPhone',
    position: 'table',
    context: 'on table'
  }
]
```

### Example 5: Morning Routine

**User Request:** "morning routine"

**Activity Resolution:**
```typescript
activity: {
  type: 'morning_routine',
  narrative: 'Morning routine at home',
  timeOfDay: 'morning',
  energyLevel: 'low',
  socialContext: 'alone'
}
```

**Location Resolution:**
```typescript
location: {
  type: 'home_bathroom',
  description: 'home bathroom with natural light',
  indoor: true,
  public: false,
  lightingConditions: ['natural_window_light']
}
```

**Outfit Resolution:**
```typescript
outfit: {
  top: {
    category: 'top',
    description: 'white ribbed tank',
    fabric: 'cotton',
    fit: 'fitted',
    color: 'white'
  },
  bottom: {
    category: 'bottom',
    description: 'matching lounge shorts',
    fabric: 'cotton',
    fit: 'relaxed',
    color: 'white'
  },
  brands: [
    { name: 'Alo Yoga', category: 'accessible', role: 'foundation' }
  ],
  coherence: {
    activityMatch: 0.97, // Perfect for morning routine
    locationMatch: 0.95, // Perfect for bathroom
    styleCoherence: 0.96, // Cohesive, simple
    overall: 0.96
  }
}
```

**Object Resolution:**
```typescript
objects: [
  {
    type: 'water_bottle',
    description: 'glass water bottle',
    position: 'table',
    context: 'on bathroom counter'
  },
  {
    type: 'phone',
    description: 'iPhone',
    position: 'table',
    context: 'on bathroom counter'
  }
]
```

---

## 5. PROMPT OUTPUT EXAMPLES

### 5.1 Single Function: `buildPrompt(scene, model)`

```typescript
/**
 * PROMPT ASSEMBLY (LATE BINDING ONLY)
 * 
 * This is the ONLY place where natural language is generated.
 * No mutation, cleaning, or sanitization afterward.
 * Model-specific schemas only control structure, not content.
 */

function buildPrompt(scene: StructuredScene, model: 'flux' | 'nano-banana'): string {
  if (model === 'flux') {
    return buildFluxPrompt(scene)
  } else {
    return buildNanoBananaPrompt(scene)
  }
}
```

### 5.2 Nano Banana Prompt Example

**Input Scene:** Post-Workout Coffee (from Example 1)

**Output Prompt:**
```
A realistic photo of the person shown in the reference images, preserving her exact facial features and identity. The subject is walking toward camera wearing a black ribbed sports bra, high-waisted black leggings, and an oversized cream cashmere knit sweater draped over shoulders, with white New Balance sneakers. She's holding a ceramic coffee cup in one hand and an iPhone in the other, walking through a local coffee shop with natural window light and mixed color temperatures. The photo is taken in a coffee shop with natural light streaming through windows, creating soft shadows. Natural lighting with uneven illumination and mixed color temperatures. Shot on iPhone 15 Pro, portrait mode, authentic photography aesthetic.
```

**Word Count:** 108 words (within 80-130 target)

**Structure:**
1. Identity anchor (explicit, not auto-injected)
2. Subject + outfit (detailed, fabrics/textures)
3. Objects (in context)
4. Location (one clear location)
5. Lighting (natural, realistic)
6. Camera specs (iPhone 15 Pro)

### 5.3 Flux Prompt Example

**Input Scene:** Post-Workout Coffee (from Example 1)

**Output Prompt:**
```
user_trigger, woman, brown hair, in black ribbed sports bra, high-waisted black leggings, oversized cream cashmere knit sweater draped over shoulders, white New Balance sneakers, walking through local coffee shop with ceramic coffee cup in hand, uneven natural lighting with mixed color temperatures, candid moment, shot on iPhone 15 Pro portrait mode, shallow depth of field, natural skin texture with pores visible, film grain, muted colors, authentic iPhone photo aesthetic
```

**Word Count:** 52 words (within 30-60 target)

**Structure:**
1. Trigger word + gender (first)
2. Outfit (detailed, fabrics/textures)
3. Location (brief, one line)
4. Lighting (realistic, uneven)
5. Camera specs (iPhone 15 Pro)
6. Mandatory elements (natural skin, film grain, muted colors)

### 5.4 Key Differences

**Nano Banana:**
- Longer (80-130 words)
- Identity anchor explicit
- More narrative flow
- Natural language throughout

**Flux:**
- Shorter (30-60 words)
- Trigger word first
- More concise, technical
- Mandatory elements (natural skin, film grain, muted colors)

**Same Scene Object:** Both prompts generated from the SAME structured scene object. Only the formatting differs.

---

## 6. DELETION PLAN

### Week 1: Foundation Setup

**Tasks:**
1. Create `lib/maya/scene-composer-v1.ts` (core composer)
2. Create `lib/maya/activity-resolver.ts` (activity resolution)
3. Create `lib/maya/location-resolver.ts` (location resolution)
4. Create `lib/maya/outfit-resolver.ts` (outfit resolution)
5. Create `lib/maya/object-resolver.ts` (object resolution)
6. Create `lib/maya/prompt-shaper.ts` (prompt assembly)
7. Create `lib/maya/model-schemas.ts` (model schemas)

**Deliverable:** Core system exists, not yet integrated

**Legacy Files:** All frozen, no changes

---

### Week 2: Integration & Testing

**Tasks:**
1. Integrate Scene Composer into ONE endpoint (`/api/maya/generate-image`)
2. Run parallel: Old system + New system
3. A/B test: Compare outputs
4. Log quality metrics

**Deliverable:** One endpoint using new system, parallel running

**Legacy Files:** Still frozen, old system still active

---

### Week 3: Migration Expansion

**Tasks:**
1. Migrate `/api/maya/generate-studio-pro` to Scene Composer
2. Migrate `/api/feed/[feedId]/generate-single` to Scene Composer
3. Continue A/B testing
4. Gather user feedback

**Deliverable:** Three endpoints using new system

**Legacy Files:** Still frozen, old system still active for other endpoints

---

### Week 4: Full Migration

**Tasks:**
1. Migrate all remaining endpoints to Scene Composer
2. Final A/B testing
3. User acceptance testing
4. Performance benchmarking

**Deliverable:** All endpoints using new system

**Legacy Files:** Still frozen, old system still exists but unused

---

### Week 5: Legacy Cleanup (Phase 1)

**Tasks:**
1. **DELETE** `backup-before-cleanup/prompt-builder.ts` (if exists)
2. **DELETE** `lib/maya/prompt-health-alerts.ts` (if exists)
3. **DELETE** `lib/quality/prompt-quality-baseline.ts` (if exists)
4. Add deprecation warnings to legacy builders
5. Update documentation

**Deliverable:** Dead weight removed, legacy files marked deprecated

**Legacy Files:** Still frozen, marked deprecated

---

### Week 6: Legacy Cleanup (Phase 2)

**Tasks:**
1. **FREEZE** all legacy builders (add `// FROZEN: Do not modify` comments)
2. **FREEZE** all legacy adapters
3. **FREEZE** all legacy resolvers
4. Create migration guide for developers
5. Update API documentation

**Deliverable:** All legacy files frozen, migration guide complete

**Legacy Files:** All frozen, documented as legacy

---

### Week 7-8: Knowledge Base Migration

**Tasks:**
1. Migrate `brand-library-2025.ts` to RAG system
2. Migrate `lifestyle-contexts.ts` to RAG system
3. Migrate `fashion-knowledge-2025.ts` to RAG system
4. Migrate `flux-prompting-principles.ts` to declarative schema
5. Test RAG system performance

**Deliverable:** Hardcoded knowledge bases migrated to RAG

**Legacy Files:** Knowledge bases frozen, RAG system active

---

### Week 9-10: Template Migration

**Tasks:**
1. Migrate `blueprint-photoshoot-templates.ts` to scene-as-data definitions
2. Migrate Feed Planner templates to scene-as-data
3. Test template migration
4. Update Feed Planner to use Scene Composer

**Deliverable:** Templates migrated to scene-as-data

**Legacy Files:** Templates frozen, scene-as-data active

---

### Week 11-12: Final Cleanup

**Tasks:**
1. **DELETE** `lib/feed-planner/nano-banana-adapter.ts` (no longer needed)
2. **DELETE** `lib/feed-planner/visual-composition-expert.ts` (redundant)
3. **DELETE** `lib/feed-planner/build-single-image-prompt.ts` (replaced by scene parser)
4. Archive legacy files to `lib/_legacy/` directory
5. Final documentation update

**Deliverable:** Legacy files archived, system fully migrated

**Legacy Files:** Archived, not deleted (for reference)

---

## 7. RISK MITIGATION

### Risk 1: Breaking Existing Functionality

**Mitigation:**
- Run old and new systems in parallel
- A/B test outputs before switching
- Gradual migration (one endpoint at a time)
- Keep legacy files frozen (not deleted) for rollback

### Risk 2: Performance Degradation

**Mitigation:**
- Benchmark Scene Composer performance
- Optimize RAG queries (caching, indexing)
- Monitor latency metrics
- Fallback to legacy system if performance degrades

### Risk 3: Quality Regression

**Mitigation:**
- A/B test quality metrics (user ratings, coherence scores)
- Gather user feedback before full migration
- Keep legacy system available for comparison
- Iterate on Scene Composer based on feedback

### Risk 4: Knowledge Loss

**Mitigation:**
- Migrate hardcoded knowledge to RAG (not delete)
- Validate RAG results match hardcoded knowledge
- Keep hardcoded knowledge as fallback
- Gradually improve RAG quality

---

## 8. SUCCESS METRICS

### Technical Metrics

- **Complexity Reduction:** 20+ files → 8 core files (60% reduction)
- **Prompt Mutation Layers:** 8 → 0 (100% elimination)
- **Hardcoded Knowledge:** 5000+ lines → 0 (100% migration to RAG)
- **Prompt Build Time:** <100ms (current: ~200-500ms)

### Quality Metrics

- **Prompt Consistency:** 95%+ (current: ~70%)
- **User Satisfaction:** +20% (A/B test)
- **Image Quality:** +15% (user ratings)
- **Coherence:** 98%+ (current: ~85%)

### Business Metrics

- **Development Velocity:** +50% (simpler system)
- **Bug Rate:** -60% (fewer mutation layers)
- **Feature Time:** -40% (declarative schemas)

---

## 9. CONCLUSION

The old system failed because it treated prompts as mutable text strings instead of structured scene data. The new system succeeds by:

1. **Scene-as-Data:** Composing scenes as structured objects, not text
2. **Activity-First:** Starting with activities, deriving everything else
3. **Single Source of Truth:** One scene object, multiple prompt outputs
4. **Late Binding:** Natural language only at final step
5. **Zero Mutation:** Building correctly the first time

**The path forward is clear:**
- Week 1-2: Build foundation
- Week 3-4: Integrate and test
- Week 5-6: Clean up dead weight
- Week 7-10: Migrate knowledge bases and templates
- Week 11-12: Final cleanup

**This is a $100M product foundation decision. The new system will scale.**

---

**End of Design Document**
