"use client"

import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { useEffect, useRef, useState, useTransition } from "react"

import {
  formatLessonDuration,
  type CourseLesson,
} from "@/app/academy/_lib/client-utils"
import { LessonMayaChat } from "@/components/sselfie/academy/lesson-maya-chat"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "500", "600"],
})

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  ink: "#0F0D0B",
  inkSoft: "#1E1A15",
  cream: "#EDE9E2",
  stone: "#C4B5A0",
  muted: "#7A6F63",
  div: "rgba(237,233,226,0.10)",
}

const LP =
  "0 2px 8px rgba(0,0,0,0.8), 0 -1px 0 rgba(255,255,255,0.06), 1px 1px 0 rgba(0,0,0,0.5)"

// ─── Types ────────────────────────────────────────────────────────────────────
type ActionLevel = "bare_minimum" | "bold_move" | "bonus_vibe"
type MobileTab = "lesson" | "action" | "resources"

type LessonViewerClientProps = {
  course: {
    id: number
    title: string
    description: string | null
  }
  lesson: CourseLesson
  lessons: CourseLesson[]
  previousLesson: { id: number; title: string } | null
  nextLesson: { id: number; title: string } | null
}

type LessonNotesResponse = {
  reflection: string | null
  action_level: ActionLevel | null
  profile_answer: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseVimeoId(url: string | null | undefined): string | null {
  if (!url) return null
  const match = url.match(/vimeo\.com\/(\d+)/)
  return match ? match[1] : null
}

async function getApiErrorMessage(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => null)) as { error?: string } | null
  return data?.error || fallback
}

