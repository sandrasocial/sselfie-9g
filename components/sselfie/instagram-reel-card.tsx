"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Heart, MessageCircle, Send, MoreVertical, Volume2, VolumeX, Play } from 'lucide-react'

interface InstagramReelCardProps {
  videoUrl: string
  motionPrompt?: string
  onDelete?: () => void
  onLike?: () => void
  isLiked?: boolean
}

export default function InstagramReelCard({
  videoUrl,
  motionPrompt,
  onDelete,
  onLike,
  isLiked = false,
}: InstagramReelCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [liked, setLiked] = useState(isLiked)
  const [showMenu, setShowMenu] = useState(false)
  const [progress, setProgress] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
  }

  const handleLike = () => {
    setLiked(!liked)
    onLike?.()
  }

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleTimeUpdate = () => {
      const progress = (video.currentTime / video.duration) * 100
      setProgress(progress)
    }

    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)
    video.addEventListener("timeupdate", handleTimeUpdate)

    return () => {
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      video.removeEventListener("timeupdate", handleTimeUpdate)
    }
  }, [])

  return (
    <div className="relative aspect-[9/16] bg-stone-950 rounded-2xl overflow-hidden shadow-2xl max-w-[400px] mx-auto group">
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/20 z-20">
        <div className="h-full bg-white transition-all duration-100" style={{ width: `${progress}%` }} />
      </div>

      {/* Video */}
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-cover"
        loop
        playsInline
        muted={isMuted}
        onClick={handlePlayPause}
      />

      {/* Play/Pause Overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-950/20 z-10">
          <button
            onClick={handlePlayPause}
            className="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
            aria-label="Play video"
          >
            <Play size={28} className="text-stone-950 ml-1" fill="currentColor" />
          </button>
        </div>
      )}

      {/* Top Right: Mute Button */}
      <button
        onClick={handleMuteToggle}
        className="absolute top-4 right-4 w-10 h-10 bg-stone-950/60 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-stone-950/80 transition-colors z-20"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <VolumeX size={18} className="text-white" /> : <Volume2 size={18} className="text-white" />}
      </button>

      {/* Right Sidebar Actions (Instagram Reel Style) */}
      <div className="absolute right-3 bottom-20 flex flex-col items-center gap-6 z-20">
        <button
          onClick={handleLike}
          className="flex flex-col items-center gap-1 hover:scale-110 transition-transform active:scale-95"
          aria-label={liked ? "Unlike" : "Like"}
        >
          <div className="w-12 h-12 bg-stone-950/60 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Heart
              size={24}
              className={liked ? "fill-red-500 text-red-500" : "text-white"}
              strokeWidth={liked ? 0 : 2}
            />
          </div>
          <span className="text-xs font-semibold text-white drop-shadow-lg">{liked ? "1" : ""}</span>
        </button>

        <button
          className="flex flex-col items-center gap-1 hover:scale-110 transition-transform active:scale-95"
          aria-label="Comment"
        >
          <div className="w-12 h-12 bg-stone-950/60 backdrop-blur-sm rounded-full flex items-center justify-center">
            <MessageCircle size={24} className="text-white" strokeWidth={2} />
          </div>
        </button>

        <button
          className="flex flex-col items-center gap-1 hover:scale-110 transition-transform active:scale-95"
          aria-label="Share"
        >
          <div className="w-12 h-12 bg-stone-950/60 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Send size={24} className="text-white" strokeWidth={2} />
          </div>
        </button>

        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex flex-col items-center gap-1 hover:scale-110 transition-transform active:scale-95 relative"
          aria-label="More options"
        >
          <div className="w-12 h-12 bg-stone-950/60 backdrop-blur-sm rounded-full flex items-center justify-center">
            <MoreVertical size={24} className="text-white" strokeWidth={2} />
          </div>
          {showMenu && (
            <div className="absolute right-full mr-2 bottom-0 bg-white rounded-xl shadow-2xl border border-stone-200 py-2 w-48">
              <button
                onClick={() => {
                  window.open(videoUrl, '_blank')
                  setShowMenu(false)
                }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-stone-50 transition-colors text-stone-950"
              >
                View Fullscreen
              </button>
              <button
                onClick={() => {
                  const a = document.createElement("a")
                  a.href = videoUrl
                  a.download = `sselfie-reel-${Date.now()}.mp4`
                  a.click()
                  setShowMenu(false)
                }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-stone-50 transition-colors text-stone-950"
              >
                Download Video
              </button>
              {onDelete && (
                <button
                  onClick={() => {
                    onDelete()
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Delete Video
                </button>
              )}
            </div>
          )}
        </button>
      </div>

      {/* Bottom Overlay (Username + Caption) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-stone-950/80 via-stone-950/40 to-transparent z-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-[2px]">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
              <span className="text-xs font-bold text-stone-950">S</span>
            </div>
          </div>
          <span className="text-sm font-semibold text-white drop-shadow-lg">sselfie</span>
        </div>
        {motionPrompt && (
          <p className="text-sm text-white drop-shadow-lg line-clamp-2 leading-relaxed">{motionPrompt}</p>
        )}
      </div>
    </div>
  )
}

export { InstagramReelCard }
