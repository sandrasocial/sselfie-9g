# Feed Creation API Documentation

## Overview
The feed creation system has been refactored to use dedicated API endpoints, similar to concept cards. This provides better separation of concerns, easier testing, and consistent patterns across the codebase.

---

## API Endpoints

### 1. Classic Mode: Generate Feed

**Endpoint:** `POST /api/maya/generate-feed`

**Purpose:** Validates and processes feed strategy JSON from Maya's response in Classic Mode.

**Request Body:**
```typescript
{
  strategyJson: string        // JSON string containing feed strategy
  chatId?: number             // Optional chat ID for context
  conversationContext?: string // Optional conversation context
}
```

**Response:**
```typescript
{
  success: true
  strategy: FeedStrategy       // Validated strategy object
}
```

**Error Responses:**
- `400 Bad Request`: Invalid JSON format or missing required fields
- `401 Unauthorized`: User not authenticated
- `404 Not Found`: User not found
- `500 Internal Server Error`: Server error

**Validation Rules:**
- Strategy must contain exactly 9 posts
- Each post must have `position` (1-9) and `visualDirection`
- Strategy must have `feedTitle` or `title`

**Example Request:**
```json
{
  "strategyJson": "{\"feedTitle\":\"My Feed\",\"posts\":[...]}",
  "chatId": 123
}
```

---

### 2. Pro Mode: Generate Feed

**Endpoint:** `POST /api/maya/pro/generate-feed`

**Purpose:** Validates and processes feed strategy JSON from Maya's response in Pro Mode. Can leverage image library for enhancements.

**Request Body:**
```typescript
{
  strategyJson: string        // JSON string containing feed strategy
  chatId?: number             // Optional chat ID for context
  imageLibrary?: ImageLibrary // Pro Mode: Image library for enhancements
  conversationContext?: string // Optional conversation context
}
```

**Response:**
```typescript
{
  success: true
  strategy: FeedStrategy       // Validated strategy object
  proMode: true               // Indicates Pro Mode response
}
```

**Error Responses:**
- Same as Classic Mode endpoint

**Pro Mode Features:**
- Can use `imageLibrary` to enhance strategy
- Future: Can add Pro Mode specific validation
- Future: Can enhance strategy with Pro Mode features

**Example Request:**
```json
{
  "strategyJson": "{\"feedTitle\":\"My Feed\",\"posts\":[...]}",
  "chatId": 123,
  "imageLibrary": {
    "selfies": ["url1", "url2"],
    "products": ["url3"],
    "baseImages": [],
    "people": [],
    "vibes": []
  }
}
```

---

## Feed Strategy Structure

### FeedStrategy Interface
```typescript
interface FeedStrategy {
  feedTitle?: string          // Feed title (required)
  title?: string              // Alternative title field
  overallVibe?: string        // Overall aesthetic vibe
  colorPalette?: string       // Color palette description
  posts: FeedPost[]           // Array of exactly 9 posts (required)
  strategicRationale?: string // Optional strategic rationale
  strategyDocument?: string   // Optional full strategy document
  totalCredits?: number       // Total credits required
  gridPattern?: string        // Grid layout pattern
  visualRhythm?: string       // Visual rhythm description
  userRequest?: string        // Original user request
}
```

### FeedPost Interface
```typescript
interface FeedPost {
  position: number            // Position in grid (1-9, required)
  postType: 'user' | 'lifestyle' | string
  shotType: 'portrait' | 'half-body' | 'full-body' | 'object' | 'flatlay' | 'scenery' | string
  visualDirection: string     // Visual direction description (required)
  purpose: string             // Post purpose
  caption?: string            // Optional caption
  background?: string          // Optional background description
  generationMode?: 'classic' | 'pro' | string
}
```

---

## Flow Diagram

### Classic Mode Flow
```
User Request → Maya Response → [CREATE_FEED_STRATEGY: {...}] 
  → Component Detection → POST /api/maya/generate-feed 
  → Validation → handleCreateFeed() → Feed Card Display
```

### Pro Mode Flow
```
User Request → Maya Response → [CREATE_FEED_STRATEGY: {...}] 
  → Component Detection → POST /api/maya/pro/generate-feed 
  → Validation (with imageLibrary) → handleCreateFeed() → Feed Card Display
```

