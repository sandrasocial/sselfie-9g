"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface GeneratedVideo {
  id: number
  user_id: string
  image_id: number | null
  image_source: string | null
  video_url: string
  motion_prompt: string | null
  status: string
  progress: number
  created_at: string
  completed_at: string | null
}

interface InstagramReelPreviewProps {
  video: GeneratedVideo
  videos: GeneratedVideo[]
  onClose: () => void
  onDelete: (videoId: number) => void
  userName?: string
  userAvatar?: string
}

export function InstagramReelPreview({
  video,
  videos,
  onClose,
  onDelete,
  userName = "sselfie",
  userAvatar = "/placeholder.svg",
}: InstagramReelPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(videos.findIndex((v) => v.id === video.id))
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(true)
  const [liked, setLiked] = useState(false)
  const [mounted, setMounted] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const currentVideo = videos[currentIndex]
  const userInitial = userName.charAt(0).toUpperCase()

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    // Lock body scroll when modal is open
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [onClose])

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        void videoRef.current.play().catch((error) => {
          console.error("[v0] Preview video play error:", error)
        })
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying, currentIndex])

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : videos.length - 1))
    setIsPlaying(true)
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < videos.length - 1 ? prev + 1 : 0))
    setIsPlaying(true)
  }

  const handleVideoClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsPlaying(!isPlaying)
  }

  const handleVideoTouch = (e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
    }
  }

  const handleDownload = () => {
    const a = document.createElement("a")
    a.href = currentVideo.video_url
    a.download = `sselfie-video-${currentVideo.id}.mp4`
    a.target = "_blank"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  if (!mounted) return null

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] bg-stone-950 flex items-center justify-center p-4"
      style={{
        paddingTop: `max(env(safe-area-inset-top), 1rem)`,
        paddingBottom: `max(env(safe-area-inset-bottom), 1rem)`,
        paddingLeft: `max(env(safe-area-inset-left), 1rem)`,
        paddingRight: `max(env(safe-area-inset-right), 1rem)`,
      }}
    >
      {/* Close button - top right corner, always visible */}
      <button
        onClick={onClose}
        className="absolute z-[100] min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-black/80 hover:bg-black transition-colors backdrop-blur-md shadow-2xl border border-white/20 px-3 text-[10px] uppercase tracking-[0.2em] text-white"
        style={{
          top: `max(calc(env(safe-area-inset-top) + 0.5rem), 0.5rem)`,
          right: `max(calc(env(safe-area-inset-right) + 0.5rem), 0.5rem)`,
        }}
        aria-label="Close video preview"
      >
        Close
      </button>

      {/* Navigation */}
      {videos.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute z-20 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-stone-950/80 hover:bg-stone-950/90 transition-colors backdrop-blur-sm"
            style={{
              left: `max(env(safe-area-inset-left), 1rem)`,
              top: "50%",
              transform: "translateY(-50%)",
            }}
            aria-label="Previous video"
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-white">Prev</span>
          </button>
          <button
            onClick={handleNext}
            className="absolute z-20 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-stone-950/80 hover:bg-stone-950/90 transition-colors backdrop-blur-sm"
            style={{
              right: `max(env(safe-area-inset-right), 1rem)`,
              top: "50%",
              transform: "translateY(-50%)",
            }}
            aria-label="Next video"
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-white">Next</span>
          </button>
        </>
      )}

      {/* Instagram Reel Style - with proper constraints */}
      <div className="relative w-full max-w-md aspect-[9/16] bg-stone-950 rounded-xl overflow-hidden flex flex-col max-h-[calc(100vh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem)]">
        {/* Video */}
        <div className="relative flex-1 overflow-hidden">
          <video
            ref={videoRef}
            src={currentVideo.video_url}
            className="w-full h-full object-cover cursor-pointer"
            loop
            muted={isMuted}
            playsInline
            autoPlay
            onClick={handleVideoClick}
            onTouchEnd={handleVideoTouch}
          />
        </div>

        {/* Top gradient overlay */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-stone-950/80 to-transparent pointer-events-none" />

        {/* Bottom gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-stone-950/90 to-transparent pointer-events-none" />

        {/* Right sidebar actions */}
        <div className="absolute right-3 bottom-20 flex flex-col items-end gap-2 z-10">
          <button
            onClick={() => setLiked(!liked)}
            className="px-3 py-1.5 rounded-full bg-stone-950/50 border border-[rgba(255,255,255,0.2)] text-[10px] tracking-[0.2em] uppercase text-white transition-colors hover:bg-stone-950/80"
          >
            {liked ? "Favourited" : "Favourite"}
          </button>

          <button className="px-3 py-1.5 rounded-full bg-stone-950/50 border border-[rgba(255,255,255,0.2)] text-[10px] tracking-[0.2em] uppercase text-white transition-colors hover:bg-stone-950/80">
            Preview
          </button>

          <button
            onClick={handleDownload}
            className="px-3 py-1.5 rounded-full bg-stone-950/50 border border-[rgba(255,255,255,0.2)] text-[10px] tracking-[0.2em] uppercase text-white transition-colors hover:bg-stone-950/80"
          >
            Download
          </button>

          <button
            onClick={() => onDelete(currentVideo.id)}
            className="px-3 py-1.5 rounded-full bg-red-500/20 border border-red-400/30 text-[10px] tracking-[0.2em] uppercase text-red-300 transition-colors hover:bg-red-500/30"
          >
            Delete
          </button>

          <button
            onClick={toggleMute}
            className="px-3 py-1.5 rounded-full bg-stone-950/50 border border-[rgba(255,255,255,0.2)] text-[10px] tracking-[0.2em] uppercase text-white transition-colors hover:bg-stone-950/80"
          >
            {isMuted ? "Muted" : "Audio"}
          </button>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-10 h-10 border-2 border-white">
              <AvatarImage src={userAvatar || "/placeholder.svg"} alt={userName} />
              <AvatarFallback className="bg-stone-700 text-white text-sm font-medium">{userInitial}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-white">{userName}</span>
            <button className="ml-auto rounded-full border border-white/20 px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] text-white">
              Menu
            </button>
          </div>

          {currentVideo.motion_prompt && (
            <p className="text-sm text-white mb-2 line-clamp-3">{currentVideo.motion_prompt}</p>
          )}

          {videos.length > 1 && (
            <div className="text-xs text-white/60 text-center">
              {currentIndex + 1} of {videos.length}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
