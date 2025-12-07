"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Heart, MessageCircle, Send, MoreVertical, Volume2, VolumeX, Play, Download } from "lucide-react"

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

  const handlePlayPause = async (e?: React.MouseEvent | React.TouchEvent) => {
    e?.stopPropagation()
    e?.preventDefault()
    
    const video = videoRef.current
    if (!video) return

    try {
      if (isPlaying) {
        video.pause()
      } else {
        // On mobile, play() returns a Promise that must be handled
        // This is required for user-initiated playback
        const playPromise = video.play()
        
        if (playPromise !== undefined) {
          await playPromise
          // Video started playing successfully
          setIsPlaying(true)
          setVideoError(null)
        }
      }
    } catch (error: any) {
      console.error("[v0] Error playing video:", error)
      setVideoError(error?.message || "Failed to play video")
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
      console.log("[v0] Starting video download...")

      // Fetch the video as a blob
      const response = await fetch(videoUrl)
      if (!response.ok) throw new Error("Failed to fetch video")

      const blob = await response.blob()
      console.log("[v0] Video blob fetched, size:", blob.size)

      // Check if we're on mobile and can use the share API (saves to camera roll on iOS)
      if (navigator.share && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
        console.log("[v0] Mobile device detected, using share API...")
        try {
          const file = new File([blob], `sselfie-reel-${Date.now()}.mp4`, { type: "video/mp4" })
          await navigator.share({
            files: [file],
            title: "sselfie Video",
            text: motionPrompt || "Check out this video from sselfie!",
          })
          console.log("[v0] ✅ Video shared successfully (will save to camera roll if user selects save)")
          setIsDownloading(false)
          return
        } catch (shareError: any) {
          // User cancelled or share failed - fall through to download
          console.log("[v0] Share API failed or cancelled:", shareError?.message)
        }
      }

      // Fallback: create download link (saves to Downloads folder)
      console.log("[v0] Using download link method...")
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

      console.log("[v0] ✅ Video downloaded to files")
    } catch (error) {
      console.error("[v0] Error downloading video:", error)
      setIsDownloading(false)

      // Last resort fallback - direct link
      const a = document.createElement("a")
      a.href = videoUrl
      a.download = `sselfie-reel-${Date.now()}.mp4`
      a.target = "_blank"
      a.click()
    }
  }

  // Reset state when video URL changes and validate URL
  useEffect(() => {
    setIsVideoReady(false)
    setVideoError(null)
    setIsPlaying(false)
    
    // Validate video URL
    if (!videoUrl || (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://'))) {
      console.error("[v0] Invalid video URL:", videoUrl)
      setVideoError("Invalid video URL")
      return
    }
    
    // Ensure video element has the source set correctly
    const video = videoRef.current
    if (video && videoUrl) {
      // Only update if the src has changed
      if (video.src !== videoUrl) {
        video.src = videoUrl
        // Load the video to start fetching metadata
        video.load()
      }
    }
  }, [videoUrl])

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
        const progress = (video.currentTime / video.duration) * 100
        setProgress(progress)
      }
    }
    const handleLoadedMetadata = () => {
      console.log("[v0] Video metadata loaded, readyState:", video.readyState, "src:", video.src?.substring(0, 50))
      setIsVideoReady(true)
      setVideoError(null)
    }
    const handleLoadedData = () => {
      console.log("[v0] Video data loaded, readyState:", video.readyState)
      setIsVideoReady(video.readyState >= 2)
    }
    const handleCanPlay = () => {
      console.log("[v0] Video can play, readyState:", video.readyState)
      setIsVideoReady(true)
      setVideoError(null)
    }
    const handleError = (e: Event) => {
      const videoError = (e.target as HTMLVideoElement).error
      console.error("[v0] Video error:", videoError, "src:", (e.target as HTMLVideoElement).src)
      
      if (videoError) {
        let errorMessage = "Video failed to load"
        switch (videoError.code) {
          case videoError.MEDIA_ERR_ABORTED:
            errorMessage = "Video loading was aborted"
            break
          case videoError.MEDIA_ERR_NETWORK:
            errorMessage = "Network error while loading video"
            break
          case videoError.MEDIA_ERR_DECODE:
            errorMessage = "Video decoding error"
            break
          case videoError.MEDIA_ERR_SRC_NOT_SUPPORTED:
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
    <div className="relative aspect-9/16 bg-stone-950 rounded-2xl overflow-hidden shadow-2xl max-w-[400px] mx-auto group">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/20 z-20">
        <div className="h-full bg-white transition-all duration-100" style={{ width: `${progress}%` }} />
      </div>

      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-cover touch-none"
        loop
        playsInline
        webkit-playsinline="true"
        muted={isMuted}
        preload="metadata"
        onClick={handlePlayPause}
        onTouchStart={(e) => {
          // Use onTouchStart for better mobile responsiveness
          e.stopPropagation()
          handlePlayPause(e)
        }}
        onError={(e) => {
          const video = e.currentTarget
          const error = video.error
          console.error("[v0] Video element error:", {
            code: error?.code,
            message: error?.message,
            src: video.src,
            currentSrc: video.currentSrc,
            networkState: video.networkState,
            readyState: video.readyState,
            videoUrl: videoUrl,
          })
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
            // Error object might not be accessible, try to infer from networkState
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
        <div className="absolute inset-0 flex items-center justify-center bg-stone-950/80 z-30 p-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-white font-light">{videoError}</p>
            <button
              onClick={() => {
                setVideoError(null)
                if (videoRef.current) {
                  videoRef.current.load()
                }
              }}
              className="px-4 py-2 text-xs tracking-[0.15em] uppercase font-light bg-white text-stone-950 rounded-xl hover:bg-stone-100 transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-950/20 z-10 touch-none">
          <button
            onClick={handlePlayPause}
            onTouchStart={(e) => {
              // Use onTouchStart for better mobile responsiveness
              e.stopPropagation()
              e.preventDefault()
              handlePlayPause(e)
            }}
            className="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-transform touch-manipulation"
            aria-label="Play video"
            type="button"
          >
            <Play size={28} className="text-stone-950 ml-1" fill="currentColor" />
          </button>
        </div>
      )}

      <button
        onClick={handleMuteToggle}
        className="absolute top-4 right-4 w-10 h-10 bg-stone-950/60 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-stone-950/80 transition-colors z-20"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <VolumeX size={18} className="text-white" /> : <Volume2 size={18} className="text-white" />}
      </button>

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
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex flex-col items-center gap-1 hover:scale-110 transition-transform active:scale-95 disabled:opacity-50"
          aria-label="Download video"
        >
          <div className="w-12 h-12 bg-stone-950/60 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Download size={24} className="text-white" strokeWidth={2} />
          </div>
          {isDownloading && <span className="text-xs font-semibold text-white drop-shadow-lg">...</span>}
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
                  window.open(videoUrl, "_blank")
                  setShowMenu(false)
                }}
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-stone-50 transition-colors text-stone-950"
              >
                View Fullscreen
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
