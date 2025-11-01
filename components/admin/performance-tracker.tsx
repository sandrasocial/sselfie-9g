"use client"

import { useState, useEffect } from "react"

interface PerformanceData {
  performanceHistory: any[]
  topPerforming: any[]
  milestones: any[]
  brandEvolution: any[]
  trends: any[]
}

export function PerformanceTracker({ userId }: { userId: string }) {
  const [data, setData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"top" | "history" | "milestones" | "evolution">("top")

  useEffect(() => {
    loadPerformanceData()
  }, [userId])

  const loadPerformanceData = async () => {
    try {
      const response = await fetch(`/api/admin/agent/performance?userId=${userId}`)
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error("Error loading performance data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-stone-500">Loading performance data...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-stone-500">No performance data available</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6 bg-stone-50 rounded-lg">
      <div className="flex items-center justify-between">
        <h3
          style={{ fontFamily: "'Times New Roman', serif" }}
          className="text-2xl font-extralight uppercase tracking-wider"
        >
          Performance Tracking
        </h3>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone-200">
        {[
          { id: "top", label: "Top Performing" },
          { id: "history", label: "History" },
          { id: "milestones", label: "Milestones" },
          { id: "evolution", label: "Brand Evolution" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 text-sm uppercase tracking-wider transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-stone-900 text-stone-900 font-medium"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3">
        {activeTab === "top" && (
          <>
            {data.topPerforming.length === 0 ? (
              <div className="text-center py-8 text-sm text-stone-500">No top performing content yet</div>
            ) : (
              data.topPerforming.map((item, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border border-stone-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium">
                          {Math.round(item.success_score)} score
                        </span>
                        <span className="px-2 py-1 text-xs rounded-full bg-stone-100 text-stone-600">
                          {item.content_type}
                        </span>
                      </div>
                      <h4 className="font-medium text-stone-900">{item.content_title}</h4>
                      {item.what_worked && (
                        <p className="text-sm text-stone-600 mt-2">What worked: {item.what_worked}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {activeTab === "history" && (
          <>
            {data.performanceHistory.length === 0 ? (
              <div className="text-center py-8 text-sm text-stone-500">No performance history yet</div>
            ) : (
              data.performanceHistory.slice(0, 20).map((item, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border border-stone-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-medium ${
                            item.success_score >= 70
                              ? "bg-green-100 text-green-700"
                              : item.success_score >= 40
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {Math.round(item.success_score)} score
                        </span>
                        <span className="px-2 py-1 text-xs rounded-full bg-stone-100 text-stone-600">
                          {item.content_type}
                        </span>
                        <span className="text-xs text-stone-400">
                          {new Date(item.analyzed_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-medium text-stone-900">{item.content_title}</h4>
                      {item.lessons_learned && (
                        <p className="text-sm text-stone-600 mt-2">Lessons: {item.lessons_learned}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {activeTab === "milestones" && (
          <>
            {data.milestones.length === 0 ? (
              <div className="text-center py-8 text-sm text-stone-500">No milestones yet</div>
            ) : (
              data.milestones.map((milestone, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border border-stone-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-700 uppercase tracking-wider">
                          {milestone.milestone_type}
                        </span>
                        <span className="text-xs text-stone-400">
                          {new Date(milestone.achieved_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-medium text-stone-900">{milestone.milestone_title}</h4>
                      {milestone.milestone_description && (
                        <p className="text-sm text-stone-600 mt-1">{milestone.milestone_description}</p>
                      )}
                      {milestone.celebration_note && (
                        <p className="text-sm text-stone-500 mt-2 italic">{milestone.celebration_note}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {activeTab === "evolution" && (
          <>
            {data.brandEvolution.length === 0 ? (
              <div className="text-center py-8 text-sm text-stone-500">No brand evolution history yet</div>
            ) : (
              data.brandEvolution.map((evolution, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border border-stone-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 uppercase tracking-wider">
                          {evolution.evolution_type}
                        </span>
                        <span className="text-xs text-stone-400">
                          {new Date(evolution.changed_at).toLocaleDateString()}
                        </span>
                      </div>
                      {evolution.reason_for_change && (
                        <p className="text-sm text-stone-900 mt-2">Reason: {evolution.reason_for_change}</p>
                      )}
                      {evolution.impact_observed && (
                        <p className="text-sm text-stone-600 mt-1">Impact: {evolution.impact_observed}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}
