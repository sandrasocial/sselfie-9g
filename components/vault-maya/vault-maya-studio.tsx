"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ImageLightbox } from "@/components/app-v3/image-lightbox"
import { FavoriteButton } from "@/components/app-v3/favorite-button"
import { initiateAssetDownload } from "@/lib/app-v3/download-asset"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

function track(event: string, properties?: Record<string, unknown>) {
  void trackAnalyticsEvent({
    event,
    properties: { surface: "vault_maya_studio", ...properties },
  }).catch(() => {})
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
  | { status: "done"; imageUrl: string; assetId: string | number | null }
  | { status: "error"; message: string }

type GeneratedResult = {
  imageUrl: string
  assetId: string | number | null
  look: Look
}

type GalleryPhoto = {
  id: string
  url: string
  createdAt: string
  isFavorite: boolean
  title: string | null
  generationRef: string
}

type StudioTab = "create" | "gallery" | "account"

const TAB_LABELS: Array<{ id: StudioTab; label: string }> = [
  { id: "create", label: "Create" },
  { id: "gallery", label: "My photos" },
  { id: "account", label: "Account" },
]

function useDialogLock(onClose: () => void) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current()
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKey)
    }
  }, [])
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
  const [activeTab, setActiveTab] = useState<StudioTab>("create")
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null)
  const [previewLook, setPreviewLook] = useState<{ look: Look; collection: Collection } | null>(
    null
  )
  const [showAllCollections, setShowAllCollections] = useState(false)
  const [galleryStartIndex, setGalleryStartIndex] = useState<number | null>(null)
  const [activeResult, setActiveResult] = useState<GeneratedResult | null>(null)
  const [resultFeedback, setResultFeedback] = useState<"loved" | "not_quite" | null>(null)
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
  const [galleryLoading, setGalleryLoading] = useState(true)
  const [billingBusy, setBillingBusy] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)
  const [deletingSelfie, setDeletingSelfie] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const busyRef = useRef(false)

  const loadGallery = useCallback(() => {
    setGalleryLoading(true)
    fetch("/api/app-v3/gallery")
      .then(response =>
        response.ok ? response.json() : Promise.reject(new Error(String(response.status)))
      )
      .then(data => {
        const photos = (Array.isArray(data.assets) ? data.assets : [])
          .filter(
            (asset: { kind?: string; url?: string; generationRef?: string }) =>
              asset?.kind === "image" &&
              typeof asset?.url === "string" &&
              typeof asset?.generationRef === "string" &&
              asset.generationRef.includes("-vault-maya-")
          )
          .map(
            (asset: {
              id: string
              url: string
              createdAt: string
              isFavorite?: boolean
              title?: string | null
              generationRef: string
            }) => ({
              id: String(asset.id),
              url: asset.url,
              createdAt: asset.createdAt,
              isFavorite: Boolean(asset.isFavorite),
              title: typeof asset.title === "string" ? asset.title : null,
              generationRef: asset.generationRef,
            })
          )
        setGalleryPhotos(photos)
      })
      .catch(() => {})
      .finally(() => setGalleryLoading(false))
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
      .then(response =>
        response.ok ? response.json() : Promise.reject(new Error(String(response.status)))
      )
      .then(data => {
        if (!cancelled) setCollections(data.collections ?? [])
      })
      .catch(() => {
        if (!cancelled) setLoadError("The looks didn't load. Give it a second and refresh.")
      })
    return () => {
      cancelled = true
    }
  }, [])

  const weekly = collections?.find(collection => collection.isWeeklyDrop) ?? null
  const rest = collections?.filter(collection => !collection.isWeeklyDrop) ?? []
  const visibleCollections = showAllCollections ? rest : rest.slice(0, 6)

  const allLooks = useMemo(
    () =>
      (collections ?? []).flatMap(collection =>
        collection.looks.map(look => ({ look, collection }))
      ),
    [collections]
  )

  const switchTab = useCallback((tab: StudioTab) => {
    setActiveTab(tab)
    setSelectedCollection(null)
    setShowAllCollections(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const openCollection = useCallback((collection: Collection) => {
    setSelectedCollection(collection)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const closeCollection = useCallback(() => {
    setSelectedCollection(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const uploadSelfie = useCallback(async (file: File) => {
    setUploading(true)
    setUploadError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("slot", "face")
      const response = await fetch("/api/app-v3/upload-selfie", { method: "POST", body: form })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.url) {
        throw new Error(data?.error || "That upload didn't work. Try another photo.")
      }
      setSelfieUrl(data.url)
      track("vault_maya_selfie_added")
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "That upload didn't work. Try another photo."
      )
    } finally {
      setUploading(false)
    }
  }, [])

  const deleteSelfie = useCallback(async () => {
    if (
      !window.confirm(
        "Delete your selfie? Maya can't create new photos until you add one again. Photos you already made stay in My photos."
      )
    ) {
      return
    }
    setDeletingSelfie(true)
    setUploadError(null)
    try {
      const response = await fetch("/api/vault-maya/delete-selfie", { method: "DELETE" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Deleting didn't work. Try again.")
      }
      setSelfieUrl(null)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Deleting didn't work. Try again.")
    } finally {
      setDeletingSelfie(false)
    }
  }, [])

  const openBillingPortal = useCallback(async () => {
    setBillingBusy(true)
    setBillingError(null)
    try {
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath: "/vault-maya/studio" }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.url) {
        throw new Error(
          data?.message || "Billing didn't open. Try again, or reply to any email and I'll help."
        )
      }
      window.location.href = data.url
    } catch (error) {
      setBillingError(
        error instanceof Error
          ? error.message
          : "Billing didn't open. Try again, or reply to any email and I'll help."
      )
      setBillingBusy(false)
    }
  }, [])

  const makeLook = useCallback(
    async (look: Look) => {
      if (!selfieUrl) {
        setPreviewLook(null)
        switchTab("account")
        return
      }
      if (busyRef.current) return
      busyRef.current = true
      setPreviewLook(null)
      setResultFeedback(null)
      setGen(previous => ({ ...previous, [look.cardKey]: { status: "generating" } }))
      track("vault_maya_generation_started", { cardKey: look.cardKey })
      try {
        const briefResponse = await fetch("/api/vault-maya/brief", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardKey: look.cardKey }),
        })
        const briefData = await briefResponse.json().catch(() => ({}))
        if (!briefResponse.ok || !briefData?.brief) {
          throw new Error(briefData?.error || "That look isn't available right now.")
        }

        const response = await fetch("/api/app-v3/maya/generate", {
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
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data?.imageUrl) {
          if (response.status === 402 || /credit/i.test(String(data?.error || ""))) {
            throw new Error("You're out of photos this month. Top up and keep going.")
          }
          throw new Error(data?.error || "That one didn't come out. Tap to try again.")
        }
        if (typeof data.newBalance === "number") setCredits(data.newBalance)
        const assetId =
          typeof data.aiImageId === "number" || typeof data.aiImageId === "string"
            ? data.aiImageId
            : null
        setGen(previous => ({
          ...previous,
          [look.cardKey]: { status: "done", imageUrl: data.imageUrl, assetId },
        }))
        setActiveResult({ imageUrl: data.imageUrl, assetId, look })
        track("vault_maya_generation_completed", { cardKey: look.cardKey, aiImageId: assetId })
        loadGallery()
      } catch (error) {
        track("vault_maya_generation_failed", {
          cardKey: look.cardKey,
          message: error instanceof Error ? error.message.slice(0, 120) : "unknown",
        })
        setGen(previous => ({
          ...previous,
          [look.cardKey]: {
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "That one didn't come out. Tap to try again.",
          },
        }))
      } finally {
        busyRef.current = false
      }
    },
    [loadGallery, selfieUrl, switchTab]
  )

  const sendDropRequest = useCallback(async () => {
    const message = requestText.trim()
    if (!message || requestState === "sending") return
    setRequestState("sending")
    try {
      const response = await fetch("/api/vault-maya/drop-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      })
      if (!response.ok) throw new Error()
      setRequestState("sent")
      setRequestText("")
      track("vault_maya_drop_request_sent")
    } catch {
      setRequestState("error")
    }
  }, [requestState, requestText])

  const createAgainFromGallery = useCallback(
    (index: number) => {
      const photo = galleryPhotos[index]
      const match = allLooks.find(({ look }) => look.title === photo?.title)
      setGalleryStartIndex(null)
      switchTab("create")
      if (match) {
        setSelectedCollection(match.collection)
        void makeLook(match.look)
      }
    },
    [allLooks, galleryPhotos, makeLook, switchTab]
  )

  const submitFeedback = useCallback(
    (value: "loved" | "not_quite") => {
      if (!activeResult || resultFeedback) return
      setResultFeedback(value)
      track(value === "loved" ? "vault_maya_photo_loved" : "vault_maya_photo_not_quite", {
        cardKey: activeResult.look.cardKey,
        aiImageId: activeResult.assetId,
      })
    },
    [activeResult, resultFeedback]
  )

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 pb-28 pt-5 sm:px-6 sm:pb-16 sm:pt-7 lg:px-8">
      <header className="sticky top-0 z-30 -mx-4 border-b border-[color:var(--ss-silver)]/55 bg-[color:var(--ss-seasalt)]/95 px-4 pb-4 pt-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <button type="button" onClick={() => switchTab("create")} className="text-left">
            <span className="block text-[9px] uppercase tracking-[0.32em] text-[color:var(--ss-gray)]">
              SSELFIE
            </span>
            <span className="mt-0.5 block font-serif text-[25px] font-light leading-none text-[color:var(--ss-night)]">
              Vault Maya
            </span>
          </button>

          <nav className="hidden items-center gap-8 sm:flex" aria-label="Vault Maya">
            {TAB_LABELS.map(tab => (
              <TabButton
                key={tab.id}
                tab={tab}
                active={activeTab === tab.id}
                onSelect={() => switchTab(tab.id)}
              />
            ))}
          </nav>

          <button
            type="button"
            onClick={() => switchTab("account")}
            className="min-h-11 text-right text-[11px] leading-4 text-[color:var(--ss-davy)]"
          >
            <span className="block font-medium text-[color:var(--ss-night)]">{credits} photos</span>
            <span className="block">left this month</span>
          </button>
        </div>
      </header>

      <main className="pt-7 sm:pt-10">
        {activeTab === "create" ? (
          selectedCollection ? (
            <CollectionDetail
              collection={selectedCollection}
              selfieReady={Boolean(selfieUrl)}
              gen={gen}
              onBack={closeCollection}
              onPreview={look => setPreviewLook({ look, collection: selectedCollection })}
              onMake={look => void makeLook(look)}
              onAddSelfie={() => switchTab("account")}
            />
          ) : (
            <CreateHome
              weekly={weekly}
              collections={visibleCollections}
              loading={!collections && !loadError}
              loadError={loadError}
              selfieUrl={selfieUrl}
              uploading={uploading}
              onAddSelfie={() => fileInputRef.current?.click()}
              onOpenCollection={openCollection}
              hasMoreCollections={!showAllCollections && rest.length > visibleCollections.length}
              totalCollections={rest.length}
              onShowAllCollections={() => setShowAllCollections(true)}
            />
          )
        ) : null}

        {activeTab === "gallery" ? (
          <Gallery
            photos={galleryPhotos}
            loading={galleryLoading}
            onOpen={setGalleryStartIndex}
            onCreate={() => switchTab("create")}
          />
        ) : null}

        {activeTab === "account" ? (
          <Account
            selfieUrl={selfieUrl}
            credits={credits}
            uploading={uploading}
            deletingSelfie={deletingSelfie}
            uploadError={uploadError}
            billingBusy={billingBusy}
            billingError={billingError}
            requestText={requestText}
            requestState={requestState}
            showSuiteBridge={showSuiteBridge}
            onAddSelfie={() => fileInputRef.current?.click()}
            onDeleteSelfie={() => void deleteSelfie()}
            onRequestTextChange={value => {
              setRequestText(value)
              if (requestState === "sent" || requestState === "error") setRequestState("idle")
            }}
            onSendRequest={() => void sendDropRequest()}
            onOpenBilling={() => void openBillingPortal()}
          />
        ) : null}
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={event => {
          const file = event.target.files?.[0]
          if (file) void uploadSelfie(file)
          event.target.value = ""
        }}
      />

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-[color:var(--ss-silver)]/60 bg-white/95 px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-md sm:hidden"
        aria-label="Vault Maya"
      >
        {TAB_LABELS.map(tab => (
          <TabButton
            key={tab.id}
            tab={tab}
            active={activeTab === tab.id}
            onSelect={() => switchTab(tab.id)}
            mobile
          />
        ))}
      </nav>

      {previewLook ? (
        <LookPreview
          look={previewLook.look}
          collection={previewLook.collection}
          selfieReady={Boolean(selfieUrl)}
          generating={gen[previewLook.look.cardKey]?.status === "generating"}
          onClose={() => setPreviewLook(null)}
          onMake={() => void makeLook(previewLook.look)}
        />
      ) : null}

      {activeResult ? (
        <GeneratedResultView
          result={activeResult}
          feedback={resultFeedback}
          onFeedback={submitFeedback}
          onAgain={() => {
            const look = activeResult.look
            setActiveResult(null)
            void makeLook(look)
          }}
          onDownloaded={() =>
            track("vault_maya_photo_saved", {
              from: "result",
              cardKey: activeResult.look.cardKey,
            })
          }
          onClose={() => {
            setActiveResult(null)
            loadGallery()
          }}
        />
      ) : null}

      {galleryStartIndex !== null && galleryPhotos.length > 0 ? (
        <ImageLightbox
          images={galleryPhotos.map(photo => photo.url)}
          assetIds={galleryPhotos.map(photo => photo.id)}
          favoriteStates={galleryPhotos.map(photo => photo.isFavorite)}
          startIndex={galleryStartIndex}
          conceptTitle="sselfie-vault-maya"
          onDownloaded={() => track("vault_maya_photo_saved", { from: "gallery" })}
          onCreateVariation={createAgainFromGallery}
          variationLabel="Create again"
          onClose={() => {
            setGalleryStartIndex(null)
            loadGallery()
          }}
        />
      ) : null}
    </div>
  )
}

function TabButton({
  tab,
  active,
  onSelect,
  mobile = false,
}: {
  tab: { id: StudioTab; label: string }
  active: boolean
  onSelect: () => void
  mobile?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      className={`${mobile ? "min-h-12" : "min-h-11"} text-[10px] uppercase tracking-[0.18em] transition-colors ${
        active
          ? "text-[color:var(--ss-night)] underline decoration-[color:var(--ss-night)] underline-offset-[7px]"
          : "text-[color:var(--ss-gray)] hover:text-[color:var(--ss-night)]"
      }`}
    >
      {tab.label}
    </button>
  )
}

function CreateHome({
  weekly,
  collections,
  loading,
  loadError,
  selfieUrl,
  uploading,
  onAddSelfie,
  onOpenCollection,
  hasMoreCollections,
  totalCollections,
  onShowAllCollections,
}: {
  weekly: Collection | null
  collections: Collection[]
  loading: boolean
  loadError: string | null
  selfieUrl: string | null
  uploading: boolean
  onAddSelfie: () => void
  onOpenCollection: (collection: Collection) => void
  hasMoreCollections: boolean
  totalCollections: number
  onShowAllCollections: () => void
}) {
  return (
    <div>
      <section className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ss-gray)]">
            Choose a photoshoot
          </p>
          <h1 className="mt-3 max-w-2xl font-serif text-[42px] font-light leading-[0.98] text-[color:var(--ss-night)] sm:text-[58px]">
            What do you want to create today?
          </h1>
        </div>
        {selfieUrl ? (
          <div className="flex items-center gap-3 border-l border-[color:var(--ss-silver)]/60 pl-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selfieUrl}
              alt="Your selfie"
              className="h-11 w-11 rounded-full object-cover"
            />
            <p className="max-w-32 text-[12px] leading-5 text-[color:var(--ss-davy)]">
              Your selfie is ready.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={onAddSelfie}
            disabled={uploading}
            className="inline-flex min-h-12 items-center justify-center rounded-[5px] bg-[color:var(--ss-night)] px-6 text-[10px] uppercase tracking-[0.2em] text-white disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Add my selfie"}
          </button>
        )}
      </section>

      {loading ? (
        <p className="mt-10 text-[10px] uppercase tracking-[0.24em] text-[color:var(--ss-gray)]">
          Opening your vault…
        </p>
      ) : null}
      {loadError ? <p className="mt-10 text-sm text-[color:var(--ss-davy)]">{loadError}</p> : null}

      {weekly ? (
        <WeeklyFeature collection={weekly} onOpen={() => onOpenCollection(weekly)} />
      ) : null}

      {collections.length > 0 ? (
        <section className="mt-14 sm:mt-20">
          <div className="flex items-end justify-between gap-5 border-b border-[color:var(--ss-silver)]/55 pb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ss-gray)]">
                The collections
              </p>
              <h2 className="mt-2 font-serif text-[34px] font-light leading-none text-[color:var(--ss-night)] sm:text-[42px]">
                Find your next look
              </h2>
            </div>
            <p className="hidden text-[12px] text-[color:var(--ss-gray)] sm:block">
              {totalCollections} collections
            </p>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map(collection => (
              <CollectionCard
                key={collection.slug}
                collection={collection}
                onOpen={() => onOpenCollection(collection)}
              />
            ))}
          </div>

          {hasMoreCollections ? (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={onShowAllCollections}
                className="inline-flex min-h-12 items-center justify-center rounded-[5px] border border-[color:var(--ss-night)] px-7 text-[10px] uppercase tracking-[0.2em] text-[color:var(--ss-night)]"
              >
                View all {totalCollections} collections
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}

function WeeklyFeature({ collection, onOpen }: { collection: Collection; onOpen: () => void }) {
  const images = collection.looks.map(look => look.exampleImage).filter(Boolean) as string[]

  return (
    <section className="mt-10 overflow-hidden rounded-[14px] bg-white shadow-[0_18px_60px_rgba(13,14,16,0.08)] sm:mt-14">
      <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
        <ContactSheet images={images} heroImage={collection.heroImage} large />
        <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-12">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[color:var(--ss-gray)]">
            New this week
          </p>
          <h2 className="mt-4 font-serif text-[38px] font-light leading-[0.98] text-[color:var(--ss-night)] sm:text-[50px]">
            {collection.title}
          </h2>
          <p className="mt-4 text-[14px] leading-6 text-[color:var(--ss-davy)]">
            {collection.moodLine}
          </p>
          <p className="mt-3 text-[12px] text-[color:var(--ss-gray)]">
            {collection.looks.length} photos to choose from
          </p>
          <button
            type="button"
            onClick={onOpen}
            className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-[5px] bg-[color:var(--ss-night)] px-7 text-[10px] uppercase tracking-[0.22em] text-white sm:w-fit"
          >
            Open the collection
          </button>
        </div>
      </div>
    </section>
  )
}

function ContactSheet({
  images,
  heroImage,
  large = false,
}: {
  images: string[]
  heroImage: string | null
  large?: boolean
}) {
  const sources = [images[0] ?? heroImage, images[1] ?? heroImage, images[2] ?? heroImage]
  return (
    <div
      className={`grid grid-cols-2 gap-1 bg-[color:var(--ss-silver)]/20 p-1 ${large ? "min-h-[430px]" : "aspect-[4/3]"}`}
    >
      <div className="relative row-span-2 overflow-hidden bg-[color:var(--ss-seasalt)]">
        {sources[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sources[0]} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
      </div>
      {[sources[1], sources[2]].map((source, index) => (
        <div
          key={`${source ?? "empty"}-${index}`}
          className="relative overflow-hidden bg-[color:var(--ss-seasalt)]"
        >
          {source ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={source} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
        </div>
      ))}
    </div>
  )
}

function CollectionCard({ collection, onOpen }: { collection: Collection; onOpen: () => void }) {
  const images = collection.looks.map(look => look.exampleImage).filter(Boolean) as string[]

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group overflow-hidden rounded-[12px] bg-white text-left shadow-[0_10px_35px_rgba(13,14,16,0.055)] transition-transform duration-300 hover:-translate-y-1"
    >
      <ContactSheet images={images} heroImage={collection.heroImage} />
      <span className="block p-5">
        <span className="block font-serif text-[28px] font-light leading-none text-[color:var(--ss-night)]">
          {collection.title}
        </span>
        <span className="mt-2 line-clamp-2 block text-[12px] leading-5 text-[color:var(--ss-davy)]">
          {collection.moodLine}
        </span>
        <span className="mt-4 block text-[9px] uppercase tracking-[0.2em] text-[color:var(--ss-gray)] group-hover:text-[color:var(--ss-night)]">
          {collection.looks.length} photos · Open collection
        </span>
      </span>
    </button>
  )
}

function CollectionDetail({
  collection,
  selfieReady,
  gen,
  onBack,
  onPreview,
  onMake,
  onAddSelfie,
}: {
  collection: Collection
  selfieReady: boolean
  gen: Record<string, GenState>
  onBack: () => void
  onPreview: (look: Look) => void
  onMake: (look: Look) => void
  onAddSelfie: () => void
}) {
  return (
    <section>
      <button
        type="button"
        onClick={onBack}
        className="min-h-11 text-[10px] uppercase tracking-[0.2em] text-[color:var(--ss-gray)] underline underline-offset-4 hover:text-[color:var(--ss-night)]"
      >
        Back to collections
      </button>

      <div className="mt-5 grid gap-6 border-b border-[color:var(--ss-silver)]/55 pb-8 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ss-gray)]">
            {collection.isWeeklyDrop ? "New this week" : "Vault collection"}
          </p>
          <h1 className="mt-3 font-serif text-[48px] font-light leading-[0.95] text-[color:var(--ss-night)] sm:text-[64px]">
            {collection.title}
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[color:var(--ss-davy)]">
            {collection.moodLine}
          </p>
        </div>
        <p className="text-[12px] text-[color:var(--ss-gray)]">Choose one photo to create</p>
      </div>

      {!selfieReady ? (
        <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-[10px] border border-[color:var(--ss-silver)]/55 bg-white p-5 sm:flex-row sm:items-center">
          <p className="text-sm leading-6 text-[color:var(--ss-davy)]">
            Add one clear selfie before you create your first photo.
          </p>
          <button
            type="button"
            onClick={onAddSelfie}
            className="min-h-11 rounded-[5px] bg-[color:var(--ss-night)] px-5 text-[10px] uppercase tracking-[0.2em] text-white"
          >
            Add my selfie
          </button>
        </div>
      ) : null}

      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-5">
        {collection.looks.map(look => {
          const state = gen[look.cardKey]
          return (
            <article key={look.cardKey} className="min-w-0">
              <button
                type="button"
                onClick={() => onPreview(look)}
                className="group relative block aspect-[3/4] w-full overflow-hidden rounded-[10px] bg-white shadow-[0_8px_26px_rgba(13,14,16,0.07)]"
                aria-label={`Open ${look.title}`}
              >
                {state?.status === "done" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={state.imageUrl}
                    alt={look.title}
                    className="h-full w-full object-cover"
                  />
                ) : look.exampleImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={look.exampleImage}
                    alt={look.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center p-4 text-center font-serif text-xl text-[color:var(--ss-davy)]">
                    {look.title}
                  </span>
                )}
                {state?.status === "generating" ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-[color:var(--ss-night)]/70 text-[10px] uppercase tracking-[0.2em] text-white">
                    Making your photo…
                  </span>
                ) : null}
              </button>
              <div className="px-1 pb-2 pt-3">
                <p className="truncate text-[13px] text-[color:var(--ss-night)]">{look.title}</p>
                <button
                  type="button"
                  onClick={() => onMake(look)}
                  disabled={!selfieReady || state?.status === "generating"}
                  className="mt-2 min-h-9 text-[9px] uppercase tracking-[0.18em] text-[color:var(--ss-davy)] underline underline-offset-4 disabled:text-[color:var(--ss-gray)]"
                >
                  {state?.status === "generating"
                    ? "Making it…"
                    : state?.status === "done"
                      ? "Create again"
                      : "Create this photo"}
                </button>
                {state?.status === "error" ? (
                  <p className="mt-1 text-[11px] leading-4 text-[color:var(--ss-davy)]">
                    {state.message}
                  </p>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function Gallery({
  photos,
  loading,
  onOpen,
  onCreate,
}: {
  photos: GalleryPhoto[]
  loading: boolean
  onOpen: (index: number) => void
  onCreate: () => void
}) {
  return (
    <section>
      <div className="border-b border-[color:var(--ss-silver)]/55 pb-7">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ss-gray)]">
          My photos
        </p>
        <h1 className="mt-3 font-serif text-[48px] font-light leading-[0.95] text-[color:var(--ss-night)] sm:text-[64px]">
          Everything Maya has made for you
        </h1>
        <p className="mt-4 max-w-xl text-[14px] leading-6 text-[color:var(--ss-davy)]">
          Open any photo to see it full screen, save it to your device or create it again.
        </p>
      </div>

      {loading ? (
        <p className="mt-8 text-[10px] uppercase tracking-[0.24em] text-[color:var(--ss-gray)]">
          Opening your photos…
        </p>
      ) : null}

      {!loading && photos.length === 0 ? (
        <div className="mt-8 rounded-[12px] bg-white px-6 py-16 text-center shadow-[0_12px_40px_rgba(13,14,16,0.05)]">
          <p className="font-serif text-[34px] font-light text-[color:var(--ss-night)]">
            Your photos will appear here.
          </p>
          <p className="mx-auto mt-3 max-w-md text-[14px] leading-6 text-[color:var(--ss-davy)]">
            Choose a collection and create the first one you would love to use.
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="mt-6 min-h-12 rounded-[5px] bg-[color:var(--ss-night)] px-7 text-[10px] uppercase tracking-[0.2em] text-white"
          >
            Choose a photoshoot
          </button>
        </div>
      ) : null}

      {photos.length > 0 ? (
        <div className="mt-7 columns-2 gap-3 sm:columns-3 sm:gap-5 lg:columns-4">
          {photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => onOpen(index)}
              className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-[10px] bg-white shadow-[0_8px_28px_rgba(13,14,16,0.06)] sm:mb-5"
              aria-label={`Open ${photo.title ?? "your photo"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.title ?? "Your photo"} className="h-auto w-full" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-3 pt-10 text-left text-[9px] uppercase tracking-[0.16em] text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
                Open photo
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function Account({
  selfieUrl,
  credits,
  uploading,
  deletingSelfie,
  uploadError,
  billingBusy,
  billingError,
  requestText,
  requestState,
  showSuiteBridge,
  onAddSelfie,
  onDeleteSelfie,
  onRequestTextChange,
  onSendRequest,
  onOpenBilling,
}: {
  selfieUrl: string | null
  credits: number
  uploading: boolean
  deletingSelfie: boolean
  uploadError: string | null
  billingBusy: boolean
  billingError: string | null
  requestText: string
  requestState: "idle" | "sending" | "sent" | "error"
  showSuiteBridge: boolean
  onAddSelfie: () => void
  onDeleteSelfie: () => void
  onRequestTextChange: (value: string) => void
  onSendRequest: () => void
  onOpenBilling: () => void
}) {
  return (
    <section className="mx-auto max-w-3xl">
      <div className="border-b border-[color:var(--ss-silver)]/55 pb-7">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ss-gray)]">
          Account
        </p>
        <h1 className="mt-3 font-serif text-[48px] font-light leading-[0.95] text-[color:var(--ss-night)] sm:text-[64px]">
          Your Vault Maya membership
        </h1>
      </div>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <AccountCard
          eyebrow="Your selfie"
          title={selfieUrl ? "Ready to create" : "Add one clear selfie"}
        >
          {selfieUrl ? (
            <div className="mt-5 flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selfieUrl}
                alt="Your selfie"
                className="h-20 w-20 rounded-full object-cover"
              />
              <div className="flex flex-col items-start gap-2">
                <button
                  type="button"
                  onClick={onAddSelfie}
                  disabled={uploading || deletingSelfie}
                  className="min-h-9 text-[10px] uppercase tracking-[0.17em] text-[color:var(--ss-davy)] underline underline-offset-4"
                >
                  {uploading ? "Uploading…" : "Change selfie"}
                </button>
                <button
                  type="button"
                  onClick={onDeleteSelfie}
                  disabled={uploading || deletingSelfie}
                  className="min-h-9 text-[10px] uppercase tracking-[0.17em] text-[color:var(--ss-gray)] underline underline-offset-4"
                >
                  {deletingSelfie ? "Deleting…" : "Delete my selfie"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-3 text-[13px] leading-6 text-[color:var(--ss-davy)]">
                Choose a photo where your face is clear, without a filter or heavy shadows.
              </p>
              <button
                type="button"
                onClick={onAddSelfie}
                disabled={uploading}
                className="mt-5 min-h-11 rounded-[5px] bg-[color:var(--ss-night)] px-5 text-[10px] uppercase tracking-[0.2em] text-white disabled:opacity-60"
              >
                {uploading ? "Uploading…" : "Add my selfie"}
              </button>
            </>
          )}
          {uploadError ? (
            <p className="mt-3 text-[12px] text-[color:var(--ss-davy)]">{uploadError}</p>
          ) : null}
        </AccountCard>

        <AccountCard eyebrow="Photos" title={`${credits} left this month`}>
          <p className="mt-3 text-[13px] leading-6 text-[color:var(--ss-davy)]">
            Your monthly photos refresh on your billing date. Extra photos you buy stay until you
            use them.
          </p>
          <Link
            href="/checkout/credits"
            className="mt-5 inline-flex min-h-11 items-center rounded-[5px] border border-[color:var(--ss-night)] px-5 text-[10px] uppercase tracking-[0.2em] text-[color:var(--ss-night)]"
          >
            Top up photos
          </Link>
        </AccountCard>
      </div>

      <AccountCard eyebrow="From Sandra" title="What would you love next?" className="mt-5">
        <p className="mt-3 text-[13px] leading-6 text-[color:var(--ss-davy)]">
          Tell me the kind of photoshoot you want. Your idea could inspire a future Monday drop.
        </p>
        <textarea
          value={requestText}
          onChange={event => onRequestTextChange(event.target.value)}
          rows={3}
          placeholder="A relaxed morning at home. A clean studio shoot. Dinner in the city."
          className="mt-4 w-full resize-none rounded-[5px] border border-[color:var(--ss-silver)]/75 bg-[color:var(--ss-seasalt)] p-4 text-[14px] text-[color:var(--ss-night)] outline-none focus:border-[color:var(--ss-night)]"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSendRequest}
            disabled={requestState === "sending" || !requestText.trim()}
            className="min-h-11 rounded-[5px] border border-[color:var(--ss-night)] px-5 text-[10px] uppercase tracking-[0.2em] text-[color:var(--ss-night)] disabled:opacity-50"
          >
            {requestState === "sending" ? "Sending…" : "Send to Sandra"}
          </button>
          {requestState === "sent" ? (
            <p className="text-[13px] text-[color:var(--ss-davy)]">Thank you. I read every one.</p>
          ) : null}
          {requestState === "error" ? (
            <p className="text-[13px] text-[color:var(--ss-davy)]">
              That didn&apos;t send. Try again.
            </p>
          ) : null}
        </div>
      </AccountCard>

      <AccountCard eyebrow="Membership" title="Account & billing" className="mt-5">
        <p className="mt-3 text-[13px] leading-6 text-[color:var(--ss-davy)]">
          Update your payment method, see your billing details or cancel your membership.
        </p>
        <button
          type="button"
          onClick={onOpenBilling}
          disabled={billingBusy}
          className="mt-5 min-h-11 rounded-[5px] bg-[color:var(--ss-night)] px-5 text-[10px] uppercase tracking-[0.2em] text-white disabled:opacity-60"
        >
          {billingBusy ? "Opening…" : "Manage membership"}
        </button>
        {billingError ? (
          <p className="mt-3 text-[12px] text-[color:var(--ss-davy)]">{billingError}</p>
        ) : null}
      </AccountCard>

      <p className="mt-7 text-center text-[12px] leading-6 text-[color:var(--ss-gray)]">
        Want Vault Maya on your home screen? Use your browser&apos;s share button, then choose “Add
        to Home Screen.”
      </p>

      {showSuiteBridge ? (
        <section className="mt-10 border-t border-[color:var(--ss-silver)]/55 pt-8 text-center">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ss-gray)]">
            Need more?
          </p>
          <h2 className="mt-3 font-serif text-[34px] font-light text-[color:var(--ss-night)]">
            Create from your own ideas with SSELFIE SUITE
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[13px] leading-6 text-[color:var(--ss-davy)]">
            SUITE is where Maya helps with custom photos, your content plan, your feed and your
            captions.
          </p>
          <Link
            href="/checkout/membership?interval=month&source=vault_maya_bridge&utm_source=vault_maya&utm_medium=studio&utm_campaign=vault_maya_to_suite"
            className="mt-5 inline-flex min-h-11 items-center text-[10px] uppercase tracking-[0.2em] text-[color:var(--ss-night)] underline underline-offset-4"
          >
            See SSELFIE SUITE
          </Link>
        </section>
      ) : null}
    </section>
  )
}

function AccountCard({
  eyebrow,
  title,
  children,
  className = "",
}: {
  eyebrow: string
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-[12px] bg-white p-6 shadow-[0_10px_35px_rgba(13,14,16,0.045)] ${className}`}
    >
      <p className="text-[9px] uppercase tracking-[0.25em] text-[color:var(--ss-gray)]">
        {eyebrow}
      </p>
      <h2 className="mt-2 font-serif text-[30px] font-light leading-tight text-[color:var(--ss-night)]">
        {title}
      </h2>
      {children}
    </section>
  )
}

function LookPreview({
  look,
  collection,
  selfieReady,
  generating,
  onClose,
  onMake,
}: {
  look: Look
  collection: Collection
  selfieReady: boolean
  generating: boolean
  onClose: () => void
  onMake: () => void
}) {
  useDialogLock(onClose)
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={look.title}
      className="fixed inset-0 z-[60] flex h-[100dvh] flex-col bg-[color:var(--ss-night)]/96 p-3 text-white backdrop-blur-sm sm:p-5"
    >
      <div className="flex shrink-0 items-center justify-between gap-4 pb-3">
        <div>
          <p className="text-[9px] uppercase tracking-[0.24em] text-white/50">{collection.title}</p>
          <p className="mt-1 font-serif text-[24px] font-light">{look.title}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="min-h-11 px-2 text-[10px] uppercase tracking-[0.18em] text-white/75 hover:text-white"
        >
          Close
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {look.exampleImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={look.exampleImage}
            alt={look.title}
            className="max-h-full max-w-full rounded-[10px] object-contain shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
          />
        ) : (
          <p className="font-serif text-3xl text-white/70">{look.title}</p>
        )}
      </div>
      <div className="shrink-0 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-4 text-center">
        <p className="mb-3 text-[12px] text-white/60">{look.mood}</p>
        <button
          type="button"
          onClick={onMake}
          disabled={generating}
          className="min-h-12 w-full rounded-[5px] bg-white px-8 text-[10px] uppercase tracking-[0.22em] text-[color:var(--ss-night)] disabled:opacity-60 sm:w-auto"
        >
          {generating
            ? "Making your photo…"
            : selfieReady
              ? "Create this photo"
              : "Add a selfie first"}
        </button>
      </div>
    </div>
  )
}

function GeneratedResultView({
  result,
  feedback,
  onFeedback,
  onAgain,
  onDownloaded,
  onClose,
}: {
  result: GeneratedResult
  feedback: "loved" | "not_quite" | null
  onFeedback: (value: "loved" | "not_quite") => void
  onAgain: () => void
  onDownloaded: () => void
  onClose: () => void
}) {
  useDialogLock(onClose)
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Your new photo"
      className="fixed inset-0 z-[70] flex h-[100dvh] flex-col bg-[color:var(--ss-night)]/96 p-3 text-white backdrop-blur-sm sm:p-5"
    >
      <div className="flex shrink-0 items-center justify-between gap-4 pb-3">
        <div>
          <p className="text-[9px] uppercase tracking-[0.24em] text-white/50">Your new photo</p>
          <p className="mt-1 font-serif text-[24px] font-light">{result.look.title}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="min-h-11 px-2 text-[10px] uppercase tracking-[0.18em] text-white/75 hover:text-white"
        >
          Close
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={result.imageUrl}
          alt="Your finished photo"
          className="max-h-full max-w-full rounded-[10px] object-contain shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        />
      </div>
      <div className="shrink-0 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <FavoriteButton assetId={result.assetId} dark />
          <button
            type="button"
            onClick={async () => {
              const started = await initiateAssetDownload(
                result.imageUrl,
                `sselfie-vault-${result.assetId ?? Date.now()}.png`
              )
              if (started) onDownloaded()
            }}
            className="min-h-11 rounded-full bg-white px-6 text-[10px] uppercase tracking-[0.18em] text-[color:var(--ss-night)]"
          >
            Download
          </button>
          <button
            type="button"
            onClick={onAgain}
            className="min-h-11 px-3 text-[11px] text-white/80 underline underline-offset-4 hover:text-white"
          >
            Create again
          </button>
        </div>
        <div className="mt-3 text-center">
          {feedback ? (
            <p className="text-[12px] text-white/65">
              {feedback === "loved"
                ? "Thank you. I’m so happy you love it."
                : "Thank you. This helps me make Vault Maya better."}
            </p>
          ) : (
            <div className="flex items-center justify-center gap-5">
              <span className="text-[11px] text-white/55">How did this one feel?</span>
              <button
                type="button"
                onClick={() => onFeedback("loved")}
                className="min-h-9 text-[11px] text-white underline underline-offset-4"
              >
                Love this
              </button>
              <button
                type="button"
                onClick={() => onFeedback("not_quite")}
                className="min-h-9 text-[11px] text-white/75 underline underline-offset-4"
              >
                Not quite
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
