"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import BuyBlueprintModal from "@/components/sselfie/buy-blueprint-modal"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface FreeModeUpsellModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feedId?: number
}

/**
 * Free Mode Upsell Modal
 * 
 * Shows after free user has used 2 credits
 * Offers three options:
 * 1. Test More (10 credits) - $9.99 - Low friction entry point
 * 2. Unlock Full Blueprint - $47 - Best value for serious creators
 * 3. Get More Credits (100 credits) - $45 - For power users
 */
export default function FreeModeUpsellModal({
  open,
  onOpenChange,
  feedId,
}: FreeModeUpsellModalProps) {
  const router = useRouter()
  const [showBlueprintModal, setShowBlueprintModal] = useState(false)

  const handleTestMore = () => {
    // Close upsell modal and navigate to credits checkout page with 10-credit pack highlighted
    onOpenChange(false)
    router.push("/checkout/credits")
  }

  const handleUnlockBlueprint = () => {
    // Close upsell modal first to prevent duplicate modals
    onOpenChange(false)
    // Small delay to ensure upsell modal is fully closed before showing blueprint modal
    setTimeout(() => {
      setShowBlueprintModal(true)
    }, 100)
  }

  const handleGetMoreCredits = () => {
    // Close upsell modal and navigate to credits checkout page
    onOpenChange(false)
    router.push("/checkout/credits")
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md mx-4 sm:mx-auto p-4 sm:p-6">
          <DialogHeader className="text-center sm:text-left px-0 sm:px-0">
            <DialogTitle className="text-xl sm:text-2xl font-serif font-light text-stone-900 leading-tight">
              You&apos;ve Used Your Free Credits
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base text-stone-600 mt-2 sm:mt-1">
              Choose how you&apos;d like to continue creating content
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
            {/* Option 1: Test More (10 credits) - Low friction entry */}
            <Button
              onClick={handleTestMore}
              variant="outline"
              className="w-full justify-start h-auto py-3 sm:py-4 px-3 sm:px-4 border-2 hover:border-stone-900 transition-all touch-manipulation"
            >
              <div className="flex items-center gap-2 sm:gap-3 w-full">
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium text-stone-900 text-sm sm:text-base">Test More</div>
                  <div className="text-xs text-stone-500 mt-0.5 sm:mt-0">$9.99 • 5 preview feeds</div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 flex-shrink-0" />
              </div>
            </Button>

            {/* Option 2: Unlock Full Blueprint - Best value */}
            <Button
              onClick={handleUnlockBlueprint}
              className="w-full justify-start h-auto py-3 sm:py-4 px-3 sm:px-4 bg-stone-900 hover:bg-stone-800 transition-all touch-manipulation"
            >
              <div className="flex items-center gap-2 sm:gap-3 w-full">
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium text-white text-sm sm:text-base">Unlock Full Blueprint</div>
                  <div className="text-xs text-stone-300 mt-0.5 sm:mt-0">$47 • 60 Credits • Full Feed Planner</div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-300 flex-shrink-0" />
              </div>
            </Button>

            {/* Option 3: Get More Credits (100 credits) - Power users */}
            <Button
              onClick={handleGetMoreCredits}
              variant="outline"
              className="w-full justify-start h-auto py-3 sm:py-4 px-3 sm:px-4 border border-stone-200 hover:border-stone-300 transition-all touch-manipulation"
            >
              <div className="flex items-center gap-2 sm:gap-3 w-full">
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium text-stone-700 text-sm sm:text-base">Get More Credits</div>
                  <div className="text-xs text-stone-500 mt-0.5 sm:mt-0">$45 • 100 credits • 50 preview feeds</div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400 flex-shrink-0" />
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Embedded checkout modal */}
      <BuyBlueprintModal
        open={showBlueprintModal}
        onOpenChange={setShowBlueprintModal}
        feedId={feedId}
      />
    </>
  )
}
