import { generateText } from "ai"

export const FEED_LAYOUT_STRATEGIST_PROMPT = `You're an Instagram Feed Layout Strategist - a visual design expert who creates stunning 9-post grids with Pinterest and influencer-level aesthetics.

## Your Sole Responsibility:
Design the visual layout and arrangement of photo types to create aesthetic harmony and storytelling. You DO NOT write captions, select images, or create prompts - that's handled by other specialists.

## CRITICAL PERSONAL BRAND RULE:
For personal brand feeds, you MUST follow this shot type distribution:
- **80% USER'S FACE**: 7-8 posts featuring the user (selfies, half body, full body with face visible)
- **20% SUPPORTING CONTENT**: 1-2 posts of objects, flatlays, or details (NO face)

This ratio is NON-NEGOTIABLE for personal brand authenticity and engagement.

## Core Design Principles:

**Shot Type Categories:**
- selfie: Close-up face/portrait shot (USER'S FACE)
- half body: Waist-up portrait (USER'S FACE)
- full body: Head-toe shot (USER'S FACE)
- object: Product, flatlay, or detail focus (NO FACE)
- place/scenary: Location without person (NO FACE)
- hobby/others: Activity shot (can include face or not)

**Personal Brand Distribution (9 posts):**
Required: 7-8 posts with user's face visible
- Examples: 3 selfies, 2 half body, 2-3 full body
- Maximum 1-2 posts without face (objects/details)

**Color Palette Strategy:**
Create visual rhythm by strategically alternating:
- Warm tones (beige, tan, gold, peachy)
- Cool tones (gray, blue, slate, silver)
- Neutral tones (white, black, balanced)

Like the best Pinterest boards and Instagram influencers, alternate colors in a checkerboard or flowing pattern.

**Visual Composition Techniques:**
- Rule of thirds: Guide eye movement across grid
- Whitespace: Balance busy and minimal shots
- Scale variety: Mix close-ups with wide shots
- Lighting consistency: Create cohesive aesthetic across all posts
- Color harmony: Ensure posts complement each other visually

**Storytelling Through Layout:**
- Post 1: Face-forward strong hook (selfie or portrait)
- Posts 2-3: Build narrative with varied face shots
- Posts 4-6: Develop story (mostly face shots, maybe 1 object)
- Posts 7-8: Deepen connection with authentic moments
- Post 9: Face-forward memorable closer

## Output Format:

Return ONLY valid JSON with this exact structure:
{
  "overallStrategy": "Grid's visual story and aesthetic goal",
  "gridPattern": "Pattern name",
  "colorFlow": "Color movement across 9 posts",
  "visualRhythm": "How eye travels and visual interest",
  "posts": [
    {
      "position": 1,
      "shotType": "selfie",
      "purpose": "Hook viewers with authentic connection",
      "visualDirection": "warm golden hour lighting, natural smile, cohesive with overall feed aesthetic",
      "warmCool": "warm",
      "compositionStyle": "intimate close-up"
    }
    // ... 8 more posts
  ]
}

Requirements:
- MINIMUM 7 posts with user's face (selfie, half body, or full body)
- MAXIMUM 2 posts without face (objects/details only)
- Cohesive color palette across all 9 posts
- Consistent lighting and aesthetic mood
- Each post serves the grid's visual story`

interface LayoutStrategyParams {
  businessType: string
  brandVibe: string
  targetAudience: string
  niche: string
  colorPalette?: string
  researchInsights?: string
}

export interface PostLayout {
  position: number
  shotType: string
  purpose: string
  visualDirection: string
  strategicNote: string
  warmCool: "warm" | "cool" | "neutral"
  compositionStyle?: string
}

export interface FeedLayoutStrategy {
  overallStrategy: string
  gridPattern: string
  colorFlow: string
  posts: PostLayout[]
  visualRhythm: string
  whitespacePlacement?: string
}

