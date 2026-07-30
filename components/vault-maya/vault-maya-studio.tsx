"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { downloadAllSlides } from "@/lib/app-v3/download-all-slides"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

// B10 activation instrumentation: every funnel stage the measurement plan reads.
function track(event: string, properties?: Record<string, unknown>) {
  void trackAnalyticsEvent({ event, properties: { surface: "vault_maya_studio", ...properties } }).catch(() => {})
}

type Look = {
  cardKey: string
  number: string
  title: string
  mood: string
  exampleImage: string | null
}

type Collection = {
  slug: string
  title: string
  moodLine: string
  heroImage: string | null
  aestheticId: string
  isWeeklyDrop: boolean
  looks: Look[]
}

type GenState =
  | { status: "generating" }
  | { status: "done"; imageUrl: string }
  | { status: "error"; message: string }

type GalleryPhoto = {
  id: string
  url: string
  createdAt: string
}

export function VaultMayaStudio({
  initialSelfieUrl,
  initialCredits,
  showSuiteBridge,
}: {
  initialSelfieUrl: string | null
  initialCredits: number
  showSuiteBridge: boolean
}) {
  const [selfieUrl, setSelfieUrl] = useState<string | null>(initialSelfieUrl)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [collections, setCollections] = useState<Collection[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [credits, setCredits] = useState(initialCredits)
  const [gen, setGen] = useState<Record<string, GenState>>({})
  const [requestText, setRequestText] = useState("")
  const [requestState, setRequestState] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([])
  const [billingBusy, setBillingBusy] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)
  const [deletingSelfie, setDeletingSelfie] = useState(false)

  const deleteSelfie = useCallback(async () => {
    if (
      !window.confirm(
        "Delete your selfie? Maya can't create new photos until you add one again. Photos you already made stay in your gallery.",
      )
    ) {
      return
    }
    setDeletingSelfie(true)
    setUploadError(null)
    try {
      const res = await fetch("/api/vault-maya/delete-selfie", { method: "DELETE" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Deleting didn't work. Try again.")
      }
      setSelfieUrl(null)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Deleting didn't work. Try again.")
    } finally {
      setDeletingSelfie(false)
    }
  }, [])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const busyRef = useRef(false)

  const openBillingPortal = useCallback(async () => {
    setBillingBusy(true)
    setBillingError(null)
    try {
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath: "/vault-maya/studio" }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.url) {
        throw new Error(data?.message || "Billing didn't open. Try again, or reply to any email and I'll help.")
      }
      window.location.href = data.url
    } catch (e) {
      setBillingError(
        e instanceof Error ? e.message : "Billing didn't open. Try again, or reply to any email and I'll help.",
      )
      setBillingBusy(false)
    }
  }, [])

  const loadGallery = useCallback(() => {
    fetch("/api/app-v3/gallery")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        const photos = (Array.isArray(d.assets) ? d.assets : [])
          .filter((a: { kind?: string; url?: string }) => a?.kind === "image" && typeof a?.url === "string")
          .slice(0, 18)
          .map((a: { id: string; url: string; createdAt: string }) => ({
            id: String(a.id),
            url: a.url,
            createdAt: a.createdAt,
          }))
        setGalleryPhotos(photos)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadGallery()
  }, [loadGallery])

  useEffect(() => {
    track("vault_maya_studio_viewed", { hasSelfie: Boolean(initialSelfieUrl) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    let cancelled = false
    fetch("/api/vault-maya/looks")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (!cancelled) setCollections(d.collections ?? [])
      })
      .catch(() => {
        if (!cancelled) setLoadError("The looks didn't load. Give it a second and refresh.")
      })
    return () => {
      cancelled = true
    }
  }, [])

  const uploadSelfie = useCallback(async (file: File) => {
    setUploading(true)
    setUploadError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("slot", "face")
      const res = await fetch("/api/app-v3/upload-selfie", { method: "POST", body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "That upload didn't work. Try another photo.")
      }
      setSelfieUrl(data.url)
      track("vault_maya_selfie_added")
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "That upload didn't work. Try another photo.")
    } finally {
      setUploading(false)
    }
  }, [])

  const makeLook = useCallback(
    async (look: Look) => {
      if (!selfieUrl || busyRef.current) return
      busyRef.current = true
      setGen((prev) => ({ ...prev, [look.cardKey]: { status: "generating" } }))
      track("vault_maya_generation_started", { cardKey: look.cardKey })
      try {
        const briefRes = await fetch("/api/vault-maya/brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardKey: look.cardKey }),
        })
        const briefData = await briefRes.json().catch(() => ({}))
        if (!briefRes.ok || !briefData?.brief) {
          throw new Error(briefData?.error || "That look isn't available right now.")
        }
        const res = await fetch("/api/app-v3/maya/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brief: briefData.brief,
            format: "photo",
            referenceSelfieUrl: selfieUrl,
            aestheticId: briefData.aestheticId,
            conceptTitle: briefData.title,
            clientRequestId: `vault-maya-${look.cardKey}-${Date.now()}`,
            stream: false,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data?.imageUrl) {
          if (res.status === 402 || /credit/i.test(String(data?.error || ""))) {
            throw new Error("You're out of photos this month. Top up and keep going.")
          }
          throw new Error(data?.error || "That one didn't come out. Tap to try again.")
        }
        if (typeof data.newBalance === "number") setCredits(data.newBalance)
        setGen((prev) => ({ ...prev, [look.cardKey]: { status: "done", imageUrl: data.imageUrl } }))
        track("vault_maya_generation_completed", { cardKey: look.cardKey })
        loadGallery()
      } catch (e) {
        track("vault_maya_generation_failed", {
          cardKey: look.cardKey,
          message: e instanceof Error ? e.message.slice(0, 120) : "unknown",
        })
        setGen((prev) => ({
          ...prev,
          [look.cardKey]: {
            status: "error",
            message: e instanceof Error ? e.message : "That one didn't come out. Tap to try again.",
          },
        }))
      } finally {
        busyRef.current = false
      }
    },
    [selfieUrl],
  )

  const sendDropRequest = useCallback(async () => {
    const message = requestText.trim()
    if (!message || requestState === "sending") return
    setRequestState("sending")
    try {
      const res = await fetch("/api/vault-maya/drop-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      })
      if (!res.ok) throw new Error()
      setRequestState("sent")
      setRequestText("")
      track("vault_maya_drop_request_sent")
    } catch {
      setRequestState("error")
    }
  }, [requestText, requestState])

  const weekly = collections?.find((c) => c.isWeeklyDrop) ?? null
  const rest = collections?.filter((c) => !c.isWeeklyDrop) ?? []

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-8">
      <header className="flex flex-col gap-4 border-b border-[color:var(--ss-silver)]/55 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.34em] text-[color:var(--ss-gray)]">
            Vault Maya
          </p>
          <h1 className="mt-2 font-serif text-[34px] font-light leading-[1.03] text-[color:var(--ss-night)] sm:text-[44px]">
            Your vault. Made on you.
          </h1>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-[13px] text-[color:var(--ss-davy)]">{credits} photos left</p>
          <Link
            href="/checkout/credits"
            className="text-[10px] uppercase tracking-[0.17em] text-[color:var(--ss-gray)] underline underline-offset-4 hover:text-[color:var(--ss-night)]"
          >
            Top up
          </Link>
        </div>
      </header>

      <section className="mt-6 rounded-[10px] border border-[color:var(--ss-silver)]/55 bg-white p-5">
        {selfieUrl ? (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selfieUrl} alt="Your selfie" className="h-14 w-14 rounded-full object-cover" />
            <div className="flex-1">
              <p className="text-[14px] text-[color:var(--ss-night)]">
                Your selfie is in. Maya uses it for every look.
              </p>
              <div className="mt-1 flex gap-4">
                <button
                  type="button"
                  className="text-[10px] uppercase tracking-[0.17em] text-[color:var(--ss-gray)] underline underline-offset-4 hover:text-[color:var(--ss-night)]"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || deletingSelfie}
                >
                  {uploading ? "Uploading…" : "Change selfie"}
                </button>
                <button
                  type="button"
                  className="text-[10px] uppercase tracking-[0.17em] text-[color:var(--ss-gray)] underline underline-offset-4 hover:text-[color:var(--ss-night)]"
                  onClick={() => void deleteSelfie()}
                  disabled={uploading || deletingSelfie}
                >
                  {deletingSelfie ? "Deleting…" : "Delete my selfie"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ss-gray)]">
              Step one
            </p>
            <p className="mt-2 font-serif text-[26px] font-light leading-tight text-[color:var(--ss-night)]">
              Start with one selfie
            </p>
            <p className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-[color:var(--ss-davy)]">
              Window light. Phone at eye level. No filter. Maya keeps your face your face — she
              frames you, she never changes you.
            </p>
            <button
              type="button"
              className="mt-5 inline-flex min-h-11 items-center rounded-[5px] bg-[color:var(--ss-night)] px-7 text-[10px] uppercase tracking-[0.22em] text-white disabled:opacity-60"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "Add my selfie"}
            </button>
          </div>
        )}
        {uploadError ? (
          <p className="mt-3 text-[13px] text-[color:var(--ss-davy)]">{uploadError}</p>
        ) : null}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void uploadSelfie(file)
            e.target.value = ""
          }}
        />
      </section>

      {loadError ? (
        <p className="mt-6 text-[14px] text-[color:var(--ss-davy)]">{loadError}</p>
      ) : null}
      {!collections && !loadError ? (
        <p className="mt-6 text-[10px] uppercase tracking-[0.28em] text-[color:var(--ss-gray)]">
          Opening your vault…
        </p>
      ) : null}

      {weekly ? (
        <CollectionSection
          key={weekly.slug}
          collection={weekly}
          eyebrow="This week's drop"
          defaultOpen
          selfieReady={Boolean(selfieUrl)}
          gen={gen}
          onMake={makeLook}
        />
      ) : null}

      {rest.map((collection) => (
        <CollectionSection
          key={collection.slug}
          collection={collection}
          selfieReady={Boolean(selfieUrl)}
          gen={gen}
          onMake={makeLook}
        />
      ))}

      {galleryPhotos.length > 0 ? (
        <section className="mt-10">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ss-gray)]">
            Your photos
          </p>
          <p className="mt-2 font-serif text-[26px] font-light leading-tight text-[color:var(--ss-night)]">
            Everything Maya has made you
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {galleryPhotos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => {
                  track("vault_maya_photo_saved", { from: "gallery" })
                  void downloadAllSlides([photo.url], "sselfie-vault")
                }}
                className="group relative aspect-[3/4] overflow-hidden rounded-[8px] bg-white"
                aria-label="Save this photo"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="Your photo" className="h-full w-full object-cover" />
                <span className="absolute bottom-1.5 right-1.5 rounded-[4px] bg-[color:var(--ss-night)]/80 px-2 py-1 text-[8px] uppercase tracking-[0.16em] text-white opacity-0 transition-opacity group-hover:opacity-100">
                  Save
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-[color:var(--ss-gray)]">Tap a photo to save it.</p>
        </section>
      ) : null}

      <section className="mt-10 rounded-[10px] border border-[color:var(--ss-silver)]/55 bg-white p-6">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ss-gray)]">
          From Sandra
        </p>
        <p className="mt-2 font-serif text-[26px] font-light leading-tight text-[color:var(--ss-night)]">
          Tell me what to shoot next.
        </p>
        <p className="mt-2 text-[14px] leading-relaxed text-[color:var(--ss-davy)]">
          New looks drop every Monday. Send me the vibe you want — your idea can be the next drop.
        </p>
        <textarea
          value={requestText}
          onChange={(e) => {
            setRequestText(e.target.value)
            if (requestState === "sent" || requestState === "error") setRequestState("idle")
          }}
          rows={3}
          placeholder="Golden hour on a rooftop. A cozy cabin morning. All white studio."
          className="mt-4 w-full resize-none rounded-[5px] border border-[color:var(--ss-silver)]/70 p-3 text-[14px] text-[color:var(--ss-night)] outline-none focus:border-[color:var(--ss-night)]"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => void sendDropRequest()}
            disabled={requestState === "sending" || !requestText.trim()}
            className="inline-flex min-h-11 items-center rounded-[5px] border border-[color:var(--ss-night)] px-5 text-[10px] uppercase tracking-[0.22em] text-[color:var(--ss-night)] disabled:opacity-50"
          >
            {requestState === "sending" ? "Sending…" : "Send to Sandra"}
          </button>
          {requestState === "sent" ? (
            <p className="text-[13px] text-[color:var(--ss-davy)]">Got it. I read every one.</p>
          ) : null}
          {requestState === "error" ? (
            <p className="text-[13px] text-[color:var(--ss-davy)]">That didn't send. Try again.</p>
          ) : null}
        </div>
      </section>

      {showSuiteBridge ? (
        <section className="mt-6 rounded-[10px] bg-[color:var(--ss-night)] p-6">
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/70">Go further</p>
          <p className="mt-2 font-serif text-[26px] font-light leading-tight text-white">
            Have your own idea?
          </p>
          <p className="mt-2 max-w-md text-[14px] leading-relaxed text-white/80">
            In SSELFIE SUITE, Maya creates from your ideas — and plans your feed and writes your
            captions too.
          </p>
          <Link
            href="/checkout/membership?interval=month&source=vault_maya_bridge&utm_source=vault_maya&utm_medium=studio&utm_campaign=vault_maya_to_suite"
            className="mt-4 inline-flex min-h-11 items-center rounded-[5px] bg-white px-5 text-[10px] uppercase tracking-[0.22em] text-[color:var(--ss-night)]"
          >
            See SSELFIE SUITE
          </Link>
        </section>
      ) : null}

      <section className="mt-8 flex flex-col items-center gap-2 border-t border-[color:var(--ss-silver)]/40 pt-6">
        <button
          type="button"
          onClick={() => void openBillingPortal()}
          disabled={billingBusy}
          className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--ss-davy)] underline underline-offset-4 hover:text-[color:var(--ss-night)] disabled:opacity-60"
        >
          {billingBusy ? "Opening…" : "Account & billing"}
        </button>
        <p className="text-[11px] text-[color:var(--ss-gray)]">
          Update your payment method or cancel your membership anytime.
        </p>
        {billingError ? (
          <p className="text-[12px] text-[color:var(--ss-davy)]">{billingError}</p>
        ) : null}
      </section>

      <p className="mt-6 text-center text-[11px] leading-relaxed text-[color:var(--ss-gray)]">
        Add this page to your home screen and it opens like an app — share button, then
        &ldquo;Add to Home Screen&rdquo;.
      </p>
    </div>
  )
}

