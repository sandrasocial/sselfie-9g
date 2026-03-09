import { Suspense } from "react"
import { SuccessContent } from "@/components/checkout/success-content"

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    session_id?: string
    email?: string
    type?: string
    return_to?: string
    brand_strategy_bump?: string
  }>
}) {
  const params = await searchParams

  // This prevents race conditions where we fetch before webhook has processed
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0d0c0b] flex items-center justify-center p-4">
          <div className="text-center">
            <div className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl tracking-[0.3em] uppercase text-[#f0ede8] mb-4">
              LOADING
            </div>
          </div>
        </div>
      }
    >
      <SuccessContent
        initialUserInfo={null}
        initialEmail={params.email}
        sessionId={params.session_id}
        purchaseType={params.type}
        returnTo={params.return_to}
        brandStrategyBumpSelected={params.brand_strategy_bump === "1"}
      />
    </Suspense>
  )
}
