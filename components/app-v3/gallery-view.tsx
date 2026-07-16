"use client"

// SSELFIE Studio 3.0 - Photos hub.
// Functional first pass: typed assets, filters, videos, favorites, selection, delete/download.

import { memo, startTransition, useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import {
  Check,
  Download,
  Film,
  Heart,
  ImageIcon,
  MoreHorizontal,
  Play,
  Trash2,
  X,
} from "lucide-react"
import { ImageLightbox } from "./image-lightbox"
import type { AppV3GalleryAsset, AppV3GalleryCounts } from "@/lib/app-v3/gallery-assets"
import { retryGeneratedImageOnce } from "./image-retry"
import { recordSuiteDownloadForReview } from "@/lib/testimonials/review-capture-client"
import { initiateAssetDownload } from "@/lib/app-v3/download-asset"
import { useAccessibleModal } from "./use-accessible-modal"

// The project intentionally serves generated assets without Next's image optimizer.
// Keep each page modest so opening Photos does not compete for dozens of full-resolution files.
const GALLERY_PAGE_SIZE = 24

type GalleryFilter =
  | "all"
  | "favorites"
  | "photos"
  | "photoshoots"
  | "reel-cover"
  | "carousel"
  | "story-slide"
  | "video"

type GalleryResponse = {
  assets?: AppV3GalleryAsset[]
  counts?: AppV3GalleryCounts
  images?: string[]
  videos?: string[]
}

const FILTERS: { id: GalleryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "favorites", label: "Favorites" },
  { id: "photos", label: "Photos" },
  { id: "photoshoots", label: "Shoots" },
  { id: "reel-cover", label: "Covers" },
  { id: "carousel", label: "Carousels" },
  { id: "story-slide", label: "Stories" },
  { id: "video", label: "Videos" },
]

function countForFilter(filter: GalleryFilter, counts: AppV3GalleryCounts | null): number | null {
  if (!counts) return null
  switch (filter) {
    case "all":
      return counts.all
    case "favorites":
      return counts.favorites
    case "photos":
      return counts.photos
    case "photoshoots":
      return counts.photoshoots
    case "reel-cover":
      return counts.reelCovers
    case "carousel":
      return counts.carousels
    case "story-slide":
      return counts.storySlides
    case "video":
      return counts.videos
  }
}

function filterAssets(assets: AppV3GalleryAsset[], filter: GalleryFilter): AppV3GalleryAsset[] {
  switch (filter) {
    case "all":
      return assets
    case "favorites":
      return assets.filter(asset => asset.isFavorite)
    case "photos":
      return assets.filter(asset => asset.kind === "image" && asset.contentType === "photo")
    case "video":
      return assets.filter(asset => asset.kind === "video")
    default:
      return assets.filter(asset => asset.contentType === filter)
  }
}

async function downloadAsset(asset: AppV3GalleryAsset) {
  const started = await initiateAssetDownload(
    asset.url,
    `sselfie-${asset.id}.${asset.kind === "video" ? "mp4" : "png"}`
  )
  if (!started) return
  void recordSuiteDownloadForReview({
    source: "gallery",
    format: asset.contentType,
    assetId: asset.id,
  })
}

function assetLabel(asset: AppV3GalleryAsset): string {
  if (asset.kind === "video") return "Video"
  if (asset.contentType === "photoshoot") return "Shoot"
  if (asset.contentType === "reel-cover") return "Cover"
  if (asset.contentType === "story-slide") return "Story"
  if (asset.contentType === "carousel") return "Carousel"
  return "Photo"
}

function safeAssetTitle(asset: AppV3GalleryAsset): string {
  const title = asset.title?.trim() ?? ""
  const looksInternal =
    title.length > 100 ||
    /use attached|identity reference|fill the frame|reference image|do not change/i.test(title)
  return title && !looksInternal ? title : `${assetLabel(asset)} made with Maya`
}

