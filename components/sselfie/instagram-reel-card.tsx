"use client"

import type React from "react"

import { useState, useRef, useEffect, useMemo } from "react"

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
  const [isDownloading, setIsDownloading] = useState(false)
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const normalizedVideoUrl = useMemo(() => {
    const raw = (videoUrl || "").trim()
    if (!raw) return ""
    if (raw.startsWith("//")) return `https:${raw}`
    return raw
  }, [videoUrl])

  const handlePlayPause = async (e?: React.MouseEvent | React.TouchEvent) => {
    e?.stopPropagation()

    const video = videoRef.current
    if (!video) return

    try {
      if (!video.paused) {
        video.pause()
        return
      }

      await video.play()
      setVideoError(null)
    } catch (error: any) {
      // Retry once with muted mode to satisfy strict autoplay policies on mobile browsers.
      try {
        video.muted = true
        setIsMuted(true)
        await video.play()
        setVideoError(null)
      } catch (retryError: any) {
        console.error("[v0] Error playing video:", retryError || error)
        setVideoError((retryError || error)?.message || "Failed to play video")
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

  const handleDownload = async () => {
    setIsDownloading(true)
    setShowMenu(false)

    try {
      const response = await fetch(normalizedVideoUrl)
      if (!response.ok) throw new Error("Failed to fetch video")

      const blob = await response.blob()

      if (navigator.share && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        try {
          const file = new File([blob], `sselfie-reel-${Date.now()}.mp4`, { type: "video/mp4" })
          await navigator.share({
            files: [file],
            title: "sselfie Video",
            text: motionPrompt || "Check out this video from sselfie!",
          })
          setIsDownloading(false)
          return
        } catch {
          // Fall through to direct download.
        }
      }

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `sselfie-reel-${Date.now()}.mp4`
      a.style.display = "none"

      document.body.appendChild(a)
      a.click()

      setTimeout(() => {
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        setIsDownloading(false)
      }, 100)
    } catch (error) {
      console.error("[v0] Error downloading video:", error)
      setIsDownloading(false)

      const a = document.createElement("a")
      a.href = normalizedVideoUrl
      a.download = `sselfie-reel-${Date.now()}.mp4`
      a.target = "_blank"
      a.click()
    }
  }

  useEffect(() => {
    setIsVideoReady(false)
    setVideoError(null)
    setIsPlaying(false)

    if (!normalizedVideoUrl || (!normalizedVideoUrl.startsWith("http://") && !normalizedVideoUrl.startsWith("https://"))) {
      console.error("[v0] Invalid video URL:", normalizedVideoUrl)
      setVideoError("Invalid video URL")
      return
    }

    if (videoRef.current) {
      videoRef.current.load()
    }
  }, [normalizedVideoUrl])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlay = () => {
      setIsPlaying(true)
      setVideoError(null)
    }
    const handlePause = () => setIsPlaying(false)
    const handleTimeUpdate = () => {
      if (video.duration) {
        const nextProgress = (video.currentTime / video.duration) * 100
        setProgress(nextProgress)
      }
    }
    const handleLoadedMetadata = () => {
      setIsVideoReady(true)
      setVideoError(null)
    }
    const handleLoadedData = () => {
      setIsVideoReady(video.readyState >= 2)
    }
    const handleCanPlay = () => {
      setIsVideoReady(true)
      setVideoError(null)
    }
    const handleError = (e: Event) => {
      const mediaError = (e.target as HTMLVideoElement).error
      if (mediaError) {
        let errorMessage = "Video failed to load"
        switch (mediaError.code) {
          case mediaError.MEDIA_ERR_ABORTED:
            errorMessage = "Video loading was aborted"
            break
          case mediaError.MEDIA_ERR_NETWORK:
            errorMessage = "Network error while loading video"
            break
          case mediaError.MEDIA_ERR_DECODE:
            errorMessage = "Video decoding error"
            break
          case mediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = "Video format not supported"
            break
        }
        setVideoError(errorMessage)
        setIsVideoReady(false)
      }
    }

    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)
    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("loadeddata", handleLoadedData)
    video.addEventListener("canplay", handleCanPlay)
    video.addEventListener("error", handleError)

    return () => {
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("loadeddata", handleLoadedData)
      video.removeEventListener("canplay", handleCanPlay)
      video.removeEventListener("error", handleError)
    }
  }, [])

  return (
    <div className="relative aspect-9/16 bg-[#1c1b19] rounded-[20px] overflow-hidden border border-[rgba(195,190,182,0.20)] max-w-[400px] mx-auto group">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-[rgba(175,170,162,0.20)] z-20">
        <div className="h-full bg-[#a8a49c] transition-all duration-100" style={{ width: `${progress}%` }} />
      </div>

      <video
        ref={videoRef}
        src={normalizedVideoUrl}
        className="w-full h-full object-cover"
        loop
        playsInline
        webkit-playsinline="true"
        muted={isMuted}
        preload="metadata"
        onClick={handlePlayPause}
        onTouchEnd={handlePlayPause}
        onError={(e) => {
          const video = e.currentTarget
          const error = video.error
          if (error) {
            let errorMessage = "Video failed to load"
            switch (error.code) {
              case error.MEDIA_ERR_ABORTED:
                errorMessage = "Video loading was aborted"
                break
              case error.MEDIA_ERR_NETWORK:
                errorMessage = "Network error while loading video"
                break
              case error.MEDIA_ERR_DECODE:
                errorMessage = "Video decoding error"
                break
              case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                errorMessage = "Video format not supported or URL invalid"
                break
            }
            setVideoError(errorMessage)
          } else {
            if (video.networkState === 3) {
              setVideoError("Network error while loading video")
            } else if (video.networkState === 4) {
              setVideoError("Video format not supported or URL invalid")
            } else {
              setVideoError("Video failed to load. Please check the URL.")
            }
          }
        }}
      />
      
      {videoError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[rgba(13,12,11,0.80)] z-30 p-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-[#f0ede8] font-light">{videoError}</p>
            <button
              onClick={() => {
                setVideoError(null)
                if (videoRef.current) {
                  videoRef.current.load()
                }
              }}
              className="px-4 py-2 text-xs tracking-[0.15em] uppercase font-light bg-[#c8c4bb] text-[#0d0c0b] rounded-xl hover:bg-[#f0ede8] transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {!isPlaying && isVideoReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-[rgba(13,12,11,0.20)] z-10">
          <button
            onClick={handlePlayPause}
            onTouchEnd={handlePlayPause}
            className="w-16 h-16 bg-[rgba(175,170,162,0.20)] backdrop-blur-sm rounded-full border border-[rgba(195,190,182,0.25)] flex items-center justify-center hover:scale-110 active:scale-95 transition-transform touch-manipulation"
            aria-label="Play video"
            type="button"
          >
            <span className="text-[11px] tracking-[0.2em] uppercase text-[#f0ede8]">Play</span>
          </button>
        </div>
      )}

      <button
        onClick={handleMuteToggle}
        className="absolute top-4 right-4 px-3 py-1.5 bg-[rgba(13,12,11,0.60)] backdrop-blur-sm rounded-full border border-[rgba(195,190,182,0.25)] hover:bg-[rgba(13,12,11,0.80)] transition-colors z-20 text-[10px] text-[#f0ede8] tracking-[0.2em] uppercase"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? "Muted" : "Audio"}
      </button>

      <div className="absolute right-3 bottom-20 flex flex-col items-end gap-2 z-20">
        <button
          onClick={handleLike}
          className="px-3 py-1.5 rounded-full bg-[rgba(13,12,11,0.60)] border border-[rgba(195,190,182,0.25)] text-[10px] tracking-[0.2em] uppercase text-[#f0ede8] hover:bg-[rgba(13,12,11,0.80)] transition-colors"
          aria-label={liked ? "Unlike" : "Like"}
        >
          {liked ? "Favourited" : "Favourite"}
        </button>

        <button
          className="px-3 py-1.5 rounded-full bg-[rgba(13,12,11,0.60)] border border-[rgba(195,190,182,0.25)] text-[10px] tracking-[0.2em] uppercase text-[#f0ede8] hover:bg-[rgba(13,12,11,0.80)] transition-colors"
          aria-label="Comment"
        >
          Preview
        </button>

        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="px-3 py-1.5 rounded-full bg-[rgba(13,12,11,0.60)] border border-[rgba(195,190,182,0.25)] text-[10px] tracking-[0.2em] uppercase text-[#f0ede8] hover:bg-[rgba(13,12,11,0.80)] transition-colors disabled:opacity-50"
          aria-label="Download video"
        >
          {isDownloading ? "Downloading" : "Download"}
        </button>

        <button
          className="px-3 py-1.5 rounded-full bg-[rgba(13,12,11,0.60)] border border-[rgba(195,190,182,0.25)] text-[10px] tracking-[0.2em] uppercase text-[#f0ede8] hover:bg-[rgba(13,12,11,0.80)] transition-colors"
          aria-label="Share"
        >
          Photoshoot
        </button>

        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[rgba(13,12,11,0.60)] border border-[rgba(195,190,182,0.25)] text-[10px] tracking-[0.2em] uppercase text-[#f0ede8] hover:bg-[rgba(13,12,11,0.80)] transition-colors relative"
          aria-label="More options"
        >
          More
          {showMenu && (
            <div className="absolute right-full mr-2 bottom-0 bg-[#2e2c29] rounded-xl shadow-2xl border border-[rgba(195,190,182,0.15)] py-2 w-48">
              <button
                onClick={() => {
                  window.open(normalizedVideoUrl, "_blank")
                  setShowMenu(false)
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-[#a8a49c] hover:bg-[rgba(175,170,162,0.12)] transition-colors"
              >
                View Fullscreen
              </button>
              {onDelete && (
                <button
                  onClick={() => {
                    onDelete()
                    setShowMenu(false)
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Delete Video
                </button>
              )}
            </div>
          )}
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[rgba(13,12,11,0.80)] via-[rgba(13,12,11,0.40)] to-transparent z-10">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.15)] p-[2px]">
            <div className="w-full h-full rounded-full bg-[#1c1b19] flex items-center justify-center">
              <span className="text-xs font-semibold text-[#f0ede8]">S</span>
            </div>
          </div>
          <span className="text-sm font-medium text-[#f0ede8] drop-shadow-lg">sselfie</span>
        </div>
        {motionPrompt && (
          <p className="text-sm text-[#f0ede8] drop-shadow-lg line-clamp-2 leading-relaxed">{motionPrompt}</p>
        )}
      </div>
    </div>
  )
}

export { InstagramReelCard }
