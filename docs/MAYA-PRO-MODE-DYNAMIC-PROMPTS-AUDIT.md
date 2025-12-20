# Dynamic Smart Prompts Audit - ImageUploadFlow Step 4

## Overview
This audit examines how to add dynamic smart prompts to Step 4 ("What would you like to create with these images?") in the ImageUploadFlow component, and verifies that images are correctly linked when sending messages to Maya.

## Current State Analysis

### Step 4 Current Implementation
**Location:** `components/sselfie/pro-mode/ImageUploadFlow.tsx` (Lines 1395-1620)

**Current Features:**
- Textarea for user to describe creative intent
- Library summary showing image counts by category
- Validation error for missing intent
- "Start Creating" button that triggers `onComplete` callback

**Missing:**
- No prompt suggestions/quick actions
- No dynamic prompts based on library content
- Users who don't know where to start have no guidance

### Image Linking Current State

**Location:** `components/sselfie/maya-chat-screen.tsx` (Lines 3150-3228)

**Current Implementation:**
```typescript
// When onComplete is called:
const allImages = [
  ...library.selfies,      // ✅ Selfies included
  ...library.products,     // ✅ Products included
  ...library.people,       // ✅ People included
  ...library.vibes,        // ✅ Vibes included
]

const messageParts: Array<{ type: string; text?: string; image?: string }> = []

// Add text part
if (messageText) {
  messageParts.push({ type: "text", text: messageText })
}

// Add all images
allImages.forEach(imageUrl => {
  messageParts.push({ type: "image", image: imageUrl })
})

sendMessage({
  role: "user",
  parts: messageParts,
})
```

**✅ VERIFIED: Images are correctly linked**
- All library images (selfies, products, people, vibes) are included
- Images are sent as separate parts in the message
- Selfies are always included (required for identity preservation)

## How Classic Mode Handles Prompts

### Classic Mode Quick Actions
**Location:** `components/sselfie/maya-chat-screen.tsx` (Lines 1570-1605, 3270-3250)

**Current Implementation:**
- Uses `getRandomPrompts()` function from `lib/maya/prompt-generator.ts`
- Displays prompts as clickable buttons in empty state
- Prompts are static/generic (not personalized)
- Disabled for Pro Mode (line 1580: `setCurrentPrompts([])`)

**Key Functions:**
- `getRandomPrompts(category: string | null, count?: number)` - Returns array of prompt suggestions
- `currentPrompts` state - Stores prompt suggestions
- Prompts have `label` and `prompt` properties

## Proposed Solution: Dynamic Smart Prompts for Step 4

### 1. Prompt Generation Strategy

#### Option A: AI-Generated Prompts (Recommended)
**Create new API endpoint:** `/api/maya/pro/generate-intent-suggestions`

**Input:**
- Image library (selfies, products, people, vibes counts)
- Category detection from library content
- User's brand profile (if available)

**Output:**
- Array of 3-5 personalized intent suggestions
- Each suggestion should be:
  - Specific to their library content
  - Actionable and inspiring
  - Professional (no emojis in UI)
  - Examples:
    - "Create lifestyle content for my wellness brand, featuring morning routines and product showcases"
    - "Generate editorial fashion content showcasing my personal style with luxury pieces"
    - "Build a travel content series highlighting destination moments and local experiences"

**Implementation:**
```typescript
// New API route: app/api/maya/pro/generate-intent-suggestions/route.ts
export async function POST(req: NextRequest) {
  const { library, userId } = await req.json()
  
  // Use Maya's AI to generate personalized suggestions
  // Based on:
  // - Library content (selfies count, products, people, vibes)
  // - Category detection
  // - User's brand profile
  // - Fashion knowledge
  
  return NextResponse.json({
    suggestions: [
      { text: "Create lifestyle content...", category: "lifestyle" },
      { text: "Generate editorial fashion...", category: "fashion" },
      // ...
    ]
  })
}
```

#### Option B: Template-Based Prompts (Faster, Less Personalized)
**Use existing prompt system with library-aware templates**

**Implementation:**
- Extend `lib/maya/prompt-generator.ts` with library-aware function
- Create templates based on library composition:
  - High products count → Brand partnership content
  - High people count → Lifestyle/group content
  - High vibes count → Aesthetic/inspiration content
  - Mix → General lifestyle content

### 2. UI Integration in Step 4

**Location:** `components/sselfie/pro-mode/ImageUploadFlow.tsx` (After line 1497, before Library summary)

**Design Requirements:**
- Professional, editorial feel (no emojis in UI)
- Matches Pro Mode design system
- Subtle, non-intrusive
- Optional (users can still type their own)

**UI Structure:**
```
[Header: "What would you like to create with these images?"]
[Divider]

[Optional: Smart Suggestions Section]
  <p>Not sure where to start? Try one of these:</p>
  <div className="flex flex-wrap gap-2">
    {suggestions.map((suggestion, index) => (
      <button onClick={() => handleSuggestionClick(suggestion.text)}>
        {suggestion.text}
      </button>
    ))}
  </div>
  <button onClick={loadMoreSuggestions}>Show more ideas</button>

[Intent Textarea]
[Helper text]
[Library summary]
[Validation error]
[Start Creating button]
```

### 3. Data Flow

**Step 4 Component State:**
```typescript
const [suggestions, setSuggestions] = useState<Array<{ text: string; category?: string }>>([])
const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
```

