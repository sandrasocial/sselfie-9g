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
        className="max-w-[95vw] sm:max-w-6xl lg:max-w-7xl max-h-[95vh] overflow-y-auto p-0 bg-[rgba(175,170,162,0.12)] backdrop-blur-[70px] border border-[rgba(195,190,182,0.25)] rounded-3xl"
        showCloseButton={false}
      >
        {/* DialogTitle must be a direct child of DialogContent for accessibility */}
        <DialogTitle className="sr-only">
          {loading ? "Loading lesson" : error || !lesson ? "Error" : lesson?.title || "Lesson"}
        </DialogTitle>
        
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="h-8 w-8 rounded-full border-2 border-[rgba(195,190,182,0.25)] border-t-[#a8a49c] animate-spin" />
          </div>
        ) : error || !lesson ? (
          <div className="p-8 text-center">
            <p className="text-[#8a8780] mb-4">{error || "Lesson not found"}</p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.25)] text-[#f0ede8] rounded-full font-['Inter'] font-medium tracking-[0.15em] uppercase text-xs hover:bg-[rgba(175,170,162,0.18)] transition-all duration-200"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="relative">
            {/* Header with Close Button */}
            <div className="sticky top-0 z-10 bg-[rgba(13,12,11,0.90)] backdrop-blur-xl border-b border-[rgba(195,190,182,0.15)] p-3 sm:p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Navigation Buttons */}
                {onPrevLesson && (
                  <button
                    onClick={onPrevLesson}
                    className="px-3 py-2 bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.25)] rounded-full hover:bg-[rgba(175,170,162,0.18)] transition-colors"
                    aria-label="Previous lesson"
                  >
                    <span className="font-['Inter'] text-[10px] tracking-[0.5em] uppercase font-medium text-[#8a8780] hover:text-[#f0ede8]">Prev</span>
                  </button>
                )}
                {onNextLesson && (
                  <button
                    onClick={onNextLesson}
                    className="px-3 py-2 bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.25)] rounded-full hover:bg-[rgba(175,170,162,0.18)] transition-colors"
                    aria-label="Next lesson"
                  >
                    <span className="font-['Inter'] text-[10px] tracking-[0.5em] uppercase font-medium text-[#8a8780] hover:text-[#f0ede8]">Next</span>
                  </button>
                )}
              </div>

              <button
                onClick={onClose}
                className="p-2 text-[#8a8780] hover:text-[#f0ede8] transition-colors"
                aria-label="Close"
              >
                <span className="font-['Inter'] text-[10px] tracking-[0.5em] uppercase font-medium">Close</span>
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4 sm:space-y-6">
              {/* Lesson Header */}
              <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className="px-2 sm:px-3 py-1 bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.25)] rounded-full font-['Inter'] text-[10px] tracking-[0.5em] uppercase font-medium text-[#8a8780]">
                    Lesson {(lesson.order_index ?? 0) + 1}
                  </span>
                  {isCompleted && (
                    <span className="px-2 sm:px-3 py-1 bg-[rgba(168,164,156,0.20)] border border-[rgba(195,190,182,0.25)] text-[#a8a49c] rounded-full font-['Inter'] text-[10px] tracking-[0.5em] uppercase font-medium">
                      Completed
                    </span>
                  )}
                </div>

                <h1 className="font-['Cormorant_Garamond'] font-light text-xl sm:text-2xl lg:text-3xl text-[#f0ede8] leading-tight">
                  {lesson.title}
                </h1>

                {lesson.description && (
                  <p className="text-sm sm:text-base text-[#f0ede8] leading-relaxed">{lesson.description}</p>
                )}

                <div className="flex items-center gap-2 font-['Inter'] text-[10px] tracking-[0.5em] uppercase font-medium text-[#8a8780]">
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
                <div className="mx-4 sm:mx-6 lg:mx-8 bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl p-6 sm:p-8 text-center">
                  <p className="text-sm sm:text-base text-[#8a8780]">
                    This lesson type is not yet supported.
                  </p>
                </div>
              )}

              {/* Progress Indicator */}
              <div className="px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 space-y-4">
                <div className="bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-['Inter'] text-[10px] tracking-[0.5em] uppercase font-medium text-[#8a8780]">
                      Your Progress
                    </span>
                    <span className="font-['Inter'] text-xs sm:text-sm text-[#f0ede8]">
                      {isCompleted
                        ? "100%"
                        : `${Math.round((watchTimeSeconds / (lesson.duration_seconds ?? 1)) * 100)}%`}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[rgba(175,170,162,0.12)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#c8c4bb] transition-all duration-300"
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
                    className="w-full bg-[rgba(175,170,162,0.10)] border border-[rgba(195,190,182,0.25)] text-[#f0ede8] py-3 sm:py-4 rounded-full font-['Inter'] font-medium tracking-[0.15em] uppercase text-xs sm:text-sm hover:bg-[rgba(175,170,162,0.18)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isMarkingComplete ? (
                      <>
                        <div className="h-4 w-4 rounded-full border-2 border-[rgba(195,190,182,0.25)] border-t-[#a8a49c] animate-spin" />
                        <span>Marking Complete...</span>
                      </>
                    ) : (
                      <>
                        <span className="font-['Inter'] text-[10px] tracking-[0.5em] uppercase font-medium text-[#8a8780]">Done</span>
                        <span>Mark as Done</span>
                      </>
                    )}
                  </button>
                )}

                {/* Next Lesson Button */}
                {onNextLesson && (
                  <button
                    onClick={onNextLesson}
                    className="w-full bg-[#c8c4bb] text-[#0d0c0b] py-3 sm:py-4 rounded-full font-['Inter'] font-medium tracking-[0.15em] uppercase text-xs sm:text-sm hover:bg-[#f0ede8] transition-all duration-200"
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
