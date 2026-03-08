import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { createServerClient } from "@/lib/supabase/server"
import { getProductById } from "@/lib/products"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
})

export const metadata: Metadata = {
  title: "Selfie Guide | SSELFIE",
  description: "The paid SSELFIE guide that turns one good selfie into a full brand asset system.",
}

export default async function SelfieGuidePage() {
  const product = getProductById("selfie_guide")
  const features = product?.features || []

  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  const ctaHref = authUser
    ? "/checkout/selfie-guide"
    : `/auth/login?returnTo=${encodeURIComponent("/checkout/selfie-guide")}`
  const bundleHref = authUser
    ? "/checkout/selfie-guide?plan=bundle"
    : `/auth/login?returnTo=${encodeURIComponent("/checkout/selfie-guide?plan=bundle")}`

  return (
    <main className={`min-h-screen bg-[#0d0c0b] text-[#f0ede8] ${inter.className}`}>
      <section className="relative overflow-hidden border-b border-[rgba(195,190,182,0.16)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(240,237,232,0.08),transparent_48%)]" />
        <div className="relative mx-auto grid min-h-[100svh] max-w-[1600px] lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-between px-6 pb-10 pt-6 sm:px-10 sm:pb-14 sm:pt-8 lg:px-14 lg:pb-16 lg:pt-10">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="https://sselfie.ai"
                className={`${cormorant.className} text-[30px] font-light uppercase tracking-[0.28em] text-[#f0ede8]`}
              >
                SSELFIE
              </Link>
              <p className="text-[10px] uppercase tracking-[0.38em] text-[#8a8780]">Paid Guide</p>
            </div>

            <div className="max-w-[620px] py-14 sm:py-16 lg:py-20">
              <p className="mb-5 text-[11px] uppercase tracking-[0.42em] text-[#a8a49c]">2026 Edition</p>
              <h1
                className={`${cormorant.className} max-w-[12ch] text-[clamp(54px,9vw,118px)] font-light uppercase leading-[0.9] tracking-[0.04em] text-[#f0ede8]`}
              >
                One Good Selfie. Your Entire Brand.
              </h1>
              <p className="mt-6 max-w-[28ch] text-[18px] font-light leading-8 text-[rgba(240,237,232,0.78)] sm:text-[20px]">
                The guide that turns your phone into your most powerful business tool.
              </p>

              <div className="mt-8 flex flex-wrap items-end gap-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.34em] text-[#8a8780]">One-time access</p>
                  <p className="mt-2 text-4xl font-light text-[#f0ede8]">€17</p>
                </div>
                <p className="max-w-[24ch] text-sm font-light leading-6 text-[#8a8780]">
                  Instant digital access. No subscription.
                </p>
              </div>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link
                  href={ctaHref}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#f0ede8] px-7 text-[11px] font-medium uppercase tracking-[0.28em] text-[#0d0c0b] transition hover:bg-white"
                >
                  Get the Guide
                </Link>
                <Link
                  href={bundleHref}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-[rgba(240,237,232,0.16)] px-7 text-[11px] font-medium uppercase tracking-[0.28em] text-[#f0ede8] transition hover:border-[rgba(240,237,232,0.4)] hover:bg-[rgba(240,237,232,0.06)]"
                >
                  Get the $27 Bundle
                </Link>
              </div>
              <p className="mt-4 text-sm font-light leading-6 text-[#8a8780]">
                Buy once. Read immediately. Add the Brand Strategy bundle at checkout when you want both.
              </p>
            </div>

            <div className="grid gap-4 border-t border-[rgba(195,190,182,0.14)] pt-6 text-sm font-light leading-6 text-[#a8a49c] sm:grid-cols-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#8a8780]">Read</p>
                <p className="mt-2">Move chapter by chapter through Sandra&apos;s actual selfie framework.</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#8a8780]">Practice</p>
                <p className="mt-2">Use the checklists and 7-day challenge to make the advice real.</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#8a8780]">Build</p>
                <p className="mt-2">Flow straight into the Brand Strategy Pack and Studio when you are ready.</p>
              </div>
            </div>
          </div>

          <div className="relative min-h-[420px] border-t border-[rgba(195,190,182,0.14)] lg:min-h-full lg:border-l lg:border-t-0">
            <Image
              src="/images/selfie-guide/window-editorial-portrait.jpg"
              alt="Sandra standing beside a bright window in editorial black styling"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0c0b] via-transparent to-transparent lg:bg-gradient-to-l lg:from-transparent lg:via-transparent lg:to-[#0d0c0b]/24" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <div className="max-w-[360px] rounded-[26px] border border-[rgba(240,237,232,0.16)] bg-[rgba(13,12,11,0.56)] p-5 backdrop-blur-xl">
                <p className="text-[10px] uppercase tracking-[0.32em] text-[#a8a49c]">Inside the guide</p>
                <p className={`${cormorant.className} mt-3 text-3xl font-light uppercase tracking-[0.08em] text-[#f0ede8]`}>
                  A proper system
                </p>
                <p className="mt-3 text-sm font-light leading-6 text-[rgba(240,237,232,0.78)]">
                  Camera settings, light, angles, editing, confidence, content distribution, and the challenge that
                  helps it stick.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-16 sm:px-10 lg:px-14 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="max-w-[440px]">
            <p className="text-[10px] uppercase tracking-[0.4em] text-[#8a8780]">What you get</p>
            <h2 className={`${cormorant.className} mt-4 text-[clamp(34px,5vw,58px)] font-light uppercase leading-[0.96] tracking-[0.06em] text-[#f0ede8]`}>
              Clear steps. Better photos. A stronger starting point.
            </h2>
            <p className="mt-5 text-base font-light leading-8 text-[rgba(240,237,232,0.72)]">
              This is for the woman who is done waiting for a photographer, a team, or the perfect setup.
              You need a simple system that works right now.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {features.map((feature, index) => (
              <article
                key={feature}
                className="rounded-[28px] border border-[rgba(195,190,182,0.16)] bg-[rgba(175,170,162,0.08)] p-6 backdrop-blur-[30px]"
              >
                <p className="text-[10px] uppercase tracking-[0.32em] text-[#8a8780]">{String(index + 1).padStart(2, "0")}</p>
                <p className="mt-4 text-lg font-light leading-8 text-[#f0ede8]">{feature}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-12 rounded-[32px] border border-[rgba(195,190,182,0.16)] bg-[rgba(175,170,162,0.08)] p-6 sm:p-8 lg:p-10">
          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <p className="text-[10px] uppercase tracking-[0.4em] text-[#8a8780]">Your next step</p>
              <h3 className={`${cormorant.className} mt-3 text-[clamp(30px,4vw,50px)] font-light uppercase tracking-[0.08em] text-[#f0ede8]`}>
                Start with the guide. Build from there.
              </h3>
              <p className="mt-4 max-w-[42ch] text-base font-light leading-8 text-[rgba(240,237,232,0.74)]">
                Start with the guide. If you already know you want the message behind the visuals too, take the $27
                bundle and lock in both at once.
              </p>
            </div>

            <div className="flex flex-col gap-4 lg:items-end">
              <Link
                href={ctaHref}
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-[#f0ede8] px-7 text-[11px] font-medium uppercase tracking-[0.28em] text-[#0d0c0b] transition hover:bg-white lg:w-auto"
              >
                Get the Guide
              </Link>
              <Link
                href={bundleHref}
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-full border border-[rgba(240,237,232,0.16)] px-7 text-[11px] font-medium uppercase tracking-[0.28em] text-[#f0ede8] transition hover:border-[rgba(240,237,232,0.4)] hover:bg-[rgba(240,237,232,0.06)] lg:w-auto"
              >
                Get the $27 Bundle
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
