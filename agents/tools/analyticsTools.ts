import { createClient } from "@supabase/supabase-js"

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

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
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        const { data, error } = await supabase
          .from("users")
          .select("id, email, display_name, created_at, plan")
          .gte("created_at", sevenDaysAgo.toISOString())
          .order("created_at", { ascending: false })

        if (error) throw error

        return {
          success: true,
          count: data?.length || 0,
          users: data,
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

        // Get users who have no recent maya_chat_messages or ai_images
        const { data: mayaActivity, error: mayaError } = await supabase
          .from("maya_chat_messages")
          .select("chat_id")
          .gte("created_at", cutoffDate.toISOString())

        if (mayaError) throw mayaError

        const { data: imageActivity, error: imageError } = await supabase
          .from("ai_images")
          .select("user_id")
          .gte("created_at", cutoffDate.toISOString())

        if (imageError) throw imageError

        // Get chat user_ids from maya_chats
        const activeChatIds = mayaActivity?.map((m) => m.chat_id) || []
        const { data: activeChats } = await supabase.from("maya_chats").select("user_id").in("id", activeChatIds)

        const activeUserIds = new Set([
          ...(activeChats?.map((c) => c.user_id) || []),
          ...(imageActivity?.map((i) => i.user_id) || []),
        ])

        // Get all users except active ones
        const { data: inactiveUsers, error: usersError } = await supabase
          .from("users")
          .select("id, email, display_name, created_at, last_login_at, plan")
          .not("id", "in", `(${Array.from(activeUserIds).join(",") || "null"})`)
          .order("last_login_at", { ascending: true })

        if (usersError) throw usersError

        return {
          success: true,
          count: inactiveUsers?.length || 0,
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
        // Count images per user
        const { data: imageCounts, error: imageError } = await supabase.from("ai_images").select("user_id")

        if (imageError) throw imageError

        // Count messages per user (via chats)
        const { data: messages, error: messageError } = await supabase.from("maya_chat_messages").select("chat_id")

        if (messageError) throw messageError

        const { data: chats, error: chatError } = await supabase.from("maya_chats").select("id, user_id")

        if (chatError) throw chatError

        // Aggregate counts
        const userActivity: Record<string, { images: number; messages: number }> = {}

        imageCounts?.forEach((img) => {
          if (!userActivity[img.user_id]) {
            userActivity[img.user_id] = { images: 0, messages: 0 }
          }
          userActivity[img.user_id].images++
        })

        const chatUserMap = new Map(chats?.map((c) => [c.id, c.user_id]))
        messages?.forEach((msg) => {
          const userId = chatUserMap.get(msg.chat_id)
          if (userId) {
            if (!userActivity[userId]) {
              userActivity[userId] = { images: 0, messages: 0 }
            }
            userActivity[userId].messages++
          }
        })

        // Get top 20 users
        const sortedUsers = Object.entries(userActivity)
          .sort((a, b) => b[1].images + b[1].messages - (a[1].images + a[1].messages))
          .slice(0, 20)

        // Get user details
        const userIds = sortedUsers.map(([id]) => id)
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, email, display_name, plan")
          .in("id", userIds)

        if (usersError) throw usersError

        const usersMap = new Map(users?.map((u) => [u.id, u]))

        const heavyUsers = sortedUsers.map(([userId, activity]) => ({
          ...usersMap.get(userId),
          totalImages: activity.images,
          totalMessages: activity.messages,
          totalActivity: activity.images + activity.messages,
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
        const { data: oldUsers, error: usersError } = await supabase
          .from("users")
          .select("id, email, display_name, created_at, last_login_at, plan")
          .lte("created_at", tenDaysAgo.toISOString())

        if (usersError) throw usersError

        // Get recent activity (last 7 days)
        const { data: recentMessages, error: msgError } = await supabase
          .from("maya_chat_messages")
          .select("chat_id")
          .gte("created_at", sevenDaysAgo.toISOString())

        if (msgError) throw msgError

        const { data: recentImages, error: imgError } = await supabase
          .from("ai_images")
          .select("user_id")
          .gte("created_at", sevenDaysAgo.toISOString())

        if (imgError) throw imgError

        // Get chat user_ids
        const activeChatIds = recentMessages?.map((m) => m.chat_id) || []
        const { data: activeChats } = await supabase.from("maya_chats").select("user_id").in("id", activeChatIds)

        const activeUserIds = new Set([
          ...(activeChats?.map((c) => c.user_id) || []),
          ...(recentImages?.map((i) => i.user_id) || []),
        ])

        // Filter for old users with no recent activity
        const churnRiskUsers = oldUsers?.filter((user) => !activeUserIds.has(user.id))

        return {
          success: true,
          count: churnRiskUsers?.length || 0,
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
        const { count: mayaChatsCount, error: chatsError } = await supabase
          .from("maya_chats")
          .select("*", { count: "exact", head: true })

        if (chatsError) throw chatsError

        // Count Maya messages
        const { count: mayaMessagesCount, error: messagesError } = await supabase
          .from("maya_chat_messages")
          .select("*", { count: "exact", head: true })

        if (messagesError) throw messagesError

        // Count photoshoot images (category='photoshoot')
        const { count: photoshootsCount, error: photosError } = await supabase
          .from("ai_images")
          .select("*", { count: "exact", head: true })
          .eq("category", "photoshoot")

        if (photosError) throw photosError

        // Count videos
        const { count: videosCount, error: videosError } = await supabase
          .from("generated_videos")
          .select("*", { count: "exact", head: true })

        if (videosError) throw videosError

        // Count concepts
        const { count: conceptsCount, error: conceptsError } = await supabase
          .from("maya_concepts")
          .select("*", { count: "exact", head: true })

        if (conceptsError) throw conceptsError

        // Count feed layouts
        const { count: feedLayoutsCount, error: feedError } = await supabase
          .from("feed_layouts")
          .select("*", { count: "exact", head: true })

        if (feedError) throw feedError

        return {
          success: true,
          stats: {
            mayaChats: mayaChatsCount || 0,
            mayaMessages: mayaMessagesCount || 0,
            photoshoots: photoshootsCount || 0,
            videos: videosCount || 0,
            concepts: conceptsCount || 0,
            feedLayouts: feedLayoutsCount || 0,
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
