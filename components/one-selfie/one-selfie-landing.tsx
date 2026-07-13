"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import {
  PublicOfferTracker,
  trackOfferCtaClick,
  trackPostKeywordAttributed,
} from "@/components/analytics/public-offer-tracker"

type OfferPhase = "upcoming" | "open" | "closed"

type OneSelfieLandingProps = {
  checkoutHref: string
  checkoutFailed: boolean
  closesAt: string
  hasInboundKeyword: boolean
  keyword: string
  opensAt: string
  serverNow: string
  source: string
  starterKitHref: string
}

const OFFER_SLUG = "one-selfie-visibility-bundle"
const PRODUCT_ID = "selfie_visibility_bundle"

const path = [
  {
    number: "01",
    title: "Start with the selfie",
    body: "Take one clear photo and make it stronger before you post or create anything else.",
  },
  {
    number: "02",
    title: "Make the photos",
    body: "Turn that selfie into realistic AI photos that still look and feel like you.",
  },
  {
    number: "03",
    title: "Build the visible brand",
    body: "Use the photos with a clearer story, message, and reason for people to remember you.",
  },
  {
    number: "04",
    title: "Keep creating with Maya",
    body: "Use 200 credits across 30 days to keep making the photos and content you need next.",
  },
]

const included = [
  {
    label: "Start with a photo you trust",
    products: "Selfie Starter Kit · Full SSELFIE Presets Collection",
    access: "Lifetime access",
  },
  {
    label: "Make it ready to post",
    products: "Editing Masterclass",
    access: "Lifetime access",
  },
  {
    label: "Create without the blank screen",
    products: "Prompt Vault",
    access: "Lifetime access",
  },
  {
    label: "Become easier to recognize",
    products: "Branded by SSELFIE course",
    access: "Lifetime access",
  },
  {
    label: "Keep the work moving",
    products: "30 days of SSELFIE SUITE with Maya · 200 credits",
    access: "Ends automatically · No renewal",
  },
]

const faqs = [
  {
    question: "Is this a subscription?",
    answer:
      "No. You pay $97 once. Your 30 days of SUITE ends automatically and nothing renews.",
  },
  {
    question: "What stays after the 30 days?",
    answer:
      "The Selfie Starter Kit, full Presets Collection, Editing Masterclass, Branded by SSELFIE course, and Prompt Vault stay yours for lifetime access. Only the 30-day SUITE pass ends.",
  },
  {
    question: "Do I need to finish five products before I can use Maya?",
    answer:
      "No. This is one path, not a library you need to finish. Start with one photo. Use the next piece only when you need it.",
  },
  {
    question: "What if I have never used AI for photos?",
    answer:
      "You can start as a complete beginner. The first step is still your own selfie. Maya and the Prompt Vault help with what comes next.",
  },
  {
    question: "What are the 200 credits?",
    answer:
      "A standard image uses one credit. Your bundle includes 200 credits for creating inside Maya during your 30-day pass.",
  },
  {
    question: "I already pay for SUITE. Should I buy this?",
    answer:
      "No. This bundle is designed to give non-members a 30-day introduction to Maya. You already have ongoing SUITE and Maya access, so keep using your membership. If you need one of the learning tools, contact support and we will help you find the right next step.",
  },
]

function getPhase(now: number, opensAt: string, closesAt: string): OfferPhase {
  if (now < Date.parse(opensAt)) return "upcoming"
  if (now >= Date.parse(closesAt)) return "closed"
  return "open"
}

function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  return `${minutes}m ${seconds}s`
}

