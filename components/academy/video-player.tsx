"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"

interface VideoPlayerProps {
  videoUrl: string
  lessonId: number
  durationMinutes?: number
  onComplete?: () => void
  initialWatchTime?: number
}

function getVimeoVideoId(url: string): string | null {
  // Match patterns like:
  // https://vimeo.com/123456789
  // https://player.vimeo.com/video/123456789
  // vimeo.com/123456789
  const patterns = [/vimeo\.com\/(\d+)/, /player\.vimeo\.com\/video\/(\d+)/]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

function getYouTubeVideoId(url: string): string | null {
  // Match patterns like:
  // https://www.youtube.com/watch?v=VIDEO_ID
  // https://youtu.be/VIDEO_ID
  // https://www.youtube.com/embed/VIDEO_ID
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      return match[1]
    }
  }

  return null
}

export default function VideoPlayer({
  videoUrl,
  lessonId,
  durationMinutes,
  onComplete,
  initialWatchTime = 0,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hasMarkedComplete, setHasMarkedComplete] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastSaveTimeRef = useRef(0)

  // Validate video URL
  if (!videoUrl || videoUrl.trim() === "" || videoUrl === "PLACEHOLDER_VIDEO_URL") {
    return (
      <div className="bg-stone-950 p-8 text-center">
        <p className="text-stone-50 font-light mb-4">Video URL is not available</p>
        <p className="text-stone-400 text-sm">Please contact support if this issue persists.</p>
      </div>
    )
  }

  const vimeoVideoId = getVimeoVideoId(videoUrl)
  const youtubeVideoId = getYouTubeVideoId(videoUrl)
  const isVimeo = vimeoVideoId !== null
  const isYouTube = youtubeVideoId !== null
  const isEmbedded = isVimeo || isYouTube
  
  const vimeoEmbedUrl = isVimeo
    ? `https://player.vimeo.com/video/${vimeoVideoId}?autoplay=0&title=0&byline=0&portrait=0&responsive=1&dnt=1`
    : null
  
  const youtubeEmbedUrl = isYouTube
    ? `https://www.youtube.com/embed/${youtubeVideoId}?autoplay=0&rel=0&modestbranding=1`
    : null

  useEffect(() => {
    if ((isVimeo || isYouTube) && durationMinutes) {
      setDuration(durationMinutes * 60)
    }
  }, [isVimeo, isYouTube, durationMinutes])

  useEffect(() => {
    if (!isVimeo || !iframeRef.current) return

    const handleVimeoMessage = (event: MessageEvent) => {
      // Only accept messages from Vimeo
      if (!event.origin.includes("vimeo.com") && !event.origin.includes("player.vimeo.com")) return

      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data

        switch (data.event) {
          case "ready":
            // Player is ready, set initial time if needed
            if (initialWatchTime > 0 && iframeRef.current) {
              setTimeout(() => {
                iframeRef.current?.contentWindow?.postMessage(
                  JSON.stringify({ method: "setCurrentTime", value: initialWatchTime }),
                  "https://player.vimeo.com",
                )
              }, 500)
            }
            break
          case "play":
            setIsPlaying(true)
            break
          case "pause":
            setIsPlaying(false)
            break
          case "timeupdate":
            if (data.data?.seconds !== undefined) {
              setCurrentTime(data.data.seconds)
            }
            break
          case "loaded":
            if (data.data?.duration) {
              setDuration(data.data.duration)
            }
            break
          case "ended":
            setIsPlaying(false)
            break
        }
      } catch (e) {
        // Ignore parsing errors for non-JSON messages
      }
    }

    window.addEventListener("message", handleVimeoMessage)

    // Subscribe to Vimeo events after iframe loads
    const iframe = iframeRef.current
    const subscribeToEvents = () => {
      if (iframe.contentWindow) {
        // Request Vimeo player to send events
        iframe.contentWindow.postMessage(
          JSON.stringify({
            method: "addEventListener",
            value: "play",
          }),
          "https://player.vimeo.com",
        )
        iframe.contentWindow.postMessage(
          JSON.stringify({
            method: "addEventListener",
            value: "pause",
          }),
          "https://player.vimeo.com",
        )
        iframe.contentWindow.postMessage(
          JSON.stringify({
            method: "addEventListener",
            value: "timeupdate",
          }),
          "https://player.vimeo.com",
        )
        iframe.contentWindow.postMessage(
          JSON.stringify({
            method: "addEventListener",
            value: "loaded",
          }),
          "https://player.vimeo.com",
        )
      }
    }

    // Wait for iframe to load before subscribing
    iframe.addEventListener("load", subscribeToEvents)
    // Also try immediately in case iframe is already loaded
    setTimeout(subscribeToEvents, 1000)

    return () => {
      window.removeEventListener("message", handleVimeoMessage)
      iframe.removeEventListener("load", subscribeToEvents)
    }
  }, [isVimeo, initialWatchTime])

  // Auto-save watch time every 10 seconds
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(async () => {
      const watchTimeSeconds = Math.floor(currentTime)

      // Only save if time has changed significantly (avoid duplicate saves)
      if (Math.abs(watchTimeSeconds - lastSaveTimeRef.current) >= 5) {
        lastSaveTimeRef.current = watchTimeSeconds

        try {
          await fetch("/api/academy/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lessonId,
              watchTimeSeconds,
            }),
          })
          console.log("[v0] Saved watch time:", watchTimeSeconds)
        } catch (error) {
          console.error("[v0] Error saving watch time:", error)
        }
      }
    }, 10000) // Every 10 seconds

    return () => clearInterval(interval)
  }, [isPlaying, lessonId, currentTime])

  // Check for 90% completion
  useEffect(() => {
    if (duration > 0 && currentTime > 0 && !hasMarkedComplete) {
      const percentWatched = (currentTime / duration) * 100

      if (percentWatched >= 90) {
        setHasMarkedComplete(true)
        markLessonComplete()
      }
    }
  }, [currentTime, duration, hasMarkedComplete])

  const markLessonComplete = async () => {
    try {
      await fetch("/api/academy/progress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId }),
      })
      console.log("[v0] Marked lesson as complete")
      onComplete?.()
    } catch (error) {
      console.error("[v0] Error marking lesson complete:", error)
    }
  }

  const handlePlayPause = () => {
    if (isVimeo && iframeRef.current) {
      const method = isPlaying ? "pause" : "play"
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ method }),
        "https://player.vimeo.com",
      )
    } else if (isYouTube && iframeRef.current) {
      // YouTube iframe API would require additional setup, for now just toggle state
      setIsPlaying(!isPlaying)
    } else if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)

      // Resume from last watch time
      if (initialWatchTime > 0) {
        videoRef.current.currentTime = initialWatchTime
      }
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * duration

    if (isVimeo && iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ method: "setCurrentTime", value: newTime }),
        "https://player.vimeo.com",
      )
    } else if (isYouTube) {
      // YouTube seek would require iframe API, skip for now
      console.log("[v0] YouTube seek not yet implemented")
    } else if (videoRef.current) {
      videoRef.current.currentTime = newTime
    }

    setCurrentTime(newTime)
  }

  const changeSpeed = (speed: number) => {
    if (isVimeo && iframeRef.current) {
      iframeRef.current.contentWindow?.postMessage(
        JSON.stringify({ method: "setPlaybackRate", value: speed }),
        "https://player.vimeo.com",
      )
      setPlaybackSpeed(speed)
    } else if (isYouTube) {
      // YouTube playback speed would require iframe API
      console.log("[v0] YouTube playback speed not yet implemented")
    } else if (videoRef.current) {
      videoRef.current.playbackRate = speed
      setPlaybackSpeed(speed)
    }
  }

  const toggleFullscreen = async () => {
    try {
      // For Vimeo iframe
      if (isVimeo && iframeRef.current) {
        // Use the iframe's fullscreen API
        const iframe = iframeRef.current as any

        if (iframe.requestFullscreen) {
          await iframe.requestFullscreen()
        } else if (iframe.webkitRequestFullscreen) {
          // iOS Safari
          await iframe.webkitRequestFullscreen()
        } else if (iframe.mozRequestFullScreen) {
          // Firefox
          await iframe.mozRequestFullScreen()
        } else if (iframe.msRequestFullscreen) {
          // IE/Edge
          await iframe.msRequestFullscreen()
        }
        setIsFullscreen(true)
        return
      }

      // For native video element
      if (videoRef.current) {
        const video = videoRef.current as any

        if (video.requestFullscreen) {
          await video.requestFullscreen()
        } else if (video.webkitEnterFullscreen) {
          // iOS Safari - native video fullscreen
          video.webkitEnterFullscreen()
        } else if (video.webkitRequestFullscreen) {
          await video.webkitRequestFullscreen()
        } else if (video.mozRequestFullScreen) {
          await video.mozRequestFullScreen()
        } else if (video.msRequestFullscreen) {
          await video.msRequestFullscreen()
        }
        setIsFullscreen(true)
        return
      }

      // Fallback to container fullscreen (desktop)
      if (containerRef.current) {
        const container = containerRef.current as any

        if (!document.fullscreenElement) {
          if (container.requestFullscreen) {
            await container.requestFullscreen()
          } else if (container.webkitRequestFullscreen) {
            await container.webkitRequestFullscreen()
          } else if (container.mozRequestFullScreen) {
            await container.mozRequestFullScreen()
          } else if (container.msRequestFullscreen) {
            await container.msRequestFullscreen()
          }
          setIsFullscreen(true)
        } else {
          if (document.exitFullscreen) {
            await document.exitFullscreen()
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen()
          } else if ((document as any).mozCancelFullScreen) {
            await (document as any).mozCancelFullScreen()
          } else if ((document as any).msExitFullscreen) {
            await (document as any).msExitFullscreen()
          }
          setIsFullscreen(false)
        }
      }
    } catch (error) {
      console.error("[v0] Error toggling fullscreen:", error)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange)
    document.addEventListener("mozfullscreenchange", handleFullscreenChange)
    document.addEventListener("msfullscreenchange", handleFullscreenChange)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange)
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange)
      document.removeEventListener("msfullscreenchange", handleFullscreenChange)
    }
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div ref={containerRef} className="bg-stone-950 overflow-hidden">
      {/* Video Element with proper 16:9 aspect ratio */}
      <div className="relative w-full aspect-video bg-stone-950">
        {isVimeo && vimeoEmbedUrl ? (
          <iframe
            ref={iframeRef}
            src={vimeoEmbedUrl}
            className="w-full h-full"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            title="Vimeo video player"
          />
        ) : isYouTube && youtubeEmbedUrl ? (
          <iframe
            ref={iframeRef}
            src={youtubeEmbedUrl}
            className="w-full h-full"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onError={(e) => {
              console.error("[v0] Video playback error:", e)
              const video = e.currentTarget
              if (video.error) {
                let errorMessage = "Failed to load video"
                switch (video.error.code) {
                  case 1:
                    errorMessage = "Video loading aborted"
                    break
                  case 2:
                    errorMessage = "Network error while loading video"
                    break
                  case 3:
                    errorMessage = "Video decoding error"
                    break
                  case 4:
                    errorMessage = "Video format not supported"
                    break
                }
                setVideoError(errorMessage)
                console.error("[v0] Video error code:", video.error.code, errorMessage)
              }
            }}
            onCanPlay={() => {
              setVideoError(null)
              if (process.env.NODE_ENV === "development") {
                console.log("[v0] Video can play")
              }
            }}
            onLoadStart={() => {
              setVideoError(null)
              if (process.env.NODE_ENV === "development") {
                console.log("[v0] Video load started")
              }
            }}
            playsInline
            preload="metadata"
            crossOrigin="anonymous"
          />
        )}

        {/* Error Message */}
        {videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-950/90 z-20">
            <div className="text-center p-6 max-w-md">
              <p className="text-stone-50 font-light mb-2">{videoError}</p>
              <p className="text-stone-400 text-sm mb-4">Video URL: {videoUrl.substring(0, 50)}...</p>
              <button
                onClick={() => {
                  setVideoError(null)
                  if (videoRef.current) {
                    videoRef.current.load()
                  }
                }}
                className="px-4 py-2 bg-stone-50 text-stone-950 rounded-lg text-sm hover:bg-stone-200 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Play/Pause Overlay - Only show for native video when not playing */}
        {!isEmbedded && !isPlaying && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-950/40">
            <button
              onClick={handlePlayPause}
              className="w-16 h-16 sm:w-20 sm:h-20 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-2xl"
              aria-label="Play video"
            >
              <div className="w-0 h-0 border-t-[12px] sm:border-t-[16px] border-t-transparent border-l-[20px] sm:border-l-[28px] border-l-stone-950 border-b-[12px] sm:border-b-[16px] border-b-transparent ml-1 sm:ml-2" />
            </button>
          </div>
        )}

        {/* Click to pause when playing - Only for native video */}
        {!isEmbedded && isPlaying && (
          <button onClick={handlePlayPause} className="absolute inset-0 cursor-pointer" aria-label="Pause video" />
        )}
      </div>

      {/* Controls */}
      <div className="bg-stone-950 p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Progress Bar */}
        <div onClick={handleSeek} className="w-full h-1.5 sm:h-2 bg-stone-800 rounded-full cursor-pointer group">
          <div
            className="h-full bg-stone-50 rounded-full transition-all duration-100 group-hover:bg-stone-200"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Time Display */}
        <div className="flex items-center justify-between text-stone-400 text-xs sm:text-sm font-light">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Control Buttons - Responsive Layout */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPause}
            className="px-6 py-3 bg-stone-50 text-stone-950 rounded-xl font-light tracking-[0.15em] uppercase text-xs sm:text-sm hover:bg-stone-200 transition-all duration-200 min-w-[100px] sm:min-w-[120px]"
          >
            {isPlaying ? "PAUSE" : "PLAY"}
          </button>

          {/* Speed Controls */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-[10px] sm:text-xs tracking-[0.15em] uppercase font-light text-stone-400 mr-1 sm:mr-2">
              SPEED
            </span>
            {[0.5, 1, 1.5, 2].map((speed) => (
              <button
                key={speed}
                onClick={() => changeSpeed(speed)}
                className={`px-2.5 sm:px-3 py-2 rounded-lg text-[10px] sm:text-xs font-light tracking-wider transition-all duration-200 ${
                  playbackSpeed === speed
                    ? "bg-stone-50 text-stone-950"
                    : "bg-stone-800 text-stone-400 hover:bg-stone-700"
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="px-4 sm:px-6 py-3 bg-stone-800 text-stone-50 rounded-xl font-light tracking-[0.15em] uppercase text-xs sm:text-sm hover:bg-stone-700 transition-all duration-200"
          >
            {isFullscreen ? "EXIT" : "FULL"}
          </button>
        </div>
      </div>
    </div>
  )
}
