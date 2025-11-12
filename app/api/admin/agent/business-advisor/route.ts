import { neon } from "@neondatabase/serverless"
import { streamText } from "ai"
import { createAdminClient } from "@/lib/supabase/admin"

const sql = neon(process.env.DATABASE_URL!)

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { message } = await req.json()

    const supabase = createAdminClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      return new Response("Unauthorized", { status: 401 })
    }

    console.log("[v0] Business Advisor agent called")

    // Get complete business context
    const context = await getBusinessContext()

    const systemPrompt = `You are the SSELFIE Business Advisor - an expert business coach, strategic mentor, and growth consultant specifically for SSELFIE Studio.

YOUR ROLE:
You help the founder (Anders) scale SSELFIE Studio to a million-dollar company by providing strategic advice, growth opportunities, and monetization strategies.

YOUR EXPERTISE:
- SaaS business strategy and scaling
- AI product monetization
- User acquisition and retention
- Revenue optimization
- Competitive analysis
- Market positioning
- Product development priorities
- Pricing strategy

YOUR KNOWLEDGE:
${context}

HOW YOU HELP:
1. Strategic Planning - Identify growth opportunities based on current metrics
2. Revenue Optimization - Suggest ways to increase MRR and user lifetime value
3. Product Decisions - Recommend feature priorities based on user behavior
4. Market Analysis - Analyze competitors and market trends
5. Monetization - Find new revenue streams and pricing optimizations
6. Scaling Advice - Guide on when to hire, invest, or pivot

YOUR PERSONALITY:
- Direct and action-oriented (like a real business advisor)
- Data-driven (always reference actual metrics)
- Strategic thinker (see the big picture)
- Mentor mindset (teach, don't just tell)
- Honest (call out risks and challenges)
- Ambitious (aim for $1M ARR and beyond)

ALWAYS:
- Reference actual revenue, user, and engagement data in your responses
- Provide specific, actionable recommendations
- Estimate ROI or impact of suggestions
- Ask clarifying questions when needed
- Challenge assumptions when necessary
- Celebrate wins and milestones

NEVER:
- Give generic advice that could apply to any business
- Ignore the actual data in your context
- Sugarcoat bad metrics or trends
- Suggest strategies that don't fit SSELFIE's positioning
- Forget that Anders is bootstrapping (be realistic about resources)`

    const result = await streamText({
      model: "openai/gpt-4o",
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
      temperature: 0.7,
      maxTokens: 2000,
    })

    return result.toUIMessageStreamResponse()
  } catch (error) {
    console.error("[v0] Business Advisor error:", error)
    return new Response("Error processing request", { status: 500 })
  }
}

async function getBusinessContext(): Promise<string> {
  const context: string[] = []

  try {
    // Admin knowledge base
    const knowledge = await sql`
      SELECT category, title, content, confidence_level
      FROM admin_knowledge_base
      WHERE is_active = true
      ORDER BY confidence_level DESC
      LIMIT 20
    `

    if (knowledge.length > 0) {
      context.push("\n=== SSELFIE BRAND & STRATEGY ===")
      for (const k of knowledge) {
        context.push(`[${k.category}] ${k.title}`)
        context.push(k.content)
        context.push("")
      }
    }

    // Revenue metrics
    const [revenue] = await sql`
      SELECT 
        COUNT(DISTINCT user_id) as total_customers,
        COUNT(*) as total_transactions,
        SUM(amount) as total_revenue,
        AVG(amount) as avg_transaction,
        MAX(created_at) as last_transaction
      FROM credit_transactions
      WHERE transaction_type IN ('purchase', 'subscription')
        AND created_at >= NOW() - INTERVAL '90 days'
    `

    if (revenue) {
      context.push("\n=== REVENUE METRICS (Last 90 Days) ===")
      context.push(`Total Revenue: $${((revenue.total_revenue || 0) / 100).toFixed(2)}`)
      context.push(`Total Customers: ${revenue.total_customers}`)
      context.push(`Total Transactions: ${revenue.total_transactions}`)
      context.push(`Average Transaction: $${((revenue.avg_transaction || 0) / 100).toFixed(2)}`)
      context.push("")
    }

    // User metrics
    const [users] = await sql`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE plan != 'free') as paid_users,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_30d,
        COUNT(*) FILTER (WHERE last_login_at >= NOW() - INTERVAL '7 days') as active_users_7d,
        COUNT(*) FILTER (WHERE last_login_at >= NOW() - INTERVAL '30 days') as active_users_30d
      FROM users
    `

    if (users) {
      context.push("\n=== USER METRICS ===")
      context.push(`Total Users: ${users.total_users}`)
      context.push(
        `Paid Users: ${users.paid_users} (${((users.paid_users / users.total_users) * 100).toFixed(1)}% conversion)`,
      )
      context.push(`New Users (30d): ${users.new_users_30d}`)
      context.push(`Active Users (7d): ${users.active_users_7d}`)
      context.push(`Active Users (30d): ${users.active_users_30d}`)
      context.push(`Monthly Active Rate: ${((users.active_users_30d / users.total_users) * 100).toFixed(1)}%`)
      context.push("")
    }

    // Generation metrics
    const [generations] = await sql`
      SELECT 
        COUNT(*) as total_generations,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as generations_30d,
        COUNT(*) FILTER (WHERE saved = true) as saved_generations,
        COUNT(DISTINCT user_id) as users_generating
      FROM generated_images
    `

    if (generations) {
      context.push("\n=== ENGAGEMENT METRICS ===")
      context.push(`Total Generations: ${generations.total_generations}`)
      context.push(`Generations (30d): ${generations.generations_30d}`)
      context.push(
        `Saved Generations: ${generations.saved_generations} (${((generations.saved_generations / generations.total_generations) * 100).toFixed(1)}% save rate)`,
      )
      context.push(`Users Generating: ${generations.users_generating}`)
      context.push("")
    }

    // Training metrics
    const [training] = await sql`
      SELECT 
        COUNT(*) as total_trainings,
        COUNT(*) FILTER (WHERE training_status = 'completed') as completed_trainings,
        COUNT(*) FILTER (WHERE training_status = 'failed') as failed_trainings,
        COUNT(DISTINCT user_id) as users_training
      FROM user_models
    `

    if (training) {
      context.push("\n=== TRAINING METRICS ===")
      context.push(`Total Training Sessions: ${training.total_trainings}`)
      context.push(
        `Completed: ${training.completed_trainings} (${((training.completed_trainings / training.total_trainings) * 100).toFixed(1)}% success rate)`,
      )
      context.push(`Failed: ${training.failed_trainings}`)
      context.push(`Users Training: ${training.users_training}`)
      context.push("")
    }

    // Business insights
    const insights = await sql`
      SELECT insight_type, title, description, priority
      FROM admin_business_insights
      WHERE status IN ('new', 'reviewing')
      ORDER BY 
        CASE priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          ELSE 4
        END
      LIMIT 10
    `

    if (insights.length > 0) {
      context.push("\n=== ACTIVE BUSINESS INSIGHTS ===")
      for (const insight of insights) {
        context.push(`[${insight.priority}] ${insight.title}`)
        context.push(insight.description)
        context.push("")
      }
    }

    return context.join("\n")
  } catch (error) {
    console.error("[v0] Error building business context:", error)
    return "Unable to load business context"
  }
}
