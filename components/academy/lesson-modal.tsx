"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import VideoPlayer from "./video-player"

interface Lesson {
  id: string
  title: string
  description: string | null
  lesson_type: string
  video_url: string | null
  duration_seconds: number
  order_index: number
}

interface LessonProgress {
  watch_time_seconds: number
  status: "not_started" | "in_progress" | "completed"
  completed_at: string | null
}

interface LessonModalProps {
  lessonId: string
  courseId: string
  onClose: () => void
  onLessonComplete?: () => void
  onNextLesson?: () => void
  onPrevLesson?: () => void
}

export default function LessonModal({
  lessonId,
  courseId,
  onClose,
  onLessonComplete,
  onNextLesson,
  onPrevLesson,
}: LessonModalProps) {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [progress, setProgress] = useState<LessonProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMarkingComplete, setIsMarkingComplete] = useState(false)

  useEffect(() => {
    fetchLessonData()
  }, [lessonId])

  const fetchLessonData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/academy/lessons/${lessonId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch lesson")
      }

      const data = await response.json()
      setLesson(data.lesson)
      setProgress(data.progress)
    } catch (err) {
      console.error("[v0] Error fetching lesson:", err)
      setError("Failed to load lesson. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleLessonComplete = () => {
    setProgress((prev) => (prev ? { ...prev, status: "completed" } : null))
    onLessonComplete?.()
  }

  const handleMarkAsDone = async () => {
    if (progress?.status === "completed") return

    try {
      setIsMarkingComplete(true)
      await fetch("/api/academy/progress", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: Number.parseInt(lessonId) }),
      })
      console.log("[v0] Manually marked lesson as complete")
      handleLessonComplete()
    } catch (error) {
      console.error("[v0] Error marking lesson complete:", error)
      alert("Failed to mark lesson as complete. Please try again.")
    } finally {
      setIsMarkingComplete(false)
    }
  }

  const isCompleted = progress?.status === "completed"
  const watchTimeSeconds = progress?.watch_time_seconds || 0

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent
        className="max-w-[95vw] sm:max-w-6xl lg:max-w-7xl max-h-[95vh] overflow-y-auto p-0 bg-[rgba(13,15,19,0.96)] border-white/20 backdrop-blur-3xl"
        showCloseButton={false}
      >
        {/* DialogTitle must be a direct child of DialogContent for accessibility */}
        <DialogTitle className="sr-only">
          {loading ? "Loading lesson" : error || !lesson ? "Error" : lesson?.title || "Lesson"}
        </DialogTitle>
        
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
          </div>
        ) : error || !lesson ? (
          <div className="p-8 text-center">
            <p className="text-white/60 font-light mb-4">{error || "Lesson not found"}</p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-[rgba(255,255,255,0.08)] border border-white/10 text-white/80 rounded-xl font-light tracking-[0.15em] uppercase text-sm hover:bg-[rgba(255,255,255,0.12)] transition-all duration-200"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="relative">
            {/* Header with Close Button */}
            <div className="sticky top-0 z-10 bg-[rgba(11,13,16,0.90)] backdrop-blur-xl border-b border-white/10 p-3 sm:p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Navigation Buttons */}
                {onPrevLesson && (
                  <button
                    onClick={onPrevLesson}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    aria-label="Previous lesson"
                  >
                    <span className="text-[11px] tracking-[0.12em] uppercase text-white/70">Prev</span>
                  </button>
                )}
                {onNextLesson && (
                  <button
                    onClick={onNextLesson}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    aria-label="Next lesson"
                  >
                    <span className="text-[11px] tracking-[0.12em] uppercase text-white/70">Next</span>
                  </button>
                )}
              </div>

              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close"
              >
                <span className="text-[11px] tracking-[0.12em] uppercase text-white/70">Close</span>
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4 sm:space-y-6">
              {/* Lesson Header */}
              <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className="px-2 sm:px-3 py-1 bg-white/10 border border-white/10 rounded-full text-[10px] sm:text-xs tracking-[0.1em] uppercase font-light text-white/70">
                    Lesson {(lesson.order_index ?? 0) + 1}
                  </span>
                  {isCompleted && (
                    <span className="px-2 sm:px-3 py-1 bg-[rgba(11,13,16,0.8)] border border-white/15 text-white/80 rounded-full text-[10px] sm:text-xs tracking-[0.1em] uppercase font-light">
                      Completed
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase text-white leading-tight">
                  {lesson.title}
                </h1>

                {lesson.description && (
                  <p className="text-sm sm:text-base font-light text-white/50 leading-relaxed">{lesson.description}</p>
                )}

                <div className="flex items-center gap-2 text-[10px] sm:text-xs tracking-[0.1em] uppercase font-light text-white/40">
                  <span>{Math.floor((lesson.duration_seconds ?? 0) / 60)} MINUTES</span>
                </div>
              </div>

              {lesson.lesson_type === "video" && lesson.video_url ? (
                <div className="w-full">
                  <VideoPlayer
                    videoUrl={lesson.video_url}
                    lessonId={Number.parseInt(lesson.id)}
                    durationMinutes={Math.floor((lesson.duration_seconds ?? 0) / 60)}
                    onComplete={handleLessonComplete}
                    initialWatchTime={watchTimeSeconds}
                  />
                </div>
              ) : (
                <div className="mx-4 sm:mx-6 lg:mx-8 bg-[rgba(255,255,255,0.04)] backdrop-blur-xl border border-white/10 rounded-[1.75rem] p-6 sm:p-8 text-center">
                  <p className="text-sm sm:text-base text-white/60 font-light">
                    This lesson type is not yet supported.
                  </p>
                </div>
              )}

              {/* Progress Indicator */}
              <div className="px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 space-y-4">
                <div className="bg-[rgba(255,255,255,0.04)] backdrop-blur-xl border border-white/10 rounded-[1.75rem] p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] sm:text-xs tracking-[0.15em] uppercase font-light text-white/40">
                      Your Progress
                    </span>
                    <span className="text-xs sm:text-sm font-light text-white">
                      {isCompleted
                        ? "100%"
                        : `${Math.round((watchTimeSeconds / (lesson.duration_seconds ?? 1)) * 100)}%`}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white/70 transition-all duration-300"
                      style={{
                        width: isCompleted
                          ? "100%"
                          : `${Math.min(100, (watchTimeSeconds / (lesson.duration_seconds ?? 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Mark as Done button */}
                {!isCompleted && (
                  <button
                    onClick={handleMarkAsDone}
                    disabled={isMarkingComplete}
                    className="w-full bg-[rgba(255,255,255,0.04)] border border-white/20 text-white/75 py-3 sm:py-4 rounded-[1.25rem] font-light tracking-[0.15em] uppercase text-xs sm:text-sm hover:bg-[rgba(255,255,255,0.1)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isMarkingComplete ? (
                      <>
                        <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
                        <span>Marking Complete...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] tracking-[0.12em] uppercase text-white/60">Done</span>
                        <span>Mark as Done</span>
                      </>
                    )}
                  </button>
                )}

                {/* Next Lesson Button */}
                {onNextLesson && (
                  <button
                    onClick={onNextLesson}
                    className="w-full bg-white/90 text-[#0b0d10] py-3 sm:py-4 rounded-[1.25rem] font-light tracking-[0.15em] uppercase text-xs sm:text-sm hover:bg-white transition-all duration-200 shadow-xl shadow-black/30"
                  >
                    Next Lesson
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
