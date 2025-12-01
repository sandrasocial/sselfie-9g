import { neon } from "@neondatabase/serverless"

// Lazy initialization to avoid errors when DATABASE_URL is missing
let sqlInstance: ReturnType<typeof neon> | null = null

function getSql() {
  if (!sqlInstance) {
    const dbUrl = process.env.DATABASE_URL
    if (!dbUrl) {
      throw new Error("DATABASE_URL environment variable is not set")
    }
    sqlInstance = neon(dbUrl, { disableWarningInBrowsers: true })
  }
  return sqlInstance
}

/**
 * Audience Tools
 * Tools for audience management, segmentation, and targeting
 * Used by: MarketingAutomationAgent, AdminSupervisorAgent
 */

export const audienceTools = {
  getBetaUsers: {
    description: "Fetch all users marked as beta testers",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async () => {
      try {
        const result = await getSql()`
          SELECT id, email, display_name, first_name, last_name, created_at
          FROM users
          WHERE role = 'beta'
          ORDER BY created_at DESC
        `

        return {
          success: true,
          users: result,
          count: result.length,
        }
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          users: [],
          count: 0,
        }
      }
    },
  },

  getPayingUsers: {
    description: "Fetch all active subscription users",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async () => {
      try {
        const result = await getSql()`
          SELECT 
            s.user_id,
            s.status,
            s.plan,
            s.current_period_start,
            s.current_period_end,
            u.email,
            u.display_name,
            u.first_name,
            u.last_name
          FROM subscriptions s
          INNER JOIN users u ON u.id = s.user_id
          WHERE s.status = 'active'
          ORDER BY s.current_period_start DESC
        `

        return {
          success: true,
          users: result,
          count: result.length,
        }
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          users: [],
          count: 0,
        }
      }
    },
  },

  getTrialUsers: {
    description: "Fetch users inside trial period (first 7 days, no active subscription)",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async () => {
      try {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        // Get users created in last 7 days
        const recentUsers = await getSql()`
          SELECT 
            u.id,
            u.email,
            u.display_name,
            u.first_name,
            u.last_name,
            u.created_at
          FROM users u
          WHERE u.created_at >= ${sevenDaysAgo.toISOString()}
          ORDER BY u.created_at DESC
        `

        // Get active subscriptions for these users
        const userIds = recentUsers.map((u: any) => u.id)
        const activeSubscriptions = userIds.length > 0
          ? await getSql()`
              SELECT user_id
              FROM subscriptions
              WHERE user_id IN ${sql(userIds)}
                AND status = 'active'
            `
          : []

        const activeSubUserIds = new Set(activeSubscriptions.map((s: any) => s.user_id))

        // Filter for users without active subscriptions
        const trialUsers = recentUsers.filter((user: any) => !activeSubUserIds.has(user.id))

        return {
          success: true,
          users: trialUsers,
          count: trialUsers.length,
        }
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          users: [],
          count: 0,
        }
      }
    },
  },

  getChurnRiskUsers: {
    description: "Fetch users with low activity, older accounts, or nearing subscription renewal",
    parameters: {
      type: "object",
      properties: {
        inactivityDays: {
          type: "number",
          description: "Days of inactivity to consider churn risk",
          default: 14,
        },
      },
      required: [],
    },
    execute: async (params: { inactivityDays?: number }) => {
      try {
        const inactivityDays = params.inactivityDays || 14
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - inactivityDays)

        // Get users with active subscriptions
        const subscriptions = await getSql()`
          SELECT 
            s.user_id,
            s.status,
            s.plan,
            s.current_period_end,
            u.id,
            u.email,
            u.display_name,
            u.created_at
          FROM subscriptions s
          INNER JOIN users u ON u.id = s.user_id
          WHERE s.status = 'active'
        `

        // Get recent activity
        const activeUsers = await getSql()`
          SELECT DISTINCT u.id
          FROM users u
          LEFT JOIN maya_chats mc ON mc.user_id = u.id
          LEFT JOIN maya_chat_messages mcm ON mcm.chat_id = mc.id AND mcm.created_at >= ${cutoffDate.toISOString()}
          LEFT JOIN ai_images ai ON ai.user_id = u.id AND ai.created_at >= ${cutoffDate.toISOString()}
          WHERE mcm.id IS NOT NULL OR ai.id IS NOT NULL
        `

        const activeUserIds = new Set(activeUsers.map((u: any) => u.id))

        // Find users who haven't been active recently or renewing soon
        const churnRiskUsers = subscriptions
          .map((sub: any) => {
            const daysUntilRenewal = Math.floor(
              (new Date(sub.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
            )
            const isInactive = !activeUserIds.has(sub.user_id)
            const renewingSoon = daysUntilRenewal <= 7

            return {
              ...sub,
              isInactive,
              renewingSoon,
              daysUntilRenewal,
            }
          })
          .filter((sub: any) => sub.isInactive || sub.renewingSoon)

        const inactiveCount = churnRiskUsers.filter((u: any) => u.isInactive).length
        const renewingSoonCount = churnRiskUsers.filter((u: any) => u.renewingSoon).length

        return {
          success: true,
          users: churnRiskUsers,
          count: churnRiskUsers.length,
          reasons: {
            inactive: inactiveCount,
            renewingSoon: renewingSoonCount,
          },
        }
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          users: [],
          count: 0,
        }
      }
    },
  },

  getInactiveUsersSegment: {
    description: "Segment: users with 5+ days inactivity",
    parameters: {
      type: "object",
      properties: {
        minInactiveDays: {
          type: "number",
          description: "Minimum days of inactivity",
          default: 5,
        },
      },
      required: [],
    },
    execute: async (params: { minInactiveDays?: number }) => {
      try {
        const minDays = params.minInactiveDays || 5
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - minDays)

        // Get all users
        const allUsers = await getSql()`
          SELECT id, email, display_name, first_name, last_name, created_at
          FROM users
        `

        // Get recent activity
        const activeUsers = await getSql()`
          SELECT DISTINCT u.id
          FROM users u
          LEFT JOIN maya_chats mc ON mc.user_id = u.id
          LEFT JOIN maya_chat_messages mcm ON mcm.chat_id = mc.id AND mcm.created_at >= ${cutoffDate.toISOString()}
          LEFT JOIN ai_images ai ON ai.user_id = u.id AND ai.created_at >= ${cutoffDate.toISOString()}
          WHERE mcm.id IS NOT NULL OR ai.id IS NOT NULL
        `

        const activeUserIds = new Set(activeUsers.map((u: any) => u.id))

        // Filter for inactive users
        const inactiveUsers = allUsers.filter((user: any) => !activeUserIds.has(user.id))

        return {
          success: true,
          users: inactiveUsers,
          count: inactiveUsers.length,
          inactiveDays: minDays,
        }
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          users: [],
          count: 0,
        }
      }
    },
  },

  getHeavyUsersSegment: {
    description: "Segment: power users with high engagement",
    parameters: {
      type: "object",
      properties: {
        minImages: {
          type: "number",
          description: "Minimum images generated",
          default: 50,
        },
        minMessages: {
          type: "number",
          description: "Minimum Maya messages",
          default: 100,
        },
      },
      required: [],
    },
    execute: async (params: { minImages?: number; minMessages?: number }) => {
      try {
        const minImages = params.minImages || 50
        const minMessages = params.minMessages || 100

        // Count images and messages per user
        const userActivity = await getSql()`
          SELECT 
            u.id,
            u.email,
            u.display_name,
            u.first_name,
            u.last_name,
            u.created_at,
            COUNT(DISTINCT ai.id) as image_count,
            COUNT(DISTINCT mcm.id) as message_count
          FROM users u
          LEFT JOIN ai_images ai ON ai.user_id = u.id
          LEFT JOIN maya_chats mc ON mc.user_id = u.id
          LEFT JOIN maya_chat_messages mcm ON mcm.chat_id = mc.id
          GROUP BY u.id, u.email, u.display_name, u.first_name, u.last_name, u.created_at
          HAVING COUNT(DISTINCT ai.id) >= ${minImages} OR COUNT(DISTINCT mcm.id) >= ${minMessages}
        `

        const usersWithStats = userActivity.map((user: any) => ({
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          first_name: user.first_name,
          last_name: user.last_name,
          created_at: user.created_at,
          activity: {
            images: Number(user.image_count) || 0,
            messages: Number(user.message_count) || 0,
          },
        }))

        return {
          success: true,
          users: usersWithStats,
          count: usersWithStats.length,
          criteria: { minImages, minMessages },
        }
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          users: [],
          count: 0,
        }
      }
    },
  },

  getNewUsersSegment: {
    description: "Segment: users in first 72 hours after signup",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async () => {
      try {
        const hoursAgo = new Date()
        hoursAgo.setHours(hoursAgo.getHours() - 72)

        const result = await getSql()`
          SELECT id, email, display_name, first_name, last_name, created_at
          FROM users
          WHERE created_at >= ${hoursAgo.toISOString()}
          ORDER BY created_at DESC
        `

        return {
          success: true,
          users: result,
          count: result.length,
          timeWindow: "72 hours",
        }
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          users: [],
          count: 0,
        }
      }
    },
  },

  getNewsletterSubscribers: {
    description: "Get all users in the newsletter_subscribers segment",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async () => {
      try {
        // Get all users with email notifications enabled
        // Fallback to all users if email_notifications column doesn't exist
        let result
        try {
          result = await getSql()`
            SELECT id, email, display_name, first_name, last_name, created_at
            FROM users
            WHERE email_notifications = true
            ORDER BY created_at DESC
          `
        } catch (error: any) {
          // If column doesn't exist, get all users
          result = await getSql()`
            SELECT id, email, display_name, first_name, last_name, created_at
            FROM users
            ORDER BY created_at DESC
          `
        }

        return {
          success: true,
          users: result,
          count: result.length,
          segment: "newsletter_subscribers",
        }
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          users: [],
          count: 0,
        }
      }
    },
  },

  getAllActiveUsers: {
    description: "Get all active users (default announcement audience)",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async () => {
      try {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        // Try to get users with recent login, fallback to all users
        let result
        try {
          result = await getSql()`
            SELECT id, email, display_name, first_name, last_name, created_at, last_login_at
            FROM users
            WHERE last_login_at >= ${thirtyDaysAgo.toISOString()}
            ORDER BY last_login_at DESC
          `
        } catch (error: any) {
          // If last_login_at doesn't exist, get all users
          result = await getSql()`
            SELECT id, email, display_name, first_name, last_name, created_at
            FROM users
            ORDER BY created_at DESC
          `
        }

        return {
          success: true,
          users: result,
          count: result.length,
          segment: "all_active_users",
        }
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
          users: [],
          count: 0,
        }
      }
    },
  },
}
