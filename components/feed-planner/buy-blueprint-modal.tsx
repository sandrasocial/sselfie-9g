"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { Check } from 'lucide-react'
import { startProductCheckoutSession } from "@/app/actions/stripe"
import { createLandingCheckoutSession } from "@/app/actions/landing-checkout"
import { createClient } from "@/lib/supabase/client"
import { getProductById } from "@/lib/products"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface BuyBlueprintModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feedId?: number // Optional feedId for tracking
  promoCode?: string // Optional promo code from URL
}

export default function BuyBlueprintModal({ 
  open, 
  onOpenChange, 
  feedId,
  promoCode 
}: BuyBlueprintModalProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const product = getProductById("paid_blueprint")
  const price = product ? `$${(product.priceInCents / 100).toFixed(2)}` : "$47"

  const startCheckout = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Check auth status
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Authenticated: Use startProductCheckoutSession
        console.log("[BuyBlueprintModal] ✅ Authenticated user, using product checkout session", promoCode ? `with promo: ${promoCode}` : "without promo code")
        return await startProductCheckoutSession("paid_blueprint", promoCode)
      } else {
        // Unauthenticated: Use createLandingCheckoutSession
        console.log("[BuyBlueprintModal] 👤 Unauthenticated user, using landing checkout session", promoCode ? `with promo: ${promoCode}` : "without promo code")
        return await createLandingCheckoutSession("paid_blueprint", promoCode)
      }
    } catch (error) {
      console.error("[BuyBlueprintModal] Error starting checkout:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [promoCode])

  const handleCheckoutComplete = async () => {
    console.log("[BuyBlueprintModal] ✅ Checkout completed")
    setIsLoading(false)
    onOpenChange(false)
    
    // Redirect to success page (will poll for access and redirect to feed planner)
    // Extract session ID from client secret if available, otherwise redirect to feed planner
    router.push("/checkout/success?type=paid_blueprint")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif font-light text-stone-900">
            Unlock Full Feed Planner
          </DialogTitle>
        </DialogHeader>

        {!isLoading ? (
          // Product selection view
          <div className="mt-6">
            <div className="border rounded-2xl p-6 border-stone-900 shadow-lg">
              <div className="text-center space-y-4">
                <div>
                  <div className="text-4xl font-serif font-light text-stone-900">30 Photos</div>
                  <div className="text-sm text-stone-500 mt-1">Custom Brand Strategy</div>
                </div>

                <div className="text-3xl font-serif font-light text-stone-900">
                  {price}
                </div>

                <p className="text-sm text-stone-600">
                  Get the full Feed Planner with 30 custom photos, captions & strategy
                </p>

                <div className="pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-stone-700">
                    <Check size={16} className="text-stone-900" />
                    <span>30 custom AI photos</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-stone-700">
                    <Check size={16} className="text-stone-900" />
                    <span>Full Feed Planner access</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-stone-700">
                    <Check size={16} className="text-stone-900" />
                    <span>Caption templates & strategy</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-stone-700">
                    <Check size={16} className="text-stone-900" />
                    <span>Content calendar</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsLoading(true)}
                  className="w-full bg-stone-900 hover:bg-stone-800 text-white rounded-xl py-3 px-6 font-medium transition-colors mt-6"
                >
                  Continue to Checkout
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Embedded checkout view
          <div className="mt-6">
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{
                fetchClientSecret: startCheckout,
                onComplete: handleCheckoutComplete,
              }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
