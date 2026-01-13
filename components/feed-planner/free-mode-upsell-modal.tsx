"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CreditCard, Sparkles, ArrowRight } from "lucide-react"
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
 * Offers two options:
 * 1. Buy Credits - Link to credit top-up
 * 2. Unlock Full Blueprint - Open checkout modal
 */
export default function FreeModeUpsellModal({
  open,
  onOpenChange,
  feedId,
}: FreeModeUpsellModalProps) {
  const router = useRouter()
  const [showBlueprintModal, setShowBlueprintModal] = useState(false)

  const handleBuyCredits = () => {
    onOpenChange(false)
    router.push("/account?tab=credits")
  }

  const handleUnlockBlueprint = () => {
    onOpenChange(false)
    setShowBlueprintModal(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif font-light text-stone-900">
              You've Used Your Free Credits
            </DialogTitle>
            <DialogDescription className="text-stone-600">
              Choose how you'd like to continue creating content
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-3">
            {/* Option 1: Buy Credits */}
            <Button
              onClick={handleBuyCredits}
              variant="outline"
              className="w-full justify-start h-auto py-4 px-4 border-2 hover:border-stone-900 transition-all"
            >
              <div className="flex items-center gap-3 w-full">
                <CreditCard className="w-5 h-5 text-stone-600" />
                <div className="flex-1 text-left">
                  <div className="font-medium text-stone-900">Buy Credits</div>
                  <div className="text-xs text-stone-500">Generate more preview feeds</div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-400" />
              </div>
            </Button>

            {/* Option 2: Unlock Full Blueprint */}
            <Button
              onClick={handleUnlockBlueprint}
              className="w-full justify-start h-auto py-4 px-4 bg-stone-900 hover:bg-stone-800 transition-all"
            >
              <div className="flex items-center gap-3 w-full">
                <Sparkles className="w-5 h-5 text-white" />
                <div className="flex-1 text-left">
                  <div className="font-medium text-white">Unlock Full Blueprint</div>
                  <div className="text-xs text-stone-300">$47 • 60 Credits • Full Feed Planner</div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-300" />
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
