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

export default function VideoPlayer({
  videoUrl,
  lessonId,
  durationMinutes,
  onComplete,
  initialWatchTime = 0,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hasMarkedComplete, setHasMarkedComplete] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const lastSaveTimeRef = useRef(0)

  // Auto-save watch time every 10 seconds
  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(async () => {
      if (videoRef.current) {
        const watchTimeSeconds = Math.floor(videoRef.current.currentTime)

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
      }
    }, 10000) // Every 10 seconds

    return () => clearInterval(interval)
  }, [isPlaying, lessonId])

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
    if (videoRef.current) {
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
    if (!videoRef.current) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * duration

    videoRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const changeSpeed = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed
      setPlaybackSpeed(speed)
    }
  }

  const toggleFullscreen = async () => {
    if (!containerRef.current) return

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen()
        setIsFullscreen(true)
      } else {
        await document.exitFullscreen()
        setIsFullscreen(false)
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
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div ref={containerRef} className="bg-stone-950 rounded-[1.75rem] overflow-hidden shadow-2xl">
      {/* Video Element */}
      <div className="relative aspect-video bg-stone-950">
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          playsInline
        />

        {/* Play/Pause Overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-950/40">
            <button
              onClick={handlePlayPause}
              className="w-20 h-20 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-2xl"
              aria-label="Play video"
            >
              <div className="w-0 h-0 border-t-[16px] border-t-transparent border-l-[28px] border-l-stone-950 border-b-[16px] border-b-transparent ml-2" />
            </button>
          </div>
        )}

        {/* Click to pause when playing */}
        {isPlaying && (
          <button onClick={handlePlayPause} className="absolute inset-0 cursor-pointer" aria-label="Pause video" />
        )}
      </div>

      {/* Controls */}
      <div className="bg-stone-950 p-4 space-y-4">
        {/* Progress Bar */}
        <div onClick={handleSeek} className="w-full h-2 bg-stone-800 rounded-full cursor-pointer group">
          <div
            className="h-full bg-stone-50 rounded-full transition-all duration-100 group-hover:bg-stone-200"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Time Display */}
        <div className="flex items-center justify-between text-stone-400 text-sm font-light">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between gap-4">
          {/* Play/Pause Button */}
          <button
            onClick={handlePlayPause}
            className="px-6 py-3 bg-stone-50 text-stone-950 rounded-xl font-light tracking-[0.15em] uppercase text-sm hover:bg-stone-200 transition-all duration-200 min-w-[120px]"
          >
            {isPlaying ? "PAUSE" : "PLAY"}
          </button>

          {/* Speed Controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs tracking-[0.15em] uppercase font-light text-stone-400 mr-2">SPEED</span>
            {[0.5, 1, 1.5, 2].map((speed) => (
              <button
                key={speed}
                onClick={() => changeSpeed(speed)}
                className={`px-3 py-2 rounded-lg text-xs font-light tracking-wider transition-all duration-200 ${
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
            className="px-6 py-3 bg-stone-800 text-stone-50 rounded-xl font-light tracking-[0.15em] uppercase text-sm hover:bg-stone-700 transition-all duration-200"
          >
            {isFullscreen ? "EXIT" : "FULLSCREEN"}
          </button>
        </div>
      </div>
    </div>
  )
}
