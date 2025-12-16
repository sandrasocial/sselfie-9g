# WORKBENCH + MAYA CHAT INTEGRATION PLAN
## Comprehensive Analysis & Implementation Strategy

**Date:** 2025-01-XX  
**Status:** ANALYSIS & DESIGN - NO CODE YET  
**Goal:** Make Workbench always visible and integrate seamlessly with Maya chat to leverage Nano Banana Pro's full potential

---

## 🔍 CURRENT ISSUES ANALYSIS

### Issue 1: Workbench Disappears on Quick Prompts
**Root Cause:**
- Quick prompts in Studio Pro mode set `isWorkflowChat = true`
- Workbench rendering condition: `workbenchEnabled && studioProMode && !isWorkflowChat`
- When `isWorkflowChat = true`, workbench hides
- Old workflow system (`[WORKFLOW_START: ...]`) triggers instead

**Location:** `components/sselfie/maya-chat-screen.tsx:2657` and `3113`

### Issue 2: Workbench Disappears on New Chat
**Root Cause:**
- New chat creation might reset state or change conditions
- Workbench visibility tied to multiple state variables
- No persistent workbench state across chat sessions

### Issue 3: Old Pro Implementation Still Triggers
**Root Cause:**
- Quick prompts send `[WORKFLOW_START: ...]` messages
- This triggers old workflow system instead of workbench
- No check for workbench mode before triggering workflows

---

## 🎯 NANO BANANA PRO'S UNIQUE CAPABILITIES

### Core Strengths (vs Flux):
1. **Text Rendering** 🎯
   - Accurate, legible text in images
   - Multiple languages with proper typography
   - Posters, mockups, infographics

2. **Real-Time Data** 🔍
   - Google Search integration
   - Current information (weather, trends, stats)
   - Educational content with live data

3. **Multi-Image Composition** 🖼️
   - Up to 14 images in single composition
   - Character consistency across 5 people
   - Lifestyle scenes, product mockups

4. **Professional Creative Controls** 🎬
   - Camera angles, lighting changes
   - Color grading, depth of field
   - Aspect ratio transformations

5. **Educational Excellence** 📚
   - Notes → diagrams
   - Step-by-step infographics
   - Data visualizations

6. **Multilingual Content** 🌍
   - Text in multiple languages
   - Localized marketing materials
   - Visual consistency across languages

---

## 💡 PROPOSED UX DESIGN

### Core Philosophy:
**Workbench = Persistent Creative Studio**  
**Maya Chat = Intelligent Guide & Prompt Architect**

### User Flow:
1. **Workbench always visible** (collapsed in header, expandable)
2. **Maya suggests prompts** → User copies to workbench
3. **User selects images** → Workbench input boxes
4. **User generates** → Nano Banana Pro creates
5. **Result appears** → Can reuse in workbench or chat

---

## 🏗️ ARCHITECTURE DESIGN

### Option A: Collapsible Workbench in Header (RECOMMENDED)
**Pros:**
- Always accessible
- Doesn't take up space when collapsed
- Clear visual indicator when expanded
- Mobile-friendly

**Implementation:**
- Header button: "Workbench" (shows image count: "Workbench (2/3)")
- Click to expand/collapse
- Expanded: Slides down from header, overlays chat
- Collapsed: Just shows count badge

### Option B: Sidebar Workbench
**Pros:**
- Always visible when open
- Doesn't interfere with chat

**Cons:**
- Takes horizontal space
- Mobile challenges
- Less integrated feel

### Option C: Bottom Sheet (Mobile-First)
**Pros:**
- Mobile-optimized
- Easy to dismiss
- Familiar pattern

**Cons:**
- Desktop feels awkward
- Less persistent

**RECOMMENDATION: Option A (Collapsible in Header)**

---

## 📋 DETAILED IMPLEMENTATION PLAN

### Phase 1: Make Workbench Always Visible (Collapsible)

#### 1.1 Add Workbench Toggle to Header
**File:** `components/sselfie/maya-chat-screen.tsx`

**Changes:**
- Add `isWorkbenchExpanded` state
- Add workbench toggle button in header (next to Mode toggle)
- Show image count badge: "Workbench (2/3)" when collapsed
- Button expands/collapses workbench

**Visual Design:**
```
[Header]
[Maya Avatar] [Chat Title] [Mode: Studio Pro] [Workbench (2/3) ▼] [MENU]
```

When expanded:
```
[Header]
[Maya Avatar] [Chat Title] [Mode: Studio Pro] [Workbench (2/3) ▲] [MENU]
[Workbench Content - slides down]
```

