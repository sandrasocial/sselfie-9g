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
 * Analytics Tools
 * Tools for revenue analysis, user behavior tracking, and metrics
 * Used by: AdminSupervisorAgent
 */

export const analyticsTools = {
  getRecentSignups: {
    description: "Fetch users who signed up within the last 7 days",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async () => {
      try {
        const sql = getSql()
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const result = await sql`
          SELECT id, email, display_name, created_at, plan
          FROM users
          WHERE created_at >= ${sevenDaysAgo.toISOString()}
          ORDER BY created_at DESC
        `

        return {
          success: true,
          count: result.length,
          users: result,
        }
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        }
      }
    },
  },

  getInactiveUsers: {
    description: "Fetch users who have not used Maya or photoshoots for X days",
    parameters: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Number of days of inactivity to check for",
        },
      },
      required: ["days"],
    },
    execute: async ({ days }: { days: number }) => {
      try {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)

        // Get users with recent activity
        const activeUsers = await getSql()`
          SELECT DISTINCT u.id
          FROM users u
          LEFT JOIN maya_chats mc ON mc.user_id = u.id
          LEFT JOIN maya_chat_messages mcm ON mcm.chat_id = mc.id AND mcm.created_at >= ${cutoffDate.toISOString()}
          LEFT JOIN ai_images ai ON ai.user_id = u.id AND ai.created_at >= ${cutoffDate.toISOString()}
          WHERE mcm.id IS NOT NULL OR ai.id IS NOT NULL
        `

        const activeUserIds = activeUsers.map((u: any) => u.id)

        // Get inactive users
        const inactiveUsers = activeUserIds.length > 0
          ? await sql`
              SELECT id, email, display_name, created_at, last_login_at, plan
              FROM users
              WHERE id NOT IN ${sql(activeUserIds)}
              ORDER BY last_login_at ASC NULLS LAST
            `
          : await sql`
              SELECT id, email, display_name, created_at, last_login_at, plan
              FROM users
              ORDER BY last_login_at ASC NULLS LAST
            `

        return {
          success: true,
          count: inactiveUsers.length,
          inactiveUsers,
        }
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        }
      }
    },
  },

  getHeavyUsers: {
    description: "Fetch users who generate the most images or messages",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async () => {
      try {
        // Count images and messages per user
        const userActivity = await getSql()`
          SELECT 
            u.id,
            u.email,
            u.display_name,
            u.plan,
            COUNT(DISTINCT ai.id) as total_images,
            COUNT(DISTINCT mcm.id) as total_messages
          FROM users u
          LEFT JOIN ai_images ai ON ai.user_id = u.id
          LEFT JOIN maya_chats mc ON mc.user_id = u.id
          LEFT JOIN maya_chat_messages mcm ON mcm.chat_id = mc.id
          GROUP BY u.id, u.email, u.display_name, u.plan
          ORDER BY (COUNT(DISTINCT ai.id) + COUNT(DISTINCT mcm.id)) DESC
          LIMIT 20
        `

        const heavyUsers = userActivity.map((u: any) => ({
          id: u.id,
          email: u.email,
          display_name: u.display_name,
          plan: u.plan,
          totalImages: Number(u.total_images) || 0,
          totalMessages: Number(u.total_messages) || 0,
          totalActivity: (Number(u.total_images) || 0) + (Number(u.total_messages) || 0),
        }))

        return {
          success: true,
          count: heavyUsers.length,
          heavyUsers,
        }
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        }
      }
    },
  },

  getChurnRiskUsers: {
    description: "Users who have low activity AND signed up more than 10 days ago",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async () => {
      try {
        const tenDaysAgo = new Date()
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)

        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        // Get users who signed up more than 10 days ago
        const oldUsers = await getSql()`
          SELECT id, email, display_name, created_at, last_login_at, plan
          FROM users
          WHERE created_at <= ${tenDaysAgo.toISOString()}
        `

        // Get users with recent activity (last 7 days)
        const activeUsers = await getSql()`
          SELECT DISTINCT u.id
          FROM users u
          LEFT JOIN maya_chats mc ON mc.user_id = u.id
          LEFT JOIN maya_chat_messages mcm ON mcm.chat_id = mc.id AND mcm.created_at >= ${sevenDaysAgo.toISOString()}
          LEFT JOIN ai_images ai ON ai.user_id = u.id AND ai.created_at >= ${sevenDaysAgo.toISOString()}
          WHERE mcm.id IS NOT NULL OR ai.id IS NOT NULL
        `

        const activeUserIds = new Set(activeUsers.map((u: any) => u.id))

        // Filter for old users with no recent activity
        const churnRiskUsers = oldUsers.filter((user: any) => !activeUserIds.has(user.id))

        return {
          success: true,
          count: churnRiskUsers.length,
          churnRiskUsers,
        }
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        }
      }
    },
  },

  getFeatureUsageStats: {
    description: "Count usage of major features: Maya chat, photoshoots, videos, concepts",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async () => {
      try {
        // Count Maya chats
        const [mayaChatsResult] = await getSql()`
          SELECT COUNT(*) as count
          FROM maya_chats
        `
        const mayaChatsCount = Number(mayaChatsResult?.count || 0)

        // Count Maya messages
        const [mayaMessagesResult] = await getSql()`
          SELECT COUNT(*) as count
          FROM maya_chat_messages
        `
        const mayaMessagesCount = Number(mayaMessagesResult?.count || 0)

        // Count photoshoot images (category='photoshoot')
        const [photoshootsResult] = await getSql()`
          SELECT COUNT(*) as count
          FROM ai_images
          WHERE category = 'photoshoot'
        `
        const photoshootsCount = Number(photoshootsResult?.count || 0)

        // Count videos
        const [videosResult] = await sql`
          SELECT COUNT(*) as count
          FROM generated_videos
        `
        const videosCount = Number(videosResult?.count || 0)

        // Count concepts
        const [conceptsResult] = await sql`
          SELECT COUNT(*) as count
          FROM maya_concepts
        `
        const conceptsCount = Number(conceptsResult?.count || 0)

        // Count feed layouts
        const [feedLayoutsResult] = await sql`
          SELECT COUNT(*) as count
          FROM feed_layouts
        `
        const feedLayoutsCount = Number(feedLayoutsResult?.count || 0)

        return {
          success: true,
          stats: {
            mayaChats: mayaChatsCount,
            mayaMessages: mayaMessagesCount,
            photoshoots: photoshootsCount,
            videos: videosCount,
            concepts: conceptsCount,
            feedLayouts: feedLayoutsCount,
          },
        }
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        }
      }
    },
  },
}
