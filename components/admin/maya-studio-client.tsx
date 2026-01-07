"use client"

import { useState, useEffect } from "react"
import MayaChatScreen from "@/components/sselfie/maya-chat-screen"
import { Toaster } from "@/components/ui/toaster"
import ProPhotoshootPanel from "./pro-photoshoot-panel"
import type { User as UserType } from "@/components/sselfie/types"

interface MayaStudioClientProps {
  userId: string
  userEmail: string
  userName: string | null
}

export default function MayaStudioClient({ userId, userEmail, userName }: MayaStudioClientProps) {
  const [selectedGuideId, setSelectedGuideId] = useState<number | null>(null)
  const [selectedGuideCategory, setSelectedGuideCategory] = useState<string | null>(null)
  const [selectedImageId, setSelectedImageId] = useState<number | null>(null)
  const [featureEnabled, setFeatureEnabled] = useState(false)

  // Check feature flag on mount
  useEffect(() => {
    const checkFeatureFlag = async () => {
      try {
        // Check via API or env (for now, we'll check via a simple API call)
        // In production, this could be a server-side check
        const envFlag = process.env.NEXT_PUBLIC_FEATURE_PRO_PHOTOSHOOT_ADMIN_ONLY
        if (envFlag === "true" || envFlag === "1") {
          setFeatureEnabled(true)
        }
      } catch (error) {
        console.error("[MayaStudio] Error checking feature flag:", error)
      }
    }
    checkFeatureFlag()
  }, [])

  // Listen for image generation events (from concept cards)
  useEffect(() => {
    const handleImageGenerated = (event: CustomEvent<{ imageId: number }>) => {
      setSelectedImageId(event.detail.imageId)
    }

    window.addEventListener("pro-photoshoot:image-generated" as any, handleImageGenerated as EventListener)
    return () => {
      window.removeEventListener("pro-photoshoot:image-generated" as any, handleImageGenerated as EventListener)
    }
  }, [])

  // Create user object for MayaChatScreen
  const user = {
    id: userId,
    email: userEmail,
    name: userName,
  } as any

  return (
    <div className="min-h-screen h-screen flex flex-col bg-stone-50 overflow-hidden">
      {/* Maya Chat - Same as user app, just with admin context */}
      <div className="flex-1 min-h-0 flex flex-col">
        <MayaChatScreen
          user={user}
          studioProMode={true} // Always use Pro Mode in admin
          isAdmin={true} // New prop to enable admin features
          selectedGuideId={selectedGuideId}
          selectedGuideCategory={selectedGuideCategory}
          userId={userId}
          onGuideChange={(id, category) => {
            setSelectedGuideId(id)
            setSelectedGuideCategory(category)
          }}
        />

        {/* Pro Photoshoot Panel - Only show if feature enabled and image selected */}
        {featureEnabled && selectedImageId && (
          <div className="border-t border-stone-200 p-4 bg-white overflow-y-auto max-h-96">
            <ProPhotoshootPanel originalImageId={selectedImageId} userId={userId} />
          </div>
        )}
      </div>

      {/* Toast notifications */}
      <Toaster />
    </div>
  )
}

