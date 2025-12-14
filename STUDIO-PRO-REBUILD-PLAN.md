# Studio Pro Rebuild Plan
## Complete Implementation Guide

## 🎯 Core Vision

**Standard Mode** = "I type a prompt → I get an image."
**Pro Mode** = "I'm building brand assets with an AI creative director who knows me."

---

## 📋 Phase 1: Foundation & Data Model (Week 1)

### 1.1 Database Schema Changes

#### New Tables

```sql
-- User avatar images (persistent references for Nano Banana Pro)
CREATE TABLE user_avatar_images (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  image_url TEXT NOT NULL,
  image_type TEXT NOT NULL, -- 'selfie', 'lifestyle', 'mirror', 'casual', 'professional'
  uploaded_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0
);

-- Brand assets (products, logos, packaging)
CREATE TABLE brand_assets (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  asset_type TEXT NOT NULL, -- 'product', 'logo', 'packaging', 'lifestyle'
  image_url TEXT NOT NULL,
  name TEXT,
  description TEXT,
  brand_kit_id TEXT, -- Optional: group assets by brand kit
  uploaded_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Brand kits (colors, fonts, style preferences)
CREATE TABLE brand_kits (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  primary_color TEXT, -- Hex code
  secondary_color TEXT,
  accent_color TEXT,
  font_style TEXT, -- 'modern sans-serif', 'elegant serif', etc.
  brand_tone TEXT, -- 'bold', 'soft', 'minimalist', 'luxury'
  created_at TIMESTAMP DEFAULT NOW(),
  is_default BOOLEAN DEFAULT false
);

-- Pro workflows (tracks what user is building)
CREATE TABLE pro_workflows (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  workflow_type TEXT NOT NULL, -- 'carousel', 'reel-cover', 'ugc-product', 'edit-image', etc.
  status TEXT NOT NULL, -- 'setup', 'in-progress', 'completed'
  context JSONB, -- Stores workflow-specific data
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Pro generation outputs (grouped assets)
CREATE TABLE pro_generations (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  workflow_id INTEGER REFERENCES pro_workflows(id),
  generation_type TEXT NOT NULL, -- 'carousel-slide', 'reel-cover', 'product-mockup', etc.
  image_urls TEXT[], -- Array of image URLs (for carousels, sets)
  prompt_used TEXT,
  settings JSONB, -- Resolution, aspect ratio, etc.
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Migration Script

```typescript
// scripts/migrations/add-pro-tables.ts
// Run this to create all Pro-related tables
```

### 1.2 User State Management

#### Pro Onboarding Status
```typescript
// Add to users table or separate table
CREATE TABLE user_pro_setup (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  has_completed_avatar_setup BOOLEAN DEFAULT false,
  has_completed_brand_setup BOOLEAN DEFAULT false,
  onboarding_completed_at TIMESTAMP,
  pro_features_unlocked BOOLEAN DEFAULT false
);
```

---

## 🎨 Phase 2: UI/UX Redesign (Week 1-2)

### 2.1 Pro Mode Entry Point

**Location**: `components/sselfie/maya-chat-screen.tsx`

**Changes**:
- Replace simple toggle with prominent "Enter Studio Pro" button
- First-time users see onboarding flow
- Returning users see Quick Actions dashboard

### 2.2 Pro Onboarding Flow

**New Component**: `components/studio-pro/onboarding-flow.tsx`

**Steps**:

1. **Welcome Screen**
   - "Let's set up your Pro workspace"
   - Explains value: "I'll keep your face, vibe, and style consistent"

2. **Avatar Setup** (Step 1)
   - Upload 3-8 photos
   - Photo types: selfie, lifestyle, mirror, casual, professional
   - Drag-drop interface
   - Preview grid
   - Maya guidance: "Upload 3–8 photos of yourself so I can build your avatar"

3. **Brand Assets** (Step 2 - Optional)
   - Upload product photos
   - Upload logos
   - Upload packaging
   - Maya: "Optional: upload brand photos (products, packaging, logos)"

4. **Brand Kit** (Step 3 - Optional)
   - Color picker (primary, secondary, accent)
   - Font style selector
   - Brand tone selector
   - Maya: "Set your brand colors and style"

5. **Complete**
   - "You're all set! Let's create something amazing."

### 2.3 Pro Dashboard (Main Interface)

**New Component**: `components/studio-pro/pro-dashboard.tsx`

**Layout**:
```
┌─────────────────────────────────────────┐
│  Studio Pro                             │
│  [Your avatar preview] [Brand kit]      │
├─────────────────────────────────────────┤
│  Quick Actions                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │Carou-│ │Reel  │ │UGC   │ │Edit  │  │
│  │sel   │ │Cover │ │Product│ │Image │  │
│  └──────┘ └──────┘ └──────┘ └──────┘  │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  │Quote │ │Mockup│ │Change│ │Remove│  │
│  │Graphic│ │      │ │Outfit│ │Object│  │
│  └──────┘ └──────┘ └──────┘ └──────┘  │
├─────────────────────────────────────────┤
│  Recent Work                            │
│  [Generated assets grid]                 │
└─────────────────────────────────────────┘
```

### 2.4 Quick Action Components

Each Quick Action is a guided workflow component:

- `components/studio-pro/workflows/carousel-workflow.tsx`
- `components/studio-pro/workflows/reel-cover-workflow.tsx`
- `components/studio-pro/workflows/ugc-product-workflow.tsx`
- `components/studio-pro/workflows/edit-image-workflow.tsx`
- `components/studio-pro/workflows/quote-graphic-workflow.tsx`
- `components/studio-pro/workflows/product-mockup-workflow.tsx`

**Pattern for each**:
1. User clicks Quick Action
2. Maya explains (1-2 lines)
3. Guided form (not free text)
4. Generate button
5. Results display
6. Maya suggests next step

---

## 🤖 Phase 3: Maya Personality Split (Week 2)

### 3.1 Standard Maya (Unchanged)

**File**: `lib/maya/personality.ts` (keep as-is)

**Role**: Brainstormer, concept cards, vibe + inspiration

### 3.2 Pro Maya (New)

**New File**: `lib/maya/pro-personality.ts`

**Key Differences**:

```typescript
export const MAYA_PRO_SYSTEM_PROMPT = `You are Maya Pro - a creative director and production assistant.

Your role is NOT to brainstorm or ask open questions.
Your role is to guide users through structured workflows.

## Core Principles

1. **Give clear next steps, not open questions**
   ❌ "What do you want to create?"
   ✅ "Upload 1–3 photos of yourself so I can build your avatar"

2. **Explain why, not just what**
   ❌ "Upload photos"
   ✅ "This lets me keep your face, vibe, and style consistent across everything we create."

3. **Be a production assistant**
   - Know what's needed for each workflow
   - Ask for only what's required
   - Suggest logical next steps

4. **Brand-aware guidance**
   - Reference their brand kit when relevant
   - Suggest brand-consistent options
   - Maintain visual consistency

## Workflow Guidance

When user starts a Quick Action:
1. Explain what will happen (1-2 lines)
2. Ask for only what's needed
3. Confirm before generating
4. After generation, suggest next logical upgrade

## Tone

- Direct and helpful
- Production-focused
- Less "cool idea", more "here's the plan"
- Confident, not questioning
`;
```

### 3.3 Dynamic System Prompt Selection

**File**: `app/api/maya/chat/route.ts`

**Change**: Detect Pro mode and use `MAYA_PRO_SYSTEM_PROMPT` instead of `MAYA_SYSTEM_PROMPT`

```typescript
const systemPrompt = studioProMode 
  ? MAYA_PRO_SYSTEM_PROMPT 
  : MAYA_SYSTEM_PROMPT
