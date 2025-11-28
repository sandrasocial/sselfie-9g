import { createClient } from "@supabase/supabase-js"

// Initialize Supabase with service role key for admin access
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

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
        const { data, error } = await supabase
          .from("users")
          .select("id, email, display_name, first_name, last_name, created_at")
          .eq("role", "beta")
          .order("created_at", { ascending: false })

        if (error) throw error

        return {
          success: true,
          users: data,
          count: data?.length || 0,
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
        const { data, error } = await supabase
          .from("subscriptions")
          .select(
            `
            user_id,
            status,
            plan,
            current_period_start,
            current_period_end,
            users!inner(email, display_name, first_name, last_name)
          `,
          )
          .eq("status", "active")
          .order("current_period_start", { ascending: false })

        if (error) throw error

        return {
          success: true,
          users: data,
          count: data?.length || 0,
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
        // Get users created in last 7 days
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const { data, error } = await supabase
          .from("users")
          .select(
            `
            id,
            email,
            display_name,
            first_name,
            last_name,
            created_at,
            subscriptions(status, plan)
          `,
          )
          .gte("created_at", sevenDaysAgo.toISOString())
          .order("created_at", { ascending: false })

        if (error) throw error

        // Filter for users without active subscriptions
        const trialUsers = data?.filter(
          (user: any) =>
            !user.subscriptions || user.subscriptions.length === 0 || user.subscriptions[0]?.status !== "active",
        )

        return {
          success: true,
          users: trialUsers,
          count: trialUsers?.length || 0,
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

        // Get users with subscriptions ending soon or inactive
        const { data: subscriptions, error: subError } = await supabase
          .from("subscriptions")
          .select(
            `
            user_id,
            status,
            plan,
            current_period_end,
            users!inner(
              id,
              email,
              display_name,
              created_at
            )
          `,
          )
          .eq("status", "active")

        if (subError) throw subError

        // Get last activity for each user
        const { data: lastActivity, error: actError } = await supabase
          .from("maya_chat_messages")
          .select("id, created_at")
          .gte("created_at", cutoffDate.toISOString())

        if (actError) throw actError

        // Find users who haven't been active recently
        const activeUserIds = new Set(lastActivity?.map((msg: any) => msg.user_id))

        const churnRiskUsers = subscriptions?.filter((sub: any) => {
          const daysUntilRenewal = Math.floor(
            (new Date(sub.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
          )
          const isInactive = !activeUserIds.has(sub.user_id)
          const renewingSoon = daysUntilRenewal <= 7

          return isInactive || renewingSoon
        })

        return {
          success: true,
          users: churnRiskUsers,
          count: churnRiskUsers?.length || 0,
          reasons: {
            inactive: churnRiskUsers?.filter((u: any) => !activeUserIds.has(u.user_id)).length,
            renewingSoon: churnRiskUsers?.filter((u: any) => {
              const days = Math.floor((new Date(u.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              return days <= 7
            }).length,
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
        const { data: allUsers, error: usersError } = await supabase
          .from("users")
          .select("id, email, display_name, first_name, last_name, created_at")

        if (usersError) throw usersError

        // Get recent activity
        const { data: recentMessages, error: msgError } = await supabase
          .from("maya_chat_messages")
          .select("id, chat_id")
          .gte("created_at", cutoffDate.toISOString())

        if (msgError) throw msgError

        const { data: recentImages, error: imgError } = await supabase
          .from("ai_images")
          .select("id, user_id")
          .gte("created_at", cutoffDate.toISOString())

        if (imgError) throw imgError

        // Get chat user_ids from maya_chats
        const chatIds = recentMessages?.map((m: any) => m.chat_id) || []
        const { data: recentChats, error: chatError } = await supabase
          .from("maya_chats")
          .select("user_id")
          .in("id", chatIds)

        if (chatError) throw chatError

        // Create set of active user IDs
        const activeUserIds = new Set([
          ...(recentChats?.map((c: any) => c.user_id) || []),
          ...(recentImages?.map((i: any) => i.user_id) || []),
        ])

        // Filter for inactive users
        const inactiveUsers = allUsers?.filter((user: any) => !activeUserIds.has(user.id))

        return {
          success: true,
          users: inactiveUsers,
          count: inactiveUsers?.length || 0,
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

        // Count images per user
        const { data: imageCounts, error: imgError } = await supabase.rpc("get_image_counts_by_user")

        // If RPC doesn't exist, use a direct query
        const { data: images, error: imgError2 } = await supabase.from("ai_images").select("user_id")

        if (imgError2) throw imgError2

        // Count messages per user via chats
        const { data: chats, error: chatError } = await supabase.from("maya_chats").select("id, user_id")

        if (chatError) throw chatError

        const { data: messages, error: msgError } = await supabase.from("maya_chat_messages").select("id, chat_id")

        if (msgError) throw msgError

        // Build user activity map
        const userActivity = new Map()

        images?.forEach((img: any) => {
          const current = userActivity.get(img.user_id) || {
            images: 0,
            messages: 0,
          }
          current.images++
          userActivity.set(img.user_id, current)
        })

        // Map chat_id to user_id
        const chatToUser = new Map()
        chats?.forEach((chat: any) => {
          chatToUser.set(chat.id, chat.user_id)
        })

        messages?.forEach((msg: any) => {
          const userId = chatToUser.get(msg.chat_id)
          if (userId) {
            const current = userActivity.get(userId) || {
              images: 0,
              messages: 0,
            }
            current.messages++
            userActivity.set(userId, current)
          }
        })

        // Filter for heavy users
        const heavyUserIds = Array.from(userActivity.entries())
          .filter(([_, activity]: any) => activity.images >= minImages || activity.messages >= minMessages)
          .map(([userId]) => userId)

        // Get user details
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, email, display_name, first_name, last_name, created_at")
          .in("id", heavyUserIds)

        if (usersError) throw usersError

        // Attach activity stats
        const usersWithStats = users?.map((user: any) => ({
          ...user,
          activity: userActivity.get(user.id),
        }))

        return {
          success: true,
          users: usersWithStats,
          count: usersWithStats?.length || 0,
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

        const { data, error } = await supabase
          .from("users")
          .select("id, email, display_name, first_name, last_name, created_at")
          .gte("created_at", hoursAgo.toISOString())
          .order("created_at", { ascending: false })

        if (error) throw error

        return {
          success: true,
          users: data,
          count: data?.length || 0,
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
        // Get all users with newsletter subscription
        // For now, we'll fetch all users except those who explicitly opted out
        const { data, error } = await supabase
          .from("users")
          .select("id, email, display_name, first_name, last_name, created_at")
          .eq("email_notifications", true) // Assuming this field exists
          .order("created_at", { ascending: false })

        if (error) {
          // Fallback: if email_notifications doesn't exist, get all users
          const { data: allUsers, error: allError } = await supabase
            .from("users")
            .select("id, email, display_name, first_name, last_name, created_at")
            .order("created_at", { ascending: false })

          if (allError) throw allError

          return {
            success: true,
            users: allUsers,
            count: allUsers?.length || 0,
            segment: "newsletter_subscribers",
          }
        }

        return {
          success: true,
          users: data,
          count: data?.length || 0,
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
        // Get all users who have logged in within the last 30 days
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        const { data, error } = await supabase
          .from("users")
          .select("id, email, display_name, first_name, last_name, created_at, last_login_at")
          .gte("last_login_at", thirtyDaysAgo.toISOString())
          .order("last_login_at", { ascending: false })

        if (error) {
          // Fallback: if last_login_at doesn't exist, get all users
          const { data: allUsers, error: allError } = await supabase
            .from("users")
            .select("id, email, display_name, first_name, last_name, created_at")
            .order("created_at", { ascending: false })

          if (allError) throw allError

          return {
            success: true,
            users: allUsers,
            count: allUsers?.length || 0,
            segment: "all_active_users",
          }
        }

        return {
          success: true,
          users: data,
          count: data?.length || 0,
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
