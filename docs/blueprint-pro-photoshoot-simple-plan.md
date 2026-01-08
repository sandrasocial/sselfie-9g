# Blueprint Pro Photoshoot - Simple Implementation Plan

**Goal:** Replace FLUX generation with Pro Photoshoot 3x3 grid using selfie uploads and vibe templates.

---

## What We Need (3 Things)

### 1. Endpoint
**Use existing:** `/api/maya/pro/photoshoot/generate-grid`

**OR create simple wrapper:** `/api/blueprint/generate-grid`

**Input:**
```typescript
{
  prompt: string,           // From template library
  selfieImages: string[],   // 1-3 selfie URLs (uploaded to Blob)
  vibe: "luxury" | "minimal" | "beige"
}
```

**Output:**
```typescript
{
  predictionId: string,
  status: "starting"
}
```

---

### 2. Upload Module
**File:** `components/blueprint/blueprint-selfie-upload.tsx`

**Functionality:**
- Upload 1-3 selfies to Vercel Blob
- Return array of image URLs
- Show preview of uploaded images

**Flow:**
```
User selects 1-3 selfies
  ↓
Upload to Vercel Blob (via /api/upload or direct)
  ↓
Store URLs in state: selfieImages: string[]
```

---

### 3. Template Library
**File:** `lib/maya/blueprint-photoshoot-templates.ts`

**Structure:**
```typescript
export const BLUEPRINT_PHOTOSHOOT_TEMPLATES = {
  luxury: `Create a 3x3 grid showcasing 9 distinct photographic angles... [full prompt]`,
  minimal: `Create a 3x3 grid showcasing 9 distinct photographic angles... [full prompt]`,
  beige: `Create a 3x3 grid showcasing 9 distinct photographic angles... [full prompt]`
}
```

**Each template includes:**
- Base Pro Photoshoot requirements (3x3 grid, consistency)
- Vibe-specific styling (dark & moody, light & minimal, beige aesthetic)
- Location, outfit, color grade matching the vibe

---

## Implementation Steps

### Step 1: Create Template Library

**File:** `lib/maya/blueprint-photoshoot-templates.ts`

```typescript
export const BLUEPRINT_PHOTOSHOOT_TEMPLATES = {
  luxury: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference selfies. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.

Setting: Luxury Manhattan penthouse with dark marble floors, long black cashmere coat over black turtleneck bodysuit with high-waisted tailored black trousers, black pointed-toe heels, oversized sunglasses, gold statement jewelry, moody evening interior lighting with dramatic shadows.

Angles include:
- Close-up portrait with dramatic side lighting
- Full body walking through marble hallway
- Side profile adjusting sunglasses by window
- Over-shoulder gazing at city skyline
- Waist-up leaning against dark wall
- Environmental portrait with luxe interior backdrop
- Candid confident expression with neutral look
- Dynamic walking shot in dramatic lighting
- Elevated staircase perspective looking down

Color grade: Dark and moody cinematic aesthetic with deep blacks, rich charcoal grays, dramatic high-contrast shadows, mysterious low-key lighting, desaturated with selective warm skin tones, luxury noir Instagram vibe with bold dramatic presence.`,

  minimal: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference selfies. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.

Setting: Scandinavian minimalist apartment with white walls and natural wood floors, oversized beige cashmere sweater, white linen trousers, minimal white sneakers, delicate gold jewelry, bright natural morning light through large windows.

Angles include:
- Close-up portrait against white wall with soft natural light
- Full body standing in minimalist living space
- Side profile by large window with natural light
- Over-shoulder viewing minimalist interior
- Waist-up sitting on light wood chair
- Environmental portrait with clean white backdrop
- Candid relaxed moment with soft smile
- Dynamic movement in bright natural space
- Elevated view from above showing minimalist layout

