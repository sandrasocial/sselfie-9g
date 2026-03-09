import Link from "next/link"

type FailurePageProps = {
  searchParams: Promise<{
    product?: string
  }>
}

const RETRY_PATHS: Record<string, string> = {
  sselfie_studio_membership: "/checkout/membership",
  one_time_session: "/checkout/one-time",
}

export default async function CheckoutFailurePage({ searchParams }: FailurePageProps) {
  const params = await searchParams
  const retryPath = RETRY_PATHS[params.product || ""] || "/"

  return (
    <main className="min-h-screen bg-[#0d0c0b] text-[#f0ede8] flex items-center justify-center px-6 py-16">
      <div className="max-w-xl w-full text-center bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl p-8 space-y-5">
        <p className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.5em] text-[#8a8780]">Checkout</p>
        <h1 className="font-['Cormorant_Garamond'] font-light text-4xl tracking-wide text-[#f0ede8]">
          Something went wrong
        </h1>
        <p className="text-sm text-[#8a8780] leading-relaxed">
          Your checkout did not finish. Try checkout again, or go back and start over.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={retryPath}
            className="bg-[#c8c4bb] text-[#0d0c0b] font-medium tracking-[0.15em] uppercase text-xs px-8 py-3 rounded-full hover:bg-[#f0ede8] transition-colors"
          >
            Try checkout again
          </Link>
          <Link
            href="/"
            className="border border-[rgba(195,190,182,0.25)] text-[#f0ede8] tracking-[0.15em] uppercase text-xs px-8 py-3 rounded-full hover:bg-[rgba(175,170,162,0.10)] transition-colors"
          >
            Back home
          </Link>
        </div>
      </div>
    </main>
  )
}
