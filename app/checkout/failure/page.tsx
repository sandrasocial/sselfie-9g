import Link from "next/link"
import { CheckoutBrandMasthead } from "@/components/checkout/checkout-brand-masthead"

type FailurePageProps = {
  searchParams: Promise<{
    product?: string
  }>
}

const RETRY_PATHS: Record<string, string> = {
  sselfie_studio_membership: "/checkout/membership",
  visibility_suite: "/checkout/masterclass",
  one_time_session: "/checkout/membership",
}

export default async function CheckoutFailurePage({ searchParams }: FailurePageProps) {
  const params = await searchParams
  const retryPath = RETRY_PATHS[params.product || ""] || "/"

  return (
    <main className="min-h-screen bg-[#FAFAF9] text-[#09090B]">
      <CheckoutBrandMasthead />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl space-y-5 border-t border-[#F3E6CF] bg-white p-8 text-center shadow-[0_18px_70px_rgba(9,9,11,0.07)] sm:p-10">
          <p className="font-['Inter'] text-[10px] font-medium uppercase tracking-[0.5em] text-[#74695F]">
            Checkout
          </p>
          <h1 className="font-['Cormorant_Garamond'] text-4xl font-light tracking-wide text-[#09090B]">
            Something went wrong
          </h1>
          <p className="text-sm leading-relaxed text-[#5E5E66]">
            Your checkout did not finish. Try checkout again, or go back and start over.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href={retryPath}
              className="bg-[#09090B] px-8 py-3 text-xs font-medium uppercase tracking-[0.15em] text-white transition-colors hover:bg-[#18181B]"
            >
              Try checkout again
            </Link>
            <Link
              href="/"
              className="border border-[#F3E6CF] px-8 py-3 text-xs uppercase tracking-[0.15em] text-[#09090B] transition-colors hover:bg-[#FAFAF9]"
            >
              Back home
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
