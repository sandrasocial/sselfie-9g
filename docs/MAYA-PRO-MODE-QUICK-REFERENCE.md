# MAYA PRO MODE: QUICK REFERENCE GUIDE
## Implementation Quick Reference

**Status:** 📋 READY FOR IMPLEMENTATION  
**Last Updated:** 2025-01-XX

---

## 🚨 CRITICAL RULES

### **DO NOT TOUCH CLASSIC MODE**
```
✅ SAFE FILES (Do Not Modify):
- lib/maya/personality.ts
- Classic mode concept generation
- Classic mode image generation (Flux)
- Classic mode chat flow

❌ DANGER ZONE (Modify Carefully):
- maya-chat-screen.tsx
- app/api/maya/chat/route.ts
- app/api/maya/generate-concepts/route.ts
```

### **PROTECTION STRATEGY**
1. Create new Pro Mode files FIRST
2. Copy relevant code to new files
3. Test Pro Mode works independently
4. THEN remove Pro Mode code from Classic files

---

## 📁 NEW FILE STRUCTURE

### **Components**
```
components/sselfie/pro-mode/
├── ProModeChat.tsx
├── ProModeHeader.tsx
├── ProModeInput.tsx
├── ImageLibraryModal.tsx
├── ImageUploadFlow.tsx
├── ConceptCardPro.tsx
└── hooks/
    ├── useImageLibrary.ts
    ├── useProModeChat.ts
    └── useConceptGeneration.ts
```

### **API Routes**
```
app/api/maya/pro/
├── chat/route.ts
├── generate-concepts/route.ts
├── library/
│   ├── get/route.ts
│   ├── update/route.ts
│   └── clear/route.ts
└── generate-image/route.ts
```

### **Lib Files**
```
lib/maya/pro/
├── personality.ts
├── system-prompts.ts
├── category-system.ts
├── prompt-builder.ts
├── types.ts
└── design-system.ts
```

---

## 🗑️ CODE TO REMOVE

### **maya-chat-screen.tsx**
- ❌ `processedConceptMessagesRef` (line 163)
- ❌ `carouselSlides` state (line 225)
- ❌ `workbenchPrompts` state (line 228)
- ❌ `promptSuggestions` state (line 221)
- ❌ `isWorkflowChat` state (line 200)
- ❌ Workbench mode code
- ❌ Workflow chat code
- ❌ Old upload module refs

### **pro-personality.ts**
- ❌ Workbench mode instructions
- ❌ `[GENERATE_PROMPTS]` references
- ❌ `[SHOW_IMAGE_UPLOAD_MODULE]` references
- ❌ Workflow guidance
- ❌ Generic SaaS language

### **generate-concepts/route.ts**
- ❌ Workbench mode detection
- ❌ Old brand detection complexity
- ❌ Multiple template systems overlap

### **chat/route.ts**
- ❌ Workbench mode detection
- ❌ Workflow guidance
- ❌ `activeWorkflow` handling

---

## 🎨 DESIGN SYSTEM

### **Typography**
- Headers: `Canela, serif` (e.g., "Studio Pro Mode" - 32px, Stone 900)
- Subheaders: `Hatton, serif` (e.g., "Morning Ritual Glow" - 18px, Stone 700)
- Body: `Inter Light, sans-serif` (readable descriptions - 14px, Stone 600)
- UI: `Inter Regular, sans-serif` (clear labels - 13px)
- Data: `Inter Medium, sans-serif` (numbers, counts - 13px)

### **Colors**
- Primary: `#1C1917` (stone-900)
- Secondary: `#57534E` (stone-600)
- Background: `#F5F1ED` (warm cream)
- Accent: `#292524` (stone-800)
- Border: `rgba(231, 229, 228, 0.6)` (stone-200/60)

### **UI Labels (NO EMOJIS)**
```typescript
selfies: (count: number) => `Selfies • ${count}`
products: (count: number) => `Products • ${count}`
people: (count: number) => `People • ${count}`
vibes: (count: number) => `Vibes • ${count}`
library: (total: number) => `Library • ${total} images`
imagesLinked: (count: number) => `Images Linked • ${count}`
```

### **Button Labels (NO EMOJIS)**
```typescript
beginSetup: 'Begin Setup'
continue: 'Continue'
generate: 'Generate'
addImages: 'Add Images'
manage: 'Manage'
viewPrompt: 'View Prompt'
close: 'Close'
startCreating: 'Start Creating'
startFresh: 'Start Fresh Project'
```

### **The Split:**
- **UI Layer** = Clean, editorial, no emojis, professional language
- **Maya's Chat** = Warm, personal, emojis allowed, enthusiastic
- **Never mix the two**

