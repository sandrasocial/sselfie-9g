"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import {
  X,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Download,
} from "lucide-react"
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
        videoRef.current.play()
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
        className="absolute z-[100] min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-black/80 hover:bg-black transition-colors backdrop-blur-md shadow-2xl border border-white/20"
        style={{
          top: `max(calc(env(safe-area-inset-top) + 0.5rem), 0.5rem)`,
          right: `max(calc(env(safe-area-inset-right) + 0.5rem), 0.5rem)`,
        }}
        aria-label="Close video preview"
      >
        <X size={24} className="text-white" strokeWidth={3} />
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
            <ChevronLeft size={24} className="text-white" strokeWidth={1.5} />
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
            <ChevronRight size={24} className="text-white" strokeWidth={1.5} />
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
        <div className="absolute right-3 bottom-20 flex flex-col items-center gap-6 z-10">
          <button
            onClick={() => setLiked(!liked)}
            className="flex flex-col items-center gap-1 transition-transform hover:scale-110"
          >
            <div className="w-12 h-12 rounded-full bg-stone-950/50 backdrop-blur-sm flex items-center justify-center">
              <Heart size={28} className={liked ? "text-red-500 fill-red-500" : "text-white"} strokeWidth={1.5} />
            </div>
            <span className="text-xs text-white font-medium">{liked ? "1" : ""}</span>
          </button>

          <button className="flex flex-col items-center gap-1 transition-transform hover:scale-110">
            <div className="w-12 h-12 rounded-full bg-stone-950/50 backdrop-blur-sm flex items-center justify-center">
              <MessageCircle size={28} className="text-white" strokeWidth={1.5} />
            </div>
          </button>

          <button
            onClick={handleDownload}
            className="flex flex-col items-center gap-1 transition-transform hover:scale-110"
          >
            <div className="w-12 h-12 rounded-full bg-stone-950/50 backdrop-blur-sm flex items-center justify-center">
              <Download size={28} className="text-white" strokeWidth={1.5} />
            </div>
          </button>

          <button
            onClick={() => onDelete(currentVideo.id)}
            className="flex flex-col items-center gap-1 transition-transform hover:scale-110"
          >
            <div className="w-12 h-12 rounded-full bg-red-500/20 backdrop-blur-sm flex items-center justify-center">
              <Trash2 size={28} className="text-red-400" strokeWidth={1.5} />
            </div>
          </button>

          <button
            onClick={toggleMute}
            className="flex flex-col items-center gap-1 transition-transform hover:scale-110"
          >
            <div className="w-12 h-12 rounded-full bg-stone-950/50 backdrop-blur-sm flex items-center justify-center">
              {isMuted ? (
                <VolumeX size={28} className="text-white" strokeWidth={1.5} />
              ) : (
                <Volume2 size={28} className="text-white" strokeWidth={1.5} />
              )}
            </div>
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
            <button className="ml-auto text-white">
              <MoreHorizontal size={20} />
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
