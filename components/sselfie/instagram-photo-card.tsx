"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import FullscreenImageModal from "./fullscreen-image-modal"
import type { ConceptData } from "./types"

interface InstagramPhotoCardProps {
  concept: ConceptData
  imageUrl: string
  imageId: string
  isGenerating?: boolean
  onFavoriteToggle: () => void
  onDelete: () => void
  onAnimate?: () => void
  isFavorite: boolean
  onCaptionUpdate?: (newCaption: string) => void
  showAnimateOverlay?: boolean
  onCreatePhotoshoot?: () => void
  onCreateProPhotoshoot?: () => void
  studioProMode?: boolean
  isCreatingProPhotoshoot?: boolean
  generationStatus?: string // e.g., "Analyzing motion..." or "Generating Video..."
  generationProgress?: number // 0-100
  animateOverlayStyle?: "play" | "create"
}

export default function InstagramPhotoCard({
  concept,
  imageUrl,
  imageId,
  isGenerating,
  onFavoriteToggle,
  onDelete,
  onAnimate,
  isFavorite,
  onCaptionUpdate,
  showAnimateOverlay = false,
  onCreatePhotoshoot,
  onCreateProPhotoshoot,
  studioProMode = false,
  isCreatingProPhotoshoot = false,
  generationStatus,
  generationProgress,
  animateOverlayStyle = "play",
}: InstagramPhotoCardProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [liked, setLiked] = useState(isFavorite)
  const [isEditingCaption, setIsEditingCaption] = useState(false)
  const [captionValue, setCaptionValue] = useState(concept.description)
  const [isCreatingPhotoshoot, setIsCreatingPhotoshoot] = useState(false)
  // Note: isCreatingProPhotoshoot comes from props, no local state needed

  // Sync liked state with isFavorite prop
  useEffect(() => {
    setLiked(isFavorite)
  }, [isFavorite])

  const formatCaption = (text: string) => {
    return text.split("\n").map((line, index, array) => (
      <span key={index}>
        {line}
        {index < array.length - 1 && <br />}
      </span>
    ))
  }

  const handleLike = () => {
    setLiked(!liked)
    onFavoriteToggle()
  }

  const handleSaveCaption = () => {
    if (onCaptionUpdate) {
      onCaptionUpdate(captionValue)
    }
    setIsEditingCaption(false)
  }

  const handleCancelCaption = () => {
    setCaptionValue(concept.description)
    setIsEditingCaption(false)
  }

  const handleCreatePhotoshoot = async () => {
    if (!onCreatePhotoshoot) return
    setIsCreatingPhotoshoot(true)
    setShowMenu(false)
    try {
      await onCreatePhotoshoot()
    } finally {
      setIsCreatingPhotoshoot(false)
    }
  }

  const handleCreateProPhotoshoot = async () => {
    if (!onCreateProPhotoshoot) return
    setShowMenu(false)
    // Note: isCreatingProPhotoshoot state is managed by parent component via prop
    await onCreateProPhotoshoot()
  }

  const handleAnimate = async () => {
    if (!onAnimate) return
    setIsCreatingPhotoshoot(true)
    try {
      await onAnimate()
    } finally {
      setIsCreatingPhotoshoot(false)
    }
  }

  return (
    <>
      <div className="bg-stone-dark border border-[color:var(--div-dark)] rounded-[20px] overflow-hidden max-w-[470px] mx-auto">
        {/* Instagram Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[color:var(--glass-bg)] border-b border-[color:var(--div-dark)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full border border-[color:var(--div-dark)] bg-[color:var(--glass-bg)] p-[2px]">
              <div className="w-full h-full rounded-full bg-stone-dark flex items-center justify-center">
                <span className="text-xs font-semibold text-brand-porcelain">S</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-brand-porcelain">sselfie</p>
              <p className="text-xs text-stone">{concept.category}</p>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="rounded-full border border-[color:var(--div-dark)] px-3 py-1.5 hover:bg-[color:var(--glass-bg)] transition-colors"
              aria-label="More options"
            >
              <span className="text-[10px] uppercase tracking-[0.2em] text-stone">Menu</span>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-stone-dark rounded-xl shadow-2xl border border-[color:var(--div-dark)] py-2 w-48 z-10">
                {onAnimate && (
                  <button
                    onClick={() => {
                      handleAnimate()
                      setShowMenu(false)
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-stone hover:bg-[color:var(--glass-bg)] transition-colors"
                  >
                    Animate to Video
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsViewerOpen(true)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-stone hover:bg-[color:var(--glass-bg)] transition-colors"
                >
                  View Full Size
                </button>
                <button
                  onClick={() => {
                    onDelete()
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Delete Photo
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Instagram Image */}
        <div
          className="relative aspect-square bg-stone-dark cursor-pointer group"
          onClick={(e) => {
            if (showAnimateOverlay && onAnimate && (e.target as HTMLElement).closest(".animate-overlay")) {
              handleAnimate()
            } else {
              setIsViewerOpen(true)
            }
          }}
        >
          <Image
            src={imageUrl || "/placeholder.svg"}
            alt={concept.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 470px"
          />

          {showAnimateOverlay && onAnimate && (
            <div className="animate-overlay absolute inset-0 bg-[rgba(10, 10, 10, 0.40)] md:bg-[rgba(10, 10, 10, 0.00)] md:group-hover:bg-[rgba(10, 10, 10, 0.40)] transition-all duration-300 flex flex-col items-center justify-center">
              {isGenerating || isCreatingPhotoshoot ? (
                <div className="flex flex-col items-center gap-3 px-4">
                  <div className="w-16 h-16 bg-[color:var(--glass-bg)] backdrop-blur-sm rounded-full flex items-center justify-center border border-[color:var(--div-dark)]">
                    <div className="w-8 h-8 border-2 border-brand-porcelain border-t-transparent rounded-full animate-spin" />
                  </div>
                  <p className="text-brand-porcelain font-light text-[11px] tracking-[0.28em] uppercase text-center">
                    {generationStatus || (isCreatingPhotoshoot ? "Analyzing Motion..." : "Generating Video...")}
                  </p>
                  {generationProgress !== undefined && (
                    <>
                      <p className="text-stone font-light text-xs tracking-wide">{generationProgress}% complete</p>
                      <div className="w-32 bg-[color:var(--glass-bg)] rounded-full h-1.5 overflow-hidden mt-1">
                        <div
                          className="bg-stone h-full transition-all duration-300"
                          style={{ width: `${generationProgress}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="px-4 py-2 rounded-full border border-[color:var(--div-dark)] bg-[rgba(10, 10, 10, 0.50)] backdrop-blur-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
                  {animateOverlayStyle === "create" ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-white text-2xl leading-none">✦</span>
                      <span className="text-white text-[11px] tracking-[0.22em] uppercase font-medium">Animate -&gt;</span>
                    </div>
                  ) : (
                    <p className="text-brand-porcelain text-[11px] tracking-[0.28em] uppercase font-medium text-center">
                      Click to Create B-Roll
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Instagram Action Bar */}
        <div className="px-4 py-3 space-y-4 bg-[color:var(--glass-bg)] backdrop-blur-sm border-t border-[color:var(--div-dark)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsViewerOpen(true)}
                className="text-[10px] uppercase tracking-[0.2em] text-stone hover:text-brand-porcelain transition-colors"
                aria-label="Download"
              >
                Download
              </button>
              <button
                onClick={handleLike}
                className="text-[10px] uppercase tracking-[0.2em] text-stone hover:text-brand-porcelain transition-colors"
                aria-label={liked ? "Unlike" : "Like"}
              >
                {liked ? "Favourited" : "Favourite"}
              </button>
              <button
                onClick={handleCreatePhotoshoot}
                disabled={!onCreatePhotoshoot || isCreatingPhotoshoot || isCreatingProPhotoshoot}
                className="text-[10px] uppercase tracking-[0.2em] text-stone hover:text-brand-porcelain transition-colors disabled:opacity-50"
                aria-label="Create Photoshoot"
              >
                Photoshoot
              </button>
            </div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-stone">{concept.category}</span>
          </div>

          {/* Engagement */}
          <div className="space-y-1">
            {liked && (
              <p className="text-sm font-semibold text-brand-porcelain">
                Liked by <span className="font-bold">you</span>
              </p>
            )}
            <div className="text-sm">
              <span className="font-semibold text-brand-porcelain">sselfie</span>{" "}
              {!isEditingCaption ? (
                <span
                  onClick={() => setIsEditingCaption(true)}
                  className={`cursor-text hover:bg-[color:var(--glass-bg)] rounded px-1 -mx-1 transition-all whitespace-pre-wrap ${concept.description ? "text-stone" : "text-stone-dark italic"}`}
                  title="Click to edit caption"
                >
                  {concept.description ? formatCaption(concept.description) : "Write your caption..."}
                </span>
              ) : (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={captionValue}
                    onChange={(e) => setCaptionValue(e.target.value)}
                    className="w-full text-sm resize-none bg-[color:var(--glass-bg)] border border-[color:var(--div-dark)] rounded-lg px-3 py-2 text-brand-porcelain focus:border-[color:var(--div-dark)] focus:outline-none"
                    rows={4}
                    maxLength={500}
                    placeholder="Write your caption..."
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone">{captionValue.length}/500</span>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancelCaption}
                        className="px-3 py-1.5 text-xs font-medium text-stone hover:text-brand-porcelain transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveCaption}
                        disabled={captionValue === concept.description}
                        className="px-3 py-1.5 bg-[color:var(--glass-bg)] hover:bg-[color:var(--glass-bg)] text-brand-porcelain text-xs font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {isGenerating && <p className="text-[10px] text-stone tracking-wide uppercase">AI-generated</p>}
            <p className="text-xs text-stone uppercase tracking-wide">Just now</p>
          </div>

          {/* Create Photoshoot Buttons */}
          <div className="flex flex-col gap-2">
            {onCreatePhotoshoot && (
              <button
                onClick={handleCreatePhotoshoot}
                disabled={isCreatingPhotoshoot || isCreatingProPhotoshoot}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[color:var(--glass-bg)] hover:bg-[color:var(--glass-bg)] border border-[color:var(--div-dark)] text-brand-porcelain rounded-[20px] font-medium text-[11px] tracking-[0.2em] uppercase transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingPhotoshoot ? (
                  <>
                    <div className="w-4 h-4 border-2 border-brand-porcelain border-t-transparent rounded-full animate-spin" />
                    <span>Creating Photoshoot</span>
                  </>
                ) : (
                  <span>Create Full Photoshoot -&gt;</span>
                )}
              </button>
            )}
            {onCreatePhotoshoot && !isCreatingPhotoshoot && (
              <p className="text-[11px] text-stone text-center uppercase tracking-[0.14em]">6-9 matching photos, ~3 min</p>
            )}
            {onCreateProPhotoshoot && studioProMode && (
              <button
                onClick={handleCreateProPhotoshoot}
                disabled={isCreatingPhotoshoot || isCreatingProPhotoshoot}
                className="w-full flex items-center justify-center px-4 py-2.5 bg-[color:var(--glass-bg)] hover:bg-[color:var(--glass-bg)] border border-[color:var(--div-dark)] text-brand-porcelain rounded-[20px] font-medium text-[11px] tracking-[0.2em] uppercase transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingProPhotoshoot ? (
                  <>
                    <div className="w-4 h-4 border-2 border-brand-porcelain border-t-transparent rounded-full animate-spin" />
                    <span>Creating Pro Photoshoot...</span>
                  </>
                ) : (
                  <span>Create Pro Photoshoot</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      <FullscreenImageModal
        imageUrl={imageUrl}
        imageId={imageId}
        title={concept.title}
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        isFavorite={isFavorite}
        onFavoriteToggle={onFavoriteToggle}
        onDelete={onDelete}
      />
    </>
  )
}

export { InstagramPhotoCard }
