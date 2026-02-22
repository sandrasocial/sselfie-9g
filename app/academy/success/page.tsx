import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { getAcademyProducts } from "@/lib/academy-products"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "500"],
})

type SuccessPageProps = {
  searchParams: Promise<{ product?: string }>
}

const MEMBERSHIP_UPSELL_NAME = "Creator Studio membership"

export default async function AcademySuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams
  const productId = params.product

  const products = await getAcademyProducts()
  const product = productId ? products.find((candidate) => candidate.id === productId) : null

  const productName = product?.name ?? "Academy"
  const upsellName = product
    ? product.upsellTo === "membership"
      ? MEMBERSHIP_UPSELL_NAME
      : products.find((candidate) => candidate.id === product.upsellTo)?.name ?? null
    : null

  return (
    <main className="min-h-screen min-w-[375px] bg-[#f5f5f5]">
      <div className="mx-auto max-w-xl px-8 py-24">
        <h1
          className={`${cormorant.className} text-4xl uppercase text-[#0a0a0a]`}
          style={{ fontWeight: 200 }}
        >
          YOU&apos;RE IN, {productName}.
        </h1>

        <p className={`${inter.className} mt-6 text-base font-light leading-relaxed text-[#666666]`}>
          Proud of you for doing this. Go to your Academy to access it.
        </p>

        {upsellName ? (
          <p className={`${inter.className} mt-4 text-base font-light leading-relaxed text-[#666666]`}>
            When you&apos;re ready, {upsellName} is next.
          </p>
        ) : null}

        <Link
          href="/academy"
          className={`${inter.className} mt-10 inline-flex rounded-none bg-[#0a0a0a] px-8 py-3 text-white`}
          style={{ fontWeight: 500 }}
        >
          Go to Academy
        </Link>
      </div>
    </main>
  )
}