Color grade: Clean Scandinavian aesthetic with bright whites, soft beige and cream neutrals, natural skin tones, airy and fresh lighting, minimal contrast, clean fresh Instagram style with natural brightness.`,

  beige: `Create a 3x3 grid showcasing 9 distinct photographic angles of the subject from the reference selfies. Each frame captures a different perspective while maintaining absolute continuity in identity, styling, and environment. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image. Maintain a strict perfect facial and body consistency.

Setting: Warm beige-toned cafe with terracotta accents, camel-colored oversized blazer over cream silk blouse, beige wide-leg trousers, tan leather loafers, gold minimalist jewelry, warm afternoon light with soft shadows.

Angles include:
- Close-up portrait with warm beige background
- Full body in cozy cafe setting
- Side profile with natural warm lighting
- Over-shoulder viewing cafe scene
- Waist-up at beige-toned table
- Environmental portrait with warm terracotta backdrop
- Candid moment with soft natural expression
- Dynamic movement in warm-toned space
- Elevated view showing beige aesthetic layout

Color grade: Warm beige aesthetic with soft greige tones, camel and terracotta accents, warm skin tones, soft natural lighting, muted desaturated palette, sophisticated neutral Instagram vibe with cozy warmth.`
}

export function getBlueprintPhotoshootPrompt(vibe: "luxury" | "minimal" | "beige"): string {
  return BLUEPRINT_PHOTOSHOOT_TEMPLATES[vibe] || BLUEPRINT_PHOTOSHOOT_TEMPLATES.minimal
}
```

---

### Step 2: Create Upload Module

**File:** `components/blueprint/blueprint-selfie-upload.tsx`

```typescript
"use client"

import { useState } from "react"
import { Upload, X } from "lucide-react"

interface BlueprintSelfieUploadProps {
  onUploadComplete: (imageUrls: string[]) => void
  maxImages?: number
}

export function BlueprintSelfieUpload({ 
  onUploadComplete, 
  maxImages = 3 
}: BlueprintSelfieUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Limit to maxImages
    const filesToUpload = files.slice(0, maxImages - uploadedImages.length)
    
    setUploading(true)
    
    try {
      const formData = new FormData()
      filesToUpload.forEach(file => {
        formData.append('files', file)
      })

      const response = await fetch('/api/blueprint/upload-selfies', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      
      if (data.imageUrls) {
        const newUrls = [...uploadedImages, ...data.imageUrls]
        setUploadedImages(newUrls)
        onUploadComplete(newUrls)
      }
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index)
    setUploadedImages(newImages)
    onUploadComplete(newImages)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {uploadedImages.map((url, index) => (
          <div key={index} className="relative aspect-square">
            <img src={url} alt={`Selfie ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
            <button
              onClick={() => removeImage(index)}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
            >
              <X size={16} />
            </button>
          </div>
        ))}
        
        {uploadedImages.length < maxImages && (
          <label className="aspect-square border-2 border-dashed border-stone-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-stone-400">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <div className="text-center">
              <Upload size={24} className="mx-auto mb-2 text-stone-400" />
              <p className="text-xs text-stone-500">Upload</p>
            </div>
          </label>
        )}
      </div>
      
      {uploading && <p className="text-sm text-stone-500">Uploading...</p>}
    </div>
  )
}
```

**Upload Endpoint:** `app/api/blueprint/upload-selfies/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll('files') as File[]
    
    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    const imageUrls: string[] = []
    
    for (const file of files) {
      const blob = await put(
        `blueprint-selfies/${Date.now()}-${file.name}`,
        file,
        {
          access: "public",
          contentType: file.type,
          addRandomSuffix: true
        }
      )
      imageUrls.push(blob.url)
    }

    return NextResponse.json({ imageUrls })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    )
  }
}
```

---

### Step 3: Use Existing Endpoint (or Simple Wrapper)

**Option A: Use Existing Endpoint Directly**

**File:** `components/blueprint/blueprint-concept-card.tsx`

```typescript
const handleGenerate = async () => {
  if (selfieImages.length === 0) {
    setError("Please upload 1-3 selfies first")
    return
  }

  setIsGenerating(true)
  
  // Get prompt from template library
  const prompt = getBlueprintPhotoshootPrompt(selectedFeedStyle as "luxury" | "minimal" | "beige")
  
  // Call existing Pro Photoshoot endpoint
  const response = await fetch("/api/maya/pro/photoshoot/generate-grid", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      originalImageId: null,  // Not needed for Blueprint
      gridNumber: 1,
      sessionId: null,  // Not needed for single grid
      customPromptData: {
        mayaGeneratedPrompt: prompt  // Use template prompt
      },
      avatarImages: selfieImages  // 1-3 selfie URLs
    })
  })
  
  // ... rest of polling logic
}
```

**Option B: Create Simple Wrapper**

**File:** `app/api/blueprint/generate-grid/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"
import { generateWithNanoBanana } from "@/lib/nano-banana-client"
import { getBlueprintPhotoshootPrompt } from "@/lib/maya/blueprint-photoshoot-templates"

