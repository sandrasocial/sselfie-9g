"use client"

import type React from "react"

import { Play, Download, Trash2, Loader2 } from "lucide-react"
import { useState, useRef, useEffect } from "react"

interface VideoCardProps {
  videoUrl: string
  imageSource?: string
  motionPrompt?: string
  status?: string
  progress?: number
  onDelete?: () => void
}

export default function VideoCard({ videoUrl, imageSource, motionPrompt, status, progress, onDelete }: VideoCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handlePlayPause = (e?: React.MouseEvent | React.TouchEvent) => {
    e?.stopPropagation()
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleDownload = async () => {
    try {
      const response = await fetch(videoUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `sselfie-video-${Date.now()}.mp4`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("[v0] Error downloading video:", error)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setIsDeleting(true)
    try {
      await onDelete()
    } catch (error) {
      console.error("[v0] Error deleting video:", error)
      setIsDeleting(false)
    }
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => setIsPlaying(false)

    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)
    video.addEventListener("ended", handleEnded)

    return () => {
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      video.removeEventListener("ended", handleEnded)
    }
  }, [])

  if (status === "processing") {
    return (
      <div className="bg-white/50 backdrop-blur-xl border border-white/70 rounded-2xl p-6 shadow-xl shadow-stone-900/10">
        <div className="flex items-center gap-4 mb-4">
          <Loader2 size={20} className="text-stone-600 animate-spin" />
          <div className="flex-1">
            <p className="text-sm font-medium text-stone-950 mb-1">Generating Video...</p>
            <p className="text-xs text-stone-600">{progress || 0}% complete</p>
          </div>
        </div>
        <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
          <div className="bg-stone-950 h-full transition-all duration-300" style={{ width: `${progress || 0}%` }} />
        </div>
        {motionPrompt && <p className="text-xs text-stone-600 mt-3 leading-relaxed">{motionPrompt}</p>}
      </div>
    )
  }

  return (
    <div className="bg-white/50 backdrop-blur-xl border border-white/70 rounded-2xl overflow-hidden shadow-xl shadow-stone-900/10 group">
      <div className="relative aspect-[9/16] bg-stone-100">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-cover"
          loop
          playsInline
          webkit-playsinline="true"
          preload="metadata"
          onClick={handlePlayPause}
        />
        <button
          onClick={handlePlayPause}
          onTouchEnd={(e) => {
            e.preventDefault()
            handlePlayPause(e)
          }}
          className="absolute inset-0 flex items-center justify-center bg-stone-950/20 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300"
          aria-label={isPlaying ? "Pause video" : "Play video"}
        >
          <div className="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl">
            {isPlaying ? (
              <div className="flex gap-1.5">
                <div className="w-1.5 h-6 bg-stone-950 rounded-full" />
                <div className="w-1.5 h-6 bg-stone-950 rounded-full" />
              </div>
            ) : (
              <Play size={24} className="text-stone-950 ml-1" fill="currentColor" />
            )}
          </div>
        </button>
      </div>

      <div className="p-4">
        {motionPrompt && <p className="text-xs text-stone-600 mb-3 leading-relaxed line-clamp-2">{motionPrompt}</p>}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-950 text-white rounded-xl hover:bg-stone-800 transition-all duration-300 hover:scale-105 active:scale-95"
            aria-label="Download video"
          >
            <Download size={14} strokeWidth={2.5} />
            <span className="text-xs font-medium tracking-wide">Download</span>
          </button>
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2.5 bg-white/60 backdrop-blur-xl border border-white/80 rounded-xl hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Delete video"
            >
              {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} strokeWidth={2.5} />}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
