/**
 * Update Prompt Guide Tool
 * Updates prompt guide settings including UI, style, CTA, links, and content
 */

import type { Tool, ToolResult } from '../../types'
import { sql } from '../../shared/dependencies'

interface UpdatePromptGuideInput {
  guideId: number
  guideUpdates?: {
    title?: string
    description?: string
    category?: string
    status?: 'draft' | 'published'
  }
  pageUpdates?: {
    slug?: string
    title?: string
    welcomeMessage?: string
    emailCaptureType?: 'modal' | 'inline' | 'top'
    emailListTag?: string
    upsellLink?: string
    upsellText?: string
    status?: 'draft' | 'published'
  }
}

export const updatePromptGuideTool: Tool<UpdatePromptGuideInput> = {
  name: "update_prompt_guide",
  description: `Update prompt guide settings including UI, style, CTA, links, and content.
  
Use this to edit:
- Guide metadata: title, description, category
- Page settings: welcome message, email capture type, upsell links/text
- Public page: slug, status (draft/published)

This allows Alex to optimize guide pages for conversions, update CTAs, and improve the user experience.

IMPORTANT: Always use get_prompt_guides first to get the guide ID.`,

  input_schema: {
    type: "object",
    properties: {
      guideId: {
        type: "number",
        description: "ID of the guide to update (get from get_prompt_guides tool first)"
      },
      guideUpdates: {
        type: "object",
        properties: {
          title: { type: "string", description: "Update guide title" },
          description: { type: "string", description: "Update guide description" },
          category: { type: "string", description: "Update guide category" },
          status: { type: "string", enum: ["draft", "published"], description: "Update guide status" }
        },
        description: "Updates to the guide itself"
      },
      pageUpdates: {
        type: "object",
        properties: {
          slug: { type: "string", description: "Update URL slug (must be unique)" },
          title: { type: "string", description: "Update page title" },
          welcomeMessage: { type: "string", description: "Update welcome/intro message shown to users" },
          emailCaptureType: { type: "string", enum: ["modal", "inline", "top"], description: "How email capture is displayed" },
          emailListTag: { type: "string", description: "Resend tag for this guide's email list" },
          upsellLink: { type: "string", description: "CTA link (e.g., checkout URL or landing page)" },
          upsellText: { type: "string", description: "CTA button/text copy" },
          status: { type: "string", enum: ["draft", "published"], description: "Update page status" }
        },
        description: "Updates to the public page settings"
      }
    },
    required: ["guideId"]
  },

  async execute({ guideId, guideUpdates, pageUpdates }: UpdatePromptGuideInput): Promise<ToolResult> {
    try {
      console.log(`[Alex] 📝 Updating prompt guide ${guideId}`)
      console.log(`[Alex] 📝 Guide updates:`, JSON.stringify(guideUpdates, null, 2))
      console.log(`[Alex] 📝 Page updates:`, JSON.stringify(pageUpdates, null, 2))
      
      // Verify guide exists
      const [guide] = await sql`
        SELECT id FROM prompt_guides WHERE id = ${guideId}
      `
      
      if (!guide) {
        return {
          success: false,
          error: `Guide with ID ${guideId} not found`
        }
      }
      
      // Update guide fields
      if (guideUpdates) {
        const hasUpdates = guideUpdates.title !== undefined || guideUpdates.description !== undefined || 
                          guideUpdates.category !== undefined || guideUpdates.status !== undefined
        
        if (hasUpdates) {
          await sql`
            UPDATE prompt_guides
            SET 
              title = COALESCE(${guideUpdates.title ?? null}, title),
              description = COALESCE(${guideUpdates.description ?? null}, description),
              category = COALESCE(${guideUpdates.category ?? null}, category),
              status = COALESCE(${guideUpdates.status ?? null}, status),
              published_at = CASE 
                WHEN ${guideUpdates.status === 'published'} THEN NOW()
                WHEN ${guideUpdates.status === 'draft'} THEN NULL
                ELSE published_at
              END,
              updated_at = NOW()
            WHERE id = ${guideId}
          `
          console.log(`[Alex] ✅ Updated guide ${guideId}`)
        }
      }
      
      // Update page fields
      if (pageUpdates) {
        const [existingPage] = await sql`
          SELECT id FROM prompt_pages WHERE guide_id = ${guideId}
        `
        
        const pageUpdateFields: any = {}
        
        if (pageUpdates.slug !== undefined) {
          const [slugCheck] = await sql`
            SELECT id FROM prompt_pages WHERE slug = ${pageUpdates.slug} AND guide_id != ${guideId}
          `
          if (slugCheck) {
            return {
              success: false,
              error: `Slug "${pageUpdates.slug}" is already taken by another guide`
            }
          }
          pageUpdateFields.slug = pageUpdates.slug
        }
        if (pageUpdates.title !== undefined) pageUpdateFields.title = pageUpdates.title
        if (pageUpdates.welcomeMessage !== undefined) pageUpdateFields.welcome_message = pageUpdates.welcomeMessage
        if (pageUpdates.emailCaptureType !== undefined) pageUpdateFields.email_capture_type = pageUpdates.emailCaptureType
        if (pageUpdates.emailListTag !== undefined) pageUpdateFields.email_list_tag = pageUpdates.emailListTag
        if (pageUpdates.upsellLink !== undefined) pageUpdateFields.upsell_link = pageUpdates.upsellLink
        if (pageUpdates.upsellText !== undefined) pageUpdateFields.upsell_text = pageUpdates.upsellText
        if (pageUpdates.status !== undefined) {
          pageUpdateFields.status = pageUpdates.status
          if (pageUpdates.status === 'published') {
            pageUpdateFields.published_at = new Date()
          }
        }
        
        if (Object.keys(pageUpdateFields).length > 0) {
          if (existingPage) {
            console.log(`[Alex] 🔧 Page update fields received:`, JSON.stringify(pageUpdateFields, null, 2))
            
            // Execute individual UPDATE statements for each provided field
            if (pageUpdateFields.slug !== undefined) {
              await sql`UPDATE prompt_pages SET slug = ${pageUpdateFields.slug}, updated_at = NOW() WHERE guide_id = ${guideId}`
            }
            if (pageUpdateFields.title !== undefined) {
              await sql`UPDATE prompt_pages SET title = ${pageUpdateFields.title}, updated_at = NOW() WHERE guide_id = ${guideId}`
            }
            if (pageUpdateFields.welcome_message !== undefined) {
              await sql`UPDATE prompt_pages SET welcome_message = ${pageUpdateFields.welcome_message}, updated_at = NOW() WHERE guide_id = ${guideId}`
            }
            if (pageUpdateFields.email_capture_type !== undefined) {
              await sql`UPDATE prompt_pages SET email_capture_type = ${pageUpdateFields.email_capture_type}, updated_at = NOW() WHERE guide_id = ${guideId}`
            }
            if (pageUpdateFields.email_list_tag !== undefined) {
              await sql`UPDATE prompt_pages SET email_list_tag = ${pageUpdateFields.email_list_tag}, updated_at = NOW() WHERE guide_id = ${guideId}`
            }
            if (pageUpdateFields.upsell_link !== undefined) {
              await sql`UPDATE prompt_pages SET upsell_link = ${pageUpdateFields.upsell_link}, updated_at = NOW() WHERE guide_id = ${guideId}`
            }
            if (pageUpdateFields.upsell_text !== undefined) {
              await sql`UPDATE prompt_pages SET upsell_text = ${pageUpdateFields.upsell_text}, updated_at = NOW() WHERE guide_id = ${guideId}`
            }
            if (pageUpdateFields.status !== undefined) {
              if (pageUpdateFields.status === 'published') {
                await sql`UPDATE prompt_pages SET status = ${pageUpdateFields.status}, published_at = NOW(), updated_at = NOW() WHERE guide_id = ${guideId}`
              } else if (pageUpdateFields.status === 'draft') {
                await sql`UPDATE prompt_pages SET status = ${pageUpdateFields.status}, published_at = NULL, updated_at = NOW() WHERE guide_id = ${guideId}`
              } else {
                await sql`UPDATE prompt_pages SET status = ${pageUpdateFields.status}, updated_at = NOW() WHERE guide_id = ${guideId}`
              }
            }
            
            console.log(`[Alex] ✅ Updated page for guide ${guideId}`)
          } else {
            // Create new page if it doesn't exist
            const [guideData] = await sql`
              SELECT title FROM prompt_guides WHERE id = ${guideId}
            `
            
            await sql`
              INSERT INTO prompt_pages (
                guide_id, slug, title, welcome_message,
                email_capture_type, email_list_tag, upsell_link, upsell_text, status
              ) VALUES (
                ${guideId},
                ${pageUpdateFields.slug || `guide-${guideId}`},
                ${pageUpdateFields.title || guideData?.title || 'Untitled Guide'},
                ${pageUpdateFields.welcome_message || null},
                ${pageUpdateFields.email_capture_type || 'modal'},
                ${pageUpdateFields.email_list_tag || null},
                ${pageUpdateFields.upsell_link || null},
                ${pageUpdateFields.upsell_text || null},
                ${pageUpdateFields.status || 'draft'}
              )
            `
            console.log(`[Alex] ✅ Created new page for guide ${guideId}`)
          }
        }
      }
      
      // Get updated guide and page data
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const [updatedGuide] = await sql`
        SELECT 
          pg.id, pg.title, pg.description, pg.category, pg.status,
          pg.total_prompts, pg.total_approved, pg.created_at, pg.published_at,
          pp.slug AS page_slug, pp.welcome_message, pp.email_capture_type,
          pp.email_list_tag, pp.upsell_link, pp.upsell_text,
          pp.status AS page_status, pp.view_count, pp.email_capture_count
        FROM prompt_guides pg
        LEFT JOIN prompt_pages pp ON pp.guide_id = pg.id
        WHERE pg.id = ${guideId}
      `
      
      console.log(`[Alex] 📊 Retrieved updated guide data:`, {
        id: updatedGuide?.id,
        emailListTag: updatedGuide?.email_list_tag,
        upsellLink: updatedGuide?.upsell_link,
        upsellText: updatedGuide?.upsell_text
      })
      
      return {
        success: true,
        message: "Prompt guide updated successfully",
        guide: {
          id: updatedGuide.id,
          title: updatedGuide.title,
          description: updatedGuide.description,
          category: updatedGuide.category,
          status: updatedGuide.status,
          totalPrompts: updatedGuide.total_prompts,
          totalApproved: updatedGuide.total_approved,
          createdAt: updatedGuide.created_at,
          publishedAt: updatedGuide.published_at,
          page: updatedGuide.page_slug ? {
            slug: updatedGuide.page_slug,
            welcomeMessage: updatedGuide.welcome_message,
            emailCaptureType: updatedGuide.email_capture_type,
            emailListTag: updatedGuide.email_list_tag,
            upsellLink: updatedGuide.upsell_link,
            upsellText: updatedGuide.upsell_text,
            status: updatedGuide.page_status,
            viewCount: updatedGuide.view_count,
            emailCaptureCount: updatedGuide.email_capture_count,
            publicUrl: `https://sselfie.ai/prompt-guides/${updatedGuide.page_slug}`
          } : null
        }
      }
    } catch (error: any) {
      console.error("[Alex] Error updating prompt guide:", error)
      return {
        success: false,
        error: error.message || "Failed to update prompt guide",
        suggestion: "Check that the guide exists and all required fields are provided"
      }
    }
  }
}