#### 1.2 Update Workbench Rendering Logic
**Current:** `workbenchEnabled && studioProMode && !isWorkflowChat`
**New:** `workbenchEnabled && studioProMode && isWorkbenchExpanded`

**Key Changes:**
- Remove `!isWorkflowChat` condition (workbench works WITH chat)
- Add `isWorkbenchExpanded` condition
- Workbench persists across chat messages

#### 1.3 Prevent Old Workflow Triggers
**File:** `components/sselfie/maya-chat-screen.tsx:2650`

**Current Logic:**
```typescript
if (studioProMode) {
  setIsWorkflowChat(true)  // ❌ This hides workbench
  sendMessage('[WORKFLOW_START: ...]')
}
```

**New Logic:**
```typescript
if (studioProMode && isWorkbenchModeEnabled()) {
  // Workbench mode: Don't trigger old workflows
  // Instead: Send prompt suggestion to chat, user copies to workbench
  handleSendMessage(item.prompt)
} else if (studioProMode) {
  // Old Pro mode: Keep workflow behavior
  setIsWorkflowChat(true)
  sendMessage('[WORKFLOW_START: ...]')
}
```

---

### Phase 2: Integrate Maya Chat with Workbench

#### 2.1 Update Maya's System Prompt for Workbench Mode
**File:** `lib/maya/studio-pro-system-prompt.ts`

**New Guidance:**
- When workbench is visible, Maya should suggest **copyable prompts**
- Explain Nano Banana Pro capabilities in context
- Guide users on image selection
- Help enhance prompts for workbench

**Example Maya Response:**
```
Maya: "Perfect! For Nano Banana Pro, here are 3 prompt options:

**Option 1 - Multi-Image Style Transfer:**
"Make character from image 1 in the same style as image 2, maintaining hair color and pose from image 1, applying the lighting and color palette from image 2"

**Option 2 - Detailed Style Description:**
"Transform image 1 to match the aesthetic of image 2: keep the person's appearance from image 1, apply the mood, lighting, and visual style from image 2"

**Option 3 - Precise Control:**
"Use image 1 as the base subject, use image 2 as style reference, maintain facial features and pose from image 1, apply color grading and atmosphere from image 2"

Copy the one you like into your workbench prompt box!"
```

#### 2.2 Add "Copy to Workbench" Action
**New Component:** `components/studio-pro/prompt-suggestion-card.tsx`

**Features:**
- Shows Maya's suggested prompts as copyable cards
- "Copy" button copies prompt to workbench
- "Use in Workbench" button auto-fills prompt box
- Visual feedback when copied

#### 2.3 Sync Workbench State with Chat
**Implementation:**
- Workbench state persists in localStorage
- Chat can reference workbench images
- Maya can suggest which images to use
- Results from workbench appear in chat

---

### Phase 3: Leverage Nano Banana Pro's Full Potential

#### 3.1 Multi-Image Composition Guidance
**Maya's Role:**
- Explain when to use multiple images
- Guide on image selection strategy
- Suggest compositions that leverage 14-image capability

**Example:**
```
Maya: "For this brand scene, you can use:
- Image 1: Your base photo (main subject)
- Image 2: Product shot (will be integrated naturally)
- Image 3: Background reference (optional style guide)

Nano Banana Pro excels at blending up to 14 images, so feel free to add more references!"
```

#### 3.2 Text Rendering Capabilities
**Maya's Role:**
- Proactively suggest text overlay opportunities
- Explain when text rendering is needed
- Guide on text placement and styling

**Example:**
```
Maya: "Want to add text to this? Nano Banana Pro can render accurate, legible text that Flux can't. Just mention what text you want and where!"
```

#### 3.3 Real-Time Data Integration
**Maya's Role:**
- Use web search for current trends
- Pull real-time information for educational content
- Suggest data visualizations

**Example:**
```
Maya: "I can create an infographic with current 2025 Instagram algorithm data. Should I pull the latest stats?"
```

---

## 🎨 USER EXPERIENCE FLOW

### Scenario 1: User Starts Fresh
1. User opens Studio Pro mode
2. Workbench appears collapsed in header: "Workbench (0/3)"
3. User clicks to expand
4. Maya greets: "Hi! I'll help you create with Nano Banana Pro. Select images in the workbench, and I'll suggest prompts!"
5. User selects images → Maya suggests prompts → User copies to workbench → Generates

