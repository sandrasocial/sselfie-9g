"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"

interface BlueprintScreenProps {
  userId: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

/**
 * BlueprintScreen - Brand Blueprint inside Studio (Phase 1)
 * 
 * This component provides access to the Brand Blueprint feature inside Studio.
 * It uses user_id-based APIs instead of email/token.
 * 
 * Phase 1: Basic functionality with user_id-based state management
 * Future: Full step flow UI (can be extracted from app/blueprint/page-client.tsx)
 */
export default function BlueprintScreen({ userId }: BlueprintScreenProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch blueprint state using user_id (authenticated)
  const {
    data: blueprintData,
    error: blueprintError,
    isLoading: blueprintLoading,
    mutate: mutateBlueprint,
  } = useSWR("/api/blueprint/state", fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 5000,
  })

  useEffect(() => {
    if (blueprintError) {
      setError(blueprintError.message || "Failed to load blueprint")
      setIsLoading(false)
    } else if (!blueprintLoading) {
      setIsLoading(false)
    }
  }, [blueprintError, blueprintLoading])

  // Save blueprint state
  const saveBlueprintState = async (patch: any) => {
    try {
      const response = await fetch("/api/blueprint/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save blueprint state")
      }

      // Refresh blueprint state after save
      mutateBlueprint()
    } catch (error) {
      console.error("[Blueprint] Error saving state:", error)
      throw error
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-950 mx-auto mb-4"></div>
          <p className="text-sm text-stone-600">Loading your blueprint...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px] px-4">
        <div className="text-center max-w-md">
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null)
              setIsLoading(true)
              mutateBlueprint()
            }}
            className="px-4 py-2 bg-stone-950 text-white text-xs uppercase tracking-wider hover:bg-stone-800 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const blueprint = blueprintData?.blueprint
  const entitlement = blueprintData?.entitlement
  const creditBalance = entitlement?.creditBalance ?? 0

  // If no blueprint state exists, show welcome/start screen
  if (!blueprint) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-light mb-4" style={{ fontFamily: "'Times New Roman', serif" }}>
            Your Brand Blueprint
          </h1>
          <p className="text-sm text-stone-600 mb-8">
            Get your free custom blueprint with a 30-day content calendar, caption templates, and brand strategy guide.
          </p>
        </div>

        {/* Decision 1: Show credit balance instead of quota */}
        {entitlement && (
          <div className="bg-stone-50 border border-stone-200 p-4 rounded-lg mb-6 text-center">
            <p className="text-sm text-stone-600 mb-1">
              <span className="font-medium">Available Credits:</span> {creditBalance}
            </p>
            <p className="text-xs text-stone-500">
              Each grid generation uses 2 credits (2 images × 1 credit each)
            </p>
          </div>
        )}

        <div className="bg-stone-50 border border-stone-200 p-6 md:p-8 rounded-lg">
          <h2 className="text-xl font-light mb-4" style={{ fontFamily: "'Times New Roman', serif" }}>
            Start Your Blueprint
          </h2>
          <p className="text-sm text-stone-600 mb-6">
            Your blueprint flow will be available here. For now, you can access the full blueprint experience at{" "}
            <a href="/blueprint" className="underline hover:text-stone-950">
              /blueprint
            </a>
            .
          </p>
          <p className="text-xs text-stone-500">
            Phase 1: Basic integration complete. Full step flow UI coming in next phase.
          </p>
        </div>
      </div>
    )
  }

  // If blueprint exists, show summary/status
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-light mb-4" style={{ fontFamily: "'Times New Roman', serif" }}>
          Your Brand Blueprint
        </h1>
        <p className="text-sm text-stone-600">
          {blueprint.completed
            ? "Your blueprint is complete!"
            : blueprint.strategy?.generated
              ? "Your strategy is ready. Continue to generate your grid."
              : "Your blueprint is in progress."}
        </p>
      </div>

      {/* Decision 1: Show credit balance instead of quota */}
      {entitlement && (
        <div className="bg-stone-50 border border-stone-200 p-4 rounded-lg mb-6 text-center">
          <p className="text-sm text-stone-600 mb-1">
            <span className="font-medium">Available Credits:</span> {creditBalance}
          </p>
          <p className="text-xs text-stone-500">
            Each grid generation uses 2 credits (2 images × 1 credit each)
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* Strategy Status */}
        {blueprint.strategy?.generated && (
          <div className="bg-stone-50 border border-stone-200 p-6 rounded-lg">
            <h3 className="text-lg font-light mb-2" style={{ fontFamily: "'Times New Roman', serif" }}>
              Strategy Generated
            </h3>
            <p className="text-sm text-stone-600">
              {blueprint.strategy?.generatedAt
                ? `Generated on ${new Date(blueprint.strategy.generatedAt).toLocaleDateString()}`
                : "Strategy is ready"}
            </p>
          </div>
        )}

        {/* Grid Status */}
        {blueprint.grid?.generated && blueprint.grid?.gridUrl && (
          <div className="bg-stone-50 border border-stone-200 p-6 rounded-lg">
            <h3 className="text-lg font-light mb-4" style={{ fontFamily: "'Times New Roman', serif" }}>
              Your Grid
            </h3>
            <div className="mb-4">
              <img
                src={blueprint.grid.gridUrl}
                alt="Blueprint grid"
                className="max-w-full h-auto rounded-lg"
              />
            </div>
            <p className="text-xs text-stone-500">
              {blueprint.grid?.generatedAt
                ? `Generated on ${new Date(blueprint.grid.generatedAt).toLocaleDateString()}`
                : "Grid is ready"}
            </p>
          </div>
        )}

        {/* Action Links */}
        <div className="bg-stone-50 border border-stone-200 p-6 rounded-lg">
          <h3 className="text-lg font-light mb-4" style={{ fontFamily: "'Times New Roman', serif" }}>
            Continue Your Blueprint
          </h3>
          <p className="text-sm text-stone-600 mb-4">
            Access the full blueprint experience with all steps and features.
          </p>
          <a
            href="/blueprint"
            className="inline-block px-6 py-3 bg-stone-950 text-white text-xs uppercase tracking-wider hover:bg-stone-800 transition-colors"
          >
            Open Full Blueprint →
          </a>
        </div>
      </div>
    </div>
  )
}
