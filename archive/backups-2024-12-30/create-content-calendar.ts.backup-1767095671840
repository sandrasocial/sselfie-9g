/**
 * Create Content Calendar Tool
 * Generates strategic content calendar for Instagram and/or email
 */

import type { Tool, ToolResult } from '../../types'
import { sql, Anthropic, ALEX_CONSTANTS } from '../../shared/dependencies'

interface CreateContentCalendarInput {
  duration: 'week' | 'month' | 'quarter'
  startDate?: string
  platform?: 'instagram' | 'email' | 'both'
  contentPillars?: string[]
  specialFocus?: string
  postsPerWeek?: number
}

export const createContentCalendarTool: Tool<CreateContentCalendarInput> = {
  name: "create_content_calendar",
  description: `Generate strategic content calendar for Instagram and/or email.

Creates a structured content plan based on Sandra's content pillars and business goals.

Content Pillars:
1. Future Self Visualization - Showing the dream life
2. Visibility Made Simple - Teaching visibility strategies
3. SSELFIE Studio in Action - Product demonstrations
4. Proof of Concept - Results and testimonials
5. System & Strategy - Business systems
6. Real Talk - Authentic sharing
7. Authority - Expertise positioning

Use this when Sandra:
- Wants to plan content for a week/month/quarter
- Asks for a content strategy
- Needs to organize posting schedule
- Wants to plan around a launch or event

The tool saves calendars to the library for easy reference.`,

  input_schema: {
    type: "object",
    properties: {
      duration: {
        type: "string",
        enum: ["week", "month", "quarter"],
        description: "How long the calendar should cover"
      },
      startDate: {
        type: "string",
        description: "Start date in YYYY-MM-DD format (defaults to today if not provided)"
      },
      platform: {
        type: "string",
        enum: ["instagram", "email", "both"],
        description: "Which platform(s) this calendar is for (default: instagram)"
      },
      contentPillars: {
        type: "array",
        items: { type: "string" },
        description: "Which content pillars to focus on (if not specified, uses all)"
      },
      specialFocus: {
        type: "string",
        description: "Any special theme or focus (e.g., 'Maya Pro Mode launch', 'Holiday campaign')"
      },
      postsPerWeek: {
        type: "number",
        description: "How many posts per week (default: 5 for Instagram, 2 for email)"
      }
    },
    required: ["duration"]
  },

  async execute({ 
    duration,
    startDate,
    platform = "instagram",
    contentPillars,
    specialFocus,
    postsPerWeek
  }: CreateContentCalendarInput): Promise<ToolResult> {
    try {
      console.log('[Alex] 📅 Creating content calendar:', { duration, platform, specialFocus })

      // Calculate dates
      const start = startDate ? new Date(startDate) : new Date()
      let end = new Date(start)

      if (duration === 'week') {
        end.setDate(start.getDate() + 7)
      } else if (duration === 'month') {
        end.setMonth(start.getMonth() + 1)
      } else if (duration === 'quarter') {
        end.setMonth(start.getMonth() + 3)
      }

      // Default posts per week
      if (!postsPerWeek) {
        postsPerWeek = platform === 'email' ? 2 : 5
      }

      // Default content pillars
      const defaultPillars = [
        'Future Self Visualization',
        'Visibility Made Simple',
        'SSELFIE Studio in Action',
        'Proof of Concept',
        'System & Strategy',
        'Real Talk',
        'Authority'
      ]

      const pillars = contentPillars && contentPillars.length > 0 
        ? contentPillars 
        : defaultPillars

      const calendarPrompt = `Create a strategic content calendar for Sandra's ${platform}.

**Duration:** ${duration} (${start.toLocaleDateString()} to ${end.toLocaleDateString()})
**Platform:** ${platform}
**Posts per week:** ${postsPerWeek}
**Content Pillars:** ${pillars.join(', ')}
${specialFocus ? `**Special Focus:** ${specialFocus}` : ''}

**Sandra's Content Strategy:**
- Monday: System & Strategy (business frameworks)
- Tuesday: Future Self (inspiration, visualization)
- Wednesday: Real Talk (authentic sharing)
- Thursday: Authority (expertise, teaching)
- Friday: Freedom (lifestyle, results)
- Saturday: Community (engagement)
- Sunday: Vision (big picture)

**Content Mix:**
- 40% Educational (teach, share value)
- 30% Inspirational (motivate, visualize)
- 20% Personal/Authentic (real talk, behind-scenes)
- 10% Promotional (soft sells, features)

**Guidelines:**
- Each post should align with a content pillar
- Mix content types (photos, carousels, reels)
- Include variety in topics
- Build toward ${specialFocus || 'ongoing engagement'}
- Keep tone warm, empowering, authentic
${platform === 'email' ? '- Email topics should provide deep value' : ''}

**Format your response as a JSON array of posts:**
[
  {
    "date": "YYYY-MM-DD",
    "day": "Monday",
    "pillar": "System & Strategy",
    "contentType": "Carousel",
    "topic": "5 Steps to Build Your Personal Brand",
    "hook": "Most entrepreneurs skip step 3...",
    "platform": "${platform}",
    "notes": "Link to Maya Pro Mode guide"
  },
  ...
]

Generate ONLY the JSON array, nothing else.`

      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY!
      })

      const response = await anthropic.messages.create({
        model: ALEX_CONSTANTS.MODEL,
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: calendarPrompt
        }]
      })

      const calendarText = response.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n')

      // Extract JSON from response
      const jsonMatch = calendarText.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error('Failed to generate valid calendar format')
      }

      const calendarData = JSON.parse(jsonMatch[0])

      // Generate title
      const title = specialFocus 
        ? `${specialFocus} - ${duration.charAt(0).toUpperCase() + duration.slice(1)} Plan`
        : `${duration.charAt(0).toUpperCase() + duration.slice(1)} Content Calendar`

      // Check for duplicates before saving
      const existingCalendar = await sql`
        SELECT id FROM content_calendars
        WHERE title = ${title}
          AND start_date = ${start.toISOString().split('T')[0]}
          AND created_at > NOW() - INTERVAL '5 minutes'
        LIMIT 1
      `
      
      let calendarInfo
      if (existingCalendar.length === 0) {
        // Save to database - only if no duplicate found
        const saved = await sql`
          INSERT INTO content_calendars (
            title, description, duration, start_date, end_date,
            platform, calendar_data, content_pillars, total_posts,
            created_by, created_at
          ) VALUES (
            ${title},
            ${specialFocus || `${platform} content plan for ${duration}`},
            ${duration},
            ${start.toISOString().split('T')[0]},
            ${end.toISOString().split('T')[0]},
            ${platform},
            ${JSON.stringify({ days: calendarData })},
            ${pillars},
            ${calendarData.length},
            ${ALEX_CONSTANTS.ADMIN_EMAIL},
            NOW()
          )
          RETURNING id, title, duration, start_date, end_date, total_posts, created_at
        `
        calendarInfo = saved[0]
        console.log('[Alex] ✅ Content calendar saved:', { 
          id: calendarInfo.id, 
          posts: calendarInfo.total_posts 
        })
      } else {
        // Use existing calendar
        const existing = await sql`
          SELECT id, title, duration, start_date, end_date, total_posts, created_at
          FROM content_calendars
          WHERE id = ${existingCalendar[0].id}
        `
        calendarInfo = existing[0]
        console.log('[Alex] ⚠️ Duplicate calendar detected (within 5 minutes), using existing:', { id: calendarInfo.id })
      }


      return {
        success: true,
        type: "content_calendar",
        data: {
          id: calendarInfo.id,
          title: calendarInfo.title,
          duration,
          startDate: calendarInfo.start_date,
          endDate: calendarInfo.end_date,
          platform,
          contentPillars: pillars,
          posts: calendarData,
          totalPosts: calendarInfo.total_posts,
          specialFocus,
          createdAt: calendarInfo.created_at
        },
        message: `Created ${duration} calendar with ${calendarInfo.total_posts} posts`,
        displayCard: true
      }

    } catch (error: any) {
      console.error('[Alex] ❌ Error creating content calendar:', error)
      return {
        success: false,
        error: error.message || 'Failed to create content calendar'
      }
    }
  }
}

