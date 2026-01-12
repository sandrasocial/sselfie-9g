"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import { Check } from 'lucide-react'
import { Button } from "@/components/ui/button"
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
  const [showCheckout, setShowCheckout] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const clientSecretRef = useRef<string | null>(null)

  const product = getProductById("paid_blueprint")
  const price = product ? `$${(product.priceInCents / 100).toFixed(2)}` : "$47"

  const startCheckout = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Check auth status
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      let secret: string | null = null
      if (user) {
        // Authenticated: Use startProductCheckoutSession
        console.log("[BuyBlueprintModal] ✅ Authenticated user, using product checkout session", promoCode ? `with promo: ${promoCode}` : "without promo code")
        secret = await startProductCheckoutSession("paid_blueprint", promoCode)
      } else {
        // Unauthenticated: Use createLandingCheckoutSession
        console.log("[BuyBlueprintModal] 👤 Unauthenticated user, using landing checkout session", promoCode ? `with promo: ${promoCode}` : "without promo code")
        secret = await createLandingCheckoutSession("paid_blueprint", promoCode)
      }
      
      // Store client secret in ref to extract session ID later
      if (secret) {
        clientSecretRef.current = secret
      }
      
      setIsLoading(false)
      return secret
    } catch (error) {
      console.error("[BuyBlueprintModal] Error starting checkout:", error)
      setIsLoading(false)
      throw error
    }
  }, [promoCode])

  const handleCheckoutComplete = useCallback(async () => {
    console.log("[BuyBlueprintModal] ✅ Checkout completed")
    setIsLoading(false)
    onOpenChange(false)
    
    // Extract session ID from client secret and redirect to success page
    const clientSecret = clientSecretRef.current
    if (clientSecret) {
      const sessionId = clientSecret.split("_secret_")[0]
      console.log("[BuyBlueprintModal] Extracted session ID:", sessionId)
      
      // Try to get email from session
      try {
        const response = await fetch(`/api/checkout-session?session_id=${sessionId}`)
        const sessionData = await response.json()
        
        if (sessionData.email) {
          router.push(`/checkout/success?session_id=${sessionId}&email=${encodeURIComponent(sessionData.email)}&type=paid_blueprint`)
        } else {
          router.push(`/checkout/success?session_id=${sessionId}&type=paid_blueprint`)
        }
      } catch (error) {
        console.error("[BuyBlueprintModal] Error fetching session:", error)
        // Fallback: redirect without session ID (success page will handle it)
        router.push(`/checkout/success?session_id=${sessionId}&type=paid_blueprint`)
      }
    } else {
      // Fallback: redirect without session ID
      console.warn("[BuyBlueprintModal] No client secret available, redirecting without session ID")
      router.push("/checkout/success?type=paid_blueprint")
    }
  }, [router, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif font-light text-stone-900">
            Unlock Full Feed Planner
          </DialogTitle>
        </DialogHeader>

        {!showCheckout ? (
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

                <Button
                  onClick={() => {
                    console.log("[BuyBlueprintModal] Continue to Checkout clicked")
                    setShowCheckout(true)
                  }}
                  className="w-full bg-stone-900 hover:bg-stone-800 text-white rounded-xl py-3 px-6 font-medium transition-colors mt-6"
                >
                  Continue to Checkout
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Embedded checkout view
          <div className="mt-6">
            {isLoading && (
              <div className="text-center py-8">
                <p className="text-stone-600">Loading checkout...</p>
              </div>
            )}
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
