"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ChevronLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Lightbulb,
  FlaskRound,
} from "lucide-react"
import type { PerformanceData } from "@/lib/brand-engine/types"

export default function PerformancePage() {
  const [performance, setPerformance] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchPerformance()
  }, [])

  const fetchPerformance = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/brand-engine/performance")
      const result = await response.json()

      if (result.success) {
        setPerformance(result.data)
      } else {
        setError(result.error || "Failed to load performance data")
      }
    } catch (err) {
      setError("Network error loading performance data")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading performance data...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !performance) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>{error || "Performance data not found"}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const getPerformanceIcon = (perf: string) => {
    switch (perf) {
      case "winner":
        return <TrendingUp className="w-5 h-5 text-green-600" />
      case "loser":
        return <TrendingDown className="w-5 h-5 text-red-600" />
      default:
        return <Minus className="w-5 h-5 text-gray-600" />
    }
  }

  const getPerformanceBadge = (perf: string) => {
    switch (perf) {
      case "winner":
        return "bg-green-100 text-green-700"
      case "loser":
        return "bg-red-100 text-red-700"
      default:
        return "bg-gray-100 text-gray-700"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/brand-engine"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-green-600" />
                Performance
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Internal reality: insights, tests, results
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Last analyzed: {new Date(performance.lastAnalyzedAt).toLocaleString()}
          </div>
        </div>

        {/* Weekly Digest */}
        {performance.weeklyDigest && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Weekly Digest
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Key Learnings
                </h3>
                <ul className="space-y-1">
                  {performance.weeklyDigest.keyLearnings.map((learning, i) => (
                    <li key={i} className="text-sm text-gray-800">
                      • {learning}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Next Week Focus
                </h3>
                <ul className="space-y-1">
                  {performance.weeklyDigest.nextWeekFocus.map((focus, i) => (
                    <li key={i} className="text-sm text-gray-800">
                      • {focus}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Stats</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-gray-800">
                      {performance.weeklyDigest.topPosts.length} top posts
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-red-600" />
                    <span className="text-gray-800">
                      {performance.weeklyDigest.bottomPosts.length} bottom posts
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Posts */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Posts ({performance.posts.length})
          </h2>
          {performance.posts.length === 0 ? (
            <p className="text-gray-500 text-sm">No post data yet</p>
          ) : (
            <div className="space-y-4">
              {performance.posts.map((post) => (
                <div
                  key={post.postId}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {getPerformanceIcon(post.performance)}
                        <h3 className="font-semibold text-gray-900">
                          {post.contentType.charAt(0).toUpperCase() +
                            post.contentType.slice(1)}{" "}
                          • {post.contentPillar}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(post.postedAt).toLocaleDateString()} •{" "}
                        {post.platform}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getPerformanceBadge(post.performance)}`}
                    >
                      {post.performance}
                    </span>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-3">
                    {post.metrics.views && (
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-500">Views</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {post.metrics.views.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {post.metrics.likes && (
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-500">Likes</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {post.metrics.likes}
                        </div>
                      </div>
                    )}
                    {post.metrics.comments && (
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-500">Comments</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {post.metrics.comments}
                        </div>
                      </div>
                    )}
                    {post.metrics.shares && (
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-500">Shares</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {post.metrics.shares}
                        </div>
                      </div>
                    )}
                    {post.metrics.saves && (
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-500">Saves</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {post.metrics.saves}
                        </div>
                      </div>
                    )}
                    {post.metrics.engagementRate && (
                      <div className="text-center p-2 bg-purple-50 rounded">
                        <div className="text-xs text-purple-600">Engagement</div>
                        <div className="text-sm font-semibold text-purple-900">
                          {post.metrics.engagementRate.toFixed(1)}%
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Analysis */}
                  {post.whyItWorked && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        ✅ <strong>Why it worked:</strong> {post.whyItWorked}
                      </p>
                    </div>
                  )}
                  {post.whyItDidnt && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">
                        ❌ <strong>Why it didn't:</strong> {post.whyItDidnt}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Insights */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-yellow-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Performance Insights ({performance.insights.length})
            </h2>
          </div>
          {performance.insights.length === 0 ? (
            <p className="text-gray-500 text-sm">No insights yet</p>
          ) : (
            <div className="space-y-4">
              {performance.insights.map((insight) => (
                <div
                  key={insight.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {insight.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {insight.description}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {insight.confidence}% confidence
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                    <span>Type: {insight.type}</span>
                    <span>Data points: {insight.dataPoints}</span>
                    <span>Timeframe: {insight.timeframe}</span>
                  </div>
                  {insight.suggestedAction && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        💡 <strong>Action:</strong> {insight.suggestedAction}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Experiments */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FlaskRound className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Experiments ({performance.experiments.length})
            </h2>
          </div>
          {performance.experiments.length === 0 ? (
            <p className="text-gray-500 text-sm">No experiments running</p>
          ) : (
            <div className="space-y-4">
              {performance.experiments.map((exp) => (
                <div
                  key={exp.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {exp.hypothesis}
                      </h3>
                      <div className="mt-2 grid md:grid-cols-2 gap-3">
                        <div className="p-2 bg-gray-50 rounded">
                          <span className="text-xs text-gray-500">Control:</span>
                          <p className="text-sm text-gray-900">{exp.control}</p>
                        </div>
                        <div className="p-2 bg-purple-50 rounded">
                          <span className="text-xs text-purple-600">Test:</span>
                          <p className="text-sm text-purple-900">{exp.test}</p>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ml-4 ${
                        exp.status === "running"
                          ? "bg-blue-100 text-blue-700"
                          : exp.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : exp.status === "planned"
                              ? "bg-gray-100 text-gray-700"
                              : "bg-red-100 text-red-700"
                      }`}
                    >
                      {exp.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Variable: {exp.variable}</span>
                    <span>Metric: {exp.metric}</span>
                    <span>Target: +{exp.targetLift}%</span>
                  </div>
                  {exp.results && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>Winner:</strong> {exp.results.winner} (
                        {exp.results.lift > 0 ? "+" : ""}
                        {exp.results.lift}% lift)
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        {exp.results.learnings}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
