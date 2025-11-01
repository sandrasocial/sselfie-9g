import { neon } from "@neondatabase/serverless"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserContextForMaya } from "@/lib/maya/get-user-context"

const sql = neon(process.env.DATABASE_URL!)

export async function getCompleteAdminContext(targetUserId?: string): Promise<string> {
  try {
    const contextParts: string[] = []

    // Fetch admin knowledge base
    const adminKnowledge = await sql`
      SELECT knowledge_type, category, title, content, confidence_level
      FROM admin_knowledge_base
      WHERE is_active = true
      ORDER BY confidence_level DESC, updated_at DESC
      LIMIT 15
    `

    if (adminKnowledge.length > 0) {
      contextParts.push("\n=== ADMIN KNOWLEDGE BASE ===")
      contextParts.push("Proprietary insights and best practices to enhance your responses:\n")

      for (const knowledge of adminKnowledge) {
        contextParts.push(`[${knowledge.category.toUpperCase()}] ${knowledge.title}`)
        contextParts.push(`${knowledge.content}`)
        contextParts.push(`Confidence: ${Math.round(knowledge.confidence_level * 100)}%\n`)
      }
    }

    // Fetch context guidelines for this mode
    const guidelines = await sql`
      SELECT guideline_name, guideline_text, priority_level
      FROM admin_context_guidelines
      WHERE is_active = true
      ORDER BY 
        CASE priority_level
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END
      LIMIT 10
    `

    if (guidelines.length > 0) {
      contextParts.push("\n=== CONTEXT GUIDELINES ===")
      contextParts.push("Important guidelines to follow when creating content:\n")

      for (const guideline of guidelines) {
        contextParts.push(`[${guideline.priority_level.toUpperCase()}] ${guideline.guideline_name}`)
        contextParts.push(`${guideline.guideline_text}\n`)
      }
    }

    // If specific user requested, get their complete data
    if (targetUserId) {
      const user = await getUserByAuthId(targetUserId)
      if (user) {
        contextParts.push("=== TARGET USER COMPLETE PROFILE ===")

        // Get user's Maya context (brand, memory, assets)
        const authId = user.stack_auth_id || user.supabase_user_id || user.id
        const mayaContext = await getUserContextForMaya(authId)
        if (mayaContext) {
          contextParts.push(mayaContext)
        }

        // User basic info
        const [userInfo] = await sql`
          SELECT 
            email, display_name, plan, created_at, last_login_at,
            monthly_generation_limit, generations_used_this_month,
            gender, profession, brand_style, photo_goals
          FROM users
          WHERE id = ${user.id}
        `
        if (userInfo) {
          contextParts.push("\n=== USER ACCOUNT INFO ===")
          contextParts.push(`Email: ${userInfo.email}`)
          contextParts.push(`Name: ${userInfo.display_name || "Not set"}`)
          contextParts.push(`Plan: ${userInfo.plan}`)
          contextParts.push(`Member since: ${new Date(userInfo.created_at).toLocaleDateString()}`)
          contextParts.push(`Generation limit: ${userInfo.monthly_generation_limit}/month`)
          contextParts.push(`Used this month: ${userInfo.generations_used_this_month}`)
          if (userInfo.profession) contextParts.push(`Profession: ${userInfo.profession}`)
          if (userInfo.photo_goals) contextParts.push(`Photo Goals: ${userInfo.photo_goals}`)
        }

        // Extended personal brand (new fields)
        const [brandExtended] = await sql`
          SELECT 
            brand_story_extended, origin_story, mission_statement,
            core_values, success_stories, testimonials, best_performing_content,
            content_performance_notes
          FROM user_personal_brand
          WHERE user_id = ${user.id}
        `
        if (brandExtended) {
          contextParts.push("\n=== EXTENDED BRAND STORY ===")
          if (brandExtended.origin_story) contextParts.push(`Origin Story: ${brandExtended.origin_story}`)
          if (brandExtended.mission_statement) contextParts.push(`Mission: ${brandExtended.mission_statement}`)
          if (brandExtended.brand_story_extended)
            contextParts.push(`Brand Story: ${brandExtended.brand_story_extended}`)

          if (brandExtended.core_values && Array.isArray(brandExtended.core_values)) {
            contextParts.push(`Core Values: ${brandExtended.core_values.join(", ")}`)
          }

          if (brandExtended.best_performing_content && Array.isArray(brandExtended.best_performing_content)) {
            contextParts.push("\nBest Performing Content:")
            brandExtended.best_performing_content.slice(0, 5).forEach((content: any) => {
              contextParts.push(`- ${content.title || content.type}: ${content.description || ""}`)
            })
          }
        }

        // Generation stats
        const [stats] = await sql`
          SELECT 
            COUNT(*)::int as total_generations,
            COUNT(*) FILTER (WHERE saved = true)::int as favorites,
            COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))::int as this_month,
            COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int as this_week
          FROM generated_images
          WHERE user_id = ${user.id}
        `
        if (stats) {
          contextParts.push("\n=== GENERATION STATS ===")
          contextParts.push(`Total Generations: ${stats.total_generations}`)
          contextParts.push(`Favorites: ${stats.favorites}`)
          contextParts.push(`This Month: ${stats.this_month}`)
          contextParts.push(`This Week: ${stats.this_week}`)
        }

        // Top categories
        const topCategories = await sql`
          SELECT category, COUNT(*) as count
          FROM generated_images
          WHERE user_id = ${user.id}
          GROUP BY category
          ORDER BY count DESC
          LIMIT 5
        `
        if (topCategories.length > 0) {
          contextParts.push("\nTop Categories:")
          topCategories.forEach((cat: any) => {
            contextParts.push(`- ${cat.category}: ${cat.count} images`)
          })
        }

        // Chat activity
        const [chatStats] = await sql`
          SELECT 
            COUNT(DISTINCT mc.id)::int as total_chats,
            COUNT(mcm.id)::int as total_messages,
            COUNT(DISTINCT mc.id) FILTER (WHERE mc.chat_type = 'maya')::int as maya_chats,
            COUNT(DISTINCT mc.id) FILTER (WHERE mc.chat_type = 'feed_designer')::int as feed_chats
          FROM maya_chats mc
          LEFT JOIN maya_chat_messages mcm ON mcm.chat_id = mc.id
          WHERE mc.user_id = ${user.id}
        `
        if (chatStats) {
          contextParts.push("\n=== CHAT ACTIVITY ===")
          contextParts.push(`Total Chats: ${chatStats.total_chats}`)
          contextParts.push(`Total Messages: ${chatStats.total_messages}`)
          contextParts.push(`Maya Chats: ${chatStats.maya_chats}`)
          contextParts.push(`Feed Designer Chats: ${chatStats.feed_chats}`)
        }

        // Feed layouts
        const [feedStats] = await sql`
          SELECT 
            COUNT(*)::int as total_feeds,
            COUNT(*) FILTER (WHERE status = 'completed')::int as completed_feeds
          FROM feed_layouts
          WHERE user_id = ${user.id}
        `
        if (feedStats && feedStats.total_feeds > 0) {
          contextParts.push("\n=== FEED DESIGNER ACTIVITY ===")
          contextParts.push(`Total Feeds: ${feedStats.total_feeds}`)
          contextParts.push(`Completed: ${feedStats.completed_feeds}`)
        }

        // Training models
        const [modelStats] = await sql`
          SELECT 
            COUNT(*)::int as total_models,
            COUNT(*) FILTER (WHERE training_status = 'completed')::int as completed_models
          FROM user_models
          WHERE user_id = ${user.id}
        `
        if (modelStats && modelStats.total_models > 0) {
          contextParts.push("\n=== AI MODEL TRAINING ===")
          contextParts.push(`Total Models: ${modelStats.total_models}`)
          contextParts.push(`Completed: ${modelStats.completed_models}`)
        }

        // Performance tracking
        const topPerforming = await sql`
          SELECT content_type, content_title, success_score, what_worked
          FROM content_performance_history
          WHERE user_id = ${user.id}
            AND success_score > 70
          ORDER BY success_score DESC
          LIMIT 5
        `
        if (topPerforming.length > 0) {
          contextParts.push("\n=== TOP PERFORMING CONTENT ===")
          topPerforming.forEach((item: any) => {
            contextParts.push(`- ${item.content_title} (${Math.round(item.success_score)} score)`)
            if (item.what_worked) contextParts.push(`  What worked: ${item.what_worked}`)
          })
        }

        // Recent milestones
        const milestones = await sql`
          SELECT milestone_type, milestone_title, achieved_at
          FROM user_milestones
          WHERE user_id = ${user.id}
          ORDER BY achieved_at DESC
          LIMIT 5
        `
        if (milestones.length > 0) {
          contextParts.push("\n=== RECENT MILESTONES ===")
          milestones.forEach((m: any) => {
            contextParts.push(`- ${m.milestone_title} (${new Date(m.achieved_at).toLocaleDateString()})`)
          })
        }

        // Brand evolution
        const evolution = await sql`
          SELECT evolution_type, reason_for_change, impact_observed, changed_at
          FROM brand_evolution
          WHERE user_id = ${user.id}
          ORDER BY changed_at DESC
          LIMIT 3
        `
        if (evolution.length > 0) {
          contextParts.push("\n=== BRAND EVOLUTION ===")
          evolution.forEach((e: any) => {
            contextParts.push(`- ${e.evolution_type}: ${e.reason_for_change}`)
            if (e.impact_observed) contextParts.push(`  Impact: ${e.impact_observed}`)
          })
        }

        // Competitor tracking
        const competitors = await sql`
          SELECT name, instagram_handle, business_type
          FROM competitors
          WHERE user_id = ${user.id}
          LIMIT 5
        `
        if (competitors.length > 0) {
          contextParts.push("\n=== TRACKED COMPETITORS ===")
          competitors.forEach((c: any) => {
            contextParts.push(`- ${c.name} (@${c.instagram_handle}) - ${c.business_type}`)
          })
        }

        // Content research
        const [research] = await sql`
          SELECT niche, trending_hashtags, top_creators, research_summary
          FROM content_research
          WHERE user_id = ${user.id}
          ORDER BY updated_at DESC
          LIMIT 1
        `
        if (research) {
          contextParts.push("\n=== CONTENT RESEARCH ===")
          if (research.niche) contextParts.push(`Niche: ${research.niche}`)
          if (research.research_summary) contextParts.push(`Summary: ${research.research_summary}`)
        }
      }
    }

    // Platform-wide insights
    contextParts.push("\n=== PLATFORM INSIGHTS ===")

    const [platformStats] = await sql`
      SELECT 
        COUNT(DISTINCT u.id)::int as total_users,
        COUNT(DISTINCT u.id) FILTER (WHERE u.plan != 'free')::int as paid_users,
        COUNT(DISTINCT gi.id)::int as total_generations,
        COUNT(DISTINCT mc.id)::int as total_chats,
        COUNT(DISTINCT fl.id)::int as total_feeds
      FROM users u
      LEFT JOIN generated_images gi ON gi.user_id = u.id
      LEFT JOIN maya_chats mc ON mc.user_id = u.id
      LEFT JOIN feed_layouts fl ON fl.user_id = u.id
    `
    if (platformStats) {
      contextParts.push(`Total Users: ${platformStats.total_users}`)
      contextParts.push(`Paid Users: ${platformStats.paid_users}`)
      contextParts.push(`Total Generations: ${platformStats.total_generations}`)
      contextParts.push(`Total Chats: ${platformStats.total_chats}`)
      contextParts.push(`Total Feeds: ${platformStats.total_feeds}`)
    }

    // Admin memory insights
    const recentInsights = await sql`
      SELECT title, insight, confidence_score, impact_level, category
      FROM admin_memory
      WHERE is_active = true
      ORDER BY confidence_score DESC, updated_at DESC
      LIMIT 10
    `
    if (recentInsights.length > 0) {
      contextParts.push("\n=== BUSINESS INSIGHTS (ADMIN MEMORY) ===")
      for (const insight of recentInsights) {
        contextParts.push(
          `- [${insight.category}] ${insight.title} (${insight.impact_level} impact, ${Math.round(insight.confidence_score * 100)}% confidence)`,
        )
        contextParts.push(`  ${insight.insight}`)
      }
    }

    // Top performing content patterns across platform
    const topContentPatterns = await sql`
      SELECT content_type, content_category, AVG(success_score) as avg_score, COUNT(*) as count
      FROM admin_content_performance
      WHERE success_score > 70
      GROUP BY content_type, content_category
      ORDER BY avg_score DESC
      LIMIT 5
    `
    if (topContentPatterns.length > 0) {
      contextParts.push("\n=== TOP PERFORMING CONTENT PATTERNS (PLATFORM-WIDE) ===")
      for (const pattern of topContentPatterns) {
        contextParts.push(
          `- ${pattern.content_type} / ${pattern.content_category}: ${Math.round(pattern.avg_score)} avg score (${pattern.count} examples)`,
        )
      }
    }

    // Recent business insights
    const businessInsights = await sql`
      SELECT insight_type, title, description, priority
      FROM admin_business_insights
      WHERE status IN ('new', 'reviewing')
      ORDER BY 
        CASE priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END,
        created_at DESC
      LIMIT 5
    `
    if (businessInsights.length > 0) {
      contextParts.push("\n=== ACTIVE BUSINESS INSIGHTS ===")
      for (const insight of businessInsights) {
        contextParts.push(`- [${insight.priority}] ${insight.title}`)
        contextParts.push(`  ${insight.description}`)
      }
    }

    // Email campaign performance
    const [emailStats] = await sql`
      SELECT 
        COUNT(*)::int as total_campaigns,
        COUNT(*) FILTER (WHERE status = 'sent')::int as sent_campaigns,
        SUM(total_recipients)::int as total_recipients,
        SUM(total_opened)::int as total_opened,
        SUM(total_clicked)::int as total_clicked
      FROM admin_email_campaigns
    `
    if (emailStats && emailStats.total_campaigns > 0) {
      contextParts.push("\n=== EMAIL CAMPAIGN PERFORMANCE ===")
      contextParts.push(`Total Campaigns: ${emailStats.total_campaigns}`)
      contextParts.push(`Sent: ${emailStats.sent_campaigns}`)
      contextParts.push(`Total Recipients: ${emailStats.total_recipients || 0}`)
      if (emailStats.total_opened > 0) {
        const openRate = ((emailStats.total_opened / emailStats.total_recipients) * 100).toFixed(1)
        contextParts.push(`Open Rate: ${openRate}%`)
      }
      if (emailStats.total_clicked > 0) {
        const clickRate = ((emailStats.total_clicked / emailStats.total_recipients) * 100).toFixed(1)
        contextParts.push(`Click Rate: ${clickRate}%`)
      }
    }

    return contextParts.join("\n")
  } catch (error) {
    console.error("[v0] Error building complete admin context:", error)
    return ""
  }
}