function TabChip({
  active,
  onClick,
  children,
  className = "",
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${inter.className} px-5 py-[10px] text-[10px] uppercase tracking-[0.22em] transition-colors ${className}`}
      style={{
        fontWeight: 600,
        border: active
          ? `1px solid rgba(237,233,226,0.35)`
          : `1px solid rgba(237,233,226,0.14)`,
        background: active ? "rgba(237,233,226,0.07)" : "transparent",
        color: active ? C.cream : C.muted,
      }}
    >
      {children}
    </button>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export function LessonViewerClient({
  course,
  lesson,
  lessons,
  previousLesson,
  nextLesson,
}: LessonViewerClientProps) {
  const lessonContent = lesson.content || {}
  const vimeoId = parseVimeoId(lesson.video_url)
  const resources = lessonContent.resources || []
  const keyTakeaways = lessonContent.key_takeaways || []
  const actionStep = lessonContent.action_step || {}
  const hasProfileField = Boolean(lessonContent.profile_field)

  const [mobileTab, setMobileTab] = useState<MobileTab>("lesson")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedActionTab, setSelectedActionTab] = useState<ActionLevel>("bold_move")
  const [chosenActionLevel, setChosenActionLevel] = useState<ActionLevel | null>(null)
  const [reflection, setReflection] = useState("")
  const [profileAnswer, setProfileAnswer] = useState("")
  const [currentLessonCompleted, setCurrentLessonCompleted] = useState(lesson.completed)
  const [lessonStates, setLessonStates] = useState(lessons)
  const [savedFlash, setSavedFlash] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [notesLoaded, setNotesLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const reflectionSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let active = true

    async function bootstrap() {
      try {
        const [enrollResponse, progressResponse] = await Promise.all([
          fetch("/api/academy/enroll", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ courseId: course.id }),
          }),
          fetch("/api/academy/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lessonId: lesson.id, action: "start" }),
          }),
        ])

        if (!enrollResponse.ok) {
          throw new Error(await getApiErrorMessage(enrollResponse, "Failed to enroll in course"))
        }

        if (!progressResponse.ok) {
          throw new Error(await getApiErrorMessage(progressResponse, "Failed to start lesson"))
        }

        const notesResponse = await fetch(`/api/academy/lessons/${lesson.id}/notes`, {
          cache: "no-store",
        })

        if (!notesResponse.ok) {
          throw new Error("Failed to load lesson notes")
        }

        const notes = (await notesResponse.json()) as LessonNotesResponse
        if (!active) return

        setReflection(notes.reflection || "")
        setProfileAnswer(notes.profile_answer || "")
        setChosenActionLevel(notes.action_level)
        if (notes.action_level) {
          setSelectedActionTab(notes.action_level)
        }
        setNotesLoaded(true)
      } catch (bootstrapError) {
        if (!active) return
        setError(
          bootstrapError instanceof Error ? bootstrapError.message : "Failed to load lesson"
        )
      }
    }

    void bootstrap()

    return () => {
      active = false
      if (reflectionSaveTimer.current) clearTimeout(reflectionSaveTimer.current)
      if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current)
    }
  }, [course.id, lesson.id])

  function showSavedFlash() {
    setSavedFlash(true)
    if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current)
    savedFlashTimer.current = setTimeout(() => setSavedFlash(false), 1500)
  }

  async function saveNotes(payload: Partial<LessonNotesResponse>) {
    const response = await fetch(`/api/academy/lessons/${lesson.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      throw new Error(data?.error || "Failed to save notes")
    }

    return (await response.json()) as { success: true; profileUpdated: boolean }
  }

  function handleChooseActionLevel(level: ActionLevel) {
    setChosenActionLevel(level)
    setError(null)
    startTransition(async () => {
      try {
        await saveNotes({ action_level: level })
        showSavedFlash()
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Failed to save action level")
      }
    })
  }

  function handleReflectionBlur() {
    if (reflectionSaveTimer.current) clearTimeout(reflectionSaveTimer.current)
    reflectionSaveTimer.current = setTimeout(() => {
      startTransition(async () => {
        try {
          await saveNotes({ reflection })
          showSavedFlash()
        } catch (saveError) {
          setError(saveError instanceof Error ? saveError.message : "Failed to save reflection")
        }
      })
    }, 300)
  }

  function handleToggleComplete() {
    const nextCompleted = !currentLessonCompleted
    setCurrentLessonCompleted(nextCompleted)
    setLessonStates(current =>
      current.map(item =>
        item.id === lesson.id ? { ...item, completed: nextCompleted } : item
      )
    )
    setError(null)

    startTransition(async () => {
      try {
        const response = await fetch("/api/academy/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId: lesson.id,
            action: nextCompleted ? "complete" : "incomplete",
          }),
        })

        if (!response.ok) {
          throw new Error(await getApiErrorMessage(response, "Failed to update progress"))
        }
      } catch (saveError) {
        setCurrentLessonCompleted(!nextCompleted)
        setLessonStates(current =>
          current.map(item =>
            item.id === lesson.id ? { ...item, completed: !nextCompleted } : item
          )
        )
        setError(saveError instanceof Error ? saveError.message : "Failed to update progress")
      }
    })
  }

  function handleSaveProfileAnswer() {
    if (!hasProfileField || !profileAnswer.trim()) return
    setError(null)
    setProfileSaved(false)
    startTransition(async () => {
      try {
        const result = await saveNotes({ profile_answer: profileAnswer })
        if (result.profileUpdated) setProfileSaved(true)
      } catch (saveError) {
        setError(
          saveError instanceof Error ? saveError.message : "Failed to save to Maya profile"
        )
      }
    })
  }

  const selectedActionText =
    actionStep[selectedActionTab] ||
    actionStep.bold_move ||
    actionStep.bare_minimum ||
    actionStep.bonus_vibe ||
    ""

  // ─── Sidebar lesson list ───────────────────────────────────────────────────
  const desktopLessonList = (
    <div className="pb-6" style={{ borderBottom: `1px solid ${C.div}` }}>
      <button
        type="button"
        onClick={() => setSidebarCollapsed(current => !current)}
        className="flex w-full items-center justify-between"
      >
        <span
          className={`${inter.className} text-[10px] uppercase tracking-[0.5em]`}
          style={{ color: C.muted, fontWeight: 600 }}
        >
          Course Lessons
        </span>
        <span style={{ color: C.muted, fontSize: 14 }}>{sidebarCollapsed ? "↓" : "↑"}</span>
      </button>

      {!sidebarCollapsed ? (
        <div className="mt-5 space-y-1">
          {lessonStates.map((item) => (
            <Link
              key={item.id}
              href={`/academy/courses/${course.id}/lessons/${item.id}`}
              className="grid grid-cols-[16px_36px_minmax(0,1fr)_46px] items-center gap-3 px-3 py-2 transition-colors"
              style={{
                background: item.current ? "rgba(237,233,226,0.06)" : "transparent",
              }}
            >
              <span
                className={`${inter.className} text-[10px]`}
                style={{ color: item.completed ? C.stone : "transparent", fontWeight: 600 }}
              >
                {item.completed ? "✓" : item.current ? "→" : ""}
              </span>
              <span
                className={`${cormorant.className}`}
                style={{ fontWeight: 300, fontSize: 22, color: C.stone, lineHeight: 1 }}
              >
                {String(item.lesson_number).padStart(2, "0")}
              </span>
              <span
                className={`${inter.className} truncate text-[13px]`}
                style={{ color: item.current ? C.cream : C.stone, fontWeight: 300 }}
              >
                {item.title}
              </span>
              <span
                className={`${inter.className} text-right text-[10px] uppercase tracking-[0.2em]`}
                style={{ color: C.muted, fontWeight: 600 }}
              >
                {formatLessonDuration(item.durationSeconds)}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p
          className={`${inter.className} mt-3 text-[13px]`}
          style={{ color: C.muted, fontWeight: 300 }}
        >
          {lessonStates.length} lessons
        </p>
      )}
    </div>
  )

  // ─── Key takeaways ────────────────────────────────────────────────────────
  const keyTakeawaysSection = keyTakeaways.length > 0 ? (
    <section
      className="space-y-5 pt-6"
      style={{ borderTop: `1px solid ${C.div}` }}
    >
      <p
        className={`${inter.className} text-[10px] uppercase tracking-[0.5em]`}
        style={{ color: C.muted, fontWeight: 600 }}
      >
        Key Takeaways
      </p>
      <div className="space-y-5">
        {keyTakeaways.map((takeaway, index) => (
          <div key={`${takeaway}-${index}`} className="grid grid-cols-[32px_minmax(0,1fr)] gap-3">
            <span
              className={`${cormorant.className}`}
              style={{ fontWeight: 300, fontSize: 26, color: C.stone, textShadow: LP, lineHeight: 1 }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <p
              className={`${inter.className} text-[13px] leading-[1.72]`}
              style={{ color: C.stone, fontWeight: 300 }}
            >
              {takeaway}
            </p>
          </div>
        ))}
      </div>
    </section>
  ) : null

  // ─── Action step ──────────────────────────────────────────────────────────
  const actionSection = (
    <section
      className="space-y-5 pt-6"
      style={{ borderTop: `1px solid ${C.div}` }}
    >
      <p
        className={`${inter.className} text-[10px] uppercase tracking-[0.5em]`}
        style={{ color: C.muted, fontWeight: 600 }}
      >
        Your Action Step
      </p>

      {/* Tab selector */}
      <div className="flex flex-wrap gap-2">
        {(["bare_minimum", "bold_move", "bonus_vibe"] as ActionLevel[]).map((level) => (
          <TabChip
            key={level}
            active={selectedActionTab === level}
            onClick={() => setSelectedActionTab(level)}
          >
            {level === "bare_minimum"
              ? "Bare Minimum"
              : level === "bold_move"
              ? "Bold Move"
              : "Bonus Vibe"}
          </TabChip>
        ))}
      </div>

      <p
        className={`${inter.className} text-[14px] leading-[1.78]`}
        style={{ color: C.stone, fontWeight: 300 }}
      >
        {selectedActionText}
      </p>

      {/* Commitment */}
      <div className="space-y-3">
        <p
          className={`${inter.className} text-[10px] uppercase tracking-[0.5em]`}
          style={{ color: C.muted, fontWeight: 600 }}
        >
          Which level did you choose?
        </p>
        <div className="flex flex-wrap gap-2">
          {(["bare_minimum", "bold_move", "bonus_vibe"] as ActionLevel[]).map((level) => (
            <TabChip
              key={level}
              active={chosenActionLevel === level}
              onClick={() => handleChooseActionLevel(level)}
            >
              {level === "bare_minimum"
                ? "Bare Minimum"
                : level === "bold_move"
                ? "Bold Move"
                : "Bonus Vibe"}
            </TabChip>
          ))}
        </div>
        {savedFlash ? (
          <p
            className={`${inter.className} text-[12px] uppercase tracking-[0.3em]`}
            style={{ color: C.stone, fontWeight: 600 }}
          >
            Saved
          </p>
        ) : null}
      </div>
    </section>
  )

  // ─── Reflection ───────────────────────────────────────────────────────────
  const reflectionSection = (
    <section
      className="space-y-5 pt-6"
      style={{ borderTop: `1px solid ${C.div}` }}
    >
      <p
        className={`${inter.className} text-[10px] uppercase tracking-[0.5em]`}
        style={{ color: C.muted, fontWeight: 600 }}
      >
        Your Reflection
      </p>
      {lessonContent.reflection_prompt ? (
        <p
          className={`${inter.className} text-[14px] leading-[1.78]`}
          style={{ color: C.muted, fontWeight: 300 }}
        >
          {lessonContent.reflection_prompt}
        </p>
      ) : null}
      <textarea
        value={reflection}
        onChange={(event) => setReflection(event.target.value)}
        onBlur={handleReflectionBlur}
        placeholder="Write your thoughts here..."
        className={`${inter.className} min-h-36 w-full px-4 py-4 text-[14px] leading-[1.72] outline-none`}
        style={{
          background: "rgba(237,233,226,0.04)",
          border: `1px solid ${C.div}`,
          color: C.cream,
          fontWeight: 300,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "rgba(237,233,226,0.28)"
        }}
        onBlurCapture={(e) => {
          e.currentTarget.style.borderColor = C.div
        }}
      />

      {hasProfileField ? (
        <div
          className="space-y-5 pt-6"
          style={{ borderTop: `1px solid ${C.div}` }}
        >
          <p
            className={`${inter.className} text-[10px] uppercase tracking-[0.5em]`}
            style={{ color: C.muted, fontWeight: 600 }}
          >
            Save to Your Maya Profile
          </p>
          {lessonContent.profile_question ? (
            <p
              className={`${inter.className} text-[14px] leading-[1.78]`}
              style={{ color: C.muted, fontWeight: 300 }}
            >
              {lessonContent.profile_question}
            </p>
          ) : null}
          <textarea
            value={profileAnswer}
            onChange={(event) => {
              setProfileAnswer(event.target.value)
              if (profileSaved) setProfileSaved(false)
            }}
            placeholder="Write your answer here..."
            className={`${inter.className} min-h-28 w-full px-4 py-4 text-[14px] leading-[1.72] outline-none`}
            style={{
              background: "rgba(237,233,226,0.04)",
              border: `1px solid ${C.div}`,
              color: C.cream,
              fontWeight: 300,
            }}
          />
          <button
            type="button"
            onClick={handleSaveProfileAnswer}
            disabled={isPending || !profileAnswer.trim()}
            className={`${inter.className} px-6 py-[10px] text-[10px] uppercase tracking-[0.22em] transition-opacity disabled:opacity-40`}
            style={{
              border: `1px solid rgba(237,233,226,0.22)`,
              color: C.cream,
              fontWeight: 600,
              background: "transparent",
            }}
          >
            Save to Maya Profile
          </button>
          {profileSaved ? (
            <p
              className={`${inter.className} text-[12px] uppercase tracking-[0.3em]`}
              style={{ color: C.stone, fontWeight: 600 }}
            >
              ✓ Saved — Maya will use this in every session.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )

  // ─── Resources / downloads ────────────────────────────────────────────────
  const resourcesSection = resources.length > 0 ? (
    <section
      className="space-y-5 pt-6"
      style={{ borderTop: `1px solid ${C.div}` }}
    >
      <p
        className={`${inter.className} text-[10px] uppercase tracking-[0.5em]`}
        style={{ color: C.muted, fontWeight: 600 }}
      >
        Downloads
      </p>
      <div className="space-y-2">
        {resources.map((resource) => (
          <a
            key={`${resource.title}-${resource.url}`}
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-4 px-4 py-4 transition-colors"
            style={{
              border: `1px solid ${C.div}`,
              color: C.stone,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(237,233,226,0.05)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent"
            }}
          >
            <span
              className={`${inter.className} text-[14px] leading-[1.72]`}
              style={{ color: C.stone, fontWeight: 300 }}
            >
              {resource.title}
            </span>
            <span
              className={`${inter.className} shrink-0 text-[10px] uppercase tracking-[0.35em]`}
              style={{ color: C.cream, fontWeight: 600 }}
            >
              ↓ Download
            </span>
          </a>
        ))}
      </div>
    </section>
  ) : null

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <main
      className="min-h-screen"
      style={{ background: C.ink, color: C.cream }}
    >
      <div className="mx-auto max-w-[1480px] px-6 py-10 md:px-10 md:py-12">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">

          {/* ── Main column ── */}
          <section className="space-y-6">
            {/* Back link */}
            <Link
              href={`/academy/courses/${course.id}`}
              className={`${inter.className} text-[10px] uppercase tracking-[0.5em] transition-opacity hover:opacity-70`}
              style={{ color: C.muted, fontWeight: 600 }}
            >
              ← {course.title}
            </Link>

            {/* Video */}
            <div
              className="relative overflow-hidden"
              style={{ aspectRatio: "16 / 9", background: "#000" }}
            >
              {vimeoId ? (
                <iframe
                  src={`https://player.vimeo.com/video/${vimeoId}?badge=0&autopause=0&player_id=0&app_id=58479`}
                  className="absolute inset-0 h-full w-full"
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                  allowFullScreen
                />
              ) : (
                <div
                  className="flex h-full items-center justify-center px-6 text-center"
                  style={{ color: C.muted }}
                >
                  Lesson video unavailable.
                </div>
              )}
            </div>

            {/* Maya chat — embedded directly below video, no page navigation */}
            <LessonMayaChat
              lessonTitle={lesson.title}
              courseTitle={course.title}
              keyTakeaways={keyTakeaways as string[]}
              actionStep={actionStep as Record<string, string>}
              chosenActionLevel={chosenActionLevel}
              reflectionPrompt={lessonContent.reflection_prompt ?? undefined}
            />

            {/* Lesson meta */}
            <div className="space-y-4">
              <p
                className={`${inter.className} text-[10px] uppercase tracking-[0.5em]`}
                style={{ color: C.muted, fontWeight: 600 }}
              >
                Lesson {String(lesson.lesson_number).padStart(2, "0")} ·{" "}
                {formatLessonDuration(lesson.durationSeconds)}
              </p>
              <h1
                className={`${cormorant.className} uppercase`}
                style={{
                  fontWeight: 300,
                  fontSize: "clamp(28px, 5vw, 52px)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.01em",
                  textShadow: LP,
                }}
              >
                {lesson.title}
              </h1>
            </div>

            {/* Prev / Next */}
            <div
              className="flex items-center justify-between gap-6 pt-6"
              style={{ borderTop: `1px solid ${C.div}` }}
            >
              {previousLesson ? (
                <Link
                  href={`/academy/courses/${course.id}/lessons/${previousLesson.id}`}
                  className={`${inter.className} text-[10px] uppercase tracking-[0.4em] transition-opacity hover:opacity-70`}
                  style={{ color: C.muted, fontWeight: 600 }}
                >
                  ← Previous
                </Link>
              ) : (
                <span />
              )}
              {nextLesson ? (
                <Link
                  href={`/academy/courses/${course.id}/lessons/${nextLesson.id}`}
                  className={`${inter.className} text-[10px] uppercase tracking-[0.4em] transition-opacity hover:opacity-70`}
                  style={{ color: C.muted, fontWeight: 600 }}
                >
                  Next →
                </Link>
              ) : null}
            </div>

            {/* Complete toggle */}
            <div
              className="flex flex-wrap items-center gap-4 pt-6"
              style={{ borderTop: `1px solid ${C.div}` }}
            >
              <button
                type="button"
                onClick={handleToggleComplete}
                className={`${inter.className} px-6 py-[10px] text-[10px] uppercase tracking-[0.22em] transition-opacity hover:opacity-90`}
                style={
                  currentLessonCompleted
                    ? {
                        background: C.cream,
                        color: C.ink,
                        border: "1px solid transparent",
                        fontWeight: 600,
                        boxShadow:
                          "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)",
                      }
                    : {
                        background: "transparent",
                        color: C.cream,
                        border: `1px solid rgba(237,233,226,0.22)`,
                        fontWeight: 600,
                      }
                }
              >
                {currentLessonCompleted ? "✓ Completed" : "Mark as complete"}
              </button>
              {currentLessonCompleted ? (
                <button
                  type="button"
                  onClick={handleToggleComplete}
                  className={`${inter.className} text-[10px] uppercase tracking-[0.4em] transition-opacity hover:opacity-70`}
                  style={{ color: C.muted, fontWeight: 600, background: "none", border: "none" }}
                >
                  Mark incomplete
                </button>
              ) : null}
            </div>

            {/* ── Mobile tab bar ── */}
            <div
              className="pt-6 md:hidden"
              style={{ borderTop: `1px solid ${C.div}` }}
            >
              <div className="flex flex-wrap gap-2">
                {(["lesson", "action", "resources"] as MobileTab[]).map((tab) => (
                  <TabChip
                    key={tab}
                    active={mobileTab === tab}
                    onClick={() => setMobileTab(tab)}
                  >
                    {tab === "lesson" ? "Lesson" : tab === "action" ? "Action" : "Resources"}
                  </TabChip>
                ))}
              </div>

              <div className="mt-6 space-y-6">
                {mobileTab === "lesson" ? (
                  <>
                    {desktopLessonList}
                    {keyTakeawaysSection}
                    {reflectionSection}
                  </>
                ) : null}
                {mobileTab === "action" ? (
                  <>
                    {actionSection}
                    <LessonMayaChat
                      lessonTitle={lesson.title}
                      courseTitle={course.title}
                      keyTakeaways={keyTakeaways as string[]}
                      actionStep={actionStep as Record<string, string>}
                      chosenActionLevel={chosenActionLevel}
                      reflectionPrompt={lessonContent.reflection_prompt ?? undefined}
                    />
                  </>
                ) : null}
                {mobileTab === "resources"
                  ? resourcesSection || (
                      <p
                        className={`${inter.className} text-[14px]`}
                        style={{ color: C.muted, fontWeight: 300 }}
                      >
                        Nothing to download for this lesson yet.
                      </p>
                    )
                  : null}
              </div>
            </div>
          </section>

          {/* ── Desktop sidebar ── */}
          <aside className="hidden md:block">
            <div
              className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto p-6"
              style={{
                background: C.inkSoft,
                border: `1px solid ${C.div}`,
              }}
            >
              <div className="space-y-6">
                {desktopLessonList}
                {keyTakeawaysSection}
                {actionSection}
                {reflectionSection}
                {resourcesSection}
              </div>
            </div>
          </aside>
        </div>

        {/* ── Error / loading states ── */}
        {error ? (
          <p
            className={`${inter.className} mt-6 text-[13px]`}
            style={{ color: "#E57373", fontWeight: 300 }}
          >
            {error}
          </p>
        ) : null}

        {!notesLoaded ? (
          <p
            className={`${inter.className} mt-6 text-[10px] uppercase tracking-[0.4em]`}
            style={{ color: C.muted, fontWeight: 600 }}
          >
            Loading lesson companion...
          </p>
        ) : null}
      </div>
    </main>
  )
}
