"use client"

import { useEffect, useState } from "react"

interface AnalyticsData {
  userStats: {
    email: string
    display_name: string
    user_since: string
    last_login_at: string
    plan: string
    total_generations: number
    total_favorites: number
    generations_this_month: number
    generations_this_week: number
    total_chats: number
    maya_chats: number
    feed_designer_chats: number
    total_messages: number
    total_feed_layouts: number
    completed_feeds: number
    trained_models: number
    completed_models: number
  }
  recentActivity: Array<{
    date: string
    count: number
    type: string
  }>
  topCategories: Array<{
    category: string
    count: number
    favorites: number
  }>
  chatEngagement: Array<{
    chat_type: string
    chat_category: string
    chat_count: number
    message_count: number
    last_activity: string
  }>
  personalBrand: {
    business_type: string
    brand_voice: string
    target_audience: string
    content_pillars: string
    is_completed: boolean
    onboarding_step: number
  } | null
}

interface AdminAnalyticsPanelProps {
  userId: string
}

export function AdminAnalyticsPanel({ userId }: AdminAnalyticsPanelProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch(`/api/admin/agent/analytics?userId=${userId}`)
        if (response.ok) {
          const data = await response.json()
          setAnalytics(data)
        }
      } catch (error) {
        console.error("Error fetching analytics:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [userId])

  if (loading) {
    return (
      <div className="p-6 bg-stone-50 border border-stone-200 rounded-lg">
        <p className="text-sm text-stone-500">Loading analytics...</p>
      </div>
    )
  }

  if (!analytics) {
    return null
  }

  const { userStats, topCategories, chatEngagement, personalBrand } = analytics

  return (
    <div className="space-y-4">
      {/* User Overview */}
      <div className="p-6 bg-stone-50 border border-stone-200 rounded-lg">
        <h3
          className="text-lg font-light uppercase mb-4 text-stone-900"
          style={{ fontFamily: "'Times New Roman', serif", letterSpacing: "0.2em" }}
        >
          User Overview
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase text-stone-500 mb-1" style={{ letterSpacing: "0.15em" }}>
              Email
            </p>
            <p className="text-sm text-stone-900">{userStats.email}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-stone-500 mb-1" style={{ letterSpacing: "0.15em" }}>
              Plan
            </p>
            <p className="text-sm text-stone-900">{userStats.plan || "Free"}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-stone-500 mb-1" style={{ letterSpacing: "0.15em" }}>
              Member Since
            </p>
            <p className="text-sm text-stone-900">{new Date(userStats.user_since).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-stone-500 mb-1" style={{ letterSpacing: "0.15em" }}>
              Last Login
            </p>
            <p className="text-sm text-stone-900">
              {userStats.last_login_at ? new Date(userStats.last_login_at).toLocaleDateString() : "Never"}
            </p>
          </div>
        </div>
      </div>

      {/* Generation Stats */}
      <div className="p-6 bg-stone-50 border border-stone-200 rounded-lg">
        <h3
          className="text-lg font-light uppercase mb-4 text-stone-900"
          style={{ fontFamily: "'Times New Roman', serif", letterSpacing: "0.2em" }}
        >
          Generation Stats
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-2xl font-light text-stone-900">{userStats.total_generations}</p>
            <p className="text-xs uppercase text-stone-500" style={{ letterSpacing: "0.15em" }}>
              Total
            </p>
          </div>
          <div>
            <p className="text-2xl font-light text-stone-900">{userStats.generations_this_month}</p>
            <p className="text-xs uppercase text-stone-500" style={{ letterSpacing: "0.15em" }}>
              This Month
            </p>
          </div>
          <div>
            <p className="text-2xl font-light text-stone-900">{userStats.generations_this_week}</p>
            <p className="text-xs uppercase text-stone-500" style={{ letterSpacing: "0.15em" }}>
              This Week
            </p>
          </div>
          <div>
            <p className="text-2xl font-light text-stone-900">{userStats.total_favorites}</p>
            <p className="text-xs uppercase text-stone-500" style={{ letterSpacing: "0.15em" }}>
              Favorites
            </p>
          </div>
        </div>
      </div>

      {/* Chat Engagement */}
      <div className="p-6 bg-stone-50 border border-stone-200 rounded-lg">
        <h3
          className="text-lg font-light uppercase mb-4 text-stone-900"
          style={{ fontFamily: "'Times New Roman', serif", letterSpacing: "0.2em" }}
        >
          Chat Engagement
        </h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-2xl font-light text-stone-900">{userStats.total_chats}</p>
            <p className="text-xs uppercase text-stone-500" style={{ letterSpacing: "0.15em" }}>
              Total Chats
            </p>
          </div>
          <div>
            <p className="text-2xl font-light text-stone-900">{userStats.total_messages}</p>
            <p className="text-xs uppercase text-stone-500" style={{ letterSpacing: "0.15em" }}>
              Messages
            </p>
          </div>
          <div>
            <p className="text-2xl font-light text-stone-900">
              {userStats.total_messages > 0 ? Math.round(userStats.total_messages / userStats.total_chats) : 0}
            </p>
            <p className="text-xs uppercase text-stone-500" style={{ letterSpacing: "0.15em" }}>
              Avg per Chat
            </p>
          </div>
        </div>
        {chatEngagement.length > 0 && (
          <div className="space-y-2">
            {chatEngagement.map((engagement, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-t border-stone-200">
                <div>
                  <p className="text-sm text-stone-900">
                    {engagement.chat_type} {engagement.chat_category && `- ${engagement.chat_category}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-stone-900">
                    {engagement.chat_count} chats, {engagement.message_count} messages
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Categories */}
      {topCategories.length > 0 && (
        <div className="p-6 bg-stone-50 border border-stone-200 rounded-lg">
          <h3
            className="text-lg font-light uppercase mb-4 text-stone-900"
            style={{ fontFamily: "'Times New Roman', serif", letterSpacing: "0.2em" }}
          >
            Top Categories
          </h3>
          <div className="space-y-2">
            {topCategories.map((category, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-t border-stone-200">
                <p className="text-sm text-stone-900">{category.category}</p>
                <div className="text-right">
                  <p className="text-sm text-stone-900">
                    {category.count} generated, {category.favorites} favorited
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Personal Brand */}
      {personalBrand && (
        <div className="p-6 bg-stone-50 border border-stone-200 rounded-lg">
          <h3
            className="text-lg font-light uppercase mb-4 text-stone-900"
            style={{ fontFamily: "'Times New Roman', serif", letterSpacing: "0.2em" }}
          >
            Personal Brand
          </h3>
          <div className="space-y-3">
            {personalBrand.business_type && (
              <div>
                <p className="text-xs uppercase text-stone-500 mb-1" style={{ letterSpacing: "0.15em" }}>
                  Business Type
                </p>
                <p className="text-sm text-stone-900">{personalBrand.business_type}</p>
              </div>
            )}
            {personalBrand.brand_voice && (
              <div>
                <p className="text-xs uppercase text-stone-500 mb-1" style={{ letterSpacing: "0.15em" }}>
                  Brand Voice
                </p>
                <p className="text-sm text-stone-900">{personalBrand.brand_voice}</p>
              </div>
            )}
            {personalBrand.target_audience && (
              <div>
                <p className="text-xs uppercase text-stone-500 mb-1" style={{ letterSpacing: "0.15em" }}>
                  Target Audience
                </p>
                <p className="text-sm text-stone-900">{personalBrand.target_audience}</p>
              </div>
            )}
            {personalBrand.content_pillars && (
              <div>
                <p className="text-xs uppercase text-stone-500 mb-1" style={{ letterSpacing: "0.15em" }}>
                  Content Pillars
                </p>
                <p className="text-sm text-stone-900">{personalBrand.content_pillars}</p>
              </div>
            )}
            <div>
              <p className="text-xs uppercase text-stone-500 mb-1" style={{ letterSpacing: "0.15em" }}>
                Onboarding Status
              </p>
              <p className="text-sm text-stone-900">
                {personalBrand.is_completed ? "Completed" : `Step ${personalBrand.onboarding_step}`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
