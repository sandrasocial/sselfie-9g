# Single Scene Extraction Layout

**Purpose:** Document how individual scenes (positions 1-9) are extracted from blueprint templates for single image generation.

**File:** `lib/feed-planner/build-single-image-prompt.ts`

---

## TEMPLATE STRUCTURE

Each blueprint template follows this structure:

```
[Grid Instructions] (only used for free mode)

Vibe: [Vibe description]

Setting: [Setting description]

Outfits: {{COLOR_PALETTE}} {{TEXTURE_NOTES}}

9 frames:
1. [Frame 1 description]
2. [Frame 2 description]
3. [Frame 3 description]
4. [Frame 4 description]
5. [Frame 5 description]
6. [Frame 6 description]
7. [Frame 7 description]
8. [Frame 8 description]
9. [Frame 9 description]

Color grade: [Color grading instructions]
```

---

## EXTRACTION PROCESS

### Step 1: Parse Template Sections

The `parseTemplateFrames()` function extracts:

1. **Vibe** - Everything after "Vibe:" until next section
2. **Setting** - Everything after "Setting:" until next section
3. **Frames** - Everything between "9 frames:" and "Color grade:"
4. **Color Grade** - Everything after "Color grade:"

**Regex Patterns:**
- Vibe: `/Vibe:\s*([^\n]+(?:\n(?!Setting:|Outfits:|9 frames:)[^\n]+)*)/i`
- Setting: `/Setting:\s*([^\n]+(?:\n(?!Outfits:|9 frames:|Color grade:)[^\n]+)*)/i`
- Frames: `/9 frames:([\s\S]+?)(?=Color grade:|$)/i`
- Color Grade: `/Color grade:\s*([^\n`]+)/i`

### Step 2: Extract Individual Frames

Each frame is parsed from the "9 frames:" section using pattern:
- Pattern: `/^(\d+)\.\s*(.+)$/i`
- Example: `"1. Standing in {{LOCATION_INDOOR_1}} - {{OUTFIT_FULLBODY_1}}, hand in pocket, {{LIGHTING_BRIGHT}}"`

**Result:** Array of `{ position: number, description: string }` objects

---

## FRAME POSITION MAPPING

### Standard Layout (9-Post Grid)

| Position | Frame Type | Typical Content | Example |
|----------|-----------|----------------|---------|
| **1** | Full Body | Opening shot, user visible | "Standing in {{LOCATION_INDOOR_1}} - {{OUTFIT_FULLBODY_1}}, hand in pocket" |
| **2** | Flatlay | Lifestyle/object shot | "Latte and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_2}} - overhead flatlay" |
| **3** | Full Body | User in environment | "Full-body in {{LOCATION_ARCHITECTURAL_1}} - {{OUTFIT_FULLBODY_2}}" |
| **4** | Close-up | Accessory detail | "Close-up of {{ACCESSORY_CLOSEUP_1}} - minimal styling, soft focus" |
| **5** | Object/Text | Sign or text element | "Minimalist sign reading 'RELAX' on {{LOCATION_ARCHITECTURAL_1}}" |
| **6** | Mid Shot | Texture/fabric detail | "{{OUTFIT_MIDSHOT_1}} fabric texture - extreme close-up" |
| **7** | Full Body | Movement/action | "Walking in {{LOCATION_INDOOR_3}} - {{OUTFIT_FULLBODY_3}}, natural stride" |
| **8** | Flatlay/Object | Workspace/lifestyle | "{{LOCATION_INDOOR_2}} with laptop and coffee - overhead view" |
| **9** | Full Body | Closing shot, mirror selfie | "Mirror selfie - {{OUTFIT_FULLBODY_4}}, phone in hand" |

---

## FRAME TYPE DETECTION

The `detectFrameType()` function identifies frame type from description:

### Detection Logic:

1. **Flatlay** - Contains: `"flatlay"`, `"overhead"`, `"overhead view"`, `"overhead flatlay"`
2. **Close-up** - Contains: `"close-up"`, `"closeup"`, `"close up"`, `"close-up of"`, `"extreme close"`
3. **Full Body** - Contains: `"full-body"`, `"fullbody"`, `"full body"`
4. **Mid Shot** - Default (everything else)

### Example Detections:

```typescript
"Standing in location - outfit, hand in pocket" 
→ detectFrameType() → 'midshot' (default)

"Latte and accessories on location - overhead flatlay" 
→ detectFrameType() → 'flatlay'

"Close-up of accessory - minimal styling" 
→ detectFrameType() → 'closeup'

"Full-body in location - outfit, dynamic pose" 
→ detectFrameType() → 'fullbody'
```

---

## FRAME DESCRIPTION CLEANING

The `cleanFrameDescription()` function cleans descriptions based on frame type:

### Flatlay Cleaning:

**Removes:**
- Full location descriptions with ambient details
- Sentences with "ambient", "atmosphere", "furniture", "fixtures"
- Location context like "lobby", "room", "space", "interior"

**Keeps:**
- Items being displayed
- Surface/material description (marble, wood, concrete, etc.)
- Lighting
- Camera angle

**Example:**
```
Input:  "Coffee and accessories on Luxurious hotel lobby with floor-to-ceiling dark marble walls and geometric patterns. Ambient lighting from modern fixtures creates moody atmosphere."