---

## Database Schema

### maya_chat_messages Table

**New Column:**
- `feed_cards` (JSONB): Stores feed card data (similar to `concept_cards`)

**Migration:**
- Existing data migrated from `styling_details` to `feed_cards`
- `styling_details` kept for backward compatibility
- GIN index created on `feed_cards` for performance

**Feed Card Structure in Database:**
```json
[
  {
    "strategy": { /* FeedStrategy object */ },
    "title": "Instagram Feed",
    "description": "Feed description",
    "posts": [ /* Array of 9 posts */ ],
    "isSaved": false,
    "feedId": 123,  // Optional: ID if saved to planner
    "proMode": false,
    "styleStrength": 0.8,
    "promptAccuracy": 0.9,
    "aspectRatio": "1:1",
    "realismStrength": 0.7
  }
]
```

---

## Component Architecture

### Detection (maya-feed-tab.tsx)
```typescript
// Step 1: Simple trigger detection
useEffect(() => {
  // Detect [CREATE_FEED_STRATEGY: {...}] pattern
  // Set pendingFeedRequest state
}, [messages, status])
```

### Processing (maya-feed-tab.tsx)
```typescript
// Step 2: Call API and create feed
useEffect(() => {
  if (!pendingFeedRequest) return
  
  // Call appropriate endpoint (Classic or Pro Mode)
  // Validate response
  // Call handleCreateFeed()
}, [pendingFeedRequest, proMode, imageLibrary])
```

---

## Pro Mode vs Classic Mode

| Feature | Classic Mode | Pro Mode |
|---------|-------------|----------|
| Endpoint | `/api/maya/generate-feed` | `/api/maya/pro/generate-feed` |
| Image Library | Not used | Used for enhancements |
| Validation | Basic validation | Can add Pro Mode specific validation |
| Future Features | Standard features | Enhanced features with image library |

---

## Error Handling

### Client-Side
- Invalid JSON: Error message displayed, loading state cleared
- Network errors: Graceful error handling, user can retry
- Missing fields: API returns 400, error displayed

### Server-Side
- JSON parsing errors: Returns 400 with clear error message
- Validation errors: Returns 400 with specific field errors
- Database errors: Returns 500 with generic error (details in dev mode)

---

## Backward Compatibility

### Old Feeds (styling_details)
- Old feeds stored in `styling_details` still load correctly
- Load function checks `feed_cards` first, falls back to `styling_details`
- Migration script moves old data to `feed_cards` automatically

### Migration Path
1. Run `migrations/add-feed-cards-column.sql`
2. Existing data automatically migrated
3. New feeds use `feed_cards` column
4. Old feeds continue to work via fallback

---

## Testing

See `FEED_CREATION_TEST_PLAN.md` for comprehensive test cases.

**Quick Test:**
1. Create feed in Classic Mode
2. Verify feed card appears
3. Refresh page
4. Verify feed card loads from database
5. Switch to Pro Mode
6. Create feed in Pro Mode
7. Verify Pro Mode endpoint called

---

## Future Enhancements

### Pro Mode
- Use image library to enhance strategy
- Add Pro Mode specific validation
- Enhance prompts with image library context

### Performance
- Cache validated strategies
- Optimize database queries
- Add request batching

### Features
- Support for different feed sizes (not just 9 posts)
- Feed templates
- Feed preview before creation

---

## Changelog

### Phase 1 (Foundation)
- Created API endpoints for Classic and Pro Mode
- Simplified trigger detection (4 patterns → 1)
- Split detection and processing

### Phase 2 (Simplification)
- Removed unnecessary refs
- Simplified message key generation
- Simplified saving logic

### Phase 3 (Pro Mode Support)
- Added Pro Mode API endpoint
- Updated component to use Pro Mode endpoint
- Added imageLibrary support

### Phase 4 (Database Consistency)
- Added `feed_cards` column
- Updated save functions
- Updated load functions with backward compatibility

---

## Support

For issues or questions:
1. Check console logs for error messages
2. Verify API endpoints are called correctly
3. Check database for feed_cards data
4. Review test plan for expected behavior