function OfferAction({
  checkoutHref,
  hasInboundKeyword,
  keyword,
  phase,
  source,
  surface = "light",
}: {
  checkoutHref: string
  hasInboundKeyword: boolean
  keyword: string
  phase: OfferPhase
  source: string
  surface?: "dark" | "light"
}) {
  if (phase === "upcoming") {
    return (
      <span
        aria-disabled="true"
        className={`inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-none border px-6 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.22em] sm:w-auto ${
          surface === "dark"
            ? "border-white/25 bg-white/10 text-white/60"
            : "border-[var(--ss-silver)] bg-[var(--ss-white)] text-[var(--ss-gray)]"
        }`}
      >
        Opens 13 July at 18:00 CEST
      </span>
    )
  }

  if (phase === "closed") return null

  const href = checkoutHref
  const label = "Get the bundle · $97 once"

  return (
    <Link
      href={href}
      onClick={() => {
        trackOfferCtaClick({
          offerSlug: OFFER_SLUG,
          productId: PRODUCT_ID,
          ctaKeyword: keyword,
          source,
          href,
        })
        if (hasInboundKeyword) {
          trackPostKeywordAttributed({
            offerSlug: OFFER_SLUG,
            productId: PRODUCT_ID,
            ctaKeyword: keyword,
            source,
            href,
          })
        }
      }}
      className={`inline-flex min-h-12 w-full items-center justify-center rounded-none px-7 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.22em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 sm:w-auto ${
        surface === "dark"
          ? "bg-white text-[var(--ss-night)] hover:bg-[var(--ss-seasalt)] focus-visible:outline-white"
          : "bg-[var(--ss-night)] text-white hover:bg-[var(--ss-raisin)] focus-visible:outline-[var(--ss-night)]"
      }`}
    >
      {label}
    </Link>
  )
}

