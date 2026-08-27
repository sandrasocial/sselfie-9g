"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { CheckoutBrandMasthead } from "@/components/checkout/checkout-brand-masthead"

export default function CheckoutCancelPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-[#FAFAF9] text-[#09090B]">
      <CheckoutBrandMasthead />
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl items-center justify-center p-6 text-center">
        <div className="w-full">
          {/* Icon */}
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border border-[#F3E6CF] bg-white">
            <svg
              className="h-8 w-8 text-[#09090B]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>

          {/* Header */}
          <h1 className="mb-6 font-serif text-4xl font-extralight uppercase tracking-[0.16em] text-[#09090B] md:text-6xl">
            CHECKOUT CANCELLED
          </h1>

          <p className="mx-auto mb-12 max-w-xl text-lg font-light leading-relaxed text-[#5E5E66]">
            No worries. Your payment was not processed. You can come back to SSELFIE whenever
            you&apos;re ready.
          </p>

          {/* What You&apos;re Missing */}
          <div className="mx-auto mb-12 max-w-xl border-t border-[#F3E6CF] bg-white p-8 text-left shadow-[0_18px_70px_rgba(9,9,11,0.06)]">
            <h2 className="mb-6 text-center font-serif text-2xl font-extralight uppercase tracking-[0.2em] text-[#09090B]">
              WHEN YOU&apos;RE READY
            </h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center bg-[#09090B] text-xs text-white">
                  ✓
                </div>
                <p className="text-sm font-light text-[#5E5E66]">
                  The Selfie Guide helps you take the first photo you feel good posting.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center bg-[#09090B] text-xs text-white">
                  ✓
                </div>
                <p className="text-sm font-light text-[#5E5E66]">
                  The Starter Kit turns that photo into your first brand-ready week.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center bg-[#09090B] text-xs text-white">
                  ✓
                </div>
                <p className="text-sm font-light text-[#5E5E66]">
                  The Masterclass gives you Sandra&apos;s full selfie and content method.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center bg-[#09090B] text-xs text-white">
                  ✓
                </div>
                <p className="text-sm font-light text-[#5E5E66]">
                  Maya turns your answers into your next 7 days.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center bg-[#09090B] text-xs text-white">
                  ✓
                </div>
                <p className="text-sm font-light text-[#5E5E66]">
                  No stress. You can start again when it feels right.
                </p>
              </div>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/masterclass"
              className="inline-block bg-[#09090B] px-8 py-4 text-sm font-medium uppercase tracking-wider text-white transition-colors hover:bg-[#18181B]"
            >
              Back To Masterclass
            </Link>
            <button
              onClick={() => router.push("/")}
              className="border border-[#F3E6CF] bg-white px-8 py-4 text-sm font-medium uppercase tracking-wider text-[#09090B] transition-colors hover:bg-[#FAFAF9]"
            >
              Return Home
            </button>
          </div>

          {/* Help */}
          <div className="mt-12 border-t border-[#F3E6CF] pt-8">
            <p className="mb-2 text-sm font-light text-[#74695F]">Have questions?</p>
            <Link
              href="mailto:hello@sselfie.ai"
              className="text-sm font-medium text-[#09090B] hover:underline"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
