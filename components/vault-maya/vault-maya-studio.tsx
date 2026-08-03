"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ImageLightbox } from "@/components/app-v3/image-lightbox"
import { FavoriteButton } from "@/components/app-v3/favorite-button"
import { initiateAssetDownload } from "@/lib/app-v3/download-asset"
import { trackAnalyticsEvent } from "@/lib/analytics/client"
import { indexLatestVaultPhotosByCardKey } from "@/lib/vault-maya/personal-vault"

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
  vaultMayaCardKey: string | null
}

type IdentitySelfie = {
  id: string
  url: string
}

type LatestPhotosByCardKey = Record<string, GalleryPhoto>

type StudioTab = "create" | "gallery" | "account"

const MAX_IDENTITY_SELFIES = 4
const LOW_CREDIT_THRESHOLD = 5

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
  initialSelfies,
  initialCredits,
  showSuiteBridge,
  includedWithSuite,
}: {
  initialSelfies: IdentitySelfie[]
  initialCredits: number
  showSuiteBridge: boolean
  includedWithSuite: boolean
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
  const [selfies, setSelfies] = useState<IdentitySelfie[]>(initialSelfies)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [collections, setCollections] = useState<Collection[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [credits, setCredits] = useState(initialCredits)
  const [gen, setGen] = useState<Record<string, GenState>>({})
  const [requestText, setRequestText] = useState("")
  const [requestInspiration, setRequestInspiration] = useState<File | null>(null)
  const [requestState, setRequestState] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([])
  const [galleryLoading, setGalleryLoading] = useState(true)
  const [billingBusy, setBillingBusy] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)
  const [deletingSelfie, setDeletingSelfie] = useState(false)
  const [selfieManagerOpen, setSelfieManagerOpen] = useState(false)
  const [creditModalOpen, setCreditModalOpen] = useState(false)
  const [creditModalDismissed, setCreditModalDismissed] = useState(false)
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
            (asset: {
              kind?: string
              url?: string
              generationRef?: string
              vaultMayaCardKey?: string | null
            }) =>
              asset?.kind === "image" &&
              typeof asset?.url === "string" &&
              ((typeof asset?.vaultMayaCardKey === "string" && asset.vaultMayaCardKey.length > 0) ||
                (typeof asset?.generationRef === "string" &&
                  asset.generationRef.includes("-vault-maya-")))
          )
          .map(
            (asset: {
              id: string
              url: string
              createdAt: string
              isFavorite?: boolean
              title?: string | null
              generationRef?: string | null
              vaultMayaCardKey?: string | null
            }) => ({
              id: String(asset.id),
              url: asset.url,
              createdAt: asset.createdAt,
              isFavorite: Boolean(asset.isFavorite),
              title: typeof asset.title === "string" ? asset.title : null,
              generationRef: typeof asset.generationRef === "string" ? asset.generationRef : "",
              vaultMayaCardKey:
                typeof asset.vaultMayaCardKey === "string" ? asset.vaultMayaCardKey : null,
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
    track("vault_maya_studio_viewed", {
      hasSelfie: initialSelfies.length > 0,
      selfieCount: initialSelfies.length,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (credits > LOW_CREDIT_THRESHOLD) {
      setCreditModalDismissed(false)
      setCreditModalOpen(false)
      return
    }
    if (credits >= 0 && !creditModalDismissed) {
      setCreditModalOpen(true)
    }
  }, [creditModalDismissed, credits])

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
  const latestPhotosByCardKey = useMemo(
    () =>
      indexLatestVaultPhotosByCardKey(
        galleryPhotos,
        allLooks.map(({ look, collection }) => ({
          cardKey: look.cardKey,
          title: look.title,
          collectionTitle: collection.title,
        }))
      ),
    [allLooks, galleryPhotos]
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

  const uploadSelfies = useCallback(
    async (files: File[]) => {
      const selectedFiles = files.slice(0, Math.max(0, MAX_IDENTITY_SELFIES - selfies.length))
      if (selectedFiles.length === 0) {
        setUploadError("Remove one of your four selfies before adding another.")
        return
      }
      setUploading(true)
      setUploadError(null)
      const errors: string[] = []
      let addedCount = 0
      try {
        for (const file of selectedFiles) {
          try {
            const form = new FormData()
            form.append("file", file)
            form.append("slot", "face")
            const response = await fetch("/api/app-v3/upload-selfie", {
              method: "POST",
              body: form,
            })
            const data = await response.json().catch(() => ({}))
            if (!response.ok || !data?.url) {
              throw new Error(data?.error || `${file.name} didn't upload.`)
            }
            if (data?.avatarImageId == null) {
              throw new Error(`${file.name} uploaded, but Maya couldn't save it.`)
            }
            const addedSelfie = { id: String(data.avatarImageId), url: String(data.url) }
            setSelfies(previous => [addedSelfie, ...previous].slice(0, MAX_IDENTITY_SELFIES))
            addedCount += 1
          } catch (error) {
            errors.push(error instanceof Error ? error.message : `${file.name} didn't upload.`)
          }
        }
        if (addedCount > 0) {
          track("vault_maya_selfie_added", {
            addedCount,
            selfieCount: Math.min(selfies.length + addedCount, MAX_IDENTITY_SELFIES),
          })
        }
        if (errors.length > 0) setUploadError(errors[0])
      } finally {
        setUploading(false)
      }
    },
    [selfies.length]
  )

  const deleteSelfie = useCallback(
    async (selfie: IdentitySelfie) => {
      if (
        !window.confirm(
          selfies.length === 1
            ? "Delete this selfie? Maya can't create new photos until you add another one. Photos you already made stay in My photos."
            : "Delete this selfie? Maya will keep using the other photos you added."
        )
      ) {
        return
      }
      setDeletingSelfie(true)
      setUploadError(null)
      try {
        const response = await fetch(
          `/api/vault-maya/delete-selfie?imageId=${encodeURIComponent(selfie.id)}`,
          { method: "DELETE" }
        )
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || "Deleting didn't work. Try again.")
        }
        setSelfies(previous => previous.filter(item => item.id !== selfie.id))
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "Deleting didn't work. Try again.")
      } finally {
        setDeletingSelfie(false)
      }
    },
    [selfies.length]
  )

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
      if (selfies.length === 0) {
        setPreviewLook(null)
        setSelfieManagerOpen(true)
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
            referenceSelfieUrl: selfies[0].url,
            referenceSelfieUrls: selfies.map(selfie => selfie.url),
            inspirationImageUrl: briefData.inspirationImageUrl,
            referenceMode: briefData.referenceMode,
            aestheticId: briefData.aestheticId,
            conceptTitle: briefData.title,
            vaultMayaCardKey: look.cardKey,
            clientRequestId: `vault-maya-${look.cardKey}-${Date.now()}`,
            stream: false,
          }),
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data?.imageUrl) {
          if (response.status === 402 || /credit/i.test(String(data?.error || ""))) {
            if (typeof data.current === "number") setCredits(data.current)
            setCreditModalOpen(true)
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
    [loadGallery, selfies]
  )

  const sendDropRequest = useCallback(async () => {
    const message = requestText.trim()
    if ((!message && !requestInspiration) || requestState === "sending") return
    setRequestState("sending")
    try {
      const form = new FormData()
      form.append("message", message)
      if (requestInspiration) form.append("inspiration", requestInspiration)
      const response = await fetch("/api/vault-maya/drop-requests", {
        method: "POST",
        body: form,
      })
      if (!response.ok) throw new Error()
      setRequestState("sent")
      setRequestText("")
      setRequestInspiration(null)
      track("vault_maya_drop_request_sent", { hasInspiration: Boolean(requestInspiration) })
    } catch {
      setRequestState("error")
    }
  }, [requestInspiration, requestState, requestText])

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
              selfieReady={selfies.length > 0}
              gen={gen}
              latestPhotosByCardKey={latestPhotosByCardKey}
              onBack={closeCollection}
              onPreview={look => setPreviewLook({ look, collection: selectedCollection })}
              onOpenCreated={(look, photo) => {
                setResultFeedback(null)
                setActiveResult({
                  imageUrl: photo.url,
                  assetId: photo.id,
                  look,
                })
              }}
              onMake={look => void makeLook(look)}
              onAddSelfie={() => setSelfieManagerOpen(true)}
            />
          ) : (
            <CreateHome
              weekly={weekly}
              collections={visibleCollections}
              loading={!collections && !loadError}
              loadError={loadError}
              selfieUrl={selfies[0]?.url ?? null}
              selfieCount={selfies.length}
              uploading={uploading}
              onAddSelfie={() => setSelfieManagerOpen(true)}
              onOpenCollection={openCollection}
              hasMoreCollections={!showAllCollections && rest.length > visibleCollections.length}
              totalCollections={rest.length}
              onShowAllCollections={() => setShowAllCollections(true)}
              latestPhotosByCardKey={latestPhotosByCardKey}
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
            selfies={selfies}
            credits={credits}
            uploading={uploading}
            deletingSelfie={deletingSelfie}
            uploadError={uploadError}
            billingBusy={billingBusy}
            billingError={billingError}
            requestText={requestText}
            requestInspiration={requestInspiration}
            requestState={requestState}
            showSuiteBridge={showSuiteBridge}
            includedWithSuite={includedWithSuite}
            onAddSelfie={() => fileInputRef.current?.click()}
            onDeleteSelfie={selfie => void deleteSelfie(selfie)}
            onRequestTextChange={value => {
              setRequestText(value)
              if (requestState === "sent" || requestState === "error") setRequestState("idle")
            }}
            onRequestInspirationChange={file => {
              setRequestInspiration(file)
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
        multiple
        className="hidden"
        onChange={event => {
          const files = Array.from(event.target.files ?? [])
          if (files.length > 0) void uploadSelfies(files)
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
          selfieReady={selfies.length > 0}
          generating={gen[previewLook.look.cardKey]?.status === "generating"}
          onClose={() => setPreviewLook(null)}
          onMake={() => void makeLook(previewLook.look)}
        />
      ) : null}

      {selfieManagerOpen ? (
        <SelfieManagerModal
          selfies={selfies}
          uploading={uploading}
          deletingSelfie={deletingSelfie}
          uploadError={uploadError}
          onAdd={() => fileInputRef.current?.click()}
          onDelete={selfie => void deleteSelfie(selfie)}
          onClose={() => setSelfieManagerOpen(false)}
        />
      ) : null}

      {creditModalOpen ? (
        <VaultMayaCreditModal
          credits={credits}
          onClose={() => {
            setCreditModalDismissed(true)
            setCreditModalOpen(false)
          }}
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
  selfieCount,
  uploading,
  onAddSelfie,
  onOpenCollection,
  hasMoreCollections,
  totalCollections,
  onShowAllCollections,
  latestPhotosByCardKey,
}: {
  weekly: Collection | null
  collections: Collection[]
  loading: boolean
  loadError: string | null
  selfieUrl: string | null
  selfieCount: number
  uploading: boolean
  onAddSelfie: () => void
  onOpenCollection: (collection: Collection) => void
  hasMoreCollections: boolean
  totalCollections: number
  onShowAllCollections: () => void
  latestPhotosByCardKey: LatestPhotosByCardKey
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
          <button
            type="button"
            onClick={onAddSelfie}
            className="group flex min-h-12 items-center gap-3 border-l border-[color:var(--ss-silver)]/60 pl-4 text-left"
            aria-label="Change selfies"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selfieUrl}
              alt="Your selfie"
              className="h-11 w-11 rounded-full object-cover"
            />
            <p className="max-w-32 text-[12px] leading-5 text-[color:var(--ss-davy)]">
              {selfieCount === 1 ? "Your selfie is ready." : `${selfieCount} selfies are ready.`}
              <span className="block text-[9px] uppercase tracking-[0.14em] text-[color:var(--ss-gray)] underline underline-offset-4 group-hover:text-[color:var(--ss-night)]">
                Change selfies
              </span>
            </p>
          </button>
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
        <WeeklyFeature
          collection={weekly}
          latestPhotosByCardKey={latestPhotosByCardKey}
          onOpen={() => onOpenCollection(weekly)}
        />
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
                latestPhotosByCardKey={latestPhotosByCardKey}
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

function WeeklyFeature({
  collection,
  latestPhotosByCardKey,
  onOpen,
}: {
  collection: Collection
  latestPhotosByCardKey: LatestPhotosByCardKey
  onOpen: () => void
}) {
  const images = collection.looks
    .map(look => latestPhotosByCardKey[look.cardKey]?.url ?? look.exampleImage)
    .filter(Boolean) as string[]
  const createdCount = collection.looks.filter(look => latestPhotosByCardKey[look.cardKey]).length

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
            {createdCount > 0
              ? `${createdCount} of ${collection.looks.length} created by you`
              : `${collection.looks.length} photos to choose from`}
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

function CollectionCard({
  collection,
  latestPhotosByCardKey,
  onOpen,
}: {
  collection: Collection
  latestPhotosByCardKey: LatestPhotosByCardKey
  onOpen: () => void
}) {
  const images = collection.looks
    .map(look => latestPhotosByCardKey[look.cardKey]?.url ?? look.exampleImage)
    .filter(Boolean) as string[]
  const createdCount = collection.looks.filter(look => latestPhotosByCardKey[look.cardKey]).length

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
          {createdCount > 0
            ? `${createdCount} of ${collection.looks.length} created · Open collection`
            : `${collection.looks.length} photos · Open collection`}
        </span>
      </span>
    </button>
  )
}

function CollectionDetail({
  collection,
  selfieReady,
  gen,
  latestPhotosByCardKey,
  onBack,
  onPreview,
  onOpenCreated,
  onMake,
  onAddSelfie,
}: {
  collection: Collection
  selfieReady: boolean
  gen: Record<string, GenState>
  latestPhotosByCardKey: LatestPhotosByCardKey
  onBack: () => void
  onPreview: (look: Look) => void
  onOpenCreated: (look: Look, photo: { id: string | number | null; url: string }) => void
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
        <div className="text-left sm:text-right">
          <p className="text-[12px] text-[color:var(--ss-gray)]">Choose one photo to create</p>
          {selfieReady ? (
            <button
              type="button"
              onClick={onAddSelfie}
              className="mt-2 min-h-9 text-[9px] uppercase tracking-[0.17em] text-[color:var(--ss-night)] underline underline-offset-4"
            >
              Change selfies
            </button>
          ) : null}
        </div>
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
          const savedPhoto = latestPhotosByCardKey[look.cardKey]
          const createdPhoto =
            state?.status === "done"
              ? { id: state.assetId, url: state.imageUrl }
              : savedPhoto
                ? { id: savedPhoto.id, url: savedPhoto.url }
                : null
          return (
            <article key={look.cardKey} className="min-w-0">
              <button
                type="button"
                onClick={() => (createdPhoto ? onOpenCreated(look, createdPhoto) : onPreview(look))}
                className="group relative block aspect-[3/4] w-full overflow-hidden rounded-[10px] bg-white shadow-[0_8px_26px_rgba(13,14,16,0.07)]"
                aria-label={`Open ${createdPhoto ? "your " : ""}${look.title}`}
              >
                {createdPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={createdPhoto.url}
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
                {createdPhoto && state?.status !== "generating" ? (
                  <span className="absolute left-2 top-2 rounded-full bg-white/92 px-2.5 py-1 text-[8px] uppercase tracking-[0.17em] text-[color:var(--ss-night)] shadow-sm">
                    Your photo
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
                    : createdPhoto
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
  selfies,
  credits,
  uploading,
  deletingSelfie,
  uploadError,
  billingBusy,
  billingError,
  requestText,
  requestInspiration,
  requestState,
  showSuiteBridge,
  includedWithSuite,
  onAddSelfie,
  onDeleteSelfie,
  onRequestTextChange,
  onRequestInspirationChange,
  onSendRequest,
  onOpenBilling,
}: {
  selfies: IdentitySelfie[]
  credits: number
  uploading: boolean
  deletingSelfie: boolean
  uploadError: string | null
  billingBusy: boolean
  billingError: string | null
  requestText: string
  requestInspiration: File | null
  requestState: "idle" | "sending" | "sent" | "error"
  showSuiteBridge: boolean
  includedWithSuite: boolean
  onAddSelfie: () => void
  onDeleteSelfie: (selfie: IdentitySelfie) => void
  onRequestTextChange: (value: string) => void
  onRequestInspirationChange: (file: File | null) => void
  onSendRequest: () => void
  onOpenBilling: () => void
}) {
  const [requestInspirationPreview, setRequestInspirationPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!requestInspiration) {
      setRequestInspirationPreview(null)
      return
    }
    const previewUrl = URL.createObjectURL(requestInspiration)
    setRequestInspirationPreview(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [requestInspiration])

  return (
    <section className="mx-auto max-w-3xl">
      <div className="border-b border-[color:var(--ss-silver)]/55 pb-7">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ss-gray)]">
          Account
        </p>
        <h1 className="mt-3 font-serif text-[48px] font-light leading-[0.95] text-[color:var(--ss-night)] sm:text-[64px]">
          {includedWithSuite ? "Included with your SUITE" : "Your Vault Maya membership"}
        </h1>
      </div>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        <AccountCard
          eyebrow="Your selfies"
          title={selfies.length > 0 ? `${selfies.length} ready to create` : "Add one clear selfie"}
        >
          {selfies.length > 0 ? (
            <>
              <p className="mt-3 text-[13px] leading-6 text-[color:var(--ss-davy)]">
                Maya uses these together to keep your face and features consistent. A clear front
                photo plus one or two different angles works best.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {selfies.map((selfie, index) => (
                  <div
                    key={selfie.id}
                    className="group relative overflow-hidden rounded-[8px] bg-[color:var(--ss-seasalt)]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selfie.url}
                      alt={`Your selfie ${index + 1}`}
                      className="aspect-[4/5] w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => onDeleteSelfie(selfie)}
                      disabled={uploading || deletingSelfie}
                      className="absolute bottom-2 right-2 min-h-9 rounded-full bg-white/92 px-3 text-[9px] uppercase tracking-[0.14em] text-[color:var(--ss-night)] shadow-sm backdrop-blur-sm disabled:opacity-60"
                      aria-label={`Remove selfie ${index + 1}`}
                    >
                      {deletingSelfie ? "Removing…" : "Remove"}
                    </button>
                  </div>
                ))}
              </div>
              {selfies.length < MAX_IDENTITY_SELFIES ? (
                <button
                  type="button"
                  onClick={onAddSelfie}
                  disabled={uploading || deletingSelfie}
                  className="mt-5 min-h-11 rounded-[5px] border border-[color:var(--ss-night)] px-5 text-[10px] uppercase tracking-[0.2em] text-[color:var(--ss-night)] disabled:opacity-60"
                >
                  {uploading ? "Uploading…" : "Add another selfie"}
                </button>
              ) : (
                <p className="mt-4 text-[12px] leading-5 text-[color:var(--ss-gray)]">
                  You have added the maximum of four selfies. Remove one if you want to replace it.
                </p>
              )}
            </>
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
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-[5px] border border-[color:var(--ss-silver)] px-4 text-[10px] uppercase tracking-[0.18em] text-[color:var(--ss-night)] hover:border-[color:var(--ss-night)]">
            Attach inspiration
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={event => {
                onRequestInspirationChange(event.target.files?.[0] ?? null)
                event.target.value = ""
              }}
            />
          </label>
          {requestInspiration ? (
            <div className="flex min-w-0 items-center gap-3 rounded-[7px] bg-[color:var(--ss-seasalt)] p-2 pr-3">
              {requestInspirationPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={requestInspirationPreview}
                  alt="Your inspiration"
                  className="h-14 w-12 shrink-0 rounded-[5px] object-cover"
                />
              ) : null}
              <div className="min-w-0">
                <p className="max-w-[220px] truncate text-[12px] text-[color:var(--ss-davy)]">
                  {requestInspiration.name}
                </p>
                <button
                  type="button"
                  onClick={() => onRequestInspirationChange(null)}
                  className="mt-1 min-h-7 text-[9px] uppercase tracking-[0.14em] text-[color:var(--ss-gray)] underline underline-offset-3"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onSendRequest}
            disabled={requestState === "sending" || (!requestText.trim() && !requestInspiration)}
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

      <AccountCard
        eyebrow={includedWithSuite ? "SSELFIE SUITE" : "Membership"}
        title="Account & billing"
        className="mt-5"
      >
        <p className="mt-3 text-[13px] leading-6 text-[color:var(--ss-davy)]">
          {includedWithSuite
            ? "Vault Maya is part of your SUITE. Manage your SUITE payment and membership here."
            : "Update your payment method, see your billing details or cancel your membership."}
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

function SelfieManagerModal({
  selfies,
  uploading,
  deletingSelfie,
  uploadError,
  onAdd,
  onDelete,
  onClose,
}: {
  selfies: IdentitySelfie[]
  uploading: boolean
  deletingSelfie: boolean
  uploadError: string | null
  onAdd: () => void
  onDelete: (selfie: IdentitySelfie) => void
  onClose: () => void
}) {
  useDialogLock(onClose)
  const canAdd = selfies.length < MAX_IDENTITY_SELFIES
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[color:var(--ss-night)]/45 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="selfie-manager-title"
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-[14px] bg-white p-5 shadow-[0_28px_100px_rgba(13,14,16,0.24)] sm:p-8"
      >
        <div className="flex items-start justify-between gap-5 border-b border-[color:var(--ss-silver)]/55 pb-5">
          <div>
            <p className="text-[9px] uppercase tracking-[0.28em] text-[color:var(--ss-gray)]">
              Your selfies
            </p>
            <h2
              id="selfie-manager-title"
              className="mt-2 font-serif text-[36px] font-light leading-none text-[color:var(--ss-night)] sm:text-[44px]"
            >
              Help Maya keep you looking like you
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="min-h-11 shrink-0 text-[10px] uppercase tracking-[0.18em] text-[color:var(--ss-gray)] hover:text-[color:var(--ss-night)]"
          >
            Close
          </button>
        </div>

        <p className="mt-5 max-w-xl text-[13px] leading-6 text-[color:var(--ss-davy)]">
          Add up to four clear photos. A front photo, another angle and a full-body photo help Maya
          keep both your face and your natural features consistent.
        </p>

        {selfies.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {selfies.map((selfie, index) => (
              <div
                key={selfie.id}
                className="relative overflow-hidden rounded-[9px] bg-[color:var(--ss-seasalt)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selfie.url}
                  alt={`Your selfie ${index + 1}`}
                  className="aspect-[4/5] w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onDelete(selfie)}
                  disabled={uploading || deletingSelfie}
                  className="absolute bottom-2 right-2 min-h-9 rounded-full bg-white/92 px-3 text-[9px] uppercase tracking-[0.14em] text-[color:var(--ss-night)] shadow-sm disabled:opacity-60"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-[10px] bg-[color:var(--ss-seasalt)] px-5 py-10 text-center text-[13px] text-[color:var(--ss-davy)]">
            Start with a clear photo where your face is easy to see.
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {canAdd ? (
            <button
              type="button"
              onClick={onAdd}
              disabled={uploading || deletingSelfie}
              className="min-h-12 rounded-[5px] bg-[color:var(--ss-night)] px-6 text-[10px] uppercase tracking-[0.2em] text-white disabled:opacity-60"
            >
              {uploading
                ? "Uploading…"
                : selfies.length > 0
                  ? "Add more selfies"
                  : "Choose selfies"}
            </button>
          ) : (
            <p className="text-[12px] leading-5 text-[color:var(--ss-gray)]">
              Four selfies added. Remove one if you want to replace it.
            </p>
          )}
          {selfies.length > 0 ? (
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 px-3 text-[10px] uppercase tracking-[0.18em] text-[color:var(--ss-night)] underline underline-offset-4"
            >
              Keep creating
            </button>
          ) : null}
        </div>
        {uploadError ? (
          <p className="mt-3 text-[12px] leading-5 text-[color:var(--ss-davy)]">{uploadError}</p>
        ) : null}
      </section>
    </div>
  )
}

function VaultMayaCreditModal({ credits, onClose }: { credits: number; onClose: () => void }) {
  useDialogLock(onClose)
  return (
    <div className="fixed inset-0 z-[85] flex items-end justify-center bg-[color:var(--ss-night)]/45 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="vault-credit-title"
        className="w-full max-w-md rounded-[14px] bg-white p-6 shadow-[0_28px_100px_rgba(13,14,16,0.24)] sm:p-8"
      >
        <p className="text-[9px] uppercase tracking-[0.28em] text-[color:var(--ss-gray)]">
          Running low
        </p>
        <h2
          id="vault-credit-title"
          className="mt-3 font-serif text-[38px] font-light leading-[0.98] text-[color:var(--ss-night)]"
        >
          {credits === 0 ? "You’re out of photos." : `You have ${credits} photos left.`}
        </h2>
        <p className="mt-4 text-[13px] leading-6 text-[color:var(--ss-davy)]">
          Top up now and keep creating. Extra photos stay in your account until you use them.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/checkout/credits"
            className="inline-flex min-h-12 items-center justify-center rounded-[5px] bg-[color:var(--ss-night)] px-6 text-[10px] uppercase tracking-[0.2em] text-white"
          >
            Top up photos
          </Link>
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="min-h-11 text-[10px] uppercase tracking-[0.16em] text-[color:var(--ss-gray)] hover:text-[color:var(--ss-night)]"
          >
            Not now
          </button>
        </div>
      </section>
    </div>
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
