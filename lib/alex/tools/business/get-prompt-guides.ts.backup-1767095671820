/**
 * Get Prompt Guides Tool
 * Fetches prompt guides with their settings, prompts, and metadata
 */

import type { Tool, ToolResult } from '../../types'
import { sql } from '../../shared/dependencies'

interface GetPromptGuidesInput {
  guideId?: number
  searchTerm?: string
  includePrompts?: boolean
  status?: 'draft' | 'published' | 'all'
}

export const getPromptGuidesTool: Tool<GetPromptGuidesInput> = {
  name: "get_prompt_guides",
  description: `Get all prompt guides with their settings, prompts, and metadata.

Returns comprehensive guide data including:
- Guide metadata (ID, title, description, category, status)
- All prompts within each guide
- Page settings (welcome message, email capture, CTAs)
- Public page info (slug, status, links)

Use this when Sandra asks:
- "What prompt guides do we have?"
- "Show me the [category] guides"
- "What's in the [guide name]?"
- "List all guides"

Always call this FIRST before using update_prompt_guide to get the guide ID.`,

  input_schema: {
    type: "object",
    properties: {
      guideId: {
        type: "number",
        description: "Specific guide ID to get details for"
      },
      searchTerm: {
        type: "string",
        description: "Search for guides by title or category (e.g., 'Christmas', 'holiday', 'luxury')"
      },
      includePrompts: {
        type: "boolean",
        description: "Whether to include all prompts from the guide(s) (defaults to false)"
      },
      status: {
        type: "string",
        enum: ["draft", "published", "all"],
        description: "Filter by guide status (defaults to 'all')"
      }
    },
    required: []
  },

  async execute({ 
    guideId, 
    searchTerm, 
    includePrompts = false, 
    status = 'all' 
  }: GetPromptGuidesInput = {}): Promise<ToolResult> {
    try {
      console.log(`[Alex] 📚 Getting prompt guides:`, { guideId, searchTerm, includePrompts, status })
      
      if (guideId) {
        // Get specific guide with all details
        const [guide] = await sql`
          SELECT 
            pg.id,
            pg.title,
            pg.description,
            pg.category,
            pg.status,
            pg.total_prompts,
            pg.total_approved,
            pg.created_at,
            pg.published_at,
            pp.slug AS page_slug,
            pp.welcome_message,
            pp.email_capture_type,
            pp.email_list_tag,
            pp.view_count,
            pp.email_capture_count
          FROM prompt_guides pg
          LEFT JOIN prompt_pages pp ON pp.guide_id = pg.id
          WHERE pg.id = ${guideId}
        `
        
        if (!guide) {
          return {
            success: false,
            error: `Guide with ID ${guideId} not found`
          }
        }
        
        let prompts: any[] = []
        if (includePrompts) {
          prompts = await sql`
            SELECT 
              id,
              prompt_text,
              concept_title,
              concept_description,
              category,
              image_url,
              status,
              sort_order
            FROM prompt_guide_items
            WHERE guide_id = ${guideId}
            ORDER BY sort_order ASC, created_at ASC
          `
        }
        
        return {
          success: true,
          guide: {
            id: guide.id,
            title: guide.title,
            description: guide.description,
            category: guide.category,
            status: guide.status,
            totalPrompts: guide.total_prompts,
            totalApproved: guide.total_approved,
            createdAt: guide.created_at,
            publishedAt: guide.published_at,
            pageSlug: guide.page_slug,
            welcomeMessage: guide.welcome_message,
            emailCaptureType: guide.email_capture_type,
            emailListTag: guide.email_list_tag,
            viewCount: guide.view_count,
            emailCaptureCount: guide.email_capture_count,
            publicUrl: guide.page_slug ? `https://sselfie.ai/prompt-guides/${guide.page_slug}` : null
          },
          prompts: includePrompts ? prompts.map(p => ({
            id: p.id,
            promptText: p.prompt_text,
            conceptTitle: p.concept_title,
            conceptDescription: p.concept_description,
            category: p.category,
            imageUrl: p.image_url,
            status: p.status,
            sortOrder: p.sort_order
          })) : undefined
        }
      } else {
        // List guides with optional search
        let guides: any[]
        
        const searchPattern = searchTerm ? `%${searchTerm}%` : null
        
        if (searchPattern && status !== 'all') {
          guides = await sql`
            SELECT 
              pg.id,
              pg.title,
              pg.description,
              pg.category,
              pg.status,
              pg.total_prompts,
              pg.total_approved,
              pg.created_at,
              pg.published_at,
              pp.slug AS page_slug
            FROM prompt_guides pg
            LEFT JOIN prompt_pages pp ON pp.guide_id = pg.id AND pp.status = 'published'
            WHERE pg.status = ${status}
              AND (pg.title ILIKE ${searchPattern} 
                OR pg.category ILIKE ${searchPattern} 
                OR pg.description ILIKE ${searchPattern})
            ORDER BY pg.created_at DESC
          `
        } else if (searchPattern) {
          guides = await sql`
            SELECT 
              pg.id,
              pg.title,
              pg.description,
              pg.category,
              pg.status,
              pg.total_prompts,
              pg.total_approved,
              pg.created_at,
              pg.published_at,
              pp.slug AS page_slug
            FROM prompt_guides pg
            LEFT JOIN prompt_pages pp ON pp.guide_id = pg.id AND pp.status = 'published'
            WHERE pg.title ILIKE ${searchPattern} 
              OR pg.category ILIKE ${searchPattern} 
              OR pg.description ILIKE ${searchPattern}
            ORDER BY pg.created_at DESC
          `
        } else if (status !== 'all') {
          guides = await sql`
            SELECT 
              pg.id,
              pg.title,
              pg.description,
              pg.category,
              pg.status,
              pg.total_prompts,
              pg.total_approved,
              pg.created_at,
              pg.published_at,
              pp.slug AS page_slug
            FROM prompt_guides pg
            LEFT JOIN prompt_pages pp ON pp.guide_id = pg.id AND pp.status = 'published'
            WHERE pg.status = ${status}
            ORDER BY pg.created_at DESC
          `
        } else {
          guides = await sql`
            SELECT 
              pg.id,
              pg.title,
              pg.description,
              pg.category,
              pg.status,
              pg.total_prompts,
              pg.total_approved,
              pg.created_at,
              pg.published_at,
              pp.slug AS page_slug
            FROM prompt_guides pg
            LEFT JOIN prompt_pages pp ON pp.guide_id = pg.id AND pp.status = 'published'
            ORDER BY pg.created_at DESC
          `
        }
        
        // If includePrompts is true, get prompts for all guides
        let allPrompts: Record<number, any[]> = {}
        if (includePrompts && guides.length > 0) {
          const guideIds = guides.map((g: any) => g.id)
          const prompts = await sql`
            SELECT 
              guide_id,
              id,
              prompt_text,
              concept_title,
              concept_description,
              category,
              image_url,
              status,
              sort_order
            FROM prompt_guide_items
            WHERE guide_id = ANY(${guideIds})
            ORDER BY guide_id, sort_order ASC, created_at ASC
          `
          
          for (const prompt of prompts) {
            if (!allPrompts[prompt.guide_id]) {
              allPrompts[prompt.guide_id] = []
            }
            allPrompts[prompt.guide_id].push({
              id: prompt.id,
              promptText: prompt.prompt_text,
              conceptTitle: prompt.concept_title,
              conceptDescription: prompt.concept_description,
              category: prompt.category,
              imageUrl: prompt.image_url,
              status: prompt.status,
              sortOrder: prompt.sort_order
            })
          }
        }
        
        return {
          success: true,
          guides: guides.map((g: any) => ({
            id: g.id,
            title: g.title,
            description: g.description,
            category: g.category,
            status: g.status,
            totalPrompts: g.total_prompts,
            totalApproved: g.total_approved,
            createdAt: g.created_at,
            publishedAt: g.published_at,
            pageSlug: g.page_slug,
            publicUrl: g.page_slug ? `https://sselfie.ai/prompt-guides/${g.page_slug}` : null,
            prompts: includePrompts ? (allPrompts[g.id] || []) : undefined
          })),
          count: guides.length
        }
      }
    } catch (error: any) {
      console.error("[Alex] Error getting prompt guides:", error)
      return {
        success: false,
        error: error.message || "Failed to get prompt guides",
        suggestion: "Check database connection and ensure prompt_guides table exists"
      }
    }
  }
}