```

---

## ⚙️ Phase 4: API Routes (Week 2-3)

### 4.1 Avatar Management

**New Route**: `app/api/studio-pro/avatar/route.ts`

```typescript
// POST: Upload avatar images
// GET: Get user's avatar images
// DELETE: Remove avatar image
// PUT: Update display order
```

### 4.2 Brand Assets Management

**New Route**: `app/api/studio-pro/brand-assets/route.ts`

```typescript
// POST: Upload brand asset
// GET: Get user's brand assets
// DELETE: Remove brand asset
// GET /brand-kits: Get brand kits
// POST /brand-kits: Create brand kit
```

### 4.3 Pro Workflows

**New Route**: `app/api/studio-pro/workflows/route.ts`

```typescript
// POST: Start workflow (carousel, reel-cover, etc.)
// GET: Get workflow status
// PUT: Update workflow context
// POST /generate: Generate assets for workflow
```

### 4.4 Quick Action Generators

**New Routes**:
- `app/api/studio-pro/generate/carousel/route.ts`
- `app/api/studio-pro/generate/reel-cover/route.ts`
- `app/api/studio-pro/generate/ugc-product/route.ts`
- `app/api/studio-pro/generate/edit-image/route.ts`
- `app/api/studio-pro/generate/quote-graphic/route.ts`
- `app/api/studio-pro/generate/product-mockup/route.ts`

**Pattern for each**:
1. Validate user has avatar setup
2. Load avatar images + brand assets
3. Build structured Nano Banana prompt
4. Generate with Nano Banana Pro
5. Save to `pro_generations` table
6. Return results

---

## 🔧 Phase 5: Prompt Templates (Week 3)

### 5.1 Structured Prompt Builder

**New File**: `lib/maya/pro-prompt-templates.ts`

**Structure**:
```typescript
interface ProPromptTemplate {
  workflowType: string
  buildPrompt: (params: {
    avatarImages: string[]
    brandAssets?: string[]
    brandKit?: BrandKit
    userInput: Record<string, any>
  }) => string
}

