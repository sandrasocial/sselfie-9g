"use client"

import { useState, useEffect } from "react"
import VideoPlayer from "./video-player"
import { Loader2 } from "lucide-react"

interface Lesson {
  id: number
  course_id: number
  title: string
  description: string | null
  lesson_number: number
  lesson_type: "video" | "interactive"
  video_url: string | null
  duration_minutes: number | null
}

interface LessonProgress {
  watch_time_seconds: number
  status: "not_started" | "in_progress" | "completed"
  completed_at: string | null
}

interface LessonViewerProps {
  lessonId: number
  courseId: number
  onLessonComplete?: () => void
  onNextLesson?: () => void
  hasNextLesson?: boolean
}

export default function LessonViewer({
  lessonId,
  courseId,
  onLessonComplete,
  onNextLesson,
  hasNextLesson = false,
}: LessonViewerProps) {
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [progress, setProgress] = useState<LessonProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-stone-600 animate-spin" />
      </div>
    )
  }

  if (error || !lesson) {
    return (
      <div className="bg-white/50 backdrop-blur-xl border border-white/60 rounded-[1.75rem] p-8 text-center">
        <p className="text-stone-600 font-light">{error || "Lesson not found"}</p>
      </div>
    )
  }

  if (lesson.lesson_type !== "video" || !lesson.video_url) {
    return (
      <div className="bg-white/50 backdrop-blur-xl border border-white/60 rounded-[1.75rem] p-8 text-center">
        <p className="text-stone-600 font-light">This lesson type is not yet supported.</p>
      </div>
    )
  }

  const isCompleted = progress?.status === "completed"
  const watchTimeSeconds = progress?.watch_time_seconds || 0

  return (
    <div className="space-y-6 pb-24">
      {/* Lesson Header */}
      <div className="bg-white/50 backdrop-blur-xl border border-white/60 rounded-[1.75rem] p-6 sm:p-8 shadow-xl shadow-stone-900/10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className="px-3 py-1 bg-stone-100/80 border border-stone-200/60 rounded-full text-xs tracking-[0.1em] uppercase font-light text-stone-700">
                LESSON {lesson.lesson_number}
              </span>
              {isCompleted && (
                <span className="px-3 py-1 bg-stone-950 text-stone-50 rounded-full text-xs tracking-[0.1em] uppercase font-light">
                  COMPLETED
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-extralight tracking-[0.2em] text-stone-950 uppercase mb-3">
              {lesson.title}
            </h1>
            {lesson.description && (
              <p className="text-sm font-light text-stone-600 leading-relaxed">{lesson.description}</p>
            )}
          </div>
        </div>

        {/* Duration */}
        {lesson.duration_minutes && (
          <div className="flex items-center gap-2 text-xs tracking-[0.1em] uppercase font-light text-stone-500">
            <span>{lesson.duration_minutes} MINUTES</span>
          </div>
        )}
      </div>

      {/* Video Player */}
      <VideoPlayer
        videoUrl={lesson.video_url}
        lessonId={lesson.id}
        durationMinutes={lesson.duration_minutes || undefined}
        onComplete={handleLessonComplete}
        initialWatchTime={watchTimeSeconds}
      />

      {/* Progress Indicator */}
      <div className="bg-white/50 backdrop-blur-xl border border-white/60 rounded-[1.75rem] p-6 shadow-xl shadow-stone-900/10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs tracking-[0.15em] uppercase font-light text-stone-500">YOUR PROGRESS</span>
          <span className="text-sm font-light text-stone-950">
            {isCompleted ? "100%" : `${Math.round((watchTimeSeconds / ((lesson.duration_minutes || 1) * 60)) * 100)}%`}
          </span>
        </div>
        <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-stone-950 transition-all duration-300"
            style={{
              width: isCompleted
                ? "100%"
                : `${Math.min(100, (watchTimeSeconds / ((lesson.duration_minutes || 1) * 60)) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Next Lesson Button */}
      {hasNextLesson && (
        <button
          onClick={onNextLesson}
          className="w-full bg-stone-950 text-stone-50 py-4 rounded-[1.25rem] font-light tracking-[0.15em] uppercase text-sm hover:bg-stone-800 transition-all duration-200 shadow-xl shadow-stone-900/20 hover:shadow-2xl hover:shadow-stone-900/30"
        >
          NEXT LESSON
        </button>
      )}
    </div>
  )
}
