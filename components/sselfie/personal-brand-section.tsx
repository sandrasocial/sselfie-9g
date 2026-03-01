"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import UnifiedOnboardingWizard from "@/components/onboarding/unified-onboarding-wizard"
import UnifiedLoading from "./unified-loading"

interface PersonalBrandData {
  name: string
  businessType: string
  currentSituation: string
  transformationStory: string
  futureVision: string
  businessGoals: string
  photoGoals: string
  stylePreferences: string
  colorPreferences?: any
  clothingPreferences?: any
  styleCategories?: any
}

interface PersonalBrandSectionProps {
  userId: string
}

export default function PersonalBrandSection({ userId: _userId }: PersonalBrandSectionProps) {
  const [brandData, setBrandData] = useState<PersonalBrandData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showWizard, setShowWizard] = useState(false)

  useEffect(() => {
    fetchBrandData()
  }, [])

  const fetchBrandData = async () => {
    try {
      const response = await fetch("/api/profile/personal-brand", {
        credentials: "include",
      })
      const data = await response.json()

      if (data.exists && data.completed) {
        setBrandData(data.data)
      }
    } catch (error) {
      console.error("[v0] Error fetching personal brand:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartBrandProfile = () => {
    setShowWizard(true)
  }

  const handleEdit = () => {
    setShowWizard(true)
  }

  if (isLoading) {
    return <UnifiedLoading message="Loading brand profile..." />
  }

  return (
    <>
      {!brandData ? (
        <div className="rounded-[20px] border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-6 backdrop-blur-[20px] sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-xl border border-white/15 bg-white/8 p-3">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-whisper)]">Brand</span>
            </div>
            <div className="flex-1">
              <h3 className="display-header mb-2 text-lg font-light text-[color:var(--color-porcelain)]">Create Your Brand Profile</h3>
              <p className="mb-4 text-sm text-[color:var(--color-whisper)]">
                Help Maya understand your unique style and vision. Complete your personal brand profile so she can
                create photos that truly represent you.
              </p>
              <Button
                onClick={handleStartBrandProfile}
                className="border border-white/20 bg-white/10 text-[11px] font-medium uppercase tracking-[0.35em] text-[color:var(--color-porcelain)] hover:bg-white/16"
              >
                Start Brand Profile
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[20px] border border-[color:var(--glass-border)] bg-[color:var(--glass-bg)] p-6 backdrop-blur-[20px] sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h3 className="display-header text-lg font-light text-[color:var(--color-porcelain)]">Personal Brand</h3>
            </div>
            <Button
              onClick={handleEdit}
              variant="ghost"
              size="sm"
              className="rounded-full border border-white/15 px-4 text-[10px] uppercase tracking-[0.35em] text-[color:var(--color-whisper)] hover:bg-white/10"
            >
              Edit Brand
            </Button>
          </div>

          <div className="space-y-6">
            {brandData.name && (
              <div>
                <h4 className="mb-2 text-[11px] font-medium uppercase tracking-[0.35em] text-[color:var(--color-smoke)]">Brand Name</h4>
                <p className="text-sm text-[color:var(--color-whisper)]">{brandData.name}</p>
              </div>
            )}

            {brandData.businessType && (
              <div>
                <h4 className="mb-2 text-[11px] font-medium uppercase tracking-[0.35em] text-[color:var(--color-smoke)]">Business Type</h4>
                <p className="text-sm text-[color:var(--color-whisper)]">{brandData.businessType}</p>
              </div>
            )}

            {brandData.photoGoals && (
              <div>
                <h4 className="mb-2 text-[11px] font-medium uppercase tracking-[0.35em] text-[color:var(--color-smoke)]">Photo Goals</h4>
                <p className="text-sm text-[color:var(--color-whisper)]">{brandData.photoGoals}</p>
              </div>
            )}

            {brandData.stylePreferences && (
              <div>
                <h4 className="mb-2 text-[11px] font-medium uppercase tracking-[0.35em] text-[color:var(--color-smoke)]">
                  Style Preferences
                </h4>
                <p className="text-sm text-[color:var(--color-whisper)]">{brandData.stylePreferences}</p>
              </div>
            )}

            {brandData.transformationStory && (
              <div>
                <h4 className="mb-2 text-[11px] font-medium uppercase tracking-[0.35em] text-[color:var(--color-smoke)]">Your Story</h4>
                <p className="line-clamp-3 text-sm text-[color:var(--color-whisper)]">{brandData.transformationStory}</p>
              </div>
            )}

            <div className="border-t border-white/10 pt-4">
              <p className="text-xs italic text-[color:var(--color-smoke)]">
                Maya uses this information to create personalized photo concepts that align with your brand and vision.
              </p>
            </div>
          </div>
        </div>
      )}

      <UnifiedOnboardingWizard
        isOpen={showWizard}
        onDismiss={() => {
          setShowWizard(false)
        }}
        onComplete={async (_data) => {
          setShowWizard(false)
          await fetchBrandData()
        }}
        existingData={brandData
          ? {
              businessType: brandData.businessType || "",
              idealAudience: (brandData as any).idealAudience || "",
              audienceChallenge: (brandData as any).audienceChallenge || "",
              audienceTransformation: (brandData as any).audienceTransformation || "",
              transformationStory: brandData.transformationStory || "",
              currentSituation: brandData.currentSituation || "",
              futureVision: (brandData as any).futureVision || "",
              visualAesthetic: Array.isArray((brandData as any).visualAesthetic)
                ? (brandData as any).visualAesthetic
                : typeof (brandData as any).visualAesthetic === "string"
                  ? JSON.parse((brandData as any).visualAesthetic || "[]")
                  : [],
              feedStyle: Array.isArray((brandData as any).settingsPreference) && (brandData as any).settingsPreference.length > 0
                ? (brandData as any).settingsPreference[0]
                : typeof (brandData as any).settingsPreference === "string"
                  ? JSON.parse((brandData as any).settingsPreference || "[]")[0] || ""
                  : "",
              fashionStyle: Array.isArray((brandData as any).fashionStyle)
                ? (brandData as any).fashionStyle
                : typeof (brandData as any).fashionStyle === "string"
                  ? JSON.parse((brandData as any).fashionStyle || "[]")
                  : [],
              brandInspiration: (brandData as any).brandInspiration || "",
              inspirationLinks: (brandData as any).inspirationLinks || "",
              contentPillars: Array.isArray((brandData as any).contentPillars)
                ? (brandData as any).contentPillars
                : typeof (brandData as any).contentPillars === "string"
                  ? JSON.parse((brandData as any).contentPillars || "[]")
                  : [],
            }
          : undefined}
        userName={null}
      />
    </>
  )
}
