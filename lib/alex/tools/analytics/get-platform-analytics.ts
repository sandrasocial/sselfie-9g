/**
 * Get Platform Analytics Tool
 * Gets comprehensive platform analytics including user stats, generation activity, revenue metrics, and engagement data
 */

import type { Tool, ToolResult } from '../../types'
import { sql } from '../../shared/dependencies'

interface GetPlatformAnalyticsInput {
  scope?: 'platform' | 'user'
  userId?: string
}

export const getPlatformAnalyticsTool: Tool<GetPlatformAnalyticsInput> = {
  name: "get_platform_analytics",
  description: `Get comprehensive platform analytics including user stats, generation activity, revenue metrics, and engagement data. Use this when Sandra asks about platform health, user growth, or business performance.`,

  input_schema: {
    type: "object",
    properties: {
      scope: {
        type: "string",
        enum: ['platform', 'user'],
        description: "Scope: 'platform' for overall stats, 'user' for specific user analytics"
      },
      userId: {
        type: "string",
        description: "User ID if scope is 'user'"
      }
    },
    required: []
  },

  async execute({ scope = 'platform', userId }: GetPlatformAnalyticsInput): Promise<ToolResult> {
    try {
      if (scope === 'platform') {
        // User Stats
        const [userStats] = await sql`
          SELECT 
            COUNT(*) as total_users,
            COUNT(CASE WHEN last_login_at > NOW() - INTERVAL '30 days' THEN 1 END) as active_users,
            COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as new_users_this_week
          FROM users
          WHERE email IS NOT NULL
        `

        // Separate query for paid users - counts ALL paying customers
        const paidUsersResult = await sql`
          SELECT COUNT(DISTINCT user_id) as paid_users
          FROM (
            -- Active subscription customers
            SELECT DISTINCT user_id
            FROM subscriptions
            WHERE status = 'active'
              AND (is_test_mode = FALSE OR is_test_mode IS NULL)
            
            UNION
            
            -- One-time purchase customers (sessions + top-ups)
            SELECT DISTINCT user_id
            FROM credit_transactions
            WHERE transaction_type = 'purchase'
              AND stripe_payment_id IS NOT NULL
              AND (is_test_mode = FALSE OR is_test_mode IS NULL)
          ) as all_paying_customers
        `
        const paid_users = Number(paidUsersResult[0]?.paid_users || 0)

        // Get customer type breakdown
        const customerBreakdown = await sql`
          WITH subscription_customers AS (
            SELECT DISTINCT user_id
            FROM subscriptions
            WHERE status = 'active'
              AND (is_test_mode = FALSE OR is_test_mode IS NULL)
          ),
          one_time_customers AS (
            SELECT DISTINCT user_id
            FROM credit_transactions
            WHERE transaction_type = 'purchase'
              AND stripe_payment_id IS NOT NULL
              AND (is_test_mode = FALSE OR is_test_mode IS NULL)
              AND user_id NOT IN (SELECT user_id FROM subscription_customers)
          )
          SELECT 
            (SELECT COUNT(*) FROM subscription_customers) as active_subscribers,
            (SELECT COUNT(*) FROM one_time_customers) as one_time_buyers,
            (SELECT COUNT(*) FROM subscription_customers) + 
            (SELECT COUNT(*) FROM one_time_customers) as total_paying
        `

        // Generation Stats
        const [generationStats] = await sql`
          SELECT 
            COUNT(*) as total_generations,
            COUNT(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN 1 END) as generations_this_month,
            COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as generations_this_week,
            COUNT(CASE WHEN saved = true THEN 1 END) as total_favorites,
            COUNT(DISTINCT user_id) as users_generating
          FROM generated_images
        `

        // Chat Stats
        const [chatStats] = await sql`
          SELECT 
            COUNT(DISTINCT mc.id) as total_chats,
            COUNT(DISTINCT mcm.id) as total_messages,
            COUNT(DISTINCT mc.id) FILTER (WHERE mc.chat_type = 'maya') as maya_chats,
            COUNT(DISTINCT mc.user_id) as users_chatting
          FROM maya_chats mc
          LEFT JOIN maya_chat_messages mcm ON mcm.chat_id = mc.id
        `

        // Revenue Stats
        const [revenueStats] = await sql`
          SELECT 
            COUNT(CASE WHEN plan = 'sselfie_studio' THEN 1 END) as sselfie_studio_members,
            COUNT(CASE WHEN plan = 'pro' THEN 1 END) as pro_users,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions
          FROM subscriptions
          WHERE status != 'canceled'
        `

        return {
          success: true,
          scope: 'platform',
          platformStats: {
            totalUsers: Number(userStats?.total_users || 0),
            activeUsers: Number(userStats?.active_users || 0),
            newUsersThisWeek: Number(userStats?.new_users_this_week || 0),
            paidUsers: paid_users,
            customerBreakdown: {
              activeSubscribers: Number(customerBreakdown[0]?.active_subscribers || 0),
              oneTimeBuyers: Number(customerBreakdown[0]?.one_time_buyers || 0),
              totalPayingCustomers: Number(customerBreakdown[0]?.total_paying || 0),
            },
            totalGenerations: Number(generationStats?.total_generations || 0),
            generationsThisMonth: Number(generationStats?.generations_this_month || 0),
            generationsThisWeek: Number(generationStats?.generations_this_week || 0),
            totalFavorites: Number(generationStats?.total_favorites || 0),
            usersGenerating: Number(generationStats?.users_generating || 0),
            totalChats: Number(chatStats?.total_chats || 0),
            totalMessages: Number(chatStats?.total_messages || 0),
            mayaChats: Number(chatStats?.maya_chats || 0),
            usersChatting: Number(chatStats?.users_chatting || 0),
            sselfieStudioMembers: Number(revenueStats?.sselfie_studio_members || 0),
            proUsers: Number(revenueStats?.pro_users || 0),
            activeSubscriptions: Number(revenueStats?.active_subscriptions || 0),
          },
          data: {
            scope: 'platform',
            platformStats: {
              totalUsers: Number(userStats?.total_users || 0),
              activeUsers: Number(userStats?.active_users || 0),
              newUsersThisWeek: Number(userStats?.new_users_this_week || 0),
              paidUsers: paid_users,
              customerBreakdown: {
                activeSubscribers: Number(customerBreakdown[0]?.active_subscribers || 0),
                oneTimeBuyers: Number(customerBreakdown[0]?.one_time_buyers || 0),
                totalPayingCustomers: Number(customerBreakdown[0]?.total_paying || 0),
              },
              totalGenerations: Number(generationStats?.total_generations || 0),
              generationsThisMonth: Number(generationStats?.generations_this_month || 0),
              generationsThisWeek: Number(generationStats?.generations_this_week || 0),
              totalFavorites: Number(generationStats?.total_favorites || 0),
              usersGenerating: Number(generationStats?.users_generating || 0),
              totalChats: Number(chatStats?.total_chats || 0),
              totalMessages: Number(chatStats?.total_messages || 0),
              mayaChats: Number(chatStats?.maya_chats || 0),
              usersChatting: Number(chatStats?.users_chatting || 0),
              sselfieStudioMembers: Number(revenueStats?.sselfie_studio_members || 0),
              proUsers: Number(revenueStats?.pro_users || 0),
              activeSubscriptions: Number(revenueStats?.active_subscriptions || 0),
            }
          }
        }
      } else if (scope === 'user' && userId) {
        // User-specific analytics
        const [userStats] = await sql`
          SELECT 
            u.email,
            u.display_name,
            u.created_at as user_since,
            u.last_login_at,
            u.plan,
            COUNT(DISTINCT gi.id) as total_generations,
            COUNT(DISTINCT gi.id) FILTER (WHERE gi.saved = true) as total_favorites,
            COUNT(DISTINCT gi.id) FILTER (WHERE gi.created_at >= date_trunc('month', CURRENT_DATE)) as generations_this_month,
            COUNT(DISTINCT mc.id) as total_chats,
            COUNT(DISTINCT mcm.id) as total_messages
          FROM users u
          LEFT JOIN generated_images gi ON gi.user_id = u.id
          LEFT JOIN maya_chats mc ON mc.user_id = u.id
          LEFT JOIN maya_chat_messages mcm ON mcm.chat_id = mc.id
          WHERE u.id = ${parseInt(userId)}
          GROUP BY u.id, u.email, u.display_name, u.created_at, u.last_login_at, u.plan
        `

        return {
          success: true,
          scope: 'user',
          userStats: userStats || {},
          data: {
            scope: 'user',
            userStats: userStats || {}
          }
        }
      }

      return {
        success: false,
        error: 'Invalid scope or missing userId'
      }
    } catch (error: any) {
      console.error('[Alex] ❌ Error fetching platform analytics:', error)
      return {
        success: false,
        error: `Failed to fetch analytics: ${error.message}`
      }
    }
  }
}