Output: "Coffee and accessories on dark marble surface"
```

### Close-up Cleaning:

**Removes:**
- Location descriptions (after "on", "in", "at")
- Full sentences with location/ambient details
- Location context words

**Keeps:**
- Accessory/outfit detail
- Minimal context
- Lighting

**Example:**
```
Input:  "Close-up accessory on Luxurious hotel lobby with floor-to-ceiling dark marble walls"

Output: "Close-up accessory"
```

### Full Body / Mid Shot:

**No cleaning** - Full location descriptions are appropriate and kept as-is.

---

## FINAL PROMPT ASSEMBLY

The `buildSingleImagePrompt()` function assembles the final prompt:

### Structure (in order):

1. **Base Identity Prompt** (ALWAYS FIRST)
   ```
   "Use the uploaded photos as strict identity reference. Influencer/pinterest style of a woman maintaining exactly the same physical characteristics (face, body, skin tone, hair) as the reference images."
   ```

2. **Vibe Context** (if available)
   ```
   "with [vibe description] aesthetic"
   ```

3. **Setting Context** (if available)
   ```
   "in [setting description]"
   ```

4. **Frame Description** (cleaned based on frame type)
   ```
   "[cleaned frame description]"
   ```

5. **Color Grade** (if available)
   ```
   "with [color grade description] color palette"
   ```

### Example Final Prompt:

**Input Template:**
```
Vibe: Bright luxury minimalist aesthetic. White and cream tailored pieces with airy elegance.

Setting: Bright white penthouse interiors, luxury hotel lobbies with natural light

9 frames:
1. Standing in {{LOCATION_INDOOR_1}} - {{OUTFIT_FULLBODY_1}}, hand in pocket, {{LIGHTING_BRIGHT}}

Color grade: Bright whites, soft creams, warm beiges, gentle shadows
```

**After Placeholder Injection:**
```
Vibe: Bright luxury minimalist aesthetic. White and cream tailored pieces with airy elegance.

Setting: Bright white penthouse interiors, luxury hotel lobbies with natural light

9 frames:
1. Standing in Bright white penthouse living room with floor-to-ceiling windows - A confident woman wearing white tailored blazer, white blouse, cream trousers, nude pumps, hand in pocket, bright natural daylight

Color grade: Bright whites, soft creams, warm beiges, gentle shadows
```

**Extracted for Position 1:**
```
Use the uploaded photos as strict identity reference. Influencer/pinterest style of a woman maintaining exactly the same physical characteristics (face, body, skin tone, hair) as the reference images. with Bright luxury minimalist aesthetic. White and cream tailored pieces with airy elegance. aesthetic in Bright white penthouse interiors, luxury hotel lobbies with natural light Standing in Bright white penthouse living room with floor-to-ceiling windows - A confident woman wearing white tailored blazer, white blouse, cream trousers, nude pumps, hand in pocket, bright natural daylight with Bright whites, soft creams, warm beiges, gentle shadows color palette
```

---

## POSITION-SPECIFIC EXTRACTION

### How Position is Used:

1. **Template is parsed** → Extracts all 9 frames into array
2. **Position requested** → Finds frame with matching position number
3. **Frame found** → Detects frame type and cleans description
4. **Final assembly** → Combines base identity + vibe + setting + cleaned frame + color grade

### Code Flow:

```typescript
// 1. Parse template
const { frames, vibe, setting, colorGrade } = parseTemplateFrames(templatePrompt)

// 2. Find frame for position
const frame = frames.find(f => f.position === position)

// 3. Detect and clean
const frameType = detectFrameType(frame.description)
const cleanedFrameDescription = cleanFrameDescription(frame.description, frameType)

// 4. Assemble final prompt
const promptParts = [
  BASE_IDENTITY_PROMPT,
  `with ${vibe} aesthetic`,
  `in ${setting}`,
  cleanedFrameDescription,
  `with ${colorGrade} color palette`
]

