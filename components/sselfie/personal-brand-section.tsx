"use client"

import { useState, useEffect } from "react"
import { Aperture, Edit2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import BrandProfileWizard from "./brand-profile-wizard"
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

export default function PersonalBrandSection({ userId }: PersonalBrandSectionProps) {
  const [brandData, setBrandData] = useState<PersonalBrandData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editData, setEditData] = useState<PersonalBrandData | null>(null)
  const [showWizard, setShowWizard] = useState(false)

  useEffect(() => {
    console.log("[v0] PersonalBrandSection showWizard changed:", showWizard)
  }, [showWizard])

  useEffect(() => {
    fetchBrandData()
  }, [])

  const fetchBrandData = async () => {
    try {
      console.log("[v0] Fetching personal brand data...")
      const response = await fetch("/api/profile/personal-brand", {
        credentials: "include",
      })
      const data = await response.json()
      console.log("[v0] Personal brand response:", data)

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
    console.log("[v0] Starting brand profile creation...")
    console.log("[v0] Current showWizard state:", showWizard)
    setShowWizard(true)
    console.log("[v0] Set showWizard to true")
  }

  const handleEdit = () => {
    console.log("[v0] Editing existing brand profile...")
    setShowWizard(true)
  }

  const handleWizardComplete = () => {
    console.log("[v0] Brand profile wizard completed")
    setShowWizard(false)
    fetchBrandData()
  }

  console.log("[v0] PersonalBrandSection rendering, showWizard:", showWizard, "brandData:", !!brandData)

  if (isLoading) {
    return <UnifiedLoading message="Loading brand profile..." />
  }

  return (
    <>
      {!brandData ? (
        <div className="bg-gradient-to-br from-stone-50/80 to-white/50 backdrop-blur-2xl rounded-xl sm:rounded-[1.75rem] p-6 sm:p-8 border border-stone-200/40 shadow-xl shadow-stone-900/10">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-stone-950 rounded-xl">
              <Aperture size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-stone-950 mb-2">Create Your Personal Brand</h3>
              <p className="text-sm text-stone-600 mb-4">
                Help Maya understand your unique style and vision. Complete your personal brand profile so she can
                create photos that truly represent you.
              </p>
              <Button onClick={handleStartBrandProfile} className="bg-stone-950 hover:bg-stone-800 text-white">
                <Plus size={16} className="mr-2" />
                Start Brand Profile
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white/50 backdrop-blur-2xl rounded-xl sm:rounded-[1.75rem] p-6 sm:p-8 border border-white/60 shadow-xl shadow-stone-900/10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-stone-950 rounded-lg shadow-lg">
                <Aperture size={18} className="text-white" strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-bold text-stone-950">Personal Brand</h3>
            </div>
            <Button onClick={handleEdit} variant="ghost" size="sm" className="text-stone-600 hover:text-stone-950">
              <Edit2 size={16} className="mr-2" />
              Edit
            </Button>
          </div>

          <div className="space-y-6">
            {brandData.name && (
              <div>
                <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Brand Name</h4>
                <p className="text-sm text-stone-950">{brandData.name}</p>
              </div>
            )}

            {brandData.businessType && (
              <div>
                <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Business Type</h4>
                <p className="text-sm text-stone-950">{brandData.businessType}</p>
              </div>
            )}

            {brandData.photoGoals && (
              <div>
                <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Photo Goals</h4>
                <p className="text-sm text-stone-950">{brandData.photoGoals}</p>
              </div>
            )}

            {brandData.stylePreferences && (
              <div>
                <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                  Style Preferences
                </h4>
                <p className="text-sm text-stone-950">{brandData.stylePreferences}</p>
              </div>
            )}

            {brandData.transformationStory && (
              <div>
                <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Your Story</h4>
                <p className="text-sm text-stone-950 line-clamp-3">{brandData.transformationStory}</p>
              </div>
            )}

            <div className="pt-4 border-t border-stone-200/30">
              <p className="text-xs text-stone-500 italic">
                Maya uses this information to create personalized photo concepts that align with your brand and vision.
              </p>
            </div>
          </div>
        </div>
      )}

      <UnifiedOnboardingWizard
        isOpen={showWizard}
        onDismiss={() => {
          console.log("[v0] Closing wizard")
          setShowWizard(false)
        }}
        onComplete={async (data) => {
          console.log("[v0] Unified wizard completed")
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
