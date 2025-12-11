"use client"

import { useState } from "react"
import Image from "next/image"
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Play, Camera } from "lucide-react"
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
  generationStatus?: string // e.g., "Analyzing motion..." or "Generating Video..."
  generationProgress?: number // 0-100
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
  generationStatus,
  generationProgress,
}: InstagramPhotoCardProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [liked, setLiked] = useState(isFavorite)
  const [isEditingCaption, setIsEditingCaption] = useState(false)
  const [captionValue, setCaptionValue] = useState(concept.description)
  const [isCreatingPhotoshoot, setIsCreatingPhotoshoot] = useState(false)

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
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-lg max-w-[470px] mx-auto">
        {/* Instagram Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-[2px]">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <span className="text-xs font-bold text-stone-950">S</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-950">sselfie</p>
              <p className="text-xs text-stone-500">{concept.category}</p>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-stone-50 rounded-full transition-colors"
              aria-label="More options"
            >
              <MoreHorizontal size={20} className="text-stone-950" />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-stone-200 py-2 w-48 z-10">
                {onAnimate && (
                  <button
                    onClick={() => {
                      handleAnimate()
                      setShowMenu(false)
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-stone-50 transition-colors"
                  >
                    Animate to Video
                  </button>
                )}
                <button
                  onClick={() => {
                    setIsViewerOpen(true)
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-stone-50 transition-colors"
                >
                  View Full Size
                </button>
                <button
                  onClick={() => {
                    onDelete()
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Delete Photo
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Instagram Image */}
        <div
          className="relative aspect-square bg-stone-100 cursor-pointer group"
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
            <div className="animate-overlay absolute inset-0 bg-stone-950/30 md:bg-stone-950/0 md:group-hover:bg-stone-950/30 transition-all duration-300 flex flex-col items-center justify-center">
              {isGenerating || isCreatingPhotoshoot ? (
                <div className="flex flex-col items-center gap-3 px-4">
                  <div className="w-16 h-16 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl">
                    <div className="w-8 h-8 border-3 border-stone-950 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <p className="text-white font-serif text-sm tracking-wide text-center">
                    {generationStatus || (isCreatingPhotoshoot ? "Analyzing Motion..." : "Generating Video...")}
                  </p>
                  {generationProgress !== undefined && (
                    <>
                      <p className="text-white/80 font-serif text-xs tracking-wide">{generationProgress}% complete</p>
                      <div className="w-32 bg-white/20 rounded-full h-1.5 overflow-hidden mt-1">
                        <div
                          className="bg-white h-full transition-all duration-300"
                          style={{ width: `${generationProgress}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-white/95 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl transform scale-100 opacity-100 md:scale-90 md:opacity-0 md:group-hover:scale-100 md:group-hover:opacity-100 transition-all duration-300">
                    <Play size={28} className="text-stone-950 ml-1" fill="currentColor" />
                  </div>
                  <p className="text-white font-serif text-sm tracking-wide opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 mt-3">
                    Click to Create B-Roll
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Instagram Action Bar */}
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleLike}
                className="hover:opacity-60 transition-opacity active:scale-90"
                aria-label={liked ? "Unlike" : "Like"}
              >
                <Heart
                  size={24}
                  className={liked ? "fill-red-500 text-red-500" : "text-stone-950"}
                  strokeWidth={liked ? 0 : 2}
                />
              </button>
              <button
                onClick={() => setIsViewerOpen(true)}
                className="hover:opacity-60 transition-opacity active:scale-90"
                aria-label="Comment"
              >
                <MessageCircle size={24} className="text-stone-950" strokeWidth={2} />
              </button>
              <button className="hover:opacity-60 transition-opacity active:scale-90" aria-label="Share">
                <Send size={24} className="text-stone-950" strokeWidth={2} />
              </button>
            </div>
            <button
              onClick={handleLike}
              className="hover:opacity-60 transition-opacity active:scale-90"
              aria-label="Save"
            >
              <Bookmark
                size={24}
                className={liked ? "fill-stone-950 text-stone-950" : "text-stone-950"}
                strokeWidth={2}
              />
            </button>
          </div>

          {/* Engagement */}
          <div className="space-y-1">
            {liked && (
              <p className="text-sm font-semibold text-stone-950">
                Liked by <span className="font-bold">you</span>
              </p>
            )}
            <div className="text-sm">
              <span className="font-semibold text-stone-950">sselfie</span>{" "}
              {!isEditingCaption ? (
                <span
                  onClick={() => setIsEditingCaption(true)}
                  className="text-stone-950 cursor-text hover:bg-stone-50 rounded px-1 -mx-1 transition-all whitespace-pre-wrap"
                  title="Click to edit caption"
                >
                  {formatCaption(concept.description)}
                </span>
              ) : (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={captionValue}
                    onChange={(e) => setCaptionValue(e.target.value)}
                    className="w-full text-sm resize-none bg-white border border-stone-300 rounded-lg px-3 py-2 focus:border-stone-950 focus:outline-none"
                    rows={4}
                    maxLength={500}
                    placeholder="Write your caption..."
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-500">{captionValue.length}/500</span>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancelCaption}
                        className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-stone-950 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveCaption}
                        disabled={captionValue === concept.description}
                        className="px-3 py-1.5 bg-stone-950 hover:bg-stone-800 text-white text-xs font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {isGenerating && <p className="text-[10px] text-stone-400 tracking-wide">AI-generated</p>}
            <p className="text-xs text-stone-400 uppercase tracking-wide">Just now</p>
          </div>

          {/* Create Photoshoot Button */}
          {onCreatePhotoshoot && (
            <button
              onClick={handleCreatePhotoshoot}
              disabled={isCreatingPhotoshoot}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-stone-800 via-stone-900 to-stone-800 hover:from-stone-900 hover:via-stone-950 hover:to-stone-900 text-white rounded-lg font-medium text-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingPhotoshoot ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Photoshoot...</span>
                </>
              ) : (
                <>
                  <Camera size={18} strokeWidth={2} />
                  <span>Create Photoshoot in This Style</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      <FullscreenImageModal
        imageUrl={imageUrl}
        imageId={Number.parseInt(imageId)}
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
