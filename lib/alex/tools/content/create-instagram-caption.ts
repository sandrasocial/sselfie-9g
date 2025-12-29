/**
 * Create Instagram Caption Tool
 * Generates Instagram captions in Sandra's authentic voice
 */

import type { Tool, ToolResult } from '../../types'
import { sql, Anthropic, ALEX_CONSTANTS } from '../../shared/dependencies'

interface CreateInstagramCaptionInput {
  photoDescription: string
  captionType: 'storytelling' | 'educational' | 'promotional' | 'motivational'
  mainMessage: string
  includeHashtags?: boolean
  includeCTA?: boolean
  tone?: 'warm' | 'professional' | 'excited' | 'reflective'
}

export const createInstagramCaptionTool: Tool<CreateInstagramCaptionInput> = {
  name: "create_instagram_caption",
  description: `Generate Instagram captions in Sandra's authentic voice.

Creates engaging, on-brand captions that match Sandra's communication style - warm, empowering, genuine, and action-oriented.

Use this when Sandra:
- Needs a caption for a SSELFIE photo
- Wants caption variations
- Asks for storytelling vs educational vs promotional captions
- Needs hashtag suggestions
- Wants to plan Instagram content

The tool saves captions to the library automatically so Sandra can reference them later.`,

  input_schema: {
    type: "object",
    properties: {
      photoDescription: {
        type: "string",
        description: "What the photo shows (e.g., 'coffee and laptop morning work setup', 'elegant pink blazer outfit')"
      },
      captionType: {
        type: "string",
        enum: ["storytelling", "educational", "promotional", "motivational"],
        description: "Type of caption to generate"
      },
      mainMessage: {
        type: "string",
        description: "The key point or story Sandra wants to convey"
      },
      includeHashtags: {
        type: "boolean",
        description: "Whether to include hashtags (default: true)"
      },
      includeCTA: {
        type: "boolean",
        description: "Whether to include a call-to-action (default: true)"
      },
      tone: {
        type: "string",
        enum: ["warm", "professional", "excited", "reflective"],
        description: "Tone for this specific caption (default: warm)"
      }
    },
    required: ["photoDescription", "captionType", "mainMessage"]
  },

  async execute({ 
    photoDescription, 
    captionType, 
    mainMessage,
    includeHashtags = true,
    includeCTA = true,
    tone = "warm"
  }: CreateInstagramCaptionInput): Promise<ToolResult> {
    try {
      console.log('[Alex] 📸 Creating Instagram caption:', { captionType, tone })

      const captionPrompt = `You are writing an Instagram caption in Sandra's voice.

**Sandra's Voice Characteristics:**
- Warm, authentic, conversational
- Empowering and action-oriented
- Vulnerable and real (not perfectly polished)
- Speaks to women entrepreneurs directly
- Uses "I" and "you" language
- Inspirational but grounded
- No corporate jargon

**Caption Type:** ${captionType}
**Tone:** ${tone}
**Photo Description:** ${photoDescription}
**Main Message:** ${mainMessage}

**Guidelines:**
- Start with a strong hook (first line gets people to read more)
- Use short paragraphs and line breaks for readability
- Be empowering and action-oriented
- Talk like a friend, not a brand
- Share vulnerability when appropriate for storytelling
- ${includeHashtags ? 'Include 8-12 relevant hashtags at the end' : 'No hashtags'}
- ${includeCTA ? 'Include a natural call-to-action (comment, DM, visit link in bio)' : 'No direct CTA'}
- Use 1-2 emojis MAX (only if natural)
- For storytelling: Share personal experience or insight
- For educational: Teach something valuable
- For promotional: Lead with value, soft sell
- For motivational: Inspire action

**Caption Length Guidelines:**
- Storytelling: 150-200 words
- Educational: 100-150 words  
- Promotional: 80-120 words
- Motivational: 60-100 words

**Format:**
[Hook - compelling first line]

[Body - 2-4 short paragraphs with line breaks]

[CTA if requested]

[Hashtags if requested]

Generate ONLY the caption text, nothing else. No preamble, no explanations.`

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY!
      })

      const response = await anthropic.messages.create({
        model: ALEX_CONSTANTS.MODEL,
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: captionPrompt
        }]
      })

      const fullCaption = response.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n\n')
        .trim()

      // Extract hashtags if present
      const hashtagMatch = fullCaption.match(/#[\w]+/g)
      const hashtags = hashtagMatch || []

      // Remove hashtags from main caption for clean storage
      const captionWithoutHashtags = fullCaption.replace(/#[\w]+/g, '').trim()

      // Extract hook (first line)
      const lines = captionWithoutHashtags.split('\n').filter(l => l.trim())
      const hook = lines[0] || ''

      // Extract CTA (usually last paragraph before hashtags)
      const paragraphs = captionWithoutHashtags.split('\n\n').filter(p => p.trim())
      const cta = includeCTA && paragraphs.length > 1 
        ? paragraphs[paragraphs.length - 1] 
        : null

      // Calculate word count
      const wordCount = captionWithoutHashtags.split(/\s+/).length

      // Save to database
      const saved = await sql`
        INSERT INTO instagram_captions (
          caption_text, caption_type, hashtags, cta,
          image_description, tone, word_count, hook,
          created_by, created_at
        ) VALUES (
          ${captionWithoutHashtags},
          ${captionType},
          ${hashtags},
          ${cta},
          ${photoDescription},
          ${tone},
          ${wordCount},
          ${hook},
          ${ALEX_CONSTANTS.ADMIN_EMAIL},
          NOW()
        )
        RETURNING id, caption_text, caption_type, hashtags, hook, word_count, created_at
      `

      const captionData = saved[0]

      console.log('[Alex] ✅ Instagram caption saved:', { id: captionData.id, wordCount })

      return {
        success: true,
        type: "instagram_caption",
        data: {
          id: captionData.id,
          captionText: captionData.caption_text,
          captionType: captionData.caption_type,
          hashtags: captionData.hashtags,
          hook: captionData.hook,
          imageDescription: photoDescription,
          tone,
          wordCount,
          cta,
          createdAt: captionData.created_at,
          fullCaption: includeHashtags 
            ? `${captionData.caption_text}\n\n${captionData.hashtags.join(' ')}`
            : captionData.caption_text
        },
        message: `Created your ${captionType} caption! 📸 ${wordCount} words of pure engagement fuel!`,
        displayCard: true
      }

    } catch (error: any) {
      console.error('[Alex] ❌ Error creating caption:', error)
      return {
        success: false,
        error: error.message || 'Failed to create Instagram caption'
      }
    }
  }
}

