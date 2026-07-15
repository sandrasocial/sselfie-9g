"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import {
  isCampaignData,
  type CampaignBuyerOrder,
  type CampaignData,
  type CampaignOrder,
} from "@/lib/campaign-outcome/types"

const ROLE_LABELS = {
  attention: "Attention",
  trust: "Trust",
  offer: "Offer",
} as const

async function recordOrderEvent(
  token: string,
  action: "downloaded" | "published_yes" | "published_no",
  assetType?: string
) {
  await fetch(`/api/campaign/order/${encodeURIComponent(token)}/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, assetType }),
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
          4. Who is this for?
        </span>
        <textarea
          required
          name="targetAudience"
          minLength={5}
          maxLength={800}
          rows={3}
          placeholder="Example: Women with a service business who are ready to show up more consistently."
          className="mt-3 w-full border border-[color:var(--app-border)] bg-white px-4 py-4 text-base leading-7 outline-none focus:border-[color:var(--ss-night)]"
        />
      </label>

      <label className="block">
        <span className="block text-[10px] uppercase tracking-[0.25em] text-[color:var(--app-text-secondary)]">
          Help Maya match your voice, optional
        </span>
        <span className="mt-2 block text-sm leading-6 text-[color:var(--app-text-secondary)]">
          Add your website, Instagram name, or paste one caption that sounds like you.
        </span>
        <textarea
          name="voiceReference"
          maxLength={1200}
          rows={3}
          placeholder="Website, Instagram name, or a sample caption"
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
        {failed ? "Maya needs a little help." : "Maya is preparing your campaign kit."}
      </h2>
      <p className="mt-4 max-w-xl text-base leading-8 text-[color:var(--app-text-secondary)]">
        {failed
          ? "You do not need to start over. Sandra can see the order and will restart it from the admin queue."
          : "Your mini shoot, feed posts, carousel, Stories, and publishing plan will move to Sandra for a quality check before delivery. You will receive an email when everything is ready."}
      </p>
    </div>
  )
}

function campaignCopyText(data: CampaignData): string {
  const postCopy = data.posts
    .map(
      (post, index) =>
        `${index + 1}. ${ROLE_LABELS[post.role]}\n${post.headline}\n\n${post.caption}\n\nCTA: ${post.cta}`
    )
    .join("\n\n---\n\n")
  const plan = data.publishPlan
    .map(day => `Day ${day.day}: ${day.instruction}`)
    .join("\n")
  return `YOUR NEXT CAMPAIGN\n\nVISUAL DIRECTION\n${data.visualDirection}\n\nFEED POSTS\n${postCopy}\n\nFIVE-DAY PLAN\n${plan}\n`
}

function allDownloadAssets(data: CampaignData) {
  return [
    ...data.photos.map((photo, index) => ({
      name: `01-brand-photos/${String(index + 1).padStart(2, "0")}-${photo.id}.png`,
      url: photo.visualUrl,
    })),
    ...data.carousel.slides.map(slide => ({
      name: `02-carousel/${String(slide.index).padStart(2, "0")}.png`,
      url: slide.visualUrl,
    })),
    ...data.storySequences.flatMap(sequence =>
      sequence.slides.map(slide => ({
        name: `03-stories/${sequence.role}/${String(slide.index).padStart(2, "0")}.png`,
        url: slide.visualUrl,
      }))
    ),
  ]
}

function AssetDownload({
  href,
  filename,
  token,
  assetType,
  label = "Download",
}: {
  href: string
  filename: string
  token: string
  assetType: string
  label?: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      download={filename}
      onClick={() => void recordOrderEvent(token, "downloaded", assetType)}
      className="inline-block border-b border-current pb-1 text-[9px] uppercase tracking-[0.2em]"
    >
      {label}
    </a>
  )
}

function DeliveredCampaign({ order, token }: { order: CampaignBuyerOrder; token: string }) {
  const [copied, setCopied] = useState<string | null>(null)
  const [downloadingAll, setDownloadingAll] = useState(false)
  const [downloadError, setDownloadError] = useState("")
  const data = isCampaignData(order.campaign_data) ? order.campaign_data : null
  const repeatHref = `/checkout/campaign?source=campaign_delivery&utm_source=product&utm_medium=repeat&utm_campaign=campaign_outcome_test&utm_content=repeat&cta_keyword=CAMPAIGN&repeat_order_token=${encodeURIComponent(token)}`

  async function copy(key: string, value: string) {
    await navigator.clipboard.writeText(value)
    setCopied(key)
    window.setTimeout(() => setCopied(null), 1600)
  }

  async function downloadAll() {
    if (!data || downloadingAll) return
    setDownloadingAll(true)
    setDownloadError("")
    try {
      const { default: JSZip } = await import("jszip")
      const zip = new JSZip()
      await Promise.all(
        allDownloadAssets(data).map(async asset => {
          const response = await fetch(asset.url)
          if (!response.ok) throw new Error(`Could not download ${asset.name}`)
          zip.file(asset.name, await response.blob())
        })
      )
      zip.file("campaign-copy-and-plan.txt", campaignCopyText(data))
      const blob = await zip.generateAsync({ type: "blob" })
      const href = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = href
      anchor.download = "sselfie-your-next-campaign.zip"
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(href)
      await recordOrderEvent(token, "downloaded", "complete_campaign_zip")
    } catch {
      setDownloadError("The full download did not finish. You can still download each section below.")
    } finally {
      setDownloadingAll(false)
    }
  }

  if (!data) return <WaitingState status="generation_failed" />

  return (
    <div className="mt-12">
      <div className="border-y border-[color:var(--app-border)] py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--ss-gray)]">
              Your visual direction
            </p>
            <p className="mt-4 max-w-3xl font-serif text-2xl leading-relaxed">
              {data.visualDirection}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void downloadAll()}
            disabled={downloadingAll}
            className="min-h-12 shrink-0 bg-[color:var(--ss-night)] px-6 text-[10px] uppercase tracking-[0.2em] text-white disabled:opacity-60"
          >
            {downloadingAll ? "Preparing download..." : "Download everything"}
          </button>
        </div>
        {downloadError ? <p className="mt-4 text-sm text-red-800">{downloadError}</p> : null}
      </div>

      <section className="mt-14">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--ss-gray)]">
          Your five-day order
        </p>
        <div className="mt-5 grid gap-px bg-[color:var(--app-border)] sm:grid-cols-5">
          {data.publishPlan.map(day => (
            <article key={day.day} className="bg-white p-5">
              <p className="text-[9px] uppercase tracking-[0.2em] text-[color:var(--ss-gray)]">
                Day {day.day}
              </p>
              <p className="mt-3 text-sm leading-6">{day.instruction}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--ss-gray)]">
          Your mini brand shoot
        </p>
        <h2 className="mt-4 font-serif text-4xl">Six photos for this promotion.</h2>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3">
          {data.photos.map((photo, index) => (
            <article key={photo.id} className="bg-white">
              <div className="relative aspect-[2/3] overflow-hidden bg-[color:var(--color-whisper)]">
                <Image
                  src={photo.visualUrl}
                  alt={photo.label}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 33vw"
                  unoptimized
                />
              </div>
              <div className="flex items-center justify-between gap-3 p-4">
                <p className="text-[9px] uppercase tracking-[0.18em] text-[color:var(--ss-gray)]">
                  {photo.kind === "primary" ? "Campaign" : "Alternate"} {index + 1}
                </p>
                <AssetDownload
                  href={photo.visualUrl}
                  filename={`sselfie-brand-photo-${index + 1}.png`}
                  token={token}
                  assetType={`brand_photo_${index + 1}`}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--ss-gray)]">
          Your feed posts
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--app-text-secondary)]">
          Start with post one because {data.firstPostReason}
        </p>
        <div className="mt-10 space-y-16">
          {data.posts.map((post, index) => {
            const captionKey = `caption-${index}`
            return (
              <article
                key={post.role}
                className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start"
              >
                <div>
                  <div className="relative aspect-[2/3] overflow-hidden bg-[color:var(--color-whisper)]">
                    <Image
                      src={post.visualUrl}
                      alt={`${ROLE_LABELS[post.role]} campaign visual`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 40vw"
                      unoptimized
                    />
                  </div>
                  <div className="mt-3">
                    <AssetDownload
                      href={post.visualUrl}
                      filename={`sselfie-${post.role}-campaign.png`}
                      token={token}
                      assetType={`${post.role}_post_image`}
                      label="Download image"
                    />
                  </div>
                </div>
                <div className="lg:pt-4">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--ss-gray)]">
                    {String(index + 1).padStart(2, "0")} · {ROLE_LABELS[post.role]}
                  </p>
                  <h2 className="mt-4 font-serif text-4xl leading-tight">{post.headline}</h2>
                  <p className="mt-4 text-sm leading-7 text-[color:var(--app-text-secondary)]">
                    {post.whyThisPost}
                  </p>
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
      </section>

      <section className="mt-20">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--ss-gray)]">
          Your carousel
        </p>
        <h2 className="mt-4 font-serif text-4xl">{data.carousel.title}</h2>
        <div className="mt-8 flex snap-x gap-4 overflow-x-auto pb-5">
          {data.carousel.slides.map(slide => (
            <article key={slide.index} className="w-[78%] shrink-0 snap-start sm:w-[42%] lg:w-[28%]">
              <div className="relative aspect-[4/5] overflow-hidden bg-[color:var(--color-whisper)]">
                <Image
                  src={slide.visualUrl}
                  alt={`Carousel slide ${slide.index}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 78vw, 30vw"
                  unoptimized
                />
              </div>
              <div className="mt-3">
                <AssetDownload
                  href={slide.visualUrl}
                  filename={`sselfie-carousel-${slide.index}.png`}
                  token={token}
                  assetType={`carousel_slide_${slide.index}`}
                  label={`Download slide ${slide.index}`}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--ss-gray)]">
          Your Stories
        </p>
        <div className="mt-8 space-y-14">
          {data.storySequences.map(sequence => (
            <article key={sequence.role}>
              <h2 className="font-serif text-3xl">{sequence.title}</h2>
              <div className="mt-6 flex snap-x gap-4 overflow-x-auto pb-5">
                {sequence.slides.map(slide => (
                  <div key={slide.index} className="w-[66%] shrink-0 snap-start sm:w-[34%] lg:w-[22%]">
                    <div className="relative aspect-[9/16] overflow-hidden bg-[color:var(--color-whisper)]">
                      <Image
                        src={slide.visualUrl}
                        alt={`${sequence.title} Story ${slide.index}`}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 66vw, 24vw"
                        unoptimized
                      />
                    </div>
                    <div className="mt-3">
                      <AssetDownload
                        href={slide.visualUrl}
                        filename={`sselfie-${sequence.role}-story-${slide.index}.png`}
                        token={token}
                        assetType={`${sequence.role}_story_${slide.index}`}
                        label={`Download Story ${slide.index}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

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
          <p className="text-[9px] uppercase tracking-[0.2em] text-[color:var(--ss-gray)]">
            Private order
          </p>
        </header>

        <section className="pt-12 sm:pt-16">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ss-gray)]">
            One selfie · One promotion · One complete campaign
          </p>
          <h1 className="mt-5 max-w-3xl font-serif text-4xl leading-tight sm:text-6xl">
            {heading}
          </h1>
          {!hasIntake ? (
            <p className="mt-5 max-w-2xl text-base leading-8 text-[color:var(--app-text-secondary)]">
              Add four simple details. Maya prepares your mini shoot, feed posts, carousel, Story
              sequences, and five-day posting order. Sandra checks the work before you receive it.
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
