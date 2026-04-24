/**
 * Client-safe utilities for the Academy UI.
 * No server-only imports — safe to use in "use client" components.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type LessonContent = {
  key_takeaways?: string[]
  action_step?: {
    bare_minimum?: string
    bold_move?: string
    bonus_vibe?: string
  }
  reflection_prompt?: string
  profile_field?: string
  profile_label?: string
  profile_prompt?: string
  resources?: Array<{ label: string; url: string }>
}

export type CourseLesson = {
  id: number
  course_id: number
  lesson_number: number
  title: string
  description: string | null
  vimeo_id: string | null
  duration_seconds: number | null
  content: LessonContent | null
  durationSeconds: number
  completed: boolean
  current: boolean
  startHere: boolean
}

// ─── Pure formatting helpers ──────────────────────────────────────────────────

export function formatDurationLabel(totalSeconds: number): string {
  const totalMinutes = Math.max(0, Math.round(totalSeconds / 60))
  if (totalMinutes < 60) return `${totalMinutes} min`
  const hours   = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`
}

export function formatLessonDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function getLessonContent(content: unknown): LessonContent | null {
  if (!content || typeof content !== "object") return null
  return content as LessonContent
}
