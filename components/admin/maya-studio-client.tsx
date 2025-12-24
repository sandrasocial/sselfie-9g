"use client"

import { useState } from "react"
import MayaChatScreen from "@/components/sselfie/maya-chat-screen"
import { Toaster } from "@/components/ui/toaster"
import type { User as UserType } from "@/components/sselfie/types"

interface MayaStudioClientProps {
  userId: string
  userEmail: string
  userName: string | null
}

export default function MayaStudioClient({ userId, userEmail, userName }: MayaStudioClientProps) {
  const [selectedGuideId, setSelectedGuideId] = useState<number | null>(null)
  const [selectedGuideCategory, setSelectedGuideCategory] = useState<string | null>(null)

  // Create user object for MayaChatScreen
  const user = {
    id: userId,
    email: userEmail,
    name: userName,
  } as any

      return (
        <div className="min-h-screen h-screen flex flex-col bg-stone-50 overflow-hidden">
      {/* Maya Chat - Same as user app, just with admin context */}
      {/* Guide controls are now in the ProModeHeader dropdown */}
      <div className="flex-1 min-h-0">
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
      </div>

      {/* Toast notifications */}
      <Toaster />
    </div>
  )
}

