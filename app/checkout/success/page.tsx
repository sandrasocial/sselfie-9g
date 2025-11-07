import { Suspense } from "react"
import { SuccessContent } from "@/components/checkout/success-content"
import { getUserByEmail } from "@/app/actions/landing-checkout"

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string; email?: string; type?: string }
}) {
  console.log("[v0] Success page - searchParams:", JSON.stringify(searchParams))

  let userInfo = null

  if (searchParams.email) {
    console.log("[v0] Success page - Attempting to get user by email:", searchParams.email)
    userInfo = await getUserByEmail(searchParams.email)
    console.log("[v0] Success page - getUserByEmail returned:", userInfo ? "user found" : "null")
  } else {
    console.log("[v0] Success page - No email in searchParams!")
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
      <SuccessContent initialUserInfo={userInfo} initialEmail={searchParams.email} purchaseType={searchParams.type} />
    </Suspense>
  )
}