function CollectionSection({
  collection,
  eyebrow,
  defaultOpen = false,
  selfieReady,
  gen,
  onMake,
}: {
  collection: Collection
  eyebrow?: string
  defaultOpen?: boolean
  selfieReady: boolean
  gen: Record<string, GenState>
  onMake: (look: Look) => void
}) {
  return (
    <details
      className="mt-5 rounded-[10px] border border-[color:var(--ss-silver)]/55 bg-white"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none p-5">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ss-gray)]">
          {eyebrow ?? "Collection"}
        </p>
        <p className="mt-2 font-serif text-[26px] font-light leading-tight text-[color:var(--ss-night)]">
          {collection.title}
        </p>
        {collection.moodLine ? (
          <p className="mt-1 text-[12px] italic text-[color:var(--ss-gray)]">{collection.moodLine}</p>
        ) : null}
      </summary>
      <div className="grid grid-cols-2 gap-3 p-5 pt-0 sm:grid-cols-3">
        {collection.looks.map((look) => {
          const state = gen[look.cardKey]
          return (
            <div
              key={look.cardKey}
              className="overflow-hidden rounded-[10px] border border-[color:var(--ss-silver)]/40"
            >
              <div className="relative aspect-[3/4] bg-[color:var(--ss-seasalt)]">
                {state?.status === "done" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={state.imageUrl}
                    alt={`${look.title} — made from your selfie`}
                    className="h-full w-full object-cover"
                  />
                ) : look.exampleImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={look.exampleImage} alt={look.title} className="h-full w-full object-cover" />
                ) : null}
                {state?.status === "generating" ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/75">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ss-davy)]">
                      Maya is creating your photo…
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="p-2.5">
                <p className="truncate text-[12px] text-[color:var(--ss-night)]">{look.title}</p>
                {state?.status === "done" ? (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        track("vault_maya_photo_saved", { from: "result", cardKey: look.cardKey })
                        void downloadAllSlides([state.imageUrl], "sselfie-vault")
                      }}
                      className="flex-1 rounded-[5px] bg-[color:var(--ss-night)] py-2 text-[9px] uppercase tracking-[0.18em] text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => onMake(look)}
                      className="flex-1 rounded-[5px] border border-[color:var(--ss-silver)] py-2 text-[9px] uppercase tracking-[0.18em] text-[color:var(--ss-davy)]"
                    >
                      Again
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onMake(look)}
                    disabled={!selfieReady || state?.status === "generating"}
                    className="mt-2 w-full rounded-[5px] border border-[color:var(--ss-night)] py-2 text-[9px] uppercase tracking-[0.18em] text-[color:var(--ss-night)] disabled:border-[color:var(--ss-silver)]/60 disabled:text-[color:var(--ss-gray)]"
                  >
                    {state?.status === "generating"
                      ? "Making it…"
                      : selfieReady
                        ? "Make it on me"
                        : "Add a selfie first"}
                  </button>
                )}
                {state?.status === "error" ? (
                  <p className="mt-1 text-[11px] text-[color:var(--ss-davy)]">{state.message}</p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </details>
  )
}