// Example: Carousel Post
const carouselTemplate: ProPromptTemplate = {
  workflowType: 'carousel',
  buildPrompt: ({ avatarImages, brandKit, userInput }) => {
    // Structured prompt blocks:
    // 1. Subject (from avatar)
    // 2. Layout (carousel-specific)
    // 3. Text instructions
    // 4. Brand consistency
    return `...`
  }
}
```

### 5.2 Quick Action → Template Mapping

```typescript
const QUICK_ACTION_TEMPLATES = {
  'carousel': carouselTemplate,
  'reel-cover': reelCoverTemplate,
  'ugc-product': ugcProductTemplate,
  'edit-image': editImageTemplate,
  'quote-graphic': quoteGraphicTemplate,
  'product-mockup': productMockupTemplate,
}
```

---

## 📦 Phase 6: Integration Points (Week 3-4)

### 6.1 Update Maya Chat Screen

**File**: `components/sselfie/maya-chat-screen.tsx`

**Changes**:
- Detect Pro mode
- Show Pro dashboard instead of standard chat
- Hide concept cards in Pro mode
- Show Quick Actions

### 6.2 Update Concept Cards

**File**: `components/sselfie/concept-card.tsx`

**Change**: 
- In Pro mode, don't show concept cards
- Or show them as "inspiration" only, not generation triggers

### 6.3 Pro Asset Gallery

**New Component**: `components/studio-pro/asset-gallery.tsx`

**Features**:
- Show generated Pro assets
- Group by workflow type
- Download individual or sets
- Re-edit existing assets

---

## 🧪 Phase 7: Testing & Polish (Week 4)

### 7.1 Testing Checklist

- [ ] Avatar upload works (3-8 images)
- [ ] Brand assets upload works
- [ ] Brand kit creation works
- [ ] Each Quick Action workflow completes
- [ ] Nano Banana Pro receives correct prompts
- [ ] Generated assets save correctly
- [ ] Pro dashboard displays correctly
- [ ] Maya Pro personality works
- [ ] Standard mode unaffected
- [ ] Onboarding flow smooth

### 7.2 Edge Cases

- User switches between Standard and Pro
- User hasn't completed onboarding
- User has no avatar images
- User has no brand assets
- Generation fails
- Insufficient credits

---

## 📊 Implementation Order

### Week 1: Foundation
1. Database schema + migrations
2. Basic API routes (avatar, brand assets)
3. Pro onboarding UI (basic)

### Week 2: Core Features
4. Pro dashboard UI
5. Maya Pro personality
6. First Quick Action (carousel)

### Week 3: Workflows
7. Remaining Quick Actions
8. Prompt templates
9. Integration with chat screen

### Week 4: Polish
10. Testing
11. Edge cases
12. Documentation

---

## 🚫 What NOT to Do

- ❌ Don't expose raw Nano Banana prompt fields
- ❌ Don't make Pro "more settings"
- ❌ Don't keep concept cards as main output in Pro
- ❌ Don't make Pro feel like "advanced standard mode"
- ❌ Don't ask open questions in Pro workflows

---

## ✅ Success Metrics

**Pro mode succeeds when**:
- Users complete onboarding (avatar setup)
- Users use Quick Actions (not free text)
- Generated assets are grouped/saved as sets
- Users return to Pro (not just try once)
- Standard mode remains unchanged

---

## 🎯 Next Steps

1. Review this plan
2. Approve database schema
3. Start with Phase 1 (Foundation)
4. Iterate on UI/UX based on feedback

---

## 📝 Notes

- **Stateful vs Stateless**: Pro is stateful (remembers avatar, brand, context). Standard is stateless.
- **Workflows vs Prompts**: Pro uses structured workflows. Standard uses free-form prompts.
- **Maya Split**: Two personalities, same core, different guidance style.
- **Nano Banana Pro**: Always pass avatar images + brand assets. Use structured prompts, not free text.