const AssetTile = memo(function AssetTile({
  asset,
  index,
  selected,
  selectionMode,
  showLabel,
  onOpen,
  onToggleSelect,
  onFavorite,
  onDelete,
  onDownload,
  onMakeMotion,
}: {
  asset: AppV3GalleryAsset
  index: number
  selected: boolean
  selectionMode: boolean
  showLabel: boolean
  onOpen: (asset: AppV3GalleryAsset, index: number) => void
  onToggleSelect: (id: string) => void
  onFavorite: (asset: AppV3GalleryAsset) => void
  onDelete: (asset: AppV3GalleryAsset) => void
  onDownload: (asset: AppV3GalleryAsset) => void
  onMakeMotion?: (url: string) => void
}) {
  const isVideo = asset.kind === "video"
  const title = safeAssetTitle(asset)
  return (
    <div
      className={`group relative overflow-hidden rounded-[6px] border bg-[#F1F2F2] transition-shadow ${
        selected ? "border-[#0D0E10] ring-1 ring-[#0D0E10]" : "border-[#C5C6C8]/50"
      }`}
    >
      <button
        type="button"
        onClick={() => (selectionMode ? onToggleSelect(asset.id) : onOpen(asset, index))}
        className="relative block aspect-[4/5] w-full overflow-hidden text-left"
      >
        {isVideo ? (
          <>
            {asset.thumbnailUrl ? (
              <Image
                src={asset.thumbnailUrl}
                alt=""
                fill
                priority={index < 4}
                className="object-cover opacity-90"
                sizes="(max-width:640px) 45vw, 240px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#E7E8E8]">
                <Film size={26} className="text-[#818283]" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-[#0D0E10]/15">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-[#0D0E10] shadow-sm">
                <Play size={18} fill="currentColor" className="ml-0.5" />
              </span>
            </div>
          </>
        ) : (
          <Image
            src={asset.url}
            alt={`${title}, item ${index + 1}`}
            fill
            priority={index < 4}
            onError={retryGeneratedImageOnce}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width:640px) 45vw, 240px"
          />
        )}
      </button>

      {/* Overlays live OUTSIDE the tap button (a button can't nest a button) and sit above it. */}
      {/* Quiet type label - only in the mixed "All" view, where it actually disambiguates. */}
      {showLabel && (
        <span className="pointer-events-none absolute left-2 top-2 rounded-[3px] bg-[#0D0E10]/55 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.16em] text-white backdrop-blur-sm">
          {assetLabel(asset)}
        </span>
      )}
      {asset.variantOf && (
        <span
          className={`pointer-events-none absolute left-2 rounded-[3px] bg-white/85 px-1.5 py-0.5 text-[8px] uppercase tracking-[0.14em] text-[color:var(--ss-charcoal)] backdrop-blur-sm ${
            showLabel ? "top-8" : "top-2"
          }`}
        >
          Variant
        </span>
      )}
      {asset.title?.trim() && title === asset.title.trim() && (
        <span className="pointer-events-none absolute inset-x-2 bottom-12 line-clamp-2 rounded-[3px] bg-[color:var(--ss-night)]/45 px-2 py-1 text-[10px] leading-snug text-white backdrop-blur-sm">
          {title}
        </span>
      )}

      {/* Selection check replaces the favorite affordance while selecting. */}
      {selectionMode ? (
        <span
          className={`pointer-events-none absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border ${
            selected
              ? "border-[#0D0E10] bg-[#0D0E10] text-white"
              : "border-white/80 bg-[#0D0E10]/20 text-white"
          }`}
        >
          {selected && <Check size={15} />}
        </span>
      ) : (
        asset.canFavorite && (
          <button
            type="button"
            onClick={() => onFavorite(asset)}
            aria-label={asset.isFavorite ? "Remove favorite" : "Favorite"}
            className="absolute right-1 top-1 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-[#0D0E10]/35 text-white backdrop-blur-sm transition-colors hover:bg-[#0D0E10]/55"
          >
            <Heart size={15} className={asset.isFavorite ? "fill-white text-white" : ""} />
          </button>
        )
      )}

      {/* Action row stays out of the way while selecting (bulk bar owns the screen then). */}
      {!selectionMode && (
        <div className="flex items-center justify-between gap-1 bg-white px-1.5 py-1.5">
          <div className="flex min-w-0 items-center">
            <button
              type="button"
              onClick={() => onDownload(asset)}
              aria-label="Download"
              className="flex h-11 w-11 items-center justify-center rounded-full text-[#4F5052] hover:bg-[#F1F2F2]"
            >
              <Download size={15} />
            </button>
            {asset.canDelete && (
              <button
                type="button"
                onClick={() => onDelete(asset)}
                aria-label="Delete"
                className="flex h-11 w-11 items-center justify-center rounded-full text-[#4F5052] hover:bg-[#F1F2F2]"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
          {asset.kind === "image" && onMakeMotion && (
            <button
              type="button"
              onClick={() => onMakeMotion(asset.url)}
              className="flex min-h-11 items-center gap-1 rounded-[4px] bg-[#0D0E10] px-2.5 text-[9px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#282728]"
            >
              <Film size={11} />
              Make video
            </button>
          )}
        </div>
      )}
    </div>
  )
})

// Core chips are always offered; content-type chips only appear once Maya has made that kind,
// so the row stays quiet for someone whose library is mostly plain photos.
const CORE_FILTERS = new Set<GalleryFilter>(["all", "favorites", "photos", "video"])

export function GalleryView({
  onMakeMotion,
  onStartCreate,
}: {
  onMakeMotion?: (url: string) => void
  onStartCreate?: () => void
}) {
  const [assets, setAssets] = useState<AppV3GalleryAsset[] | null>(null)
  const [counts, setCounts] = useState<AppV3GalleryCounts | null>(null)
  const [filter, setFilter] = useState<GalleryFilter>("all")
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [previewVideo, setPreviewVideo] = useState<AppV3GalleryAsset | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null)
  const [visibleAssetCount, setVisibleAssetCount] = useState(GALLERY_PAGE_SIZE)
  const { dialogRef: deleteDialogRef, initialFocusRef: cancelDeleteRef } = useAccessibleModal(
    pendingDeleteIds !== null,
    () => setPendingDeleteIds(null),
  )
  const { dialogRef: videoDialogRef, initialFocusRef: closeVideoRef } = useAccessibleModal(
    previewVideo !== null,
    () => setPreviewVideo(null),
  )

  const filteredAssets = useMemo(() => filterAssets(assets ?? [], filter), [assets, filter])
  const displayedAssets = useMemo(
    () => filteredAssets.slice(0, visibleAssetCount),
    [filteredAssets, visibleAssetCount],
  )
  const displayedImages = useMemo(
    () => displayedAssets.filter(asset => asset.kind === "image"),
    [displayedAssets]
  )
  const lightboxImages = useMemo(() => displayedImages.map(asset => asset.url), [displayedImages])

  const loadGallery = useCallback(() => {
    setError(null)
    fetch("/api/app-v3/gallery")
      .then(r => {
        if (!r.ok) throw new Error(`Gallery returned ${r.status}`)
        return r.json()
      })
      .then((d: GalleryResponse) => {
        const typedAssets = Array.isArray(d?.assets) ? d.assets : []
        setAssets(typedAssets)
        setCounts(d?.counts ?? null)
      })
      .catch(() => setError("Couldn't load your gallery. Try again."))
  }, [])

  useEffect(() => {
    loadGallery()
  }, [loadGallery])

  useEffect(() => {
    setVisibleAssetCount(GALLERY_PAGE_SIZE)
  }, [filter])

  const openAsset = useCallback(
    (asset: AppV3GalleryAsset) => {
      if (asset.kind === "video") {
        setPreviewVideo(asset)
        return
      }
      const imageIndex = displayedImages.findIndex(item => item.id === asset.id)
      if (imageIndex >= 0) startTransition(() => setLightboxIndex(imageIndex))
    },
    [displayedImages]
  )

  function toggleSelected(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
    setSelectionMode(false)
  }

  async function toggleFavorite(asset: AppV3GalleryAsset) {
    if (!asset.canFavorite) return
    const nextFavorite = !asset.isFavorite
    setAssets(
      prev =>
        prev?.map(item => (item.id === asset.id ? { ...item, isFavorite: nextFavorite } : item)) ??
        prev
    )
    const res = await fetch("/api/app-v3/gallery/favorite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId: asset.id, isFavorite: nextFavorite }),
    })
    if (!res.ok) {
      setAssets(
        prev =>
          prev?.map(item =>
            item.id === asset.id ? { ...item, isFavorite: asset.isFavorite } : item
          ) ?? prev
      )
      setError("Couldn't update favorite. Try again.")
      return
    }
    loadGallery()
  }

  async function deleteAssets(ids: string[]) {
    if (ids.length === 0) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/app-v3/gallery/assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetIds: ids }),
      })
      if (!res.ok) throw new Error("Delete failed")
      setAssets(prev => prev?.filter(asset => !ids.includes(asset.id)) ?? prev)
      clearSelection()
      setPendingDeleteIds(null)
      loadGallery()
    } catch {
      setError("Couldn't delete the selected assets. Try again.")
    } finally {
      setBusy(false)
    }
  }

  function bulkDownload() {
    const selected = filteredAssets.filter(asset => selectedIds.has(asset.id))
    selected.forEach((asset, index) => {
      window.setTimeout(() => downloadAsset(asset), index * 180)
    })
    clearSelection()
  }

  function selectAllVisible() {
    setSelectedIds(new Set(filteredAssets.map(asset => asset.id)))
  }

  const hasAssets = Boolean(assets && assets.length > 0)
  // Until counts load, only the core chips show (avoids a flash of every chip then collapse).
  const visibleFilters = FILTERS.filter(option => {
    if (CORE_FILTERS.has(option.id)) return true
    return (countForFilter(option.id, counts) ?? 0) > 0
  })
  const allVisibleSelected =
    filteredAssets.length > 0 && selectedIds.size >= filteredAssets.length

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-5 sm:py-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#818283]">Photos</p>
          <h1 className="mt-2 font-serif text-[28px] font-light leading-tight text-[#0D0E10] sm:text-[30px]">
            Everything you&apos;ve made
          </h1>
        </div>
        {hasAssets && (
          <button
            type="button"
            onClick={() => {
              setSelectionMode(mode => !mode)
              setSelectedIds(new Set())
            }}
            className="min-h-11 rounded-[4px] border border-[#C5C6C8] bg-white px-3 text-[10px] uppercase tracking-[0.16em] text-[#4F5052]"
          >
            {selectionMode ? "Done" : "Select"}
          </button>
        )}
      </header>

      <div className="-mx-4 mb-5 overflow-x-auto px-4 [scrollbar-width:none]">
        <div className="flex min-w-max gap-2">
          {visibleFilters.map(option => {
            const active = filter === option.id
            const count = countForFilter(option.id, counts)
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setFilter(option.id)
                  clearSelection()
                }}
                aria-pressed={active}
                className={`min-h-11 rounded-full border px-4 text-[10px] uppercase tracking-[0.14em] transition-colors ${
                  active
                    ? "border-[#0D0E10] bg-[#0D0E10] text-white"
                    : "border-[#C5C6C8] bg-white text-[#4F5052] hover:border-[#0D0E10]/40"
                }`}
              >
                {option.label}
                {typeof count === "number" && count > 0 ? (
                  <span className={active ? "ml-1.5 text-white/60" : "ml-1.5 text-[#A9AAAB]"}>
                    {count}
                  </span>
                ) : (
                  ""
                )}
              </button>
            )
          })}
        </div>
      </div>

      {selectionMode && (
        <div className="sticky top-3 z-20 mb-4 flex items-center justify-between gap-3 rounded-[6px] border border-[#C5C6C8] bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-[#4F5052]">{selectedIds.size} selected</span>
            <button
              type="button"
              onClick={allVisibleSelected ? () => setSelectedIds(new Set()) : selectAllVisible}
              className="min-h-11 text-[10px] uppercase tracking-[0.14em] text-[#4F5052] underline underline-offset-2 hover:text-[#0D0E10]"
            >
              {allVisibleSelected ? "Clear" : "Select all"}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={bulkDownload}
              disabled={selectedIds.size === 0 || busy}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#4F5052] disabled:opacity-40"
              aria-label="Download selected"
            >
              <Download size={16} />
            </button>
            <button
              type="button"
              onClick={() => setPendingDeleteIds(Array.from(selectedIds))}
              disabled={selectedIds.size === 0 || busy}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#4F5052] disabled:opacity-40"
              aria-label="Delete selected"
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              onClick={clearSelection}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#4F5052]"
              aria-label="Cancel selection"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {assets === null && !error && (
        <p className="text-[13px] text-[#818283]">Loading your gallery...</p>
      )}
      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-[6px] border border-[#C5C6C8] bg-white px-3 py-2">
          <p className="text-[13px] text-[#282728]">{error}</p>
          <button type="button" onClick={loadGallery} className="min-h-11 shrink-0 px-2 text-[10px] uppercase tracking-[0.14em] text-[#0D0E10] underline underline-offset-2">Retry</button>
        </div>
      )}
      {assets && assets.length === 0 && (
        <div className="rounded-[8px] border border-dashed border-[#C5C6C8] bg-white px-6 py-12 text-center">
          <ImageIcon size={24} className="mx-auto mb-3 text-[#818283]" />
          <p className="font-serif text-[20px] font-light text-[#0D0E10]">Nothing here yet.</p>
          <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed text-[#818283]">
            Everything you make with Maya lives here. Photos, shoots, videos, all in one place.
          </p>
          {onStartCreate && (
            <button
              type="button"
              onClick={onStartCreate}
              className="mt-5 inline-block rounded-[4px] bg-[#0D0E10] px-4 py-2.5 text-[10px] uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#282728]"
            >
              Create with Maya
            </button>
          )}
        </div>
      )}
      {assets && assets.length > 0 && displayedAssets.length === 0 && (
        <div className="rounded-[8px] border border-dashed border-[#C5C6C8] bg-white p-8 text-center">
          <MoreHorizontal size={24} className="mx-auto mb-3 text-[#818283]" />
          <p className="text-[15px] text-[#282728]">Nothing in this view yet.</p>
          <p className="mt-1 text-[13px] text-[#818283]">Try All or create something new.</p>
        </div>
      )}

      {displayedAssets.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {displayedAssets.map((asset, i) => (
            <AssetTile
              key={asset.id}
              asset={asset}
              index={i}
              selected={selectedIds.has(asset.id)}
              selectionMode={selectionMode}
              showLabel={filter === "all"}
              onOpen={openAsset}
              onToggleSelect={toggleSelected}
              onFavorite={toggleFavorite}
              onDelete={asset => setPendingDeleteIds([asset.id])}
              onDownload={downloadAsset}
              onMakeMotion={onMakeMotion}
            />
          ))}
        </div>
      )}

      {filteredAssets.length > displayedAssets.length && (
        <button
          type="button"
          onClick={() => setVisibleAssetCount(count => count + GALLERY_PAGE_SIZE)}
          className="mx-auto mt-6 flex min-h-11 items-center rounded-full border border-[#C5C6C8] bg-white px-6 text-[10px] uppercase tracking-[0.16em] text-[#282728]"
        >
          Load more
        </button>
      )}

      {lightboxIndex !== null && lightboxImages.length > 0 && (
        <ImageLightbox
          images={lightboxImages}
          assetIds={displayedImages.map(asset => asset.id)}
          formats={displayedImages.map(asset => asset.contentType)}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {previewVideo && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
          <div
            ref={videoDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Video preview"
            className="w-full max-w-sm overflow-hidden rounded-[8px] bg-white"
          >
            <video
              src={previewVideo.url}
              controls
              autoPlay
              playsInline
              className="w-full bg-black"
            />
            <div className="flex items-center justify-between gap-2 p-3">
              <button
                type="button"
                onClick={() => downloadAsset(previewVideo)}
                className="flex min-h-11 items-center gap-2 rounded-[4px] bg-[#0D0E10] px-3 text-[10px] uppercase tracking-[0.14em] text-white"
              >
                <Download size={14} />
                Download
              </button>
              <button
                ref={closeVideoRef}
                type="button"
                onClick={() => setPreviewVideo(null)}
                className="flex h-11 w-11 items-center justify-center rounded-full text-[#4F5052]"
                aria-label="Close video"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteIds && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-[#0D0E10]/45 p-4 backdrop-blur-sm">
          <div
            ref={deleteDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-assets-title"
            className="w-full max-w-sm rounded-[10px] bg-[#F8FAFA] p-5 shadow-xl"
          >
            <h2 id="delete-assets-title" className="font-serif text-[23px] font-light text-[#0D0E10]">
              {pendingDeleteIds.length === 1 ? "Delete this photo?" : `Delete ${pendingDeleteIds.length} items?`}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-[#4F5052]">
              This removes it from your Photos and can&apos;t be undone.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void deleteAssets(pendingDeleteIds)}
                className="min-h-12 rounded-[4px] bg-[#0D0E10] px-4 text-[11px] uppercase tracking-[0.16em] text-white disabled:opacity-50"
              >
                {busy ? "Deleting…" : "Delete"}
              </button>
              <button
                ref={cancelDeleteRef}
                type="button"
                disabled={busy}
                onClick={() => setPendingDeleteIds(null)}
                className="min-h-11 px-4 text-[11px] uppercase tracking-[0.16em] text-[#4F5052]"
              >
                Keep it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
