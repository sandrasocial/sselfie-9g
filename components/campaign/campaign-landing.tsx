"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"

import { trackAnalyticsEvent } from "@/lib/analytics/client"

const CAMPAIGN_IMAGES = [
  "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-01-hero-identity.jpeg",
  "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-07-work-creator.jpeg",
  "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-05-brand-anchor.jpeg",
]

const CAMPAIGN_DELIVERABLES = [
  "Planned for exactly what you're promoting",
  "Written in your voice",
  "Built from patterns proven in this niche",
  "One reel, ready to assemble: hook, your b-roll from your own photos, overlays, and what to film on your phone",
  "Three feed posts in order: attention, trust, offer",
  "Six brand photos that still look like you",
  "A seven-slide carousel for the same promotion",
  "Two Story sequences: the warm-up and the ask",
  "One simple plan for what to post first, and why",
  "Sandra checks everything before it reaches you",
  "Delivered within 48 hours",
] as const

function useCheckoutHref(): string {
  const [href, setHref] = useState("/checkout/campaign")
  useEffect(() => {
    const incoming = new URLSearchParams(window.location.search)
    incoming.delete("checkout")
    incoming.delete("offer")
    if (!incoming.has("source")) incoming.set("source", "campaign_landing")
    if (!incoming.has("utm_campaign")) incoming.set("utm_campaign", "campaign_outcome_test")
    if (!incoming.has("cta_keyword")) incoming.set("cta_keyword", "CAMPAIGN")
    setHref(`/checkout/campaign?${incoming.toString()}`)
  }, [])
  return href
}