export function OneSelfieLanding({
  checkoutHref,
  checkoutFailed,
  closesAt,
  hasInboundKeyword,
  keyword,
  opensAt,
  serverNow,
  source,
  starterKitHref,
}: OneSelfieLandingProps) {
  const [now, setNow] = useState(() => Date.parse(serverNow))

  useEffect(() => {
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const phase = getPhase(now, opensAt, closesAt)
  const countdown = useMemo(() => {
    if (phase === "upcoming") return formatCountdown(Date.parse(opensAt) - now)
    if (phase === "open") return formatCountdown(Date.parse(closesAt) - now)
    return null
  }, [closesAt, now, opensAt, phase])

  const timingLabel =
    phase === "upcoming"
      ? `Opens in ${countdown}`
      : phase === "open"
        ? `Closes in ${countdown}`
        : "This 48-hour bundle is now closed"

  if (phase === "closed") {
    return (
      <div className="min-h-screen bg-[var(--ss-seasalt)] font-sans text-[var(--ss-night)]">
        <PublicOfferTracker
          offerSlug={OFFER_SLUG}
          productId={PRODUCT_ID}
          ctaKeyword={keyword}
          source={source}
        />
        <header
          data-testid="one-selfie-campaign-header"
          className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[var(--ss-night)]/90 text-white backdrop-blur-md"
        >
          <div className="mx-auto flex h-[58px] max-w-6xl items-center justify-between px-5 sm:px-8">
            <Link
              href="/"
              className="font-[family-name:var(--font-display)] text-[18px] font-light uppercase tracking-[0.35em]"
            >
              SSELFIE
            </Link>
            <Link
              href="/app"
              className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/60 underline decoration-white/30 underline-offset-4 hover:text-white"
            >
              Already in SUITE? Open it
            </Link>
          </div>
        </header>
        <main className="mx-auto flex min-h-screen max-w-6xl items-center justify-center border-x border-[var(--ss-silver)] bg-white px-6 pb-20 pt-[118px] text-center sm:px-10">
          <div className="max-w-2xl">
            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[var(--ss-gray)]">
              48-hour offer closed
            </p>
            <h1 className="mt-6 font-[family-name:var(--font-display)] text-[clamp(36px,7vw,70px)] font-light leading-[1.03] tracking-[-0.02em]">
              This bundle is now closed.
            </h1>
            <p className="mx-auto mt-7 max-w-xl text-[16px] font-light leading-7 text-[var(--ss-davy)]">
              I will not reset the deadline. If you still want a simple place to begin, the separate Selfie Starter Kit is available for $37.
            </p>
            <p className="mx-auto mt-3 max-w-xl text-[13px] leading-6 text-[var(--ss-gray)]">
              The Starter Kit does not include the bundle&apos;s extra courses, Prompt Vault, or 30-day SUITE pass.
            </p>
            <Link
              href={starterKitHref}
              onClick={() =>
                trackOfferCtaClick({
                  offerSlug: "starter-kit",
                  productId: "starter_kit",
                  ctaKeyword: keyword,
                  source: "one_selfie_expired_fallback",
                  href: starterKitHref,
                })
              }
              className="mt-9 inline-flex min-h-12 items-center justify-center rounded-none bg-[var(--ss-night)] px-7 py-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-white"
            >
              See the Starter Kit · $37
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--ss-seasalt)] pb-20 font-sans text-[var(--ss-night)] sm:pb-0">
      <PublicOfferTracker
        offerSlug={OFFER_SLUG}
        productId={PRODUCT_ID}
        ctaKeyword={keyword}
        source={source}
      />

      <header
        data-testid="one-selfie-campaign-header"
        className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[var(--ss-night)]/90 text-white backdrop-blur-md"
      >
        <div className="mx-auto flex h-[58px] max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-[18px] font-light uppercase tracking-[0.35em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            SSELFIE
          </Link>
          <Link
            href="/app"
            className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/60 underline decoration-white/30 underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            Already in SUITE? Open it
          </Link>
        </div>
      </header>

      {checkoutFailed ? (
        <div
          role="alert"
          className="fixed inset-x-0 top-[58px] z-40 border-b border-[var(--ss-silver)] bg-white px-5 py-3 text-center text-[13px] leading-6 text-[var(--ss-davy)]"
        >
          Checkout did not open. Try again below. If it still does not open, email support@sselfie.ai.
        </div>
      ) : null}

      <main>
        <section
          data-testid="one-selfie-campaign-hero"
          className="relative min-h-[100svh] overflow-hidden bg-[var(--ss-night)] text-white"
        >
          <div className="absolute inset-x-0 top-0 h-[34svh] lg:inset-0 lg:h-auto">
            <Image
              src="/images/work-with-me/sandra-founder-new.webp"
              alt="Sandra working on her laptop at home"
              fill
              priority
              sizes="100vw"
              className="object-cover object-[64%_18%] lg:object-[64%_20%]"
            />
            <div className="absolute inset-0 bg-black/45 lg:bg-black/20" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/35 to-[var(--ss-night)] lg:[background:linear-gradient(90deg,rgba(0,0,0,0.94)_0%,rgba(0,0,0,0.78)_44%,rgba(0,0,0,0.28)_75%,rgba(0,0,0,0.5)_100%)]" />
          </div>

          <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-6xl items-end justify-center px-5 pb-14 pt-[calc(34svh+2rem)] text-center sm:px-8 sm:pb-20 lg:items-center lg:justify-start lg:pb-16 lg:pt-24 lg:text-left">
            <div className="w-full max-w-3xl lg:max-w-[620px]">
              <div className="flex flex-col items-center justify-center gap-2 border-b border-white/20 pb-5 sm:flex-row sm:gap-5 lg:items-start lg:justify-start">
                <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/55">
                  48-hour offer
                </p>
                <p
                  aria-live="polite"
                  className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/75"
                >
                  {timingLabel}
                </p>
              </div>

              <p className="mt-7 text-[10px] font-medium uppercase tracking-[0.5em] text-white/60">
                One Selfie Visibility Bundle
              </p>
              <h1 className="mx-auto mt-5 max-w-3xl font-[family-name:var(--font-display)] text-[clamp(36px,7vw,70px)] font-light leading-[1.03] tracking-[-0.02em] text-white [text-shadow:0_2px_8px_rgba(0,0,0,0.8)] lg:mx-0">
                One selfie.
                <span className="block">Photos and content you can finally use.</span>
              </h1>
              <p className="mx-auto mt-6 max-w-[520px] text-[15px] font-normal leading-[1.78] text-white/80 lg:mx-0">
                Take it better. Edit it. Turn it into realistic AI photos. Then know what to post next.
              </p>

              <div className="mx-auto mt-7 flex max-w-2xl flex-col items-center justify-center gap-4 border-y border-white/20 py-5 sm:flex-row sm:gap-8 lg:mx-0 lg:justify-start">
                <div>
                  <p className="font-[family-name:var(--font-display)] text-[42px] font-light leading-none tracking-[-0.03em]">
                    $97
                  </p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/55">
                    One payment
                  </p>
                </div>
                <p className="max-w-[330px] text-[13px] leading-6 text-white/70 sm:text-left">
                  Lifetime tools plus 30 days of SUITE with 200 credits. No subscription. No renewal.
                </p>
              </div>

              <div className="mt-7">
                <OfferAction
                  checkoutHref={checkoutHref}
                  hasInboundKeyword={hasInboundKeyword}
                  keyword={keyword}
                  phase={phase}
                  source={source}
                  surface="dark"
                />
                <p className="mx-auto mt-4 max-w-[520px] text-[12px] leading-5 text-white/60 lg:mx-0">
                  $260 in lifetime tools, plus 30 days with Maya and 200 credits. Nothing renews.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[var(--ss-silver)] bg-[var(--ss-night)] text-white">
          <div className="mx-auto grid max-w-6xl divide-y divide-white/20 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {["$97 once", "Five lifetime products", "30 days of Maya · 200 credits"].map((item) => (
              <p
                key={item}
                className="px-6 py-5 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-white/80"
              >
                {item}
              </p>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl border-x border-[var(--ss-silver)] bg-white px-6 py-14 sm:px-10 sm:py-16 lg:px-14">
          <p className="text-[10px] font-medium uppercase tracking-[0.26em] text-[var(--ss-gray)]">
            What SSELFIE members have said
          </p>
          <div className="mt-7 grid border-t border-[var(--ss-silver)] md:grid-cols-2 md:divide-x md:divide-[var(--ss-silver)]">
            <blockquote className="border-b border-[var(--ss-silver)] py-8 md:border-b-0 md:pr-10">
              <p className="font-[family-name:var(--font-display)] text-[32px] font-light leading-tight text-[var(--ss-raisin)] sm:text-[38px]">
                “I just took the best photo of myself in years.”
              </p>
              <footer className="mt-5 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--ss-gray)]">
                A SSELFIE member
              </footer>
            </blockquote>
            <blockquote className="py-8 md:pl-10">
              <p className="font-[family-name:var(--font-display)] text-[32px] font-light leading-tight text-[var(--ss-raisin)] sm:text-[38px]">
                “Best one so far. I love that it looks real, and me.”
              </p>
              <footer className="mt-5 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--ss-gray)]">
                A SSELFIE member · 50 and fabulous
              </footer>
            </blockquote>
          </div>
          <p className="mt-4 max-w-3xl text-[14px] font-light leading-6 text-[var(--ss-davy)]">
            This was never just about selfies. It was about becoming visible enough to build something of your own.
          </p>
        </section>

        <section className="mx-auto max-w-6xl border-x border-[var(--ss-silver)] px-6 py-20 sm:px-10 sm:py-24 lg:px-14">
          <div className="max-w-2xl">
            <p className="text-[10px] font-medium uppercase tracking-[0.26em] text-[var(--ss-gray)]">
              One clear path
            </p>
            <h2 className="mt-4 font-[family-name:var(--font-display)] text-[clamp(28px,4.5vw,48px)] font-light leading-[1.07] tracking-[-0.015em]">
              The photo is the start. Visibility is where it leads.
            </h2>
          </div>

          <div className="relative mt-16 grid gap-0 lg:grid-cols-4">
            <div className="absolute left-0 right-0 top-[13px] hidden h-px bg-[var(--ss-gray)] lg:block" />
            {path.map((step) => (
              <article
                key={step.number}
                className="relative grid grid-cols-[48px_1fr] gap-4 border-t border-[var(--ss-silver)] py-7 first:border-t-0 lg:block lg:border-t-0 lg:px-5 lg:py-0 lg:first:pl-0 lg:last:pr-0"
              >
                <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--ss-gray)] bg-[var(--ss-seasalt)] text-[9px] font-medium tracking-[0.12em] text-[var(--ss-davy)]">
                  {step.number}
                </span>
                <div className="lg:mt-8">
                  <h3 className="font-[family-name:var(--font-display)] text-[26px] font-normal leading-tight tracking-[-0.015em]">
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-[300px] text-[14px] font-light leading-6 text-[var(--ss-davy)]">
                    {step.body}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-[var(--ss-silver)] bg-white">
          <div className="mx-auto grid max-w-6xl lg:grid-cols-[0.88fr_1.12fr]">
            <div className="relative min-h-[420px] overflow-hidden border-b border-[var(--ss-silver)] lg:min-h-[720px] lg:border-b-0 lg:border-r">
              <Image
                src="/images/one-selfie/bundle-products-mockup-v2.webp"
                alt="The One Selfie Visibility Bundle with five lifetime SSELFIE tools and a 30-day SSELFIE SUITE pass with 200 credits"
                fill
                sizes="(min-width: 1024px) 44vw, 100vw"
                className="object-cover"
              />
            </div>
            <div className="px-6 py-16 sm:px-10 sm:py-20 lg:px-16">
              <p className="text-[10px] font-medium uppercase tracking-[0.26em] text-[var(--ss-gray)]">
                What you get
              </p>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-[clamp(28px,4.5vw,48px)] font-light leading-[1.07] tracking-[-0.015em]">
                Not a library to finish. A path to follow.
              </h2>
              <p className="mt-6 max-w-xl text-[15px] font-light leading-7 text-[var(--ss-davy)]">
                Start with the part you need today. The rest is there when you are ready for the next step.
              </p>

              <div className="mt-10 border-t border-[var(--ss-silver)]">
                {included.map((item, index) => (
                  <div
                    key={item.label}
                    className="grid gap-3 border-b border-[var(--ss-silver)] py-6 sm:grid-cols-[38px_1fr_auto] sm:items-start"
                  >
                    <span className="text-[10px] font-medium tracking-[0.14em] text-[var(--ss-gray)]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="text-[14px] font-medium leading-6 text-[var(--ss-night)]">
                        {item.label}
                      </h3>
                      <p className="mt-1 text-[13px] font-light leading-6 text-[var(--ss-davy)]">
                        {item.products}
                      </p>
                    </div>
                    <p className="text-[9px] font-medium uppercase tracking-[0.13em] text-[var(--ss-gray)] sm:pt-1 sm:text-right">
                      {item.access}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl border-x border-[var(--ss-silver)] bg-[var(--ss-seasalt)] lg:grid-cols-[1fr_0.9fr]">
          <div className="px-6 py-16 sm:px-10 sm:py-20 lg:px-14 lg:py-24">
            <p className="text-[10px] font-medium uppercase tracking-[0.26em] text-[var(--ss-gray)]">
              Why this is different
            </p>
            <h2 className="mt-4 max-w-3xl font-[family-name:var(--font-display)] text-[clamp(28px,4.5vw,48px)] font-light leading-[1.07] tracking-[-0.015em]">
              You do not need more things to learn. You need one small place to begin.
            </h2>
            <p className="mt-7 max-w-2xl text-[16px] font-light leading-7 text-[var(--ss-davy)]">
              Your phone is enough to begin. This bundle helps you take the photo, make it usable, create more from it, and connect it to a brand people can recognize.
            </p>
            <blockquote className="mt-10 border-l border-[var(--ss-gray)] pl-6 font-[family-name:var(--font-display)] text-[28px] font-light italic leading-snug text-[var(--ss-raisin)] sm:text-[34px]">
              AI is the tool. You are the brand.
            </blockquote>
          </div>
          <div className="relative min-h-[460px] overflow-hidden border-t border-[var(--ss-silver)] lg:min-h-full lg:border-l lg:border-t-0">
            <Image
              src="/academy/visibility-suite/sandra-founder.webp"
              alt="Sandra, the founder of SSELFIE, standing outside with her tablet"
              fill
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover object-[52%_50%]"
            />
          </div>
        </section>

        <section className="border-y border-[var(--ss-silver)] bg-white">
          <div className="mx-auto grid max-w-6xl lg:grid-cols-[0.72fr_1.28fr]">
            <div className="border-b border-[var(--ss-silver)] px-6 py-14 sm:px-10 lg:border-b-0 lg:border-r lg:px-14 lg:py-20">
              <p className="text-[10px] font-medium uppercase tracking-[0.26em] text-[var(--ss-gray)]">
                Questions
              </p>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-[clamp(28px,4.5vw,48px)] font-light leading-[1.07] tracking-[-0.015em]">
                Everything clear before you buy.
              </h2>
            </div>
            <div className="px-6 py-8 sm:px-10 lg:px-14 lg:py-12">
              {faqs.map((faq) => (
                <details key={faq.question} className="group border-b border-[var(--ss-silver)] py-6 first:border-t">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[15px] font-medium leading-6 marker:content-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--ss-night)]">
                    {faq.question}
                    <span aria-hidden="true" className="text-xl font-light text-[var(--ss-gray)] group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="max-w-2xl pb-1 pt-4 text-[14px] font-light leading-7 text-[var(--ss-davy)]">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section
          data-testid="one-selfie-closing-cta"
          className="border-y border-white/15 bg-[var(--ss-night)] text-white"
        >
          <div className="mx-auto max-w-6xl px-6 py-20 text-center sm:px-10 sm:py-24">
            <p className="text-[10px] font-medium uppercase tracking-[0.26em] text-white/55">
              One selfie · One clear next step
            </p>
            <h2 className="mx-auto mt-5 max-w-4xl font-[family-name:var(--font-display)] text-[clamp(28px,4.5vw,48px)] font-light leading-[1.07] tracking-[-0.015em]">
              Start with the photo you already have.
            </h2>
            <p aria-live="polite" className="mt-6 text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">
              {timingLabel}
            </p>
            <div className="mt-8 flex justify-center">
              <OfferAction
                checkoutHref={checkoutHref}
                hasInboundKeyword={hasInboundKeyword}
                keyword={keyword}
                phase={phase}
                source={source}
                surface="dark"
              />
            </div>
            <p className="mx-auto mt-5 max-w-lg text-[12px] leading-5 text-white/55">
              $97 one-time. Lifetime products. 30 days of SUITE. No renewal.
            </p>
          </div>
        </section>

        <aside className="border-y border-[var(--ss-silver)] bg-[var(--ss-raisin)] px-6 py-9 text-center text-white">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/60">
            Already a SUITE member?
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-[14px] font-light leading-6 text-white/85">
            Do not buy this bundle. It is designed as a 30-day introduction to Maya. Your paid membership already gives you ongoing SUITE and Maya access. If you need a learning tool, contact support.
          </p>
          <Link
            href="/app"
            className="mt-4 inline-block text-[10px] font-medium uppercase tracking-[0.16em] underline decoration-white/50 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            Open SUITE
          </Link>
        </aside>
      </main>

      <footer className="bg-[var(--ss-night)] px-6 py-10 text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-[family-name:var(--font-display)] text-[18px] font-light uppercase tracking-[0.32em]">
            SSELFIE
          </p>
          <div className="flex gap-6 text-[9px] font-medium uppercase tracking-[0.14em] text-white/60">
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="mailto:support@sselfie.ai" className="hover:text-white">Support</Link>
          </div>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--ss-silver)] bg-[var(--ss-seasalt)] p-3 sm:hidden">
        <OfferAction
          checkoutHref={checkoutHref}
          hasInboundKeyword={hasInboundKeyword}
          keyword={keyword}
          phase={phase}
          source={source}
        />
      </div>
    </div>
  )
}
