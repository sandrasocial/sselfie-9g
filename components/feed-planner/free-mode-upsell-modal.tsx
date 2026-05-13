"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { CREDIT_PACKAGES, formatPriceFromCents } from "@/lib/products"
import { trackCTAClick } from "@/lib/analytics"

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
 * 2. Join Studio - current full-access path
 * 3. Get More Credits (100 credits) - $45 - For power users
 */
export default function FreeModeUpsellModal({
  open,
  onOpenChange,
}: FreeModeUpsellModalProps) {
  const router = useRouter()
  const starterPack = CREDIT_PACKAGES.find((pkg) => pkg.id === "credits_topup_10")
  const powerPack = CREDIT_PACKAGES.find((pkg) => pkg.id === "credits_topup_100")
  const starterPrice = starterPack ? formatPriceFromCents(starterPack.priceInCents) : "$9.99"
  const powerPrice = powerPack ? formatPriceFromCents(powerPack.priceInCents) : "$45"

  const handleTestMore = () => {
    // Close upsell modal and navigate to credits checkout page with 10-credit pack highlighted
    trackCTAClick("free_mode_upsell", "Test More", "/checkout/credits")
    onOpenChange(false)
    router.push("/checkout/credits")
  }

  const handleJoinStudio = () => {
    trackCTAClick("free_mode_upsell", "Join Studio", "/checkout/membership")
    onOpenChange(false)
    router.push("/checkout/membership")
  }

  const handleGetMoreCredits = () => {
    // Close upsell modal and navigate to credits checkout page
    trackCTAClick("free_mode_upsell", "Get More Credits", "/checkout/credits")
    onOpenChange(false)
    router.push("/checkout/credits")
  }

  return (
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
                  <div className="text-xs text-stone-500 mt-0.5 sm:mt-0">{starterPrice} • 5 preview feeds</div>
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-stone-500 shrink-0">Next</span>
              </div>
            </Button>

            {/* Option 2: Join Studio - current full access path */}
            <Button
              onClick={handleJoinStudio}
              className="w-full justify-start h-auto py-3 sm:py-4 px-3 sm:px-4 bg-stone-900 hover:bg-stone-800 transition-all touch-manipulation"
            >
              <div className="flex items-center gap-2 sm:gap-3 w-full">
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium text-white text-sm sm:text-base">Join Studio</div>
                  <div className="text-xs text-stone-300 mt-0.5 sm:mt-0">Studio access • Maya • Full Feed Planner</div>
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-stone-300 shrink-0">Next</span>
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
                  <div className="text-xs text-stone-500 mt-0.5 sm:mt-0">{powerPrice} • 100 credits • 50 preview feeds</div>
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-stone-500 shrink-0">Next</span>
              </div>
            </Button>
          </div>
        </DialogContent>
    </Dialog>
  )
}