export function CampaignLanding({
  enabled,
  checkoutFailed,
}: {
  enabled: boolean
  checkoutFailed: boolean
}) {
  const checkoutHref = useCheckoutHref()

  useEffect(() => {
    if (!enabled) return
    void trackAnalyticsEvent({
      event: "campaign_landing_view",
      properties: { offer_slug: "your-next-campaign", cta_keyword: "CAMPAIGN" },
    })
  }, [enabled])

  if (!enabled) {
    return (
      <main className="min-h-screen bg-[color:var(--ss-seasalt)] px-6 py-20 text-[color:var(--ss-night)]">
        <div className="mx-auto max-w-xl border border-[color:var(--app-border)] bg-white px-8 py-14 text-center sm:px-14">
          <p className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--ss-gray)]">
            SSELFIE
          </p>
          <h1 className="mt-6 font-serif text-4xl leading-tight">Your Next Campaign</h1>
          <p className="mt-5 text-base leading-7 text-[color:var(--app-text-secondary)]">
            This private test is not open yet.
          </p>
          <Link
            href="/"
            className="mt-8 inline-block border-b border-[color:var(--ss-night)] pb-1 text-xs uppercase tracking-[0.2em]"
          >
            Back to SSELFIE
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="bg-[color:var(--ss-seasalt)] text-[color:var(--ss-night)]">
      <section className="relative min-h-[760px] overflow-hidden bg-[color:var(--ss-night)] lg:min-h-[820px]">
        <Image
          src={CAMPAIGN_IMAGES[0]}
          alt="Sandra using personal brand photos for her business"
          fill
          priority
          className="object-cover object-[58%_center] opacity-70"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/62 to-black/25" />
        <div className="relative mx-auto flex min-h-[760px] max-w-7xl items-center px-6 py-24 lg:min-h-[820px] lg:px-12">
          <div className="max-w-2xl text-white">
            <p className="text-[10px] uppercase tracking-[0.35em] text-white/70">
              For women building something of their own
            </p>
            <h1 className="mt-7 max-w-xl font-serif text-5xl leading-[0.98] sm:text-6xl lg:text-7xl">
              Give Maya one selfie. Leave with your next campaign.
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-8 text-white/82">
              For the woman who knows what she&apos;s building and freezes when it&apos;s time to post. One
              selfie becomes the campaign that finally shows people what you&apos;re building.
            </p>
            <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Link
                href={checkoutHref}
                className="inline-flex min-h-14 items-center justify-center bg-white px-8 text-[11px] font-semibold uppercase tracking-[0.23em] text-black transition hover:bg-white/90"
              >
                Create my campaign · $97
              </Link>
              <p className="text-sm text-white/70">One payment. No subscription.</p>
            </div>
            {checkoutFailed ? (
              <p className="mt-5 border border-white/55 bg-black/35 px-4 py-3 text-sm text-white">
                Checkout did not open. Please try again, or email hello@sselfie.ai if it happens
                twice.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 lg:px-12 lg:py-32">
        <div className="grid gap-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--ss-gray)]">
              One clear result
            </p>
            <h2 className="mt-5 max-w-md font-serif text-4xl leading-tight sm:text-5xl">
              Not another tool to learn.
            </h2>
            <p className="mt-6 max-w-md text-base leading-8 text-[color:var(--app-text-secondary)]">
              Tell Maya what you sell and what needs attention now. She turns it into one small
              campaign that arrives ready to use.
            </p>
          </div>

          <div className="grid gap-px bg-[color:var(--app-border)] sm:grid-cols-3">
            {CAMPAIGN_IMAGES.map((src, index) => {
              const roles = ["01 · Mini shoot", "02 · Feed + carousel", "03 · Stories + plan"]
              return (
                <article key={src} className="bg-white">
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <Image
                      src={src}
                      alt="Coordinated SSELFIE campaign example"
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-5">
                    <p className="text-[10px] uppercase tracking-[0.23em] text-[color:var(--ss-gray)]">
                      {roles[index]}
                    </p>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-[color:var(--app-border)] bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[0.72fr_1.28fr] lg:px-12 lg:py-24">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--ss-gray)]">
              What you get
            </p>
            <h2 className="mt-5 max-w-md font-serif text-4xl leading-tight sm:text-5xl">
              One campaign, planned and produced.
            </h2>
            <p className="mt-6 max-w-md text-base leading-8 text-[color:var(--app-text-secondary)]">
              Not a folder of templates. Maya builds the work around your brief, and Sandra checks
              it before it reaches you.
            </p>
          </div>
          <ul className="divide-y divide-[color:var(--app-border)] border-y border-[color:var(--app-border)]">
            {CAMPAIGN_DELIVERABLES.map(item => (
              <li
                key={item}
                className="grid grid-cols-[1.5rem_1fr] gap-4 py-4 text-sm leading-7 sm:text-base"
              >
                <span aria-hidden="true" className="text-[color:var(--ss-gray)]">
                  +
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-y border-[color:var(--app-border)] bg-white">
        <div className="mx-auto grid max-w-7xl gap-px bg-[color:var(--app-border)] md:grid-cols-3">
          {[
            ["You add", "One clear selfie, what you sell, and what you want to promote."],
            [
              "Maya prepares",
              "Your photos, reel, feed posts, carousel, Stories, and five-day plan, all built for the same campaign.",
            ],
            [
              "Sandra checks",
              "I look at every image before it reaches you. If you don't recognize yourself in a photo, I'll redo it. Your campaign lands within 48 hours. · Sandra",
            ],
          ].map(([title, body]) => (
            <div key={title} className="bg-white p-8 lg:p-12">
              <h3 className="font-serif text-2xl">{title}</h3>
              <p className="mt-4 text-sm leading-7 text-[color:var(--app-text-secondary)]">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-24 text-center lg:py-32">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--ss-gray)]">
          The still-you standard
        </p>
        <h2 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">
          You should still recognize yourself.
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[color:var(--app-text-secondary)]">
          Every photo starts from your real selfie, and Sandra checks the set before it reaches you.
          If you don&apos;t recognize yourself in a photo, we redo it.
        </p>
        <p className="mx-auto mt-10 max-w-2xl font-serif text-2xl leading-relaxed">
          This was never about creating more content. It&apos;s about finally becoming visible for what
          you&apos;re building.
        </p>
        <Link
          href={checkoutHref}
          className="mt-10 inline-flex min-h-14 items-center justify-center bg-[color:var(--ss-night)] px-8 text-[11px] font-semibold uppercase tracking-[0.23em] text-white"
        >
          Create my campaign · $97
        </Link>
        <p className="mt-4 text-sm text-[color:var(--ss-gray)]">
          One-time purchase. Delivered within 48 hours after intake.
        </p>
      </section>
    </main>
  )
}
