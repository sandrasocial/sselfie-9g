"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronLeft, Brain, CheckCircle, AlertCircle } from "lucide-react"
import type { BrandBrain } from "@/lib/brand-engine/types"

export default function BrandBrainPage() {
  const [brandBrain, setBrandBrain] = useState<BrandBrain | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBrandBrain()
  }, [])

  const fetchBrandBrain = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/brand-engine/brand-brain")
      const result = await response.json()

      if (result.success) {
        setBrandBrain(result.data)
      } else {
        setError(result.error || "Failed to load Brand Brain")
      }
    } catch (err) {
      setError("Network error loading Brand Brain")
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
            <div className="text-gray-500">Loading Brand Brain...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !brandBrain) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <span>{error || "Brand Brain not found"}</span>
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
                <Brain className="w-6 h-6 text-purple-600" />
                Brand Brain
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Your brand's single source of truth
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            Version: {brandBrain.version}
          </div>
        </div>

        {/* Identity */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Identity</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Mission</h3>
              <p className="text-gray-900">{brandBrain.identity.mission}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Core Values
              </h3>
              <ul className="space-y-1">
                {brandBrain.identity.coreValues.map((value, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-900">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {value}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Personality Traits
              </h3>
              <div className="flex flex-wrap gap-2">
                {brandBrain.identity.personalityTraits.map((trait, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Voice */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Voice</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Tone</h3>
              <p className="text-gray-900">{brandBrain.voice.toneDescription}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Do</h3>
                <ul className="space-y-1">
                  {brandBrain.voice.voiceRules.do.map((rule, i) => (
                    <li
                      key={i}
                      className="text-sm text-gray-700 flex items-start gap-2"
                    >
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Don't</h3>
                <ul className="space-y-1">
                  {brandBrain.voice.voiceRules.dont.map((rule, i) => (
                    <li
                      key={i}
                      className="text-sm text-gray-700 flex items-start gap-2"
                    >
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Banned Words
              </h3>
              <div className="flex flex-wrap gap-2">
                {brandBrain.voice.bannedWords.map((word, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm line-through"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content Strategy */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Content Strategy
          </h2>
          <div className="space-y-6">
            {/* Content Pillars */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Content Pillars
              </h3>
              <div className="grid gap-4">
                {brandBrain.contentStrategy.contentPillars.map((pillar) => (
                  <div
                    key={pillar.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <h4 className="font-semibold text-gray-900">{pillar.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {pillar.description}
                    </p>
                    <div className="mt-3">
                      <span className="text-xs font-medium text-gray-500">
                        Post Angles:
                      </span>
                      <ul className="mt-1 space-y-1">
                        {pillar.postAngles.map((angle, i) => (
                          <li key={i} className="text-sm text-gray-700">
                            • {angle}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Mapping */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                CTA by Funnel Stage
              </h3>
              <div className="space-y-2">
                {brandBrain.contentStrategy.ctaMapping.map((cta) => (
                  <div
                    key={cta.funnelStage}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <span className="text-xs font-medium text-gray-500 uppercase">
                        {cta.funnelStage} Funnel
                      </span>
                      <p className="text-sm text-gray-900 mt-1">{cta.cta}</p>
                    </div>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                      {cta.triggerWord}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Current Focus */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Current Focus
          </h2>
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-purple-900 mb-1">
                Priority Goal
              </h3>
              <p className="text-purple-800">
                {brandBrain.currentFocus.priorityGoal}
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-purple-900 mb-1">
                  Time Budget
                </h3>
                <p className="text-purple-800">
                  {brandBrain.currentFocus.timeBudget}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-purple-900 mb-1">
                  Primary Offer
                </h3>
                <p className="text-purple-800">
                  {
                    brandBrain.offers.find(
                      (o) => o.id === brandBrain.currentFocus.primaryOfferToPush.offerId
                    )?.name
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
