"use client"

/**
 * In-app lesson viewer.
 *
 * Wraps LessonViewerClient (the canonical cream/ink lesson UI) so it can render
 * inside the app shell — no standalone page, no dark modal. It fetches the full
 * lesson detail (video URL, content, resources, notes) client-side, then hands
 * everything to LessonViewerClient with callback-based navigation.
 *
 * Used by CourseDetail when a lesson is clicked.
 */

import { useEffect, useState } from "react"

import { LessonViewerClient } from "@/app/academy/courses/[courseId]/lessons/[lessonId]/lesson-viewer-client"
import type { CourseLesson } from "@/app/academy/_lib/client-utils"

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal lesson info already available from the course fetch */
interface BasicLesson {
  id: string
  lesson_number: number
  title: string
  duration_seconds: number
  order_index: number
  is_completed: boolean
}

interface InAppLessonViewerProps {
  courseId: string
  lessonId: string
  courseTitle: string
  courseDescription: string | null
  lessons: BasicLesson[]
  onBack: () => void
  onNavigate: (lessonId: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCourseLessons(
  lessons: BasicLesson[],
  currentLessonId: string,
): CourseLesson[] {
  return lessons.map((l, idx) => ({
    id: Number(l.id),
    course_id: 0, // not needed for rendering
    lesson_number: l.lesson_number || idx + 1,
    title: l.title,
    description: null,
    lesson_type: "video" as const,
    video_url: null,
    duration_seconds: l.duration_seconds ?? null,
    content: null,
    resources: undefined,
    durationSeconds: l.duration_seconds ?? 0,
    completed: l.is_completed,
    current: l.id === currentLessonId,
    startHere: idx === 0,
  }))
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InAppLessonViewer({
  courseId,
  lessonId,
  courseTitle,
  courseDescription,
  lessons,
  onBack,
  onNavigate,
}: InAppLessonViewerProps) {
  const [lessonDetail, setLessonDetail] = useState<CourseLesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    setLessonDetail(null)

    fetch(`/api/academy/lessons/${lessonId}`)
      .then(async (r) => {
        const data = await r.json()
        if (!active) return
        if (!r.ok || !data.lesson) {
          throw new Error(data.error || "Failed to load lesson")
        }
        const l = data.lesson
        const progressStatus = data.progress?.status
        setLessonDetail({
          id: l.id,
          course_id: Number(courseId),
          lesson_number: l.lesson_number ?? 1,
          title: l.title,
          description: l.description ?? null,
          lesson_type: l.lesson_type ?? "video",
          video_url: l.video_url ?? null,
          duration_seconds: l.duration_seconds ?? null,
          content: l.content ?? null,
          resources: undefined,
          durationSeconds: l.duration_seconds ?? 0,
          completed: progressStatus === "completed",
          current: true,
          startHere: (l.lesson_number ?? 1) === 1,
        })
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : "Failed to load lesson")
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [courseId, lessonId])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="font-['Inter'] text-[10px] uppercase tracking-[0.5em] font-semibold text-[color:var(--app-text-muted,#8a8780)]">
          Loading lesson…
        </p>
      </div>
    )
  }

  if (error || !lessonDetail) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
        <p className="font-['Inter'] text-[13px] text-[color:var(--app-text-secondary,#666666)]">
          {error || "Lesson not found"}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="font-['Inter'] text-[10px] uppercase tracking-[0.5em] font-semibold text-[color:var(--app-text-muted,#8a8780)] hover:opacity-70 transition-opacity"
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          ← Back to course
        </button>
      </div>
    )
  }

  // ── Build the full CourseLesson list for the sidebar ──────────────────────
  const courseLessons = buildCourseLessons(lessons, lessonId)

  // Merge the real progress & completion data from the lesson detail into the
  // current lesson entry so the sidebar tick is accurate.
  const mergedLessons = courseLessons.map((l) =>
    l.id === lessonDetail.id ? { ...l, completed: lessonDetail.completed } : l,
  )

  // Prev / next
  const currentIdx = lessons.findIndex((l) => l.id === lessonId)
  const previousLesson =
    currentIdx > 0
      ? { id: Number(lessons[currentIdx - 1].id), title: lessons[currentIdx - 1].title }
      : null
  const nextLesson =
    currentIdx >= 0 && currentIdx < lessons.length - 1
      ? { id: Number(lessons[currentIdx + 1].id), title: lessons[currentIdx + 1].title }
      : null

  return (
    <LessonViewerClient
      course={{ id: Number(courseId), title: courseTitle, description: courseDescription }}
      lesson={lessonDetail}
      lessons={mergedLessons}
      previousLesson={previousLesson}
      nextLesson={nextLesson}
      onBack={onBack}
      onNavigateLesson={(id) => onNavigate(String(id))}
    />
  )
}
