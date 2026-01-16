"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"

export default function CheckoutCancelPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-stone-200 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        {/* Header */}
        <h1 className="font-serif text-4xl md:text-6xl font-extralight tracking-[0.3em] uppercase text-stone-900 mb-6">
          CHECKOUT CANCELLED
        </h1>

        <p className="text-lg text-stone-600 font-light leading-relaxed mb-12 max-w-xl mx-auto">
          No worries. Your payment was not processed. You can return to the pricing page whenever you&apos;re ready to join
          SSELFIE.
        </p>

        {/* What You&apos;re Missing */}
        <div className="bg-white border-2 border-stone-200 rounded-lg p-8 mb-12 text-left max-w-xl mx-auto">
          <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-900 mb-6 text-center">
            WHAT YOU&apos;RE MISSING
          </h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-stone-900 text-stone-50 rounded-full flex items-center justify-center text-xs">
                ✓
              </div>
              <p className="text-sm text-stone-700 font-light">
                Professional AI photos generated from your selfies in minutes
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-stone-900 text-stone-50 rounded-full flex items-center justify-center text-xs">
                ✓
              </div>
              <p className="text-sm text-stone-700 font-light">Maya, your personal AI brand strategist</p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-stone-900 text-stone-50 rounded-full flex items-center justify-center text-xs">
                ✓
              </div>
              <p className="text-sm text-stone-700 font-light">
                Feed Designer to visualize your Instagram before posting
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-stone-900 text-stone-50 rounded-full flex items-center justify-center text-xs">
                ✓
              </div>
              <p className="text-sm text-stone-700 font-light">
                Content Academy with proven personal branding strategies
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-stone-900 text-stone-50 rounded-full flex items-center justify-center text-xs">
                ✓
              </div>
              <p className="text-sm text-stone-700 font-light">50% off for life as a beta member</p>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/landing#pricing"
            className="bg-stone-950 text-stone-50 px-8 py-4 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200 inline-block"
          >
            View Pricing Again
          </Link>
          <button
            onClick={() => router.push("/")}
            className="bg-stone-100 text-stone-900 px-8 py-4 rounded-lg text-sm font-medium uppercase tracking-wider hover:bg-stone-200 transition-all duration-200 border-2 border-stone-200"
          >
            Return Home
          </button>
        </div>

        {/* Help */}
        <div className="mt-12 pt-8 border-t border-stone-200">
          <p className="text-sm text-stone-500 font-light mb-2">Have questions?</p>
          <Link href="mailto:hello@sselfie.ai" className="text-sm text-stone-900 font-medium hover:underline">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  )
}
