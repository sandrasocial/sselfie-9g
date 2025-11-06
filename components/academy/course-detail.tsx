"use client"

import { useState, useEffect } from "react"
import { Loader2, Lock, CheckCircle2, Circle } from "lucide-react"
import LessonModal from "./lesson-modal"

interface Lesson {
  id: string
  title: string
  description: string | null
  lesson_type: string
  video_url: string | null
  duration_seconds: number
  order_index: number
  is_completed: boolean
  is_locked: boolean
}

interface Course {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  tier: string
  instructor_name: string | null
  total_duration: number
  lesson_count: number
  completed_lessons: number
  progress_percentage: number
  is_completed: boolean
  certificate_url: string | null
  lessons: Lesson[]
}

interface CourseDetailProps {
  courseId: string
  onBack: () => void
}

export default function CourseDetail({ courseId, onBack }: CourseDetailProps) {
  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)

  useEffect(() => {
    fetchCourseData()
  }, [courseId])

  const fetchCourseData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/academy/courses/${courseId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch course")
      }

      const data = await response.json()
      setCourse(data.course)
      setLessons(data.course?.lessons || [])
    } catch (err) {
      console.error("[v0] Error fetching course:", err)
      setError("Failed to load course. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleLessonClick = (lesson: Lesson) => {
    if (!lesson.is_locked) {
      setSelectedLessonId(lesson.id)
    }
  }

  const handleLessonComplete = () => {
    // Refresh course data to update progress
    fetchCourseData()
  }

  const handleNextLesson = () => {
    if (!selectedLessonId) return

    const currentIndex = lessons.findIndex((l) => l.id === selectedLessonId)
    if (currentIndex < lessons.length - 1) {
      const nextLesson = lessons[currentIndex + 1]
      if (!nextLesson.is_locked) {
        setSelectedLessonId(nextLesson.id)
      }
    }
  }

  const handlePrevLesson = () => {
    if (!selectedLessonId) return

    const currentIndex = lessons.findIndex((l) => l.id === selectedLessonId)
    if (currentIndex > 0) {
      setSelectedLessonId(lessons[currentIndex - 1].id)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatTotalDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const handleDownloadCertificate = async () => {
    if (!course?.certificate_url) return

    try {
      const response = await fetch(course.certificate_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${course.title}-certificate.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("[v0] Error downloading certificate:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-stone-600 animate-spin" />
      </div>
    )
  }

  if (error || !course) {
    return (
      <div className="bg-white/50 backdrop-blur-xl border border-white/60 rounded-[1.75rem] p-8 text-center">
        <p className="text-stone-600 font-light mb-4">{error || "Course not found"}</p>
        <button
          onClick={onBack}
          className="px-6 py-3 bg-stone-950 text-stone-50 rounded-xl font-light tracking-[0.15em] uppercase text-sm hover:bg-stone-800 transition-all duration-200"
        >
          Back to Courses
        </button>
      </div>
    )
  }

  const progressPercentage = course.progress_percentage ?? 0
  const completedLessons = course.completed_lessons ?? 0
  const lessonCount = course.lesson_count ?? 0

  const currentLessonIndex = selectedLessonId ? lessons.findIndex((l) => l.id === selectedLessonId) : -1
  const hasNextLesson = currentLessonIndex >= 0 && currentLessonIndex < lessons.length - 1
  const hasPrevLesson = currentLessonIndex > 0

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="text-sm font-light tracking-[0.15em] uppercase text-stone-600 hover:text-stone-950 transition-colors"
      >
        ← Back to Courses
      </button>

      {/* Course Header */}
      <div className="bg-white/50 backdrop-blur-xl border border-white/60 rounded-[1.75rem] overflow-hidden shadow-xl shadow-stone-900/10">
        {/* Thumbnail */}
        {course.thumbnail_url && (
          <div className="aspect-video relative overflow-hidden bg-stone-200/30">
            <img
              src={course.thumbnail_url || "/placeholder.svg"}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Course Info */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Title & Description */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-3xl sm:text-4xl font-serif font-extralight tracking-[0.2em] uppercase text-stone-950 leading-tight">
                {course.title}
              </h1>
              {course.is_completed && (
                <span className="px-4 py-2 bg-stone-950 text-stone-50 rounded-full text-xs tracking-[0.15em] uppercase font-light whitespace-nowrap">
                  Completed
                </span>
              )}
            </div>

            {course.description && (
              <p className="text-base font-light text-stone-600 leading-relaxed">{course.description}</p>
            )}
          </div>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-6 text-xs tracking-[0.1em] uppercase font-light text-stone-500">
            {course.instructor_name && <span>By {course.instructor_name}</span>}
            <span>{formatTotalDuration(course.total_duration)}</span>
            <span>{course.lesson_count} Lessons</span>
          </div>

          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs tracking-[0.15em] uppercase font-light text-stone-500">Course Progress</span>
              <span className="text-sm font-light text-stone-950">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-stone-950 transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs font-light text-stone-500">
              {completedLessons} of {lessonCount} lessons completed
            </p>
          </div>

          {/* Certificate Download */}
          {course.is_completed && course.certificate_url && (
            <button
              onClick={handleDownloadCertificate}
              className="w-full bg-stone-950 text-stone-50 py-4 rounded-[1.25rem] font-light tracking-[0.15em] uppercase text-sm hover:bg-stone-800 transition-all duration-200 shadow-xl shadow-stone-900/20"
            >
              Download Certificate
            </button>
          )}
        </div>
      </div>

      {/* Lesson List */}
      <div className="bg-white/50 backdrop-blur-xl border border-white/60 rounded-[1.75rem] p-6 sm:p-8 shadow-xl shadow-stone-900/10">
        <h2 className="text-2xl font-serif font-extralight tracking-[0.2em] uppercase text-stone-950 mb-6">
          Course Content
        </h2>

        <div className="space-y-3">
          {lessons.map((lesson, index) => (
            <button
              key={lesson.id}
              onClick={() => handleLessonClick(lesson)}
              disabled={lesson.is_locked}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                lesson.is_locked
                  ? "border-stone-200 bg-stone-50/50 opacity-60 cursor-not-allowed"
                  : "border-stone-200 hover:border-stone-400 hover:bg-white/80 cursor-pointer"
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Status Icon */}
                <div className="flex-shrink-0 mt-1">
                  {lesson.is_locked ? (
                    <div className="w-6 h-6 rounded-full bg-stone-200 flex items-center justify-center">
                      <Lock size={14} className="text-stone-500" strokeWidth={2} />
                    </div>
                  ) : lesson.is_completed ? (
                    <CheckCircle2 size={24} className="text-stone-950" strokeWidth={1.5} />
                  ) : (
                    <Circle size={24} className="text-stone-400" strokeWidth={1.5} />
                  )}
                </div>

                {/* Lesson Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs tracking-[0.15em] uppercase font-light text-stone-500">
                          Lesson {index + 1}
                        </span>
                        {lesson.is_completed && (
                          <span className="px-2 py-0.5 bg-stone-950 text-stone-50 rounded-full text-[10px] tracking-[0.15em] uppercase font-light">
                            Done
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-stone-950 mb-1">{lesson.title}</h3>
                      {lesson.description && (
                        <p className="text-xs font-light text-stone-600 line-clamp-2">{lesson.description}</p>
                      )}
                    </div>
                    <span className="text-xs font-light text-stone-500 whitespace-nowrap">
                      {formatDuration(lesson.duration_seconds)}
                    </span>
                  </div>

                  {lesson.is_locked && (
                    <p className="text-xs font-light text-stone-500 italic">Complete previous lessons to unlock</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lesson Modal */}
      {selectedLessonId && (
        <LessonModal
          lessonId={selectedLessonId}
          courseId={courseId}
          onClose={() => setSelectedLessonId(null)}
          onLessonComplete={handleLessonComplete}
          onNextLesson={hasNextLesson ? handleNextLesson : undefined}
          onPrevLesson={hasPrevLesson ? handlePrevLesson : undefined}
        />
      )}
    </div>
  )
}