### Scenario 2: User Clicks Quick Prompt
1. User clicks "Create carousel" quick prompt
2. **NEW:** Maya responds with copyable prompt suggestions (doesn't trigger old workflow)
3. User copies prompt to workbench
4. User selects images in workbench
5. User generates from workbench

### Scenario 3: User Asks Maya for Help
1. User types: "I want to create a brand scene with this product"
2. Maya suggests: "Here's a perfect prompt for Nano Banana Pro: [prompt]"
3. User clicks "Copy to Workbench" on suggestion card
4. Prompt appears in workbench prompt box
5. User selects images and generates

### Scenario 4: User Generates Result
1. Result appears in workbench
2. User can:
   - Click "Use in Box" to reuse in workbench
   - Result also appears in chat as preview
   - Maya can reference it: "Love this result! Want to transform it further?"

---

## 🔧 TECHNICAL IMPLEMENTATION

### Component Structure:
```
maya-chat-screen.tsx
├── Header (always visible)
│   ├── Maya Avatar
│   ├── Chat Title
│   ├── Mode Toggle
│   ├── Workbench Toggle (NEW) ← Collapsible button
│   └── MENU
├── Chat Messages Area
│   └── Prompt Suggestion Cards (NEW) ← Copyable prompts from Maya
└── Workbench (conditionally visible)
    ├── Input Strip (images)
    ├── Prompt Box
    └── Result Card
```

### State Management:
```typescript
// New states needed:
const [isWorkbenchExpanded, setIsWorkbenchExpanded] = useState(false)
const [workbenchImages, setWorkbenchImages] = useState([...])
const [workbenchPrompt, setWorkbenchPrompt] = useState("")

// Persist workbench state:
useEffect(() => {
  localStorage.setItem('workbenchState', JSON.stringify({
    images: workbenchImages,
    prompt: workbenchPrompt,
    expanded: isWorkbenchExpanded
  }))
}, [workbenchImages, workbenchPrompt, isWorkbenchExpanded])
```

### API Integration:
- Workbench generates via `/api/maya/generate-studio-pro` (already works)
- Maya chat suggests prompts (already works)
- Need: Bridge between chat suggestions and workbench prompt box

---

## 🎯 USER GUIDANCE STRATEGY

### Onboarding Flow (First Time):
1. **Welcome Message:** "Welcome to Studio Pro Workbench! This is your creative studio."
2. **Step 1:** "Select 1-4 images from your gallery or upload new ones"
3. **Step 2:** "Ask me for prompt suggestions, or write your own"
4. **Step 3:** "Copy my suggestions to the prompt box, then click Generate"
5. **Step 4:** "Results appear here and in chat - reuse them anytime!"

### Ongoing Guidance:
- **Empty Workbench:** "Select images to get started"
- **Images Selected, No Prompt:** "Ask me for prompt suggestions, or write your own"
- **Prompt Ready:** "Ready to generate! Click Generate when ready"
- **After Generation:** "Result ready! Use it in another box or ask me to transform it"

### Maya's Proactive Suggestions:
- **When user selects images:** "Great selection! For these images, I suggest: [prompt options]"
- **When user types prompt:** "Want me to enhance this for Nano Banana Pro? It excels at [capability]"
- **After generation:** "Love this! Want to try [suggestion leveraging Nano Banana Pro strength]?"

---

## 🚀 LEVERAGING NANO BANANA PRO'S STRENGTHS

### 1. Multi-Image Composition (Up to 14)
**User Education:**
- Maya explains: "You can use up to 14 images! Mix your photos, products, backgrounds, style references"
- Visual indicator: "Using 3/14 images - add more for complex compositions"
- Suggestions: "Add a background reference? Product shot? Style guide?"

### 2. Text Rendering
**User Education:**
- Maya proactively suggests: "Want to add text? Nano Banana Pro renders perfect text!"
- Examples: "Reel covers, story graphics, carousel titles, quote graphics"
- Guidance: "Just tell me what text you want and where"

### 3. Real-Time Data
**User Education:**
- Maya offers: "I can pull current data for infographics, educational content, trends"
- Examples: "2025 Instagram algorithm stats, current fashion trends, weather data"
- Auto-suggest: "Want this as an infographic with current data?"

### 4. Professional Creative Controls
**User Education:**
- Maya explains transformations: "I can change lighting, camera angles, color grading"
- Examples: "Day to night, moody to bright, different perspectives"
- Guidance: "Tell me what transformation you want"

### 5. Educational Content
**User Education:**
- Maya suggests: "Turn this into an educational infographic?"
- Capabilities: "Step-by-step guides, data visualizations, diagrams"
- Examples: "How-to posts, statistics, process explanations"

### 6. Multilingual Content
**User Education:**
- Maya offers: "Need this in another language? Nano Banana Pro handles multilingual text perfectly"
- Examples: "Norwegian captions, Spanish posters, French quotes"
- Guidance: "Just specify the language"

---

## 📐 UI/UX SPECIFICATIONS

### Workbench Toggle Button (Header):
- **Collapsed State:**
  - Text: "Workbench" or icon
  - Badge: Image count "(2/3)"
  - Icon: Chevron down ▼
  - Style: Matches Mode toggle

- **Expanded State:**
  - Same but icon: Chevron up ▲
  - Workbench slides down below header

### Workbench Panel (Expanded):
- **Position:** Fixed below header, above chat input
- **Height:** Max 60vh, scrollable if needed
- **Animation:** Slide down/up (300ms)
- **Z-index:** Above chat messages, below header

### Prompt Suggestion Cards (In Chat):
- **Appearance:** Styled cards matching workbench aesthetic
- **Actions:**
  - "Copy" button → Copies to clipboard
  - "Use in Workbench" button → Auto-fills workbench prompt box
- **Visual:** Shows which Nano Banana Pro capability it leverages

---

## 🔄 STATE MANAGEMENT

### Workbench State (Persistent):
```typescript
interface WorkbenchState {
  images: Array<SelectedImage | null>
  prompt: string
  isExpanded: boolean
  lastGenerated?: {
    imageUrl: string
    prompt: string
    timestamp: number
  }
}
```

### Chat Integration:
- Maya can read workbench state (images selected, prompt written)
- Maya can suggest based on workbench context
- Results from workbench appear in chat
- Chat can trigger workbench actions

---

## ✅ IMPLEMENTATION CHECKLIST

### Phase 1: Always-Visible Workbench
- [ ] Add `isWorkbenchExpanded` state
- [ ] Create workbench toggle button in header
- [ ] Update workbench rendering condition
- [ ] Add collapse/expand animation
- [ ] Persist expanded state in localStorage
- [ ] Show image count badge when collapsed

### Phase 2: Prevent Old Workflow Triggers
- [ ] Update quick prompt click handler
- [ ] Check workbench mode before triggering workflows
- [ ] Route quick prompts to chat suggestions instead
- [ ] Remove `isWorkflowChat` dependency from workbench visibility

### Phase 3: Maya Chat Integration
- [ ] Update Maya system prompt for workbench mode
- [ ] Create prompt suggestion card component
- [ ] Add "Copy to Workbench" functionality
- [ ] Sync workbench state with chat context
- [ ] Show workbench results in chat

### Phase 4: Nano Banana Pro Education
- [ ] Add capability explanations to Maya's responses
- [ ] Proactive suggestions based on capabilities
- [ ] Visual indicators for multi-image usage
- [ ] Guidance on leveraging each strength

### Phase 5: User Onboarding
- [ ] Welcome message for first-time workbench users
- [ ] Step-by-step guidance
- [ ] Tooltips and hints
- [ ] Example prompts

---

## 🎯 SUCCESS METRICS

### User Experience:
- ✅ Workbench always accessible (never disappears)
- ✅ Clear workflow: Chat → Suggestions → Workbench → Generate
- ✅ Users understand Nano Banana Pro capabilities
- ✅ Smooth integration between chat and workbench

### Technical:
- ✅ No old workflow triggers when workbench enabled
- ✅ State persists across chat sessions
- ✅ Mobile-optimized collapsible design
- ✅ Performance: Smooth animations, no lag

---

## 🚨 RISKS & MITIGATION

### Risk 1: Workbench Takes Too Much Space
**Mitigation:** Collapsible design, collapsed by default on mobile

### Risk 2: Users Confused by Two Interfaces
**Mitigation:** Clear visual separation, onboarding, tooltips

### Risk 3: Old Workflows Still Trigger
**Mitigation:** Explicit workbench mode check before workflow triggers

### Risk 4: State Sync Issues
**Mitigation:** Centralized state management, localStorage persistence

---

## 📝 NEXT STEPS

1. **Review this plan** - Confirm approach and priorities
2. **Design mockups** - Visualize collapsible workbench
3. **Implement Phase 1** - Always-visible workbench
4. **Test integration** - Chat + workbench flow
5. **Iterate based on feedback**

---

## 💭 DESIGN DECISIONS

### Why Collapsible in Header?
- Always accessible without taking space
- Clear visual indicator (image count)
- Mobile-friendly
- Familiar pattern (like mobile app drawers)

### Why Chat + Workbench Together?
- Maya guides, workbench executes
- Natural flow: Ask → Get suggestions → Use in workbench
- Leverages both interfaces' strengths
- Users learn Nano Banana Pro capabilities through Maya

### Why Not Replace Chat?
- Chat is valuable for guidance, questions, strategy
- Workbench is for execution
- Together they're more powerful than either alone

---

**END OF PLAN**



