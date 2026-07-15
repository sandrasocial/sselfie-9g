"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import {
  isCampaignData,
  type CampaignBuyerOrder,
  type CampaignOrder,
} from "@/lib/campaign-outcome/types"

const ROLE_LABELS = {
  attention: "Attention",
  trust: "Trust",
  offer: "Offer",
} as const

async function recordOrderEvent(
  token: string,
  action: "downloaded" | "published_yes" | "published_no"
) {
  await fetch(`/api/campaign/order/${encodeURIComponent(token)}/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  }).catch(() => {})
}

function IntakeForm({ token }: { token: string }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const form = new FormData(event.currentTarget)
    const response = await fetch(`/api/campaign/order/${encodeURIComponent(token)}/intake`, {
      method: "POST",
      body: form,
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(data.error || "I could not save that. Please check the fields and try again.")
      setSubmitting(false)
      return
    }
    window.location.reload()
  }

  return (
    <form onSubmit={submit} className="mt-10 space-y-8">
      <label className="block">
        <span className="block text-[10px] uppercase tracking-[0.25em] text-[color:var(--app-text-secondary)]">
          1. Add one clear selfie
        </span>
        <span className="mt-2 block text-sm leading-6 text-[color:var(--app-text-secondary)]">
          Face the camera in natural light. No sunglasses or heavy filters.
        </span>
        <input
          required
          name="selfie"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="mt-4 block w-full border border-[color:var(--app-border)] bg-[color:var(--ss-seasalt)] px-4 py-4 text-sm file:mr-4 file:border-0 file:bg-[color:var(--ss-night)] file:px-4 file:py-3 file:text-[10px] file:uppercase file:tracking-[0.2em] file:text-white"
        />
      </label>

      <label className="block">
        <span className="block text-[10px] uppercase tracking-[0.25em] text-[color:var(--app-text-secondary)]">
          2. What do you sell?
        </span>
        <textarea
          required
          name="whatSheSells"
          minLength={10}
          maxLength={1200}
          rows={4}
          placeholder="Example: I help women organize their homes through a four-week online program."
          className="mt-3 w-full border border-[color:var(--app-border)] bg-white px-4 py-4 text-base leading-7 outline-none focus:border-[color:var(--ss-night)]"
        />
      </label>

      <label className="block">
        <span className="block text-[10px] uppercase tracking-[0.25em] text-[color:var(--app-text-secondary)]">
          3. What do you want to promote now?
        </span>
        <textarea
          required
          name="promotion"
          minLength={10}
          maxLength={1200}
          rows={4}
          placeholder="Example: My September group starts next Monday and I want people to join the waitlist."
          className="mt-3 w-full border border-[color:var(--app-border)] bg-white px-4 py-4 text-base leading-7 outline-none focus:border-[color:var(--ss-night)]"
        />
      </label>

      <label className="block">
        <span className="block text-[10px] uppercase tracking-[0.25em] text-[color:var(--app-text-secondary)]">
          Main platform, optional
        </span>
        <select
          name="platform"
          defaultValue="Instagram"
          className="mt-3 w-full border border-[color:var(--app-border)] bg-white px-4 py-4 text-base"
        >
          <option>Instagram</option>
          <option>LinkedIn</option>
          <option>Facebook</option>
          <option>Email</option>
        </select>
      </label>

      {error ? (
        <p className="border-l-2 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="min-h-14 w-full bg-[color:var(--ss-night)] px-8 text-[11px] font-semibold uppercase tracking-[0.23em] text-white disabled:cursor-wait disabled:bg-[color:var(--ss-gray)]"
      >
        {submitting ? "Saving your details..." : "Start my campaign"}
      </button>
    </form>
  )
}

function WaitingState({ status }: { status: CampaignOrder["status"] }) {
  const failed = status === "generation_failed"
  return (
    <div className="mt-10 border border-[color:var(--app-border)] bg-white px-7 py-10">
      <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--ss-gray)]">
        {failed ? "Sandra is checking this" : "Your details are in"}
      </p>
      <h2 className="mt-4 font-serif text-3xl">
        {failed ? "Maya needs a little help." : "Maya is preparing your campaign."}
      </h2>
      <p className="mt-4 max-w-xl text-base leading-8 text-[color:var(--app-text-secondary)]">
        {failed
          ? "You do not need to start over. Sandra can see the order and will restart it from the admin queue."
          : "The three posts will move to Sandra for a quality check before delivery. You will receive an email when everything is ready."}
      </p>
    </div>
  )
}

function DeliveredCampaign({ order, token }: { order: CampaignBuyerOrder; token: string }) {
  const [copied, setCopied] = useState<string | null>(null)
  const data = isCampaignData(order.campaign_data) ? order.campaign_data : null
  const repeatHref = `/checkout/campaign?source=campaign_delivery&utm_source=product&utm_medium=repeat&utm_campaign=campaign_outcome_test&utm_content=repeat&cta_keyword=CAMPAIGN&repeat_order_token=${encodeURIComponent(token)}`

  async function copy(key: string, value: string) {
    await navigator.clipboard.writeText(value)
    setCopied(key)
    window.setTimeout(() => setCopied(null), 1600)
  }

  if (!data) return <WaitingState status="generation_failed" />

  return (
    <div className="mt-12">
      <div className="border-y border-[color:var(--app-border)] py-8">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--ss-gray)]">
          Your visual direction
        </p>
        <p className="mt-4 max-w-3xl font-serif text-2xl leading-relaxed">{data.visualDirection}</p>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--app-text-secondary)]">
          Start with post one because {data.firstPostReason}
        </p>
      </div>

      <div className="mt-12 space-y-16">
        {data.posts.map((post, index) => {
          const captionKey = `caption-${index}`
          return (
            <article
              key={post.role}
              className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start"
            >
              <a
                href={post.visualUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => void recordOrderEvent(token, "downloaded")}
                download={`sselfie-${post.role}-campaign.png`}
                className="group relative block aspect-[2/3] overflow-hidden bg-[color:var(--color-whisper)]"
              >
                <Image
                  src={post.visualUrl}
                  alt={`${ROLE_LABELS[post.role]} campaign visual`}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.01]"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  unoptimized
                />
                <span className="absolute bottom-4 right-4 bg-white px-3 py-2 text-[9px] uppercase tracking-[0.2em] text-black">
                  Download image
                </span>
              </a>
              <div className="lg:pt-4">
                <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--ss-gray)]">
                  {String(index + 1).padStart(2, "0")} · {ROLE_LABELS[post.role]}
                </p>
                <h2 className="mt-4 font-serif text-4xl leading-tight">{post.headline}</h2>
                <p className="mt-4 text-sm leading-7 text-[color:var(--app-text-secondary)]">{post.whyThisPost}</p>
                <div className="mt-7 border border-[color:var(--app-border)] bg-white p-6">
                  <p className="whitespace-pre-wrap text-base leading-8 text-[color:var(--ss-raisin)]">
                    {post.caption}
                  </p>
                  <p className="mt-5 border-t border-[color:var(--color-whisper)] pt-5 text-sm font-medium leading-7">
                    CTA: {post.cta}
                  </p>
                  <button
                    onClick={() => void copy(captionKey, `${post.caption}\n\n${post.cta}`)}
                    className="mt-6 border-b border-[color:var(--ss-night)] pb-1 text-[10px] uppercase tracking-[0.2em]"
                  >
                    {copied === captionKey ? "Copied" : "Copy caption and CTA"}
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <section className="mt-20 bg-[color:var(--ss-night)] px-7 py-14 text-center text-white sm:px-12">
        <p className="text-[10px] uppercase tracking-[0.28em] text-white/60">
          Have something new to promote?
        </p>
        <h2 className="mx-auto mt-5 max-w-xl font-serif text-4xl leading-tight">
          Let Maya prepare the next campaign.
        </h2>
        <Link
          href={repeatHref}
          className="mt-8 inline-flex min-h-14 items-center bg-white px-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-black"
        >
          Create my next campaign · $97
        </Link>
        <p className="mt-4 text-sm text-white/60">Another one-time purchase. No subscription.</p>
      </section>
    </div>
  )
}

// DRAFT COPY: Sandra must approve this buyer experience before the feature flag opens.
export function CampaignOrderExperience({
  initialOrder,
  token,
}: {
  initialOrder: CampaignBuyerOrder
  token: string
}) {
  const status = initialOrder.status
  const hasIntake = status !== "awaiting_intake"

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const published = params.get("published")
    if (published === "yes") void recordOrderEvent(token, "published_yes")
    if (published === "no") void recordOrderEvent(token, "published_no")
  }, [token])

  const heading = useMemo(() => {
    if (status === "delivered") return "Your campaign is ready."
    if (hasIntake) return "Your campaign is in progress."
    return "Tell Maya what needs to be sold."
  }, [hasIntake, status])

  return (
    <main className="min-h-screen bg-[color:var(--ss-seasalt)] px-5 py-10 text-[color:var(--ss-night)] sm:px-8 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-end justify-between border-b border-[color:var(--app-border)] pb-5">
          <div>
            <p className="font-serif text-2xl">SSELFIE</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.25em] text-[color:var(--ss-gray)]">
              Your Next Campaign
            </p>
          </div>
          <p className="text-[9px] uppercase tracking-[0.2em] text-[color:var(--ss-gray)]">Private order</p>
        </header>

        <section className="pt-12 sm:pt-16">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ss-gray)]">
            One selfie · One offer · Three posts
          </p>
          <h1 className="mt-5 max-w-3xl font-serif text-4xl leading-tight sm:text-6xl">
            {heading}
          </h1>
          {!hasIntake ? (
            <p className="mt-5 max-w-2xl text-base leading-8 text-[color:var(--app-text-secondary)]">
              Add three simple details. Maya will prepare an attention post, a trust post, and an
              offer post. Sandra checks the work before you receive it.
            </p>
          ) : null}
        </section>

        {status === "awaiting_intake" ? <IntakeForm token={token} /> : null}
        {status !== "awaiting_intake" && status !== "delivered" ? (
          <WaitingState status={status} />
        ) : null}
        {status === "delivered" ? <DeliveredCampaign order={initialOrder} token={token} /> : null}

        <footer className="mt-16 border-t border-[color:var(--app-border)] pt-6 text-xs leading-6 text-[color:var(--ss-gray)]">
          Your private link contains your campaign. Do not post or share the link itself. Questions:
          hello@sselfie.ai
        </footer>
      </div>
    </main>
  )
}
