"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { downloadAllSlides } from "@/lib/app-v3/download-all-slides"

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const busyRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/vault-maya/looks")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (!cancelled) setCollections(d.collections ?? [])
      })
      .catch(() => {
        if (!cancelled) setLoadError("The looks didn't load. Pull to refresh or try again in a moment.")
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
        throw new Error(data?.error || "Upload didn't work. Try another photo.")
      }
      setSelfieUrl(data.url)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload didn't work. Try another photo.")
    } finally {
      setUploading(false)
    }
  }, [])

  const makeLook = useCallback(
    async (look: Look) => {
      if (!selfieUrl || busyRef.current) return
      busyRef.current = true
      setGen((prev) => ({ ...prev, [look.cardKey]: { status: "generating" } }))
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
            throw new Error("You're out of photos this month. Top up below to keep going.")
          }
          throw new Error(data?.error || "That one didn't come out. Tap to try again.")
        }
        if (typeof data.newBalance === "number") setCredits(data.newBalance)
        setGen((prev) => ({ ...prev, [look.cardKey]: { status: "done", imageUrl: data.imageUrl } }))
      } catch (e) {
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
    } catch {
      setRequestState("error")
    }
  }, [requestText, requestState])

  const weekly = collections?.find((c) => c.isWeeklyDrop) ?? null
  const rest = collections?.filter((c) => !c.isWeeklyDrop) ?? []

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6">
      <header className="mb-6 flex items-baseline justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Vault Maya</p>
          <h1 className="mt-1 font-serif text-3xl text-neutral-950">Your vault, made on you</h1>
        </div>
        <div className="text-right">
          <p className="text-sm text-neutral-700">{credits} photos left</p>
          <Link href="/checkout/credits" className="text-xs text-neutral-500 underline underline-offset-2">
            Top up
          </Link>
        </div>
      </header>

      <section className="mb-8 rounded-lg border border-neutral-200 bg-white p-4">
        {selfieUrl ? (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selfieUrl} alt="Your selfie" className="h-14 w-14 rounded-full object-cover" />
            <div className="flex-1">
              <p className="text-sm text-neutral-900">Your selfie is saved. Maya uses it for every look.</p>
              <button
                type="button"
                className="mt-1 text-xs text-neutral-500 underline underline-offset-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading…" : "Change selfie"}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className="font-serif text-xl text-neutral-950">Start with one selfie</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-600">
              Face the window light, phone at eye level, no filter. Maya keeps your face your face —
              she frames you, she never changes you.
            </p>
            <button
              type="button"
              className="mt-4 rounded-sm bg-neutral-950 px-6 py-3 text-xs uppercase tracking-[0.14em] text-white disabled:opacity-60"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading…" : "Add my selfie"}
            </button>
          </div>
        )}
        {uploadError ? <p className="mt-2 text-sm text-red-700">{uploadError}</p> : null}
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

      {loadError ? <p className="mb-6 text-sm text-neutral-600">{loadError}</p> : null}
      {!collections && !loadError ? (
        <p className="mb-6 text-sm text-neutral-500">Loading your looks…</p>
      ) : null}

      {weekly ? (
        <CollectionSection
          key={weekly.slug}
          collection={weekly}
          eyebrow="THIS WEEK'S DROP"
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

      <section className="mt-10 rounded-lg border border-neutral-200 bg-white p-5">
        <p className="font-serif text-xl text-neutral-950">What should Sandra create next?</p>
        <p className="mt-1 text-sm text-neutral-600">
          New looks drop every week. Tell Maya what you want to see and try next — your idea can be
          the next drop.
        </p>
        <textarea
          value={requestText}
          onChange={(e) => {
            setRequestText(e.target.value)
            if (requestState === "sent" || requestState === "error") setRequestState("idle")
          }}
          rows={3}
          placeholder="A rooftop golden-hour look… a cozy cabin morning… all white studio…"
          className="mt-3 w-full resize-none rounded-md border border-neutral-200 p-3 text-sm text-neutral-900 outline-none focus:border-neutral-400"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => void sendDropRequest()}
            disabled={requestState === "sending" || !requestText.trim()}
            className="rounded-sm border border-neutral-950 px-4 py-2 text-xs uppercase tracking-[0.12em] text-neutral-950 disabled:opacity-50"
          >
            {requestState === "sending" ? "Sending…" : "Send to Sandra"}
          </button>
          {requestState === "sent" ? (
            <p className="text-sm text-neutral-600">Got it — Sandra sees every request.</p>
          ) : null}
          {requestState === "error" ? (
            <p className="text-sm text-red-700">That didn't send. Try again.</p>
          ) : null}
        </div>
      </section>

      {showSuiteBridge ? (
        <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-5">
          <p className="font-serif text-xl text-neutral-950">Have your own idea?</p>
          <p className="mt-1 text-sm text-neutral-600">
            In SSELFIE SUITE, Maya creates from your ideas — and plans and captions your content too.
          </p>
          <Link
            href="/checkout/membership?interval=month&source=vault_maya_bridge&utm_source=vault_maya&utm_medium=studio&utm_campaign=vault_maya_to_suite"
            className="mt-3 inline-block rounded-sm border border-neutral-950 px-4 py-2 text-xs uppercase tracking-[0.12em] text-neutral-950"
          >
            See SSELFIE SUITE
          </Link>
        </section>
      ) : null}

      <p className="mt-8 text-center text-xs text-neutral-400">
        Tip: add this page to your home screen and it opens like an app — share button, then
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
    <details className="mb-4 rounded-lg border border-neutral-200 bg-white" open={defaultOpen}>
      <summary className="cursor-pointer list-none p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
          {eyebrow ?? "Collection"}
        </p>
        <p className="mt-1 font-serif text-xl text-neutral-950">{collection.title}</p>
        {collection.moodLine ? (
          <p className="mt-1 text-xs text-neutral-500">{collection.moodLine}</p>
        ) : null}
      </summary>
      <div className="grid grid-cols-2 gap-3 p-4 pt-0 sm:grid-cols-3">
        {collection.looks.map((look) => {
          const state = gen[look.cardKey]
          return (
            <div key={look.cardKey} className="overflow-hidden rounded-md border border-neutral-100">
              <div className="relative aspect-[3/4] bg-neutral-100">
                {state?.status === "done" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={state.imageUrl} alt={`${look.title} — made from your selfie`} className="h-full w-full object-cover" />
                ) : look.exampleImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={look.exampleImage} alt={look.title} className="h-full w-full object-cover" />
                ) : null}
                {state?.status === "generating" ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                    <p className="text-xs uppercase tracking-[0.14em] text-neutral-700">
                      About 30 seconds…
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="p-2">
                <p className="truncate text-xs text-neutral-800">{look.title}</p>
                {state?.status === "done" ? (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void downloadAllSlides([state.imageUrl], "sselfie-vault")}
                      className="flex-1 rounded-sm bg-neutral-950 py-1.5 text-[10px] uppercase tracking-[0.1em] text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => onMake(look)}
                      className="flex-1 rounded-sm border border-neutral-300 py-1.5 text-[10px] uppercase tracking-[0.1em] text-neutral-700"
                    >
                      Again
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onMake(look)}
                    disabled={!selfieReady || state?.status === "generating"}
                    className="mt-2 w-full rounded-sm border border-neutral-950 py-1.5 text-[10px] uppercase tracking-[0.1em] text-neutral-950 disabled:border-neutral-200 disabled:text-neutral-400"
                  >
                    {state?.status === "generating"
                      ? "Making it…"
                      : selfieReady
                        ? "Make it on me"
                        : "Add a selfie first"}
                  </button>
                )}
                {state?.status === "error" ? (
                  <p className="mt-1 text-[11px] text-red-700">{state.message}</p>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </details>
  )
}
