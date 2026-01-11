"use client"

import BlueprintScreen from "@/components/sselfie/blueprint-screen"

interface AuthenticatedBlueprintWrapperProps {
  userId: string
  purchaseSuccess?: boolean
}

/**
 * AuthenticatedBlueprintWrapper - Client wrapper for authenticated Blueprint flow
 * 
 * This component wraps BlueprintScreen for authenticated users accessing /blueprint route
 * (separate from the guest flow with email/token params)
 */
export default function AuthenticatedBlueprintWrapper({ 
  userId, 
  purchaseSuccess 
}: AuthenticatedBlueprintWrapperProps) {
  return (
    <div className="min-h-screen bg-stone-50">
      <BlueprintScreen userId={userId} />
      {/* Handle purchaseSuccess state if needed (e.g., show success message) */}
    </div>
  )
}
