# Feed Planner Stabilization - Phase 2: Single Source of Truth for Scenes
## Scene-First Resolution Implementation

**Date:** January 2026  
**Phase:** 2 - Scene Resolution (No Prompt Logic)  
**Status:** ✅ Complete

---

## WHAT WAS CREATED

**New File:** `lib/feed-planner/scene-resolver.ts`

**Purpose:** Single source of truth for Feed Planner scene intent. Outputs structured scene data, NOT prompt text.

**Key Function:** `resolveFeedPlannerScene()`

---

## ARCHITECTURE

### Input
- `feedLayout` - Feed layout with feed_style, visual_aesthetic, fashion_style
- `user` - User object with id
- `position` - Frame position (1-9)
- `options` - Resolution options

### Output
```typescript
interface FeedPlannerScene {
  position: number
  activity: string // "post_workout_coffee", "remote_work_break", etc.
  narrative: string // "Grabbing coffee after morning workout"
  
  location: {
    type: string // "coffee_shop", "home_living_room", etc.
    description: string
    indoor: boolean
    public: boolean
  }
  
  outfit: {
    style: string // Resolved fashion style
    description: string
    base: string
    layer?: string
  }
  
  objects: Array<{
    type: string
    description: string
    position?: 'hand' | 'table' | 'bag' | 'ground'
  }>
  
  lighting: {
    type: string
    quality: 'even' | 'uneven' | 'dramatic'
    description: string
  }
  
  camera: {
    device: 'iphone_15_pro'
    mode: 'portrait' | 'photo'
    framing: 'close_up' | 'midshot' | 'full_body' | 'environmental' | 'flatlay'
  }
  
  pose: {
    type: string
    description: string
  }
  
  // Aesthetic context (derived, not primary)
  category: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
  mood: "luxury" | "minimal" | "beige"
  fashionStyle: string
  
  // Metadata
  userId: string
  feedId: number
}
```

---

## ACTIVITY-FIRST LOGIC

### How Activities are Derived

**Position Patterns:**
- Position 1: Opening scenes (morning_routine, coffee_shop_work, gym_session)
- Position 2-3: Mid-morning scenes (post_workout_coffee, remote_work_break)
- Position 4-5: Midday scenes (wellness_break, cozy_evening)
- Position 6-7: Afternoon scenes (reading_session, evening_dinner)
- Position 8-9: Evening scenes (cozy_evening, self_care_evening)

**Fashion Style Influence:**
- Athletic → post_workout_coffee, gym_session, morning_yoga
- Business → coffee_shop_work, client_meeting, remote_work_break
- Casual → coffee_shop_work, brunch_with_friends, cozy_evening
- Bohemian → art_gallery_visit, weekend_market, meditation_session

**Selection Logic:**
1. Get position candidates (based on position pattern)
2. Get style candidates (based on fashion style)
3. Find intersection (activities that match both)
4. Select deterministically (position % matchingActivities.length)

### Activity → Location Mapping

Locations are derived from activities, not aesthetic categories:
- `post_workout_coffee` → `coffee_shop`
- `remote_work_break` → `home_living_room`
- `gym_session` → `gym`
- `evening_dinner` → `restaurant`
- `travel_arrival` → `hotel_lobby`

Category aesthetic is applied subtly (e.g., "coffee shop" → "luxury coffee shop"), but location type is determined by activity.

### Activity → Outfit Mapping

Outfits are derived from activity + location + fashion style:
- `post_workout_coffee` + `coffee_shop` → `athletic_base` + `casual_layer`
- `coffee_shop_work` + `coffee_shop` → `casual_base` + `outerwear`
- `remote_work_break` + `home_living_room` → `lounge_base`

Fashion style influences base outfit type, but activity determines the pattern.

### Activity → Objects Mapping

Objects are derived from activities:
- `post_workout_coffee` → ["coffee_cup", "phone", "keys"]
- `coffee_shop_work` → ["coffee_cup", "laptop", "phone"]
- `remote_work_break` → ["tea", "book", "phone"]

Fashion style filters objects (e.g., no laptops for athletic contexts).

### Activity → Lighting Mapping

Lighting is derived from activity + location + mood:
- `post_workout_coffee` + `coffee_shop` + `minimal` → `natural_window_light` with soft shadows
- `evening_dinner` + `restaurant` + `luxury` → `artificial_warm` with dramatic shadows

Mood influences lighting description, but lighting type is determined by activity.

### Activity → Camera Mapping

Camera specs are derived from activity + location:
- `morning_routine` → `close_up`
- `coffee_shop_work` → `midshot`
- `city_exploration` → `environmental`
- Flatlay activities → `flatlay`

### Activity → Pose Mapping

Poses are derived from activities:
- `post_workout_coffee` → `walking_toward_camera` with coffee cup
- `coffee_shop_work` → `sitting_at_table` with laptop
- `remote_work_break` → `sitting_at_table` with tea cup

---

## INTEGRATION POINTS

### Current Usage (Not Yet Integrated)

