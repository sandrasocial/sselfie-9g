import { redirect, notFound } from "next/navigation"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { userHasAcademyAccess } from "@/lib/academy-access"
import { ACADEMY_PRODUCTS, type AcademyProductId } from "@/lib/products"
import PurchaseButton from "./purchase-button"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "500"] })

export default async function AcademyProductPage({
  params,
}: {
  params: Promise<{ productId: string }>
}) {
  const { productId } = await params
  const product = ACADEMY_PRODUCTS[productId as AcademyProductId]
  if (!product) notFound()

  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect(`/auth/login?redirect=${encodeURIComponent(`/academy/products/${productId}`)}`)
  }

  const neonUser = await getUserByAuthId(authUser.id)
  if (!neonUser) {
    redirect(`/auth/login?redirect=${encodeURIComponent(`/academy/products/${productId}`)}`)
  }

  const hasAccess = await userHasAcademyAccess(neonUser.id, product.id)

  return (
    <main className="min-h-screen min-w-[375px] bg-[#f5f5f5]">
      <div className="mx-auto max-w-2xl px-12 py-20">
        <p
          className={`${inter.className} mb-4 text-xs uppercase tracking-[0.5em] text-[#666666]`}
          style={{ fontWeight: 500 }}
        >
          SSELFIE Academy
        </p>
        <h1
          className={`${cormorant.className} text-4xl uppercase text-[#0a0a0a]`}
          style={{ fontWeight: 300, letterSpacing: "-0.01em" }}
        >
          {product.name}
        </h1>
        <p className={`${inter.className} mt-3 text-sm text-[#666666]`} style={{ fontWeight: 300 }}>
          {product.tagline}
        </p>

        {!hasAccess ? (
          <div className="mt-10 border border-[#e5e5e5] bg-[#ffffff] p-8">
            <p className={`${inter.className} text-sm text-[#666666]`} style={{ fontWeight: 300 }}>
              This product isn&apos;t in your library yet.
            </p>
            <PurchaseButton productId={product.id} price={product.price / 100} />
          </div>
        ) : (
          <div className="mt-10 border border-[#e5e5e5] bg-[#ffffff] p-10">
            <p
              className={`${inter.className} text-xs uppercase tracking-[0.5em] text-[#666666]`}
              style={{ fontWeight: 500 }}
            >
              Your Library
            </p>
            <h2
              className={`${cormorant.className} mt-4 text-3xl uppercase text-[#0a0a0a]`}
              style={{ fontWeight: 300 }}
            >
              {product.name}
            </h2>
            <p className={`${inter.className} mt-4 text-sm text-[#666666]`} style={{ fontWeight: 300 }}>
              Your product is ready. Open it below.
            </p>
            <a
              href={`/academy/${productId}/index.html`}
              className={`${inter.className} mt-6 inline-block bg-[#0a0a0a] px-8 py-3 text-white transition-opacity hover:opacity-80`}
              style={{ fontWeight: 500, fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase" }}
            >
              Open {product.name} →
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
