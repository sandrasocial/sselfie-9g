/**
 * Get Testimonials Tool
 * Fetches published customer testimonials from the database
 */

import type { Tool, ToolResult } from '../../types'
import { sql } from '../../shared/dependencies'

interface GetTestimonialsInput {
  limit?: number
  featuredOnly?: boolean
  minRating?: number
  withImages?: boolean
}

export const getTestimonialsTool: Tool<GetTestimonialsInput> = {
  name: "get_testimonials",
  description: `Fetch published customer testimonials from the database.

Use this when Sandra:
- Wants to include testimonials in emails
- Asks for social proof or user stories
- Needs customer quotes
- Wants to showcase results
- Creates marketing emails

Returns testimonials with:
- Customer name and quote
- Star rating
- Image URLs (up to 4 per testimonial)
- Featured status

Only returns PUBLISHED testimonials (is_published = true).`,

  input_schema: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description: "Number of testimonials to return (1-10, default: 3)"
      },
      featuredOnly: {
        type: "boolean",
        description: "Only return featured testimonials (default: false)"
      },
      minRating: {
        type: "number",
        description: "Minimum star rating (1-5, default: 4)"
      },
      withImages: {
        type: "boolean",
        description: "Only return testimonials that have images (default: false)"
      }
    },
    required: []
  },

  async execute({ 
    limit = 3, 
    featuredOnly = false, 
    minRating = 4,
    withImages = false 
  }: GetTestimonialsInput = {}): Promise<ToolResult> {
    try {
      console.log('[Alex] 📣 Fetching testimonials:', { limit, featuredOnly, minRating, withImages })
      
      // Build query using tagged template syntax
      const testimonials = await sql`
        SELECT 
          id,
          customer_name,
          testimonial_text,
          rating,
          screenshot_url,
          image_url_2,
          image_url_3,
          image_url_4,
          is_featured,
          collected_at
        FROM testimonials
        WHERE is_published = true
          AND rating >= ${minRating}
          ${featuredOnly ? sql`AND is_featured = true` : sql``}
          ${withImages ? sql`AND screenshot_url IS NOT NULL` : sql``}
        ORDER BY 
          is_featured DESC,
          rating DESC,
          collected_at DESC
        LIMIT ${Math.min(limit, 10)}
      `
      
      if (testimonials.length === 0) {
        return {
          success: true,
          testimonials: [],
          count: 0,
          message: "No testimonials found matching criteria"
        }
      }
      
      // Format testimonials for easy use
      const formattedTestimonials = testimonials.map(t => {
        const images = [
          t.screenshot_url,
          t.image_url_2,
          t.image_url_3,
          t.image_url_4
        ].filter(Boolean)
        
        return {
          id: t.id,
          customerName: t.customer_name,
          quote: t.testimonial_text,
          rating: t.rating,
          stars: '⭐'.repeat(t.rating),
          images: images,
          imageCount: images.length,
          isFeatured: t.is_featured,
          collectedAt: t.collected_at
        }
      })
      
      console.log('[Alex] ✅ Found', testimonials.length, 'testimonials')
      
      return {
        success: true,
        testimonials: formattedTestimonials,
        count: testimonials.length,
        message: `Found ${testimonials.length} testimonial${testimonials.length > 1 ? 's' : ''}`
      }
      
    } catch (error: any) {
      console.error('[Alex] ❌ Error fetching testimonials:', error)
      return {
        success: false,
        error: error.message || 'Failed to fetch testimonials',
        testimonials: []
      }
    }
  }
}

