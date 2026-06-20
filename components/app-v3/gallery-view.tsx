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

function downloadAsset(asset: AppV3GalleryAsset) {
  const anchor = document.createElement("a")
  anchor.href = asset.url
  anchor.target = "_blank"
  anchor.rel = "noreferrer"
  anchor.download = `sselfie-${asset.id}.${asset.kind === "video" ? "mp4" : "png"}`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

function assetLabel(asset: AppV3GalleryAsset): string {
  if (asset.kind === "video") return "Video"
  if (asset.contentType === "photoshoot") return "Shoot"
  if (asset.contentType === "reel-cover") return "Cover"
  if (asset.contentType === "story-slide") return "Story"
  if (asset.contentType === "carousel") return "Carousel"
  return "Photo"
}

const AssetTile = memo(function AssetTile({
  asset,
  index,
  selected,
  selectionMode,
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
  onOpen: (asset: AppV3GalleryAsset, index: number) => void
  onToggleSelect: (id: string) => void
  onFavorite: (asset: AppV3GalleryAsset) => void
  onDelete: (asset: AppV3GalleryAsset) => void
  onDownload: (asset: AppV3GalleryAsset) => void
  onMakeMotion?: (url: string) => void
}) {
  const isVideo = asset.kind === "video"
  return (
    <div className="group relative overflow-hidden rounded-[6px] border border-[#C5C6C8]/50 bg-[#F1F2F2]">
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
                className="object-cover opacity-80"
                sizes="(max-width:640px) 45vw, 240px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#E7E8E8]">
                <Film size={26} className="text-[#818283]" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-[#0D0E10]">
                <Play size={18} fill="currentColor" />
              </span>
            </div>
          </>
        ) : (
          <Image
            src={asset.url}
            alt={asset.prompt || `Gallery image ${index + 1}`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width:640px) 45vw, 240px"
          />
        )}
        <span className="absolute left-2 top-2 rounded-[4px] bg-white/90 px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-[#4F5052]">
          {assetLabel(asset)}
        </span>
        {selectionMode && (
          <span
            className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border ${
              selected
                ? "border-[#0D0E10] bg-[#0D0E10] text-white"
                : "border-white bg-white/80 text-[#818283]"
            }`}
          >
            {selected && <Check size={15} />}
          </span>
        )}
      </button>

      <div className="flex items-center justify-between gap-1 bg-white px-2 py-2">
        <div className="flex min-w-0 items-center gap-1">
          {asset.canFavorite && (
            <button
              type="button"
              onClick={() => onFavorite(asset)}
              aria-label={asset.isFavorite ? "Remove favorite" : "Favorite"}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#4F5052] hover:bg-[#F1F2F2]"
            >
              <Heart
                size={15}
                className={asset.isFavorite ? "fill-[#0D0E10] text-[#0D0E10]" : ""}
              />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDownload(asset)}
            aria-label="Download"
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#4F5052] hover:bg-[#F1F2F2]"
          >
            <Download size={15} />
          </button>
          {asset.canDelete && (
            <button
              type="button"
              onClick={() => onDelete(asset)}
              aria-label="Delete"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#4F5052] hover:bg-[#F1F2F2]"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
        {asset.kind === "image" && onMakeMotion && (
          <button
            type="button"
            onClick={() => onMakeMotion(asset.url)}
            className="min-h-8 rounded-[4px] bg-[#0D0E10] px-2.5 text-[9px] uppercase tracking-[0.12em] text-white"
          >
            Move
          </button>
        )}
      </div>
    </div>
  )
})

export function GalleryView({ onMakeMotion }: { onMakeMotion?: (url: string) => void }) {
  const [assets, setAssets] = useState<AppV3GalleryAsset[] | null>(null)
  const [counts, setCounts] = useState<AppV3GalleryCounts | null>(null)
  const [filter, setFilter] = useState<GalleryFilter>("all")
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [previewVideo, setPreviewVideo] = useState<AppV3GalleryAsset | null>(null)
  const [busy, setBusy] = useState(false)

  const displayedAssets = useMemo(() => filterAssets(assets ?? [], filter), [assets, filter])
  const displayedImages = useMemo(
    () => displayedAssets.filter(asset => asset.kind === "image"),
    [displayedAssets]
  )
  const lightboxImages = useMemo(() => displayedImages.map(asset => asset.url), [displayedImages])

  const loadGallery = useCallback(() => {
    fetch("/api/app-v3/gallery")
      .then(r => r.json())
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
    const confirmed = window.confirm(
      ids.length === 1 ? "Delete this asset?" : `Delete ${ids.length} selected assets?`
    )
    if (!confirmed) return
    setBusy(true)
    try {
      const res = await fetch("/api/app-v3/gallery/assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetIds: ids }),
      })
      if (!res.ok) throw new Error("Delete failed")
      setAssets(prev => prev?.filter(asset => !ids.includes(asset.id)) ?? prev)
      clearSelection()
      loadGallery()
    } catch {
      setError("Couldn't delete the selected assets. Try again.")
    } finally {
      setBusy(false)
    }
  }

  function bulkDownload() {
    const selected = displayedAssets.filter(asset => selectedIds.has(asset.id))
    selected.forEach((asset, index) => {
      window.setTimeout(() => downloadAsset(asset), index * 180)
    })
    clearSelection()
  }

  const hasAssets = Boolean(assets && assets.length > 0)

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
            className="min-h-10 rounded-[4px] border border-[#C5C6C8] bg-white px-3 text-[10px] uppercase tracking-[0.16em] text-[#4F5052]"
          >
            {selectionMode ? "Done" : "Select"}
          </button>
        )}
      </header>

      <div className="-mx-4 mb-5 overflow-x-auto px-4 [scrollbar-width:none]">
        <div className="flex min-w-max gap-2">
          {FILTERS.map(option => {
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
                className={`min-h-9 rounded-full border px-3 text-[10px] uppercase tracking-[0.14em] ${
                  active
                    ? "border-[#0D0E10] bg-[#0D0E10] text-white"
                    : "border-[#C5C6C8] bg-white text-[#4F5052]"
                }`}
              >
                {option.label}
                {typeof count === "number" ? ` ${count}` : ""}
              </button>
            )
          })}
        </div>
      </div>

      {selectionMode && (
        <div className="sticky top-3 z-20 mb-4 flex items-center justify-between gap-3 rounded-[6px] border border-[#C5C6C8] bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
          <span className="text-[12px] text-[#4F5052]">{selectedIds.size} selected</span>
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
              onClick={() => deleteAssets(Array.from(selectedIds))}
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
      {error && <p className="mb-4 text-[13px] text-[#282728]">{error}</p>}
      {assets && assets.length === 0 && (
        <div className="rounded-[8px] border border-dashed border-[#C5C6C8] bg-white p-8 text-center">
          <ImageIcon size={24} className="mx-auto mb-3 text-[#818283]" />
          <p className="text-[15px] text-[#282728]">Nothing here yet.</p>
          <p className="mt-1 text-[13px] text-[#818283]">
            Create your first shot and it&apos;ll live here.
          </p>
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
              onOpen={openAsset}
              onToggleSelect={toggleSelected}
              onFavorite={toggleFavorite}
              onDelete={asset => deleteAssets([asset.id])}
              onDownload={downloadAsset}
              onMakeMotion={onMakeMotion}
            />
          ))}
        </div>
      )}

      {lightboxIndex !== null && lightboxImages.length > 0 && (
        <ImageLightbox
          images={lightboxImages}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {previewVideo && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-[8px] bg-white">
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
                className="flex min-h-10 items-center gap-2 rounded-[4px] bg-[#0D0E10] px-3 text-[10px] uppercase tracking-[0.14em] text-white"
              >
                <Download size={14} />
                Download
              </button>
              <button
                type="button"
                onClick={() => setPreviewVideo(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[#4F5052]"
                aria-label="Close video"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