The scene resolver is created but not yet integrated into the generation flow. It will replace:

1. **Preview Feed Flow:**
   - Current: `getCoherentStyleParameters()` → `getBlueprintPhotoshootPrompt()` → `injectAndValidateTemplate()` → `adaptFeedPlannerToNanoBanana()`
   - Future: `resolveFeedPlannerScene()` → `buildPromptFromScene()` (Phase 3)

2. **Full Feed Planner Flow:**
   - Current: `getCoherentStyleParameters()` → `getBlueprintPhotoshootPrompt()` → `injectAndValidateTemplate()` → `generateFeedSinglePromptViaAuthority()`
   - Future: `resolveFeedPlannerScene()` → `buildPromptFromScene()` (Phase 3)

### Backward Compatibility

The scene resolver uses `getCoherentStyleParameters()` internally to maintain compatibility with existing category/mood/fashion style resolution logic. This ensures:
- Existing feeds continue to work
- No breaking changes
- Gradual migration path

---

## EXAMPLE OUTPUTS

### Example 1: Post-Workout Coffee (Position 2)

```typescript
{
  position: 2,
  activity: "post_workout_coffee",
  narrative: "Grabbing coffee after morning workout",
  
  location: {
    type: "coffee_shop",
    description: "local coffee shop with natural light",
    indoor: true,
    public: true
  },
  
  outfit: {
    style: "athletic",
    description: "athletic athletic_base with casual_layer",
    base: "athletic_base",
    layer: "casual_layer"
  },
  
  objects: [
    { type: "coffee_cup", description: "ceramic coffee cup", position: "hand" },
    { type: "phone", description: "iPhone", position: "hand" },
    { type: "keys", description: "car keys", position: "bag" }
  ],
  
  lighting: {
    type: "natural_window_light",
    quality: "uneven",
    description: "natural window light with soft shadows"
  },
  
  camera: {
    device: "iphone_15_pro",
    mode: "portrait",
    framing: "full_body"
  },
  
  pose: {
    type: "walking_toward_camera",
    description: "walking toward camera with coffee cup in hand"
  },
  
  category: "minimal",
  mood: "minimal",
  fashionStyle: "athletic",
  userId: "123",
  feedId: 456
}
```

### Example 2: Remote Work Break (Position 4)

```typescript
{
  position: 4,
  activity: "remote_work_break",
  narrative: "Taking a break from remote work",
  
  location: {
    type: "home_living_room",
    description: "home living room with natural light",
    indoor: true,
    public: false
  },
  
  outfit: {
    style: "casual",
    description: "casual lounge_base",
    base: "lounge_base"
  },
  
  objects: [
    { type: "tea", description: "ceramic tea cup", position: "hand" },
    { type: "book", description: "book", position: "table" },
    { type: "phone", description: "iPhone", position: "table" }
  ],
  
  lighting: {
    type: "natural_window_light",
    quality: "even",
    description: "natural window light with soft shadows"
  },
  
  camera: {
    device: "iphone_15_pro",
    mode: "portrait",
    framing: "midshot"
  },
  
  pose: {
    type: "sitting_at_table",
    description: "sitting relaxed with tea cup"
  },
  
  category: "minimal",
  mood: "minimal",
  fashionStyle: "casual",
  userId: "123",
  feedId: 456
}
```

---

## KEY DESIGN DECISIONS

### 1. Activity-First, Not Style-First

**Old System:**
```
Category (luxury) → Mood (minimal) → Fashion Style (athletic) → Template → Scene
```

**New System:**
```
Position + Fashion Style → Activity → Location → Outfit → Objects → Lighting → Camera → Pose
```

### 2. Single Resolver, Not Multiple

All scene intent decisions are in ONE function: `resolveFeedPlannerScene()`

No separate resolvers for:
- Category/mood (uses existing `getCoherentStyleParameters()`)
- Fashion style (uses existing `getCoherentStyleParameters()`)
- Location (derived from activity)
- Outfit (derived from activity + location)
- Objects (derived from activity)
- Lighting (derived from activity + location + mood)
- Camera (derived from activity + location)
- Pose (derived from activity)

### 3. Structured Data, Not Prompt Text

The resolver outputs structured scene objects, NOT prompt text. Prompt generation happens in Phase 3.

### 4. Backward Compatibility

Uses existing `getCoherentStyleParameters()` to maintain compatibility with current category/mood/fashion style resolution.

---

## NEXT PHASE PREPARATION

**Phase 3 Requirements:**
- Create `buildPromptFromScene()` function
- Accept structured scene data
- Output final prompt text (no mutation afterward)
- Support `preview_multi` (9 scenes in one prompt) and `single_scene` (1 scene per prompt) modes

**Key Integration Points:**
- `app/api/feed/[feedId]/generate-single/route.ts` → Use `resolveFeedPlannerScene()` instead of current flow
- Replace template injection → adapter → builder chain with scene resolver → prompt shaper

---

**End of Phase 2**
