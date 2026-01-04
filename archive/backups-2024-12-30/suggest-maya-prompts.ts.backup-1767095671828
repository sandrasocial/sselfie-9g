/**
 * Suggest Maya Prompts Tool
 * Generates creative Maya prompt ideas for SSELFIE Studio users
 */

import type { Tool, ToolResult } from '../../types'
import { sql, Anthropic, ALEX_CONSTANTS } from '../../shared/dependencies'

interface SuggestMayaPromptsInput {
  category: 'fashion' | 'lifestyle' | 'seasonal' | 'editorial' | 'brand' | 'wellness'
  season?: 'spring' | 'summer' | 'fall' | 'winter' | 'holiday' | 'year-round'
  style?: 'luxury' | 'casual' | 'editorial' | 'minimalist' | 'bold' | 'cozy'
  count?: number
  specificTheme?: string
}

export const suggestMayaPromptsTool: Tool<SuggestMayaPromptsInput> = {
  name: "suggest_maya_prompts",
  description: `Generate creative Maya prompt ideas for SSELFIE Studio users.

Creates sophisticated, trend-aware prompts that users can use in Maya to generate stunning photos.

Use this when Sandra:
- Wants new prompt ideas for seasonal content
- Asks for trending photography styles
- Needs prompts for specific occasions (holidays, seasons, events)
- Wants to expand the prompt library
- Plans new Maya features or categories

The tool saves prompts to the library for easy access and can be shared with users.`,

  input_schema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        enum: ["fashion", "lifestyle", "seasonal", "editorial", "brand", "wellness"],
        description: "Main category for the prompts"
      },
      season: {
        type: "string",
        enum: ["spring", "summer", "fall", "winter", "holiday", "year-round"],
        description: "Season or time period (default: year-round)"
      },
      style: {
        type: "string",
        enum: ["luxury", "casual", "editorial", "minimalist", "bold", "cozy"],
        description: "Photography style aesthetic"
      },
      count: {
        type: "number",
        description: "Number of prompt ideas to generate (1-10, default: 5)"
      },
      specificTheme: {
        type: "string",
        description: "Specific theme or occasion (e.g., 'Valentine's Day', 'Morning routines', 'Coffee shop vibes')"
      }
    },
    required: ["category"]
  },

  async execute({ 
    category,
    season = "year-round",
    style = "luxury",
    count = 5,
    specificTheme
  }: SuggestMayaPromptsInput): Promise<ToolResult> {
    try {
      console.log('[Alex] ✨ Creating Maya prompts:', { category, season, style, count })

      const promptGenerationPrompt = `Generate ${count} professional photography prompts for SSELFIE Studio's Maya AI.

**Category:** ${category}
**Season:** ${season}
**Style:** ${style}
${specificTheme ? `**Theme:** ${specificTheme}` : ''}

**Prompt Guidelines:**
- Professional, sophisticated photography language
- Specific lighting, setting, and mood details
- Fashion/outfit descriptions when relevant
- Natural, achievable poses and expressions
- Instagram-worthy, editorial quality aesthetic
- Stone color palette (warm neutrals, elegant tones)
- Scandinavian/Vogue-inspired aesthetics
- Focus on women entrepreneurs, personal branding

**Good Prompt Example:**
"Woman in modern home office, soft morning light through sheer curtains, wearing cream cashmere sweater, working on laptop with coffee, warm neutral tones, professional yet approachable, natural confident expression, editorial lifestyle photography"

**Bad Prompt Example:**
"Woman at desk, 8K, ultra realistic, perfect" (too generic, no detail)

**For each prompt, provide:**
1. Title: Short descriptive name (3-6 words)
2. Prompt: Full detailed prompt text (40-80 words)
3. Use Case: When/why to use this prompt
4. Mood: 1-2 word mood descriptor
5. Tags: 3-5 searchable tags

**Format as JSON array:**
[
  {
    "title": "Cozy Morning Workspace",
    "prompt": "[Full detailed prompt text]",
    "useCase": "For lifestyle content showing productive morning routines",
    "mood": "Warm, Focused",
    "tags": ["morning", "workspace", "cozy", "productivity", "lifestyle"]
  },
  ...
]

Generate ${count} prompts. Return ONLY the JSON array, nothing else.`

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY!
      })

      const response = await anthropic.messages.create({
        model: ALEX_CONSTANTS.MODEL,
        max_tokens: 2500,
        messages: [{
          role: 'user',
          content: promptGenerationPrompt
        }]
      })

      const promptsText = response.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n')

      // Extract JSON from response
      const jsonMatch = promptsText.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('Failed to generate valid prompts format')
      }

      const generatedPrompts = JSON.parse(jsonMatch[0])

      // Save each prompt to database (with duplicate prevention)
      const savedPrompts = []

      for (const prompt of generatedPrompts) {
        // Check for duplicates
        const existing = await sql`
          SELECT id FROM maya_prompt_suggestions
          WHERE prompt_text = ${prompt.prompt}
            AND created_at > NOW() - INTERVAL '5 minutes'
          LIMIT 1
        `
        
        if (existing.length === 0) {
          // Only save if no duplicate found
          const saved = await sql`
            INSERT INTO maya_prompt_suggestions (
              prompt_title, prompt_text, category, season, style,
              mood, tags, use_case, created_by, created_at
            ) VALUES (
              ${prompt.title},
              ${prompt.prompt},
              ${category},
              ${season},
              ${style},
              ${prompt.mood},
              ${prompt.tags},
              ${prompt.useCase},
              ${ALEX_CONSTANTS.ADMIN_EMAIL},
              NOW()
            )
            RETURNING id, prompt_title, prompt_text, category, season, style, mood, tags, use_case, created_at
          `
          savedPrompts.push(saved[0])
        } else {
          // Use existing prompt
          const existingPrompt = await sql`
            SELECT id, prompt_title, prompt_text, category, season, style, mood, tags, use_case, created_at
            FROM maya_prompt_suggestions
            WHERE id = ${existing[0].id}
          `
          savedPrompts.push(existingPrompt[0])
        }
      }

      console.log('[Alex] ✅ Maya prompts saved:', { count: savedPrompts.length })

      return {
        success: true,
        type: "maya_prompts",
        data: {
          prompts: savedPrompts.map(p => ({
            id: p.id,
            title: p.prompt_title,
            promptText: p.prompt_text,
            category: p.category,
            season: p.season,
            style: p.style,
            mood: p.mood,
            tags: p.tags,
            useCase: p.use_case,
            createdAt: p.created_at
          })),
          count: savedPrompts.length,
          category,
          season,
          style,
          specificTheme
        },
        message: `Generated ${savedPrompts.length} fresh prompt ideas! 💡 These are going to spark creativity!`,
        displayCard: true
      }

    } catch (error: any) {
      console.error('[Alex] ❌ Error creating Maya prompts:', error)
      return {
        success: false,
        error: error.message || 'Failed to create Maya prompts'
      }
    }
  }
}