return promptParts.join(' ').trim()
```

---

## EXAMPLE: ALL 9 POSITIONS

### Template (luxury_light_minimalistic):

```
9 frames:
1. Standing in {{LOCATION_INDOOR_1}} - {{OUTFIT_FULLBODY_1}}, hand in pocket, {{LIGHTING_BRIGHT}}
2. Latte and {{ACCESSORY_FLATLAY_1}} on {{LOCATION_INDOOR_2}} - overhead flatlay, {{LIGHTING_BRIGHT}}
3. Full-body in {{LOCATION_ARCHITECTURAL_1}} - {{OUTFIT_FULLBODY_2}}, architectural white background
4. Close-up of {{ACCESSORY_CLOSEUP_1}} - minimal styling, soft focus
5. Minimalist sign reading "RELAX" in elegant thin serif on {{LOCATION_ARCHITECTURAL_1}}, {{LIGHTING_BRIGHT}}
6. {{OUTFIT_MIDSHOT_1}} fabric texture - extreme close-up, luxurious material detail
7. Walking in {{LOCATION_INDOOR_3}} - {{OUTFIT_FULLBODY_3}}, natural stride, soft shadows
8. {{LOCATION_INDOOR_2}} with laptop and coffee - overhead view, minimal workspace, {{LIGHTING_BRIGHT}}
9. Mirror selfie - {{OUTFIT_FULLBODY_4}}, phone in hand, {{LOCATION_INDOOR_1}}
```

### Extraction Results:

**Position 1:**
- Type: `midshot` (default)
- Description: `"Standing in Bright white penthouse living room - A confident woman wearing white tailored blazer, hand in pocket, bright natural daylight"`
- Cleaning: None (full body/midshot keep full descriptions)

**Position 2:**
- Type: `flatlay`
- Description: `"Latte and Minimal gold jewelry on Bright white penthouse kitchen - overhead flatlay, bright natural daylight"`
- Cleaning: Removes location details → `"Latte and Minimal gold jewelry on white surface - overhead flatlay, bright natural daylight"`

**Position 3:**
- Type: `fullbody`
- Description: `"Full-body in Modern white architectural building - A confident woman wearing white blazer, architectural white background"`
- Cleaning: None (full body keeps full descriptions)

**Position 4:**
- Type: `closeup`
- Description: `"Close-up of Minimal gold jewelry - minimal styling, soft focus"`
- Cleaning: Removes location context → `"Close-up of Minimal gold jewelry - minimal styling, soft focus"`

**Position 5:**
- Type: `midshot` (default)
- Description: `"Minimalist sign reading 'RELAX' in elegant thin serif on Modern white architectural building, bright natural daylight"`
- Cleaning: None (object/text shots keep full descriptions)

**Position 6:**
- Type: `closeup` (contains "extreme close-up")
- Description: `"White tailored blazer fabric texture - extreme close-up, luxurious material detail"`
- Cleaning: None (texture shots keep full descriptions)

**Position 7:**
- Type: `fullbody`
- Description: `"Walking in Bright white penthouse bedroom - A confident woman wearing white dress, natural stride, soft shadows"`
- Cleaning: None (full body keeps full descriptions)

**Position 8:**
- Type: `flatlay` (contains "overhead view")
- Description: `"Bright white penthouse kitchen with laptop and coffee - overhead view, minimal workspace, bright natural daylight"`
- Cleaning: Removes location details → `"Laptop and coffee on white surface - overhead view, minimal workspace, bright natural daylight"`

**Position 9:**
- Type: `midshot` (default)
- Description: `"Mirror selfie - A confident woman wearing white blazer, phone in hand, Bright white penthouse bathroom"`
- Cleaning: None (selfie shots keep full descriptions)

---

## KEY FUNCTIONS

### `parseTemplateFrames(templatePrompt: string)`

**Purpose:** Extract all sections from template

**Returns:**
```typescript
{
  frames: Array<{ position: number; description: string }>,
  vibe: string,
  setting: string,
  colorGrade: string
}
```

### `detectFrameType(description: string)`

**Purpose:** Identify frame type for cleaning logic

**Returns:** `'flatlay' | 'closeup' | 'fullbody' | 'midshot'`

### `cleanFrameDescription(description: string, frameType: FrameType)`

**Purpose:** Clean frame description based on type

**Returns:** Cleaned description string

### `buildSingleImagePrompt(templatePrompt: string, position: number)`

**Purpose:** Extract and assemble complete prompt for single image generation

**Returns:** Complete NanoBanana prompt string

**Throws:** Error if position not found (1-9) or frame missing

---

## VALIDATION

The `validateTemplate()` function checks:

- ✅ Has "9 frames:" section
- ✅ Has "Vibe:" section
- ✅ Has "Setting:" section
- ✅ Has "Color grade:" section
- ✅ Has exactly 9 frames (positions 1-9)

**Returns:**
```typescript
{
  isValid: boolean,
  hasFrames: boolean,
  hasVibe: boolean,
  hasSetting: boolean,
  hasColorGrade: boolean,
  frameCount: number,
  missingSections: string[]
}
```

---

## SUMMARY

**Single Scene Extraction Process:**

1. **Parse** template into sections (vibe, setting, frames, color grade)
2. **Find** frame matching requested position (1-9)
3. **Detect** frame type (flatlay, closeup, fullbody, midshot)
4. **Clean** frame description based on type (removes location details for flatlay/closeup)
5. **Assemble** final prompt: Base identity + Vibe + Setting + Cleaned frame + Color grade

**Key Points:**
- Each position (1-9) maps to one frame in the template
- Frame descriptions are cleaned differently based on type
- Final prompt always starts with base identity prompt
- All context (vibe, setting, color grade) is included in final prompt

---

**Document Created:** 2025-01-11  
**Status:** Documentation Only (No Implementation Changes)