export async function generateFeedLayout(params: LayoutStrategyParams): Promise<FeedLayoutStrategy> {
  const { businessType, brandVibe, targetAudience, niche, colorPalette, researchInsights } = params

  console.log("[v0] Layout Strategist: Designing aesthetic grid for", niche)

  const prompt = `Search the web for current Instagram personal brand feed trends in ${niche} focusing on:
- Face-forward content ratios (research shows personal brands need 70-80% face shots)
- Color consistency and aesthetic cohesion
- Professional influencer grid layouts

Then design a 9-post Instagram grid that follows the 80/20 rule:
- 7-8 posts featuring the user's face (selfies, half body, full body)
- 1-2 posts of objects/details/flatlays (maximum)

**Brand Context:**
Business Type: ${businessType}
Brand Vibe: ${brandVibe}
Target Audience: ${targetAudience}
Niche: ${niche}
${colorPalette ? `Color Palette: ${colorPalette}` : ""}

${researchInsights ? `**Market Intelligence:**\n${researchInsights}` : ""}

CRITICAL REQUIREMENTS:
1. MINIMUM 7 face shots out of 9 posts (selfie, half body, or full body with face visible)
2. MAXIMUM 2 non-face posts (objects/flatlays)
3. Cohesive color palette - all posts should complement each other
4. Consistent lighting mood across the entire feed
5. Warm/cool tone alternation for visual rhythm

Create a grid where someone scrolling sees mostly the user's authentic face building personal connection.

Return ONLY valid JSON. No markdown.`

  const { text } = await generateText({
    model: "anthropic/claude-sonnet-4.5",
    system: FEED_LAYOUT_STRATEGIST_PROMPT,
    prompt,
    temperature: 0.75,
  })

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("No JSON found in response")
    }

    const strategy = JSON.parse(jsonMatch[0]) as FeedLayoutStrategy

    const faceShots = strategy.posts.filter(
      (p) => p.shotType === "selfie" || p.shotType === "half body" || p.shotType === "full body",
    ).length

    if (faceShots < 7) {
      console.warn(`[v0] Layout Strategist: Only ${faceShots} face shots - enforcing 80/20 rule`)
      return createPersonalBrandStrategy()
    }

    console.log("[v0] Layout Strategist: Grid designed with", strategy.gridPattern, "pattern")
    console.log(`[v0] Layout Strategist: ${faceShots} face shots, ${9 - faceShots} object shots`)

    return strategy
  } catch (error) {
    console.error("[v0] Layout Strategist: Failed to parse strategy:", error)
    return createPersonalBrandStrategy()
  }
}

function createPersonalBrandStrategy(): FeedLayoutStrategy {
  const posts: PostLayout[] = [
    {
      position: 1,
      shotType: "selfie",
      purpose: "Hook with authentic personal connection",
      visualDirection: "warm golden hour lighting, natural smile, professional yet approachable",
      strategicNote: "Face-first opener - strongest engagement",
      warmCool: "warm",
      compositionStyle: "close-up portrait, rule of thirds",
    },
    {
      position: 2,
      shotType: "object",
      purpose: "Show lifestyle detail or product",
      visualDirection: "flatlay overhead, cohesive with feed colors, warm beige tones",
      strategicNote: "Single object post for visual variety",
      warmCool: "warm",
      compositionStyle: "flat lay, centered",
    },
    {
      position: 3,
      shotType: "full body",
      purpose: "Display confidence and personal style",
      visualDirection: "natural setting, warm golden light, head to toe with face visible",
      strategicNote: "Full presence shot maintaining face connection",
      warmCool: "warm",
      compositionStyle: "vertical full frame",
    },
    {
      position: 4,
      shotType: "selfie",
      purpose: "Build deeper authentic connection",
      visualDirection: "soft window light, genuine expression, warm peachy tones",
      strategicNote: "Mid-grid face shot for continued engagement",
      warmCool: "warm",
      compositionStyle: "intimate close-up",
    },
    {
      position: 5,
      shotType: "half body",
      purpose: "Show personality and approachability",
      visualDirection: "waist-up, natural candid moment, warm golden hour",
      strategicNote: "Center position - key engagement spot",
      warmCool: "warm",
      compositionStyle: "waist-up portrait",
    },
    {
      position: 6,
      shotType: "full body",
      purpose: "Demonstrate lifestyle and environment",
      visualDirection: "outdoor or home setting, natural light, warm tones",
      strategicNote: "Face visible in lifestyle context",
      warmCool: "warm",
      compositionStyle: "environmental portrait",
    },
    {
      position: 7,
      shotType: "selfie",
      purpose: "Maintain personal connection",
      visualDirection: "soft lighting, authentic smile, warm golden tones",
      strategicNote: "Face-forward trust building",
      warmCool: "warm",
      compositionStyle: "close portrait",
    },
    {
      position: 8,
      shotType: "half body",
      purpose: "Show authentic personality",
      visualDirection: "natural candid, warm peachy light, genuine moment",
      strategicNote: "Waist-up face shot for connection",
      warmCool: "warm",
      compositionStyle: "relaxed portrait",
    },
    {
      position: 9,
      shotType: "full body",
      purpose: "Leave them inspired and wanting more",
      visualDirection: "confident pose, warm golden hour, face visible",
      strategicNote: "Strong face-forward closer",
      warmCool: "warm",
      compositionStyle: "empowered full frame",
    },
  ]

  return {
    overallStrategy:
      "Personal brand feed with 8 face shots and 1 object for 80/20 authenticity ratio, cohesive warm golden color palette",
    gridPattern: "Face-Forward Personal Brand Flow",
    colorFlow: "Consistently warm golden and peachy tones creating cohesive aesthetic - professional influencer feed",
    visualRhythm: "Face → object → face → face → face → face → face → face → face flow maintaining personal connection",
    whitespacePlacement: "Position 2 (object) creates single breathing moment in predominantly face-forward grid",
    posts,
  }
}
