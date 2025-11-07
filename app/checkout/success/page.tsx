import { Suspense } from "react"
import { SuccessContent } from "@/components/checkout/success-content"
import { getUserByEmail } from "@/app/actions/landing-checkout"

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; email?: string; type?: string }>
}) {
  const params = await searchParams
  let userInfo = null

  if (params.email) {
    userInfo = await getUserByEmail(params.email)
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="font-serif text-xl sm:text-2xl font-extralight tracking-[0.3em] uppercase text-stone-900 mb-4">
              LOADING
            </div>
          </div>
        </div>
      }
    >
      <SuccessContent initialUserInfo={userInfo} initialEmail={params.email} purchaseType={params.type} />
    </Suspense>
  )
}
