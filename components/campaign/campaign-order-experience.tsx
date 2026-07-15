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

function IntakeForm({
  token,
  onSubmitted,
}: {
  token: string
  onSubmitted: (status: CampaignOrder["status"]) => void
}) {
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
    onSubmitted(
      data.status === "already_submitted" ? "inputs_ready" : data.status || "inputs_ready"
    )
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
        <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</p>
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
          ? "You do not need to do anything. Sandra can see your order and will restart it for you. Nothing is lost."
          : "Your photos, reel, feed posts, carousel, Stories, and five-day plan will move to Sandra for a quality check. Everything lands in your inbox within 48 hours of your details arriving."}
      </p>
    </div>
  )
}

function campaignCopyText(data: CampaignData): string {
  const postCopy = data.posts
    .map(
      (post, index) =>
        `${index + 1}. ${ROLE_LABELS[post.role]}\n${post.headline}\n\n${post.caption}\n\nCall to action: ${post.cta}`
    )
    .join("\n\n---\n\n")
  const plan = data.publishPlan.map(day => `Day ${day.day}: ${day.instruction}`).join("\n")
  const assembly = data.reel.assembly.clipOrder
    .map((clip, index) => `${index + 1}. ${clip}`)
    .join("\n")
  const overlayPlacements = data.reel.assembly.overlayPlacements
    .map(placement => `${placement.overlayLine} on ${placement.overClipId}`)
    .join("\n")
  const reel = `HOOK\n${data.reel.hook}\n\nSCRIPT\n${data.reel.script}\n\nFILM THIS\n${data.reel.selfFilmedClipInstruction}\n\nASSEMBLY\n${assembly}\n\nOVERLAYS\n${overlayPlacements}\n\nAUDIO\n${data.reel.assembly.audioType}\n\nREEL CAPTION\n${data.reel.caption}\n\nCall to action: ${data.reel.cta}`
  return `YOUR NEXT CAMPAIGN\n\nVISUAL DIRECTION\n${data.visualDirection}\n\nYOUR REEL\n${reel}\n\nFEED POSTS\n${postCopy}\n\nFIVE-DAY PLAN\n${plan}\n`
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
    ...data.reel.brollClips
      .filter(clip => clip.status === "ready" && clip.videoUrl)
      .map((clip, index) => ({
        name: `04-reel/${String(index + 1).padStart(2, "0")}-${clip.id}.mp4`,
        url: clip.videoUrl as string,
      })),
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
      setDownloadError(
        "The full download did not finish. You can still download each section below."
      )
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
        <p className="mt-5 max-w-3xl text-xs leading-6 text-[color:var(--ss-gray)]">
          {data.traceability.note}
        </p>
      </div>

      <section className="mt-14">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[color:var(--ss-gray)]">
          Your five-day plan
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
          Your reel
        </p>
        <h2 className="mt-4 font-serif text-4xl">One reel, ready to assemble.</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--app-text-secondary)]">
          Maya built this from your campaign brief and a proven pattern. Film one simple clip, place
          the pieces in order, and use the exact words below.
        </p>

        <div className="mt-8 grid gap-px bg-[color:var(--app-border)] lg:grid-cols-2">
          <article className="bg-white p-6 sm:p-8">
            <p className="text-[9px] uppercase tracking-[0.2em] text-[color:var(--ss-gray)]">
              Hook
            </p>
            <p className="mt-4 font-serif text-3xl leading-tight">{data.reel.hook}</p>
            <p className="mt-8 text-[9px] uppercase tracking-[0.2em] text-[color:var(--ss-gray)]">
              Script
            </p>
            <p className="mt-4 whitespace-pre-wrap text-base leading-8">{data.reel.script}</p>
            <button
              type="button"
              onClick={() => void copy("reel-script", `${data.reel.hook}\n\n${data.reel.script}`)}
              className="mt-6 border-b border-[color:var(--ss-night)] pb-1 text-[10px] uppercase tracking-[0.2em]"
            >
              {copied === "reel-script" ? "Copied" : "Copy hook and script"}
            </button>
          </article>
          <article className="bg-white p-6 sm:p-8">
            <p className="text-[9px] uppercase tracking-[0.2em] text-[color:var(--ss-gray)]">
              Film this one clip
            </p>
            <p className="mt-4 text-base leading-8">{data.reel.selfFilmedClipInstruction}</p>
            <p className="mt-8 text-[9px] uppercase tracking-[0.2em] text-[color:var(--ss-gray)]">
              Assembly
            </p>
            <ol className="mt-4 space-y-2 text-sm leading-7">
              {data.reel.assembly.clipOrder.map((clip, index) => (
                <li key={`${clip}-${index}`}>
                  {index + 1}. {clip.replaceAll("_", " ")}
                </li>
              ))}
            </ol>
            <div className="mt-6 border-t border-[color:var(--color-whisper)] pt-5">
              <p className="text-[9px] uppercase tracking-[0.2em] text-[color:var(--ss-gray)]">
                Put each line here
              </p>
              <ol className="mt-3 space-y-2 text-sm leading-7">
                {data.reel.assembly.overlayPlacements.map((placement, index) => (
                  <li key={`${placement.overlayLine}-${placement.overClipId}-${index}`}>
                    “{placement.overlayLine}” over {placement.overClipId.replaceAll("_", " ")}
                  </li>
                ))}
              </ol>
            </div>
            <p className="mt-5 text-sm leading-7">
              Target length: {data.reel.assembly.targetLengthSeconds} seconds
              <br />
              Audio: {data.reel.assembly.audioType}
            </p>
          </article>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.reel.brollClips.map((clip, index) => (
            <article key={clip.id} className="border border-[color:var(--app-border)] bg-white p-4">
              {clip.status === "ready" && clip.videoUrl ? (
                <video
                  src={clip.videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="aspect-[9/16] w-full bg-black object-cover"
                />
              ) : (
                <div className="flex aspect-[9/16] items-center justify-center bg-[color:var(--ss-seasalt)] p-6 text-center text-sm leading-6 text-[color:var(--app-text-secondary)]">
                  {clip.note}
                </div>
              )}
              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-[9px] uppercase tracking-[0.18em] text-[color:var(--ss-gray)]">
                  B-roll {index + 1}
                </p>
                {clip.status === "ready" && clip.videoUrl ? (
                  <AssetDownload
                    href={clip.videoUrl}
                    filename={`sselfie-reel-broll-${index + 1}.mp4`}
                    token={token}
                    assetType={`reel_broll_${index + 1}`}
                    label="Download clip"
                  />
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-px bg-[color:var(--app-border)] lg:grid-cols-2">
          <article className="bg-white p-6 sm:p-8">
            <p className="text-[9px] uppercase tracking-[0.2em] text-[color:var(--ss-gray)]">
              Text overlays, in order
            </p>
            <ol className="mt-4 space-y-3 text-base leading-7">
              {data.reel.overlayLines.map((line, index) => (
                <li key={`${line}-${index}`}>
                  {index + 1}. {line}
                </li>
              ))}
            </ol>
          </article>
          <article className="bg-white p-6 sm:p-8">
            <p className="text-[9px] uppercase tracking-[0.2em] text-[color:var(--ss-gray)]">
              Reel caption
            </p>
            <p className="mt-4 whitespace-pre-wrap text-base leading-8">{data.reel.caption}</p>
            <p className="mt-5 border-t border-[color:var(--color-whisper)] pt-5 text-sm font-medium leading-7">
              Call to action: {data.reel.cta}
            </p>
            <button
              type="button"
              onClick={() => void copy("reel-caption", `${data.reel.caption}\n\n${data.reel.cta}`)}
              className="mt-6 border-b border-[color:var(--ss-night)] pb-1 text-[10px] uppercase tracking-[0.2em]"
            >
              {copied === "reel-caption" ? "Copied" : "Copy caption and call to action"}
            </button>
          </article>
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
          Start with post one. {data.firstPostReason}
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
                      Call to action: {post.cta}
                    </p>
                    <button
                      onClick={() => void copy(captionKey, `${post.caption}\n\n${post.cta}`)}
                      className="mt-6 border-b border-[color:var(--ss-night)] pb-1 text-[10px] uppercase tracking-[0.2em]"
                    >
                      {copied === captionKey ? "Copied" : "Copy caption and call to action"}
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
            <article
              key={slide.index}
              className="w-[78%] shrink-0 snap-start sm:w-[42%] lg:w-[28%]"
            >
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
                  <div
                    key={slide.index}
                    className="w-[66%] shrink-0 snap-start sm:w-[34%] lg:w-[22%]"
                  >
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

export function CampaignOrderExperience({
  initialOrder,
  token,
}: {
  initialOrder: CampaignBuyerOrder
  token: string
}) {
  const [status, setStatus] = useState<CampaignOrder["status"]>(initialOrder.status)
  const [publishedMessage, setPublishedMessage] = useState("")
  const hasIntake = status !== "awaiting_intake"

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const published = params.get("published")
    if (published === "yes") {
      setPublishedMessage("Posted. That is exactly what this was for.")
      void recordOrderEvent(token, "published_yes")
    }
    if (published === "no") {
      setPublishedMessage("No stress. Day one is the smallest step, start there.")
      void recordOrderEvent(token, "published_no")
    }
    if (published === "yes" || published === "no") {
      const url = new URL(window.location.href)
      url.searchParams.delete("published")
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`)
    }
  }, [token])

  const heading = useMemo(() => {
    if (status === "delivered") return "Your campaign is ready."
    if (hasIntake) return "Your campaign is in progress."
    return "Tell Maya what you're promoting."
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

        {publishedMessage ? (
          <div className="mt-6 border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-7 text-emerald-950">
            {publishedMessage}
          </div>
        ) : null}

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
              sequences, reel, and five-day plan. Sandra checks the work before you receive it.
            </p>
          ) : null}
        </section>

        {status === "awaiting_intake" ? (
          <>
            <section className="mt-10 border-y border-[color:var(--app-border)] bg-white">
              <p className="px-6 pt-7 text-[10px] uppercase tracking-[0.25em] text-[color:var(--ss-gray)] sm:px-8">
                What Maya prepares
              </p>
              <ul className="mt-4 divide-y divide-[color:var(--app-border)] px-6 pb-3 sm:px-8">
                {[
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
                ].map(item => (
                  <li key={item} className="py-4 text-sm leading-7">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
            <IntakeForm token={token} onSubmitted={setStatus} />
          </>
        ) : null}
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