export async function POST(req: NextRequest) {
  try {
    const { selfieImages, vibe } = await req.json()
    
    if (!selfieImages || selfieImages.length === 0) {
      return NextResponse.json({ error: "Selfie images required" }, { status: 400 })
    }
    
    if (!vibe || !["luxury", "minimal", "beige"].includes(vibe)) {
      return NextResponse.json({ error: "Valid vibe required" }, { status: 400 })
    }
    
    // Get prompt from template
    const prompt = getBlueprintPhotoshootPrompt(vibe)
    
    // Generate grid
    const result = await generateWithNanoBanana({
      prompt,
      image_input: selfieImages,
      aspect_ratio: "1:1",
      resolution: "2K",  // Free tier
      output_format: "png",
      safety_filter_level: "block_only_high"
    })
    
    return NextResponse.json({
      predictionId: result.predictionId,
      status: result.status
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    )
  }
}
```

---

### Step 4: Update Concept Card

**File:** `components/blueprint/blueprint-concept-card.tsx`

**Changes:**
1. Add `selfieImages` prop
2. Add `selectedFeedStyle` prop
3. Replace FLUX generation with Pro Photoshoot
4. Update polling to use `/api/blueprint/check-grid` (or existing check-grid)
5. Display 3x3 grid instead of single image

---

### Step 5: Add Selfie Upload to Blueprint Page

**File:** `app/blueprint/page.tsx`

**Changes:**
1. Add `selfieImages` state
2. Add selfie upload step (before concept generation)
3. Pass `selfieImages` and `selectedFeedStyle` to concept cards

---

## File Summary

**New Files:**
1. `lib/maya/blueprint-photoshoot-templates.ts` - Prompt templates
2. `components/blueprint/blueprint-selfie-upload.tsx` - Upload component
3. `app/api/blueprint/upload-selfies/route.ts` - Upload endpoint
4. `app/api/blueprint/generate-grid/route.ts` - Simple wrapper (optional)

**Modified Files:**
1. `components/blueprint/blueprint-concept-card.tsx` - Use Pro Photoshoot
2. `app/blueprint/page.tsx` - Add selfie upload step

**Reuse:**
- `lib/nano-banana-client.ts` - Already exists
- `app/api/maya/pro/photoshoot/check-grid/route.ts` - For polling (or create simple version)

---

## That's It

**3 Core Components:**
1. ✅ **Endpoint** - Use existing or simple wrapper
2. ✅ **Upload Module** - Upload selfies to Blob, get URLs
3. ✅ **Template Library** - Pre-written prompts for each vibe

**No need for:**
- ❌ Session management
- ❌ Complex prompt generation
- ❌ Carousel creation
- ❌ Multiple grids
- ❌ Admin requirements

**Simple flow:**
```
Upload selfies → Get URLs → Select vibe → Generate grid → Display 3x3 grid
```

---

**End of Simple Plan**