---

## 📊 CATEGORIES

### **6 Pro Mode Categories**
1. **WELLNESS** - Alo Yoga, Lululemon, Outdoor Voices
2. **LUXURY** - CHANEL, Dior, Bottega Veneta, The Row
3. **LIFESTYLE** - Glossier, Free People, Jenni Kayne
4. **FASHION** - Reformation, Everlane, Aritzia, Toteme
5. **TRAVEL** - Airport scenes, vacation mode, jet-set
6. **BEAUTY** - Rhode, Glossier, The Ordinary

---

## 🔄 PROMPT STRUCTURE

### **Pro Mode Prompts (250-500 words)**
```
Professional photography. Influencer/Pinterest style portrait
maintaining exactly the same physical characteristics...

[Outfit Section - with real brand names]
[Pose Section]
[Lighting Section]
[Setting Section]
[Mood Section]

Aesthetic: [Category-specific aesthetic description]
```

### **Key Requirements**
- ✅ Real brand names (CHANEL headband, Alo leggings)
- ✅ Professional photography language
- ✅ 250-500 words
- ✅ Specific sections (Outfit, Pose, Lighting, Setting, Mood)
- ❌ NO generic "stylish outfit"

---

## 🗄️ DATABASE TABLES

### **user_image_libraries**
```sql
CREATE TABLE user_image_libraries (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  selfies JSONB DEFAULT '[]',
  products JSONB DEFAULT '[]',
  people JSONB DEFAULT '[]',
  vibes JSONB DEFAULT '[]',
  current_intent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **pro_mode_sessions**
```sql
CREATE TABLE pro_mode_sessions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  chat_id INTEGER REFERENCES maya_chats(id),
  library_snapshot JSONB,
  concepts_generated INTEGER DEFAULT 0,
  images_generated INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🧪 TESTING CHECKLIST

### **After Each Phase**
- [ ] Classic mode still works
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] No linting errors

### **After Phase 1**
- [ ] Dead code removed
- [ ] New file structure created
- [ ] Pro mode isolated from Classic

### **After Phase 2**
- [ ] Upload flow works
- [ ] NO emojis in UI
- [ ] Elegant design throughout
- [ ] Library management functional

### **After Phase 3**
- [ ] Category system working
- [ ] Universal Prompts integrated
- [ ] State persists correctly
- [ ] Full user journey works

---

## 🚀 IMPLEMENTATION ORDER

### **Week 1: Cleanup (Phase 1)**
1. Create new file structure
2. Remove dead code safely
3. Test Classic mode still works
4. Create Pro mode skeleton

### **Week 2: UX (Phase 2)**
1. Build upload flow
2. Build concept cards (sophisticated)
3. Build library management
4. Polish UI, remove all emojis

### **Week 3: Logic (Phase 3)**
1. Category system integration
2. Prompt builder + Universal Prompts
3. API routes + state management
4. End-to-end testing

---

## 📝 COMMON PATTERNS

### **Pro Mode Component Pattern**
```typescript
import { ProModeDesign, UILabels } from '@/lib/maya/pro/design-system'

export function ProModeComponent() {
  // Use design system
  // NO emojis in UI
  // Sophisticated styling
  // Professional feel
}
```

### **Pro Mode API Route Pattern**
```typescript
export async function POST(req: NextRequest) {
  // Pro mode only
  // Uses category system
  // Returns Universal Prompts
  // Clean, focused
}
```

### **Pro Mode Hook Pattern**
```typescript
export function useProModeHook() {
  // Centralized state
  // Database persistence
  // localStorage sync
  // Clean API
}
```

---

## 🔍 DEBUGGING TIPS

### **If Classic Mode Breaks**
1. Check if you modified `lib/maya/personality.ts`
2. Check if you removed Classic mode code
3. Revert changes and re-apply carefully

### **If Pro Mode Doesn't Work**
1. Check if new files are created
2. Check if API routes are registered
3. Check if hooks are imported correctly
4. Check console for errors

### **If State Doesn't Persist**
1. Check database tables exist
2. Check API routes are working
3. Check localStorage is being used
4. Check network requests in DevTools

---

## 📚 RELATED DOCUMENTS

- **Full Plan:** `docs/MAYA-PRO-MODE-CLEANUP-PLAN.md`
- **Checklist:** `docs/MAYA-PRO-MODE-IMPLEMENTATION-CHECKLIST.md`
- **This Guide:** `docs/MAYA-PRO-MODE-QUICK-REFERENCE.md`

---

**Ready to implement? Start with Phase 1! 🚀**
