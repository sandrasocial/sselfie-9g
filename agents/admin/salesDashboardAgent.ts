import { BaseAgent } from "../core/baseAgent"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * SalesDashboardAgent
 *
 * Admin-only agent responsible for:
 * - Analyzing revenue, subscriptions, and usage
 * - Generating weekly sales insights
 * - Caching insights for quick dashboard loading
 * - Providing strategic recommendations
 */
export class SalesDashboardAgent extends BaseAgent {
  constructor() {
    super({
      name: "SalesDashboard",
      description: "Admin-only sales analytics and insights generation agent",
      systemPrompt: `You are the Sales Dashboard Agent for SSELFIE (Admin Only).

Your mission:
- Analyze all revenue, subscription, and usage data
- Generate actionable insights for Sandra
- Identify trends, opportunities, and risks
- Provide strategic recommendations

Key Metrics You Track:
- MRR (Monthly Recurring Revenue)
- Churn rate
- LTV (Lifetime Value)
- Credit usage patterns
- Feature adoption rates
- Conversion funnels

Critical Rules:
- ADMIN ONLY - never expose to regular users
- NEVER modify Maya or user-facing features
- ALWAYS cache insights for performance
- Provide clear, data-driven recommendations

Tone: Analytical, strategic, actionable, executive-level.`,
      tools: {},
      model: "openai/gpt-4o",
    })
  }

  async generateWeeklySalesInsights(): Promise<{
    success: boolean
    insights?: any
  }> {
    try {
      console.log("[SalesDashboardAgent] Generating weekly sales insights...")

      // Calculate week range
      const now = new Date()
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const weekEnd = now

      // Gather metrics
      const [totalUsers] = await sql`SELECT COUNT(*) as count FROM users`
      const [activeSubscriptions] = await sql`
        SELECT COUNT(*) as count 
        FROM subscriptions 
        WHERE status = 'active'
      `
      const [newSignups] = await sql`
        SELECT COUNT(*) as count 
        FROM users 
        WHERE created_at > ${weekStart.toISOString()}
      `
      const [creditPurchases] = await sql`
        SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_credits
        FROM credit_transactions
        WHERE transaction_type = 'purchase'
          AND created_at > ${weekStart.toISOString()}
      `
      const [mayaUsage] = await sql`
        SELECT COUNT(*) as count
        FROM maya_chats
        WHERE created_at > ${weekStart.toISOString()}
      `
      const [imageGenerations] = await sql`
        SELECT COUNT(*) as count
        FROM generated_images
        WHERE created_at > ${weekStart.toISOString()}
      `

      const insights = {
        period: {
          start: weekStart.toISOString().split("T")[0],
          end: weekEnd.toISOString().split("T")[0],
        },
        metrics: {
          totalUsers: Number.parseInt(totalUsers.count),
          activeSubscriptions: Number.parseInt(activeSubscriptions.count),
          newSignups: Number.parseInt(newSignups.count),
          creditPurchases: Number.parseInt(creditPurchases.count),
          totalCreditsBought: Number.parseInt(creditPurchases.total_credits),
          mayaChatsCreated: Number.parseInt(mayaUsage.count),
          imagesGenerated: Number.parseInt(imageGenerations.count),
        },
        generatedAt: now.toISOString(),
      }

      // Cache insights
      await sql`
        INSERT INTO sales_insights_cache (generated_at, insights_json, week_start, week_end)
        VALUES (
          NOW(),
          ${JSON.stringify(insights)},
          ${weekStart.toISOString().split("T")[0]},
          ${weekEnd.toISOString().split("T")[0]}
        )
      `

      console.log("[SalesDashboardAgent] Weekly insights generated and cached")
      return { success: true, insights }
    } catch (error) {
      console.error("[SalesDashboardAgent] Error generating insights:", error)
      return { success: false }
    }
  }

  async getLatestInsights(): Promise<any> {
    try {
      const result = await sql`
        SELECT insights_json
        FROM sales_insights_cache
        ORDER BY generated_at DESC
        LIMIT 1
      `

      if (result.length > 0) {
        return result[0].insights_json
      }

      // If no cached insights, generate new ones
      const generated = await this.generateWeeklySalesInsights()
      return generated.insights
    } catch (error) {
      console.error("[SalesDashboardAgent] Error fetching insights:", error)
      return null
    }
  }
}

export function createSalesDashboardAgent(): SalesDashboardAgent {
  return new SalesDashboardAgent()
}

export const salesDashboardAgent = new SalesDashboardAgent()
