import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const scope = searchParams.get("scope") || "platform" // Default to platform-wide view

    if (scope === "platform") {
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
            AND stripe_payment_id IS NOT NULL  -- Only verified payments
            AND (is_test_mode = FALSE OR is_test_mode IS NULL)
        ) as all_paying_customers
      `
      const paid_users = Number(paidUsersResult[0]?.paid_users || 0)

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
          COUNT(DISTINCT mc.id) FILTER (WHERE mc.chat_type = 'feed_designer') as feed_designer_chats,
          COUNT(DISTINCT mc.user_id) as users_chatting
        FROM maya_chats mc
        LEFT JOIN maya_chat_messages mcm ON mcm.chat_id = mc.id
      `

      // Revenue Stats (from Stripe subscriptions)
      const [revenueStats] = await sql`
        SELECT 
          COUNT(CASE WHEN plan = 'sselfie_studio' THEN 1 END) as sselfie_studio_members,
          COUNT(CASE WHEN plan = 'pro' THEN 1 END) as pro_users,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions
        FROM subscriptions
        WHERE status != 'canceled'
      `

      // Content Performance (Top Categories)
      const topCategories = await sql`
        SELECT 
          category,
          COUNT(*) as count,
          COUNT(CASE WHEN saved = true THEN 1 END) as favorites,
          ROUND((COUNT(CASE WHEN saved = true THEN 1 END)::numeric / COUNT(*)::numeric * 100), 1) as save_rate
        FROM generated_images
        WHERE category IS NOT NULL
        GROUP BY category
        ORDER BY count DESC
        LIMIT 10
      `

      // Recent Growth Activity (last 30 days)
      const recentActivity = await sql`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count,
          'generations' as type
        FROM generated_images
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      `

      // Trained Models
      const [modelsStats] = await sql`
        SELECT 
          COUNT(*) as total_models,
          COUNT(CASE WHEN training_status = 'completed' THEN 1 END) as completed_models,
          COUNT(CASE WHEN training_status = 'training' THEN 1 END) as models_in_training
        FROM user_models
      `

      // Feed Designer Stats
      const [feedStats] = await sql`
        SELECT 
          COUNT(*) as total_feeds,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_feeds,
          COUNT(DISTINCT user_id) as users_with_feeds
        FROM feed_layouts
      `

      return NextResponse.json({
        scope: "platform",
        platformStats: {
          totalUsers: Number(userStats?.total_users || 0),
          activeUsers: Number(userStats?.active_users || 0),
          newUsersThisWeek: Number(userStats?.new_users_this_week || 0),
          paidUsers: paid_users,
          
          totalGenerations: Number(generationStats?.total_generations || 0),
          generationsThisMonth: Number(generationStats?.generations_this_month || 0),
          generationsThisWeek: Number(generationStats?.generations_this_week || 0),
          totalFavorites: Number(generationStats?.total_favorites || 0),
          usersGenerating: Number(generationStats?.users_generating || 0),
          avgGenerationsPerUser: userStats?.total_users > 0 
            ? Math.round(Number(generationStats?.total_generations) / Number(userStats?.total_users))
            : 0,

          totalChats: Number(chatStats?.total_chats || 0),
          totalMessages: Number(chatStats?.total_messages || 0),
          mayaChats: Number(chatStats?.maya_chats || 0),
          feedDesignerChats: Number(chatStats?.feed_designer_chats || 0),
          usersChatting: Number(chatStats?.users_chatting || 0),

          sselfieStudioMembers: Number(revenueStats?.sselfie_studio_members || 0),
          proUsers: Number(revenueStats?.pro_users || 0),
          activeSubscriptions: Number(revenueStats?.active_subscriptions || 0),

          totalModels: Number(modelsStats?.total_models || 0),
          completedModels: Number(modelsStats?.completed_models || 0),
          modelsInTraining: Number(modelsStats?.models_in_training || 0),

          totalFeeds: Number(feedStats?.total_feeds || 0),
          completedFeeds: Number(feedStats?.completed_feeds || 0),
          usersWithFeeds: Number(feedStats?.users_with_feeds || 0),
        },
        topCategories: topCategories || [],
        recentActivity: recentActivity || [],
      })
    }

    const targetUserId = searchParams.get("userId")
    if (!targetUserId) {
      return NextResponse.json({ error: "userId required for user scope" }, { status: 400 })
    }

    // Get comprehensive user analytics
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
        COUNT(DISTINCT gi.id) FILTER (WHERE gi.created_at >= NOW() - INTERVAL '7 days') as generations_this_week,
        COUNT(DISTINCT mc.id) as total_chats,
        COUNT(DISTINCT mc.id) FILTER (WHERE mc.chat_type = 'maya') as maya_chats,
        COUNT(DISTINCT mc.id) FILTER (WHERE mc.chat_type = 'feed_designer') as feed_designer_chats,
        COUNT(DISTINCT mcm.id) as total_messages,
        COUNT(DISTINCT fl.id) as total_feed_layouts,
        COUNT(DISTINCT fl.id) FILTER (WHERE fl.status = 'completed') as completed_feeds,
        COUNT(DISTINCT um.id) as trained_models,
        COUNT(DISTINCT um.id) FILTER (WHERE um.training_status = 'completed') as completed_models
      FROM users u
      LEFT JOIN generated_images gi ON gi.user_id = u.id
      LEFT JOIN maya_chats mc ON mc.user_id = u.id
      LEFT JOIN maya_chat_messages mcm ON mcm.chat_id = mc.id
      LEFT JOIN feed_layouts fl ON fl.user_id = u.id
      LEFT JOIN user_models um ON um.user_id = u.id
      WHERE u.id = ${targetUserId}
      GROUP BY u.id, u.email, u.display_name, u.created_at, u.last_login_at, u.plan
    `

    // Get recent activity (last 30 days)
    const recentActivity = await sql`
      SELECT 
        DATE(gi.created_at) as date,
        COUNT(*) as count,
        'generation' as type
      FROM generated_images gi
      WHERE gi.user_id = ${targetUserId} AND gi.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(gi.created_at)
      
      UNION ALL
      
      SELECT 
        DATE(mcm.created_at) as date,
        COUNT(*) as count,
        'chat_message' as type
      FROM maya_chat_messages mcm
      JOIN maya_chats mc ON mc.id = mcm.chat_id
      WHERE mc.user_id = ${targetUserId} AND mcm.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(mcm.created_at)
      
      ORDER BY date DESC
    `

    // Get top categories
    const topCategories = await sql`
      SELECT 
        category,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE saved = true) as favorites
      FROM generated_images
      WHERE user_id = ${targetUserId}
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `

    // Get chat engagement by type
    const chatEngagement = await sql`
      SELECT 
        mc.chat_type,
        mc.chat_category,
        COUNT(DISTINCT mc.id) as chat_count,
        COUNT(mcm.id) as message_count,
        MAX(mc.last_activity) as last_activity
      FROM maya_chats mc
      LEFT JOIN maya_chat_messages mcm ON mcm.chat_id = mc.id
      WHERE mc.user_id = ${targetUserId}
      GROUP BY mc.chat_type, mc.chat_category
      ORDER BY message_count DESC
    `

    // Get personal brand info
    const [personalBrand] = await sql`
      SELECT 
        business_type,
        brand_voice,
        target_audience,
        content_pillars,
        is_completed,
        onboarding_step
      FROM user_personal_brand
      WHERE user_id = ${targetUserId}
    `

    return NextResponse.json({
      userStats: userStats || {},
      recentActivity: recentActivity || [],
      topCategories: topCategories || [],
      chatEngagement: chatEngagement || [],
      personalBrand: personalBrand || null,
    })
  } catch (error) {
    console.error("[v0] Error fetching admin analytics:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
