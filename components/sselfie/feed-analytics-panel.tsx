"use client"

import { TrendingUp, Clock, Users, Heart } from "lucide-react"

interface FeedAnalyticsPanelProps {
  feedStrategy?: any
}

export default function FeedAnalyticsPanel({ feedStrategy }: FeedAnalyticsPanelProps) {
  // Mock analytics data - in production, this would come from Instagram API or predictions
  const analytics = {
    predictedEngagement: "4.2%",
    bestPostingTimes: ["9:00 AM", "1:00 PM", "7:00 PM"],
    targetReach: "2.5K",
    contentMix: {
      personal: 40,
      educational: 30,
      lifestyle: 30,
    },
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-stone-600" />
          <h3 className="text-sm font-medium uppercase tracking-wider text-stone-600">Feed Analytics</h3>
        </div>
      </div>

      {/* Predicted Engagement */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-600">Predicted Engagement</span>
          <span className="text-lg font-bold text-stone-950">{analytics.predictedEngagement}</span>
        </div>
        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500" style={{ width: "42%" }} />
        </div>
        <p className="text-xs text-stone-500">Above average for your niche</p>
      </div>

      {/* Best Posting Times */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-stone-600" />
          <span className="text-xs font-medium text-stone-600 uppercase tracking-wider">Best Posting Times</span>
        </div>
        <div className="flex gap-2">
          {analytics.bestPostingTimes.map((time) => (
            <div key={time} className="flex-1 px-3 py-2 bg-stone-50 rounded-lg text-center">
              <div className="text-sm font-medium text-stone-950">{time}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Target Reach */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-stone-600" />
          <span className="text-xs font-medium text-stone-600 uppercase tracking-wider">Estimated Reach</span>
        </div>
        <div className="text-2xl font-bold text-stone-950">{analytics.targetReach}</div>
        <p className="text-xs text-stone-500">Based on your current followers and engagement</p>
      </div>

      {/* Content Mix */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-stone-600" />
          <span className="text-xs font-medium text-stone-600 uppercase tracking-wider">Content Balance</span>
        </div>
        <div className="space-y-2">
          {Object.entries(analytics.contentMix).map(([type, percentage]) => (
            <div key={type} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-600 capitalize">{type}</span>
                <span className="font-medium text-stone-950">{percentage}%</span>
              </div>
              <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div className="h-full bg-stone-950" style={{ width: `${percentage}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
