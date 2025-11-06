"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { X, ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from "lucide-react"
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
        className="max-w-[95vw] sm:max-w-6xl lg:max-w-7xl max-h-[95vh] overflow-y-auto p-0 bg-stone-50 border-stone-200"
        showCloseButton={false}
      >
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 text-stone-600 animate-spin" />
          </div>
        ) : error || !lesson ? (
          <div className="p-8 text-center">
            <p className="text-stone-600 font-light mb-4">{error || "Lesson not found"}</p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-stone-950 text-stone-50 rounded-xl font-light tracking-[0.15em] uppercase text-sm hover:bg-stone-800 transition-all duration-200"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="relative">
            {/* Header with Close Button */}
            <div className="sticky top-0 z-10 bg-stone-50/95 backdrop-blur-xl border-b border-stone-200 p-3 sm:p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Navigation Buttons */}
                {onPrevLesson && (
                  <button
                    onClick={onPrevLesson}
                    className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                    aria-label="Previous lesson"
                  >
                    <ChevronLeft size={20} className="text-stone-600" />
                  </button>
                )}
                {onNextLesson && (
                  <button
                    onClick={onNextLesson}
                    className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                    aria-label="Next lesson"
                  >
                    <ChevronRight size={20} className="text-stone-600" />
                  </button>
                )}
              </div>

              <button
                onClick={onClose}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X size={20} className="text-stone-600" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4 sm:space-y-6">
              {/* Lesson Header */}
              <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className="px-2 sm:px-3 py-1 bg-stone-100 border border-stone-200 rounded-full text-[10px] sm:text-xs tracking-[0.1em] uppercase font-light text-stone-700">
                    Lesson {(lesson.order_index ?? 0) + 1}
                  </span>
                  {isCompleted && (
                    <span className="px-2 sm:px-3 py-1 bg-stone-950 text-stone-50 rounded-full text-[10px] sm:text-xs tracking-[0.1em] uppercase font-light">
                      Completed
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-serif font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-950 leading-tight">
                  {lesson.title}
                </h1>

                {lesson.description && (
                  <p className="text-sm sm:text-base font-light text-stone-600 leading-relaxed">{lesson.description}</p>
                )}

                <div className="flex items-center gap-2 text-[10px] sm:text-xs tracking-[0.1em] uppercase font-light text-stone-500">
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
                <div className="mx-4 sm:mx-6 lg:mx-8 bg-white/50 backdrop-blur-xl border border-white/60 rounded-[1.75rem] p-6 sm:p-8 text-center">
                  <p className="text-sm sm:text-base text-stone-600 font-light">
                    This lesson type is not yet supported.
                  </p>
                </div>
              )}

              {/* Progress Indicator */}
              <div className="px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 space-y-4">
                <div className="bg-white/50 backdrop-blur-xl border border-white/60 rounded-[1.75rem] p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] sm:text-xs tracking-[0.15em] uppercase font-light text-stone-500">
                      Your Progress
                    </span>
                    <span className="text-xs sm:text-sm font-light text-stone-950">
                      {isCompleted
                        ? "100%"
                        : `${Math.round((watchTimeSeconds / (lesson.duration_seconds ?? 1)) * 100)}%`}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-stone-950 transition-all duration-300"
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
                    className="w-full bg-white border-2 border-stone-950 text-stone-950 py-3 sm:py-4 rounded-[1.25rem] font-light tracking-[0.15em] uppercase text-xs sm:text-sm hover:bg-stone-950 hover:text-stone-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isMarkingComplete ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Marking Complete...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Mark as Done</span>
                      </>
                    )}
                  </button>
                )}

                {/* Next Lesson Button */}
                {onNextLesson && (
                  <button
                    onClick={onNextLesson}
                    className="w-full bg-stone-950 text-stone-50 py-3 sm:py-4 rounded-[1.25rem] font-light tracking-[0.15em] uppercase text-xs sm:text-sm hover:bg-stone-800 transition-all duration-200 shadow-xl shadow-stone-900/20"
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