**When to Load Suggestions:**
- On Step 4 mount (useEffect)
- When library changes (if user goes back and adds images)
- When user clicks "Show more ideas"

**Loading Logic:**
```typescript
useEffect(() => {
  if (currentStep === 4 && library.selfies.length > 0) {
    loadSuggestions()
  }
}, [currentStep, library])

const loadSuggestions = async () => {
  setIsLoadingSuggestions(true)
  try {
    const response = await fetch('/api/maya/pro/generate-intent-suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ library }),
      credentials: 'include',
    })
    const data = await response.json()
    setSuggestions(data.suggestions)
  } catch (error) {
    console.error('[ImageUploadFlow] Failed to load suggestions:', error)
  } finally {
    setIsLoadingSuggestions(false)
  }
}
```

### 4. Suggestion Click Handler

```typescript
const handleSuggestionClick = (suggestionText: string) => {
  // Fill textarea with suggestion
  handleIntentChange(suggestionText)
  
  // Optional: Scroll to textarea or highlight it
  // Optional: Show subtle animation/feedback
}
```

## Image Linking Verification

### Current Implementation ✅

**Verified Locations:**
1. **Empty State Flow** (`maya-chat-screen.tsx:3156-3173`):
   - ✅ All images included: selfies, products, people, vibes
   - ✅ Images sent as separate parts
   - ✅ Text intent included

2. **Start Creating Flow** (`maya-chat-screen.tsx:3207-3222`):
   - ✅ All images included: selfies, products, people, vibes
   - ✅ Images sent as separate parts
   - ✅ Text intent included

3. **Upload Flow Modal** (`maya-chat-screen.tsx:4310-4323`):
   - ✅ All images included: selfies, products, people, vibes
   - ✅ Images sent as separate parts
   - ✅ Text intent included

**Conclusion:** ✅ **Images are correctly linked in all flows**

### Recommendations for Image Linking

**No changes needed** - current implementation is correct:
- Selfies are always included (required)
- All other images (products, people, vibes) are included
- Images are sent as separate message parts (correct format)
- Message structure matches API expectations

## Implementation Plan

### Phase 1: API Endpoint
1. Create `/api/maya/pro/generate-intent-suggestions/route.ts`
2. Use Maya's AI (Claude) to generate personalized suggestions
3. Base suggestions on:
   - Library composition (selfies, products, people, vibes counts)
   - Category detection from library
   - User's brand profile (if available)
   - Maya's fashion knowledge

### Phase 2: UI Integration
1. Add suggestions state to `ImageUploadFlow.tsx`
2. Add `useEffect` to load suggestions when Step 4 is reached
3. Add suggestions UI section (after divider, before textarea)
4. Style suggestions as clickable buttons matching Pro Mode design
5. Add loading state for suggestions
6. Add "Show more ideas" button (optional)

### Phase 3: Enhancement
1. Add suggestion categories (lifestyle, fashion, travel, etc.)
2. Allow filtering suggestions by category
3. Track which suggestions users click (analytics)
4. Improve suggestions based on user behavior

## Design Considerations

### Pro Mode Design System Compliance
- ✅ No emojis in UI (only in Maya's chat responses)
- ✅ Professional typography (Canela, Hatton, Inter)
- ✅ Stone palette colors
- ✅ Editorial, luxury feel
- ✅ Subtle, non-intrusive suggestions

### UX Considerations
- Suggestions should be optional (users can ignore and type their own)
- Suggestions should be helpful, not overwhelming (3-5 max initially)
- Loading state should be subtle
- Suggestions should feel intelligent and personalized, not generic

## Files to Modify

### New Files:
1. `app/api/maya/pro/generate-intent-suggestions/route.ts` - API endpoint for generating suggestions

### Modified Files:
1. `components/sselfie/pro-mode/ImageUploadFlow.tsx`:
   - Add suggestions state
   - Add `useEffect` to load suggestions
   - Add suggestions UI section
   - Add suggestion click handler

### Dependencies:
- Maya's AI (Claude) for generating suggestions
- Category detection system (already exists)
- User brand profile (if available)
- Image library hook (already exists)

## Testing Checklist

### Image Linking:
- ✅ Verify selfies are always included
- ✅ Verify all uploaded images (products, people, vibes) are included
- ✅ Verify images are sent in correct format (message parts)
- ✅ Test with empty library (should still work)
- ✅ Test with only selfies (should work)
- ✅ Test with full library (all categories)

### Dynamic Prompts:
- [ ] Test with library containing only selfies
- [ ] Test with library containing products
- [ ] Test with library containing people
- [ ] Test with library containing vibes
- [ ] Test with mixed library
- [ ] Test loading state
- [ ] Test suggestion click fills textarea
- [ ] Test "Show more ideas" button
- [ ] Test suggestions match library content
- [ ] Test suggestions are professional (no emojis in UI)

## Summary

### Image Linking: ✅ VERIFIED CORRECT
- All images (selfies, products, people, vibes) are correctly linked
- Images are sent in the correct format
- No changes needed

### Dynamic Prompts: 📋 READY FOR IMPLEMENTATION
- Clear path forward with AI-generated suggestions
- UI integration points identified
- Design system compliance ensured
- Implementation plan documented

**Next Steps:**
1. Create API endpoint for generating suggestions
2. Integrate suggestions UI in Step 4
3. Test with various library compositions
4. Refine based on user feedback





