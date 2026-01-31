"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ChevronLeft,
  Radio,
  TrendingUp,
  Users,
  Calendar,
  AlertCircle,
} from "lucide-react"
import type { SignalsData } from "@/lib/brand-engine/types"

export default function SignalsPage() {
  const [signals, setSignals] = useState<SignalsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSignals()
  }, [])

  const fetchSignals = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/brand-engine/signals")
      const result = await response.json()

      if (result.success) {
        setSignals(result.data)
      } else {
        setError(result.error || "Failed to load signals")
      }
    } catch (err) {
      setError("Network error loading signals")
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
            <div className="text-gray-500">Loading signals...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !signals) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>{error || "Signals not found"}</span>
            </div>
          </div>
        </div>
      </div>
    )
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
                <Radio className="w-6 h-6 text-orange-600" />
                Signals
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                External reality: trends, competitors, culture
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Last synced: {new Date(signals.lastSyncedAt).toLocaleString()}
          </div>
        </div>

        {/* Trends */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Trends ({signals.trends.length})
            </h2>
          </div>
          {signals.trends.length === 0 ? (
            <p className="text-gray-500 text-sm">No trends detected</p>
          ) : (
            <div className="space-y-4">
              {signals.trends.map((trend) => (
                <div
                  key={trend.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {trend.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {trend.description}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      {trend.velocity}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                    <span>Source: {trend.source}</span>
                    <span>Type: {trend.type}</span>
                    <span>Relevance: {trend.relevanceScore}%</span>
                  </div>
                  {trend.suggestedAction && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        💡 {trend.suggestedAction}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Competitors */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Competitor Intel ({signals.competitors.length})
            </h2>
          </div>
          {signals.competitors.length === 0 ? (
            <p className="text-gray-500 text-sm">No competitor data yet</p>
          ) : (
            <div className="space-y-4">
              {signals.competitors.map((comp) => (
                <div
                  key={comp.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {comp.competitorName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {comp.competitorHandle} • {comp.platform}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        comp.shouldWe === "adopt"
                          ? "bg-green-100 text-green-700"
                          : comp.shouldWe === "differentiate"
                            ? "bg-purple-100 text-purple-700"
                            : comp.shouldWe === "watch"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                      }`}
                    >
                      {comp.shouldWe}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-2">
                    {comp.observation.description}
                  </p>
                  {comp.observation.isRepeating && (
                    <span className="inline-block mt-2 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                      Repeating pattern
                    </span>
                  )}
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>Takeaway:</strong> {comp.takeaway}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Culture Moments */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-pink-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Culture Moments ({signals.cultureMoments.length})
            </h2>
          </div>
          {signals.cultureMoments.length === 0 ? (
            <p className="text-gray-500 text-sm">No culture moments detected</p>
          ) : (
            <div className="space-y-4">
              {signals.cultureMoments.map((moment) => (
                <div
                  key={moment.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {moment.topic}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {moment.description}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        moment.riskLevel === "low"
                          ? "bg-green-100 text-green-700"
                          : moment.riskLevel === "medium"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {moment.riskLevel} risk
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                    <span>Type: {moment.type}</span>
                    <span>Timing: {moment.timing}</span>
                    <span>Relevance: {moment.relevanceToAudience}%</span>
                  </div>
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Recommendation:</strong> {moment.recommendation}
                    </p>
                    {moment.suggestedAngle && (
                      <p className="text-sm text-blue-700 mt-1">
                        💡 {moment.suggestedAngle}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
