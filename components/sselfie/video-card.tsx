"use client"

import type React from "react"

import LoadingSpinner from "./loading-spinner"
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
      <div className="rounded-2xl p-6 shadow-xl border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] backdrop-blur-[20px]">
        <div className="flex items-center gap-4 mb-4">
          <LoadingSpinner size="md" className="text-stone-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[#ffffff] mb-1">Generating Video</p>
            <p className="text-xs text-[#e5e5e5]">{progress || 0}% complete</p>
          </div>
        </div>
        <div className="w-full rounded-full h-2 overflow-hidden bg-[rgba(255,255,255,0.12)]">
          <div className="h-full transition-all duration-300 bg-[#ffffff]" style={{ width: `${progress || 0}%` }} />
        </div>
        {motionPrompt && <p className="text-xs text-[#e5e5e5] mt-3 leading-relaxed">{motionPrompt}</p>}
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-xl group border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] backdrop-blur-[20px]">
      <div className="relative aspect-[9/16] bg-[rgba(255,255,255,0.06)]">
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
          <div className="px-5 py-2 bg-[rgba(10,10,10,0.84)] rounded-full border border-[rgba(255,255,255,0.2)]">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-[#ffffff]">
              {isPlaying ? "Pause" : "Play"}
            </span>
          </div>
        </button>
      </div>

      <div className="p-4">
        {motionPrompt && <p className="text-xs text-[#e5e5e5] mb-3 leading-relaxed line-clamp-2">{motionPrompt}</p>}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[rgba(255,255,255,0.1)] text-[#ffffff] rounded-xl border border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.16)] transition-all duration-300 hover:scale-105 active:scale-95"
            aria-label="Download video"
          >
            <span className="text-xs font-medium uppercase tracking-[0.18em]">Download</span>
          </button>
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.2)] text-[#e5e5e5] bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.14)] transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Delete video"
            >
              {isDeleting ? <LoadingSpinner size="sm" /> : <span className="text-xs font-medium uppercase tracking-[0.18em]">Delete</span>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
