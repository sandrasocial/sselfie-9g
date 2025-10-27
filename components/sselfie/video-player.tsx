"use client"

import { useState } from "react"
import { Play, Download, Trash2 } from "lucide-react"

interface VideoPlayerProps {
  videoUrl: string
  videoId: number
  title: string
  onDelete?: () => void
}

export default function VideoPlayer({ videoUrl, videoId, title, onDelete }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  const handleDownload = async () => {
    try {
      const response = await fetch(videoUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${title.replace(/\s+/g, "-").toLowerCase()}-video.mp4`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("[v0] Error downloading video:", error)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this video?")) return

    try {
      const response = await fetch("/api/maya/delete-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      })

      if (!response.ok) throw new Error("Failed to delete video")

      onDelete?.()
    } catch (error) {
      console.error("[v0] Error deleting video:", error)
    }
  }

  return (
    <div className="bg-white/50 backdrop-blur-2xl border border-white/70 rounded-[1.75rem] p-5 sm:p-6 transition-all duration-300 hover:bg-white/70 hover:border-white/90 shadow-xl shadow-stone-900/10">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-stone-100 backdrop-blur-xl rounded-full border border-stone-200 shadow-inner">
            <span className="text-[10px] sm:text-xs tracking-wider uppercase font-semibold text-stone-950">Video</span>
          </div>
        </div>

        <div className="aspect-[9/16] bg-stone-950 rounded-[1.5rem] overflow-hidden relative group">
          <video
            src={videoUrl}
            className="w-full h-full object-cover"
            controls
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
              <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-2xl">
                <Play className="w-8 h-8 text-stone-950 ml-1" fill="currentColor" />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          <button
            onClick={handleDownload}
            className="px-4 sm:px-5 py-3 sm:py-4 bg-stone-950 text-white rounded-[1.25rem] font-semibold text-xs sm:text-sm transition-all duration-300 hover:shadow-2xl hover:shadow-stone-950/40 hover:scale-[1.02] active:scale-[0.98] min-h-[48px] sm:min-h-[52px] flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            onClick={handleDelete}
            className="px-4 sm:px-5 py-3 sm:py-4 bg-white/50 backdrop-blur-2xl text-stone-950 border border-white/60 rounded-[1.25rem] font-semibold text-xs sm:text-sm transition-all duration-300 hover:bg-white/70 hover:border-white/80 hover:scale-[1.02] active:scale-[0.98] min-h-[48px] sm:min-h-[52px] shadow-lg shadow-stone-900/10 flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
