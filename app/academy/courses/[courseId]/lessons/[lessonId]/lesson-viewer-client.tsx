"use client"

import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { useEffect, useRef, useState, useTransition } from "react"

import {
  formatLessonDuration,
  type CourseLesson,
} from "@/app/academy/_lib/client-utils"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "500"],
})

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

function parseVimeoId(url: string | null | undefined): string | null {
  if (!url) return null
  const match = url.match(/vimeo\.com\/(\d+)/)
  return match ? match[1] : null
}

function pillClass(active: boolean) {
  return [
    "rounded-full border px-5 py-2 text-[11px] uppercase tracking-[0.3em] transition-colors",
    active
      ? "border-[rgba(195,190,182,0.5)] bg-[rgba(175,170,162,0.20)] text-[#f0ede8]"
      : "border-[rgba(195,190,182,0.25)] text-[#f0ede8] hover:bg-[rgba(175,170,162,0.15)]",
  ].join(" ")
}

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
        await Promise.all([
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
    if (savedFlashTimer.current) {
      clearTimeout(savedFlashTimer.current)
    }
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
    if (reflectionSaveTimer.current) {
      clearTimeout(reflectionSaveTimer.current)
    }

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
        await fetch("/api/academy/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lessonId: lesson.id,
            action: nextCompleted ? "complete" : "incomplete",
          }),
        })
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
    if (!hasProfileField || !profileAnswer.trim()) {
      return
    }

    setError(null)
    setProfileSaved(false)
    startTransition(async () => {
      try {
        const result = await saveNotes({ profile_answer: profileAnswer })
        if (result.profileUpdated) {
          setProfileSaved(true)
        }
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

  const desktopLessonList = (
    <div className="border-b border-[rgba(195,190,182,0.12)] pb-6">
      <button
        type="button"
        onClick={() => setSidebarCollapsed(current => !current)}
        className="flex w-full items-center justify-between"
      >
        <span
          className={`${inter.className} text-[10px] uppercase tracking-[0.5em] text-[#8a8780]`}
          style={{ fontWeight: 500 }}
        >
          Course Lessons
        </span>
        <span className="text-sm text-[#8a8780]">{sidebarCollapsed ? "↓" : "↑"}</span>
      </button>

      {!sidebarCollapsed ? (
        <div className="mt-5 space-y-2">
          {lessonStates.map((item) => (
            <Link
              key={item.id}
              href={`/academy/courses/${course.id}/lessons/${item.id}`}
              className={`grid grid-cols-[18px_40px_minmax(0,1fr)_52px] items-center gap-3 rounded-[18px] px-3 py-2 transition-colors ${
                item.current ? "bg-[rgba(175,170,162,0.12)]" : "hover:bg-[rgba(175,170,162,0.08)]"
              }`}
            >
              <span className="text-sm text-[#c9a96e]">
                {item.completed ? "✓" : item.current ? "→" : ""}
              </span>
              <span
                className={`${cormorant.className} text-2xl text-[#c8c4bb]`}
                style={{ fontWeight: 300 }}
              >
                {String(item.lesson_number).padStart(2, "0")}
              </span>
              <span
                className={`${inter.className} truncate text-sm text-[#c8c4bb]`}
                style={{ fontWeight: 300 }}
              >
                {item.title}
              </span>
              <span
                className={`${inter.className} text-right text-[11px] uppercase tracking-[0.25em] text-[#8a8780]`}
                style={{ fontWeight: 500 }}
              >
                {formatLessonDuration(item.durationSeconds)}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p
          className={`${inter.className} mt-3 text-xs text-[#8a8780]`}
          style={{ fontWeight: 300 }}
        >
          {lessonStates.length} lessons
        </p>
      )}
    </div>
  )

  const keyTakeawaysSection = keyTakeaways.length > 0 ? (
    <section className="space-y-5 border-t border-[rgba(195,190,182,0.12)] pt-6">
      <p
        className={`${inter.className} text-[10px] uppercase tracking-[0.5em] text-[#8a8780]`}
        style={{ fontWeight: 500 }}
      >
        Key Takeaways
      </p>
      <div className="space-y-4">
        {keyTakeaways.map((takeaway, index) => (
          <div key={`${takeaway}-${index}`} className="grid grid-cols-[36px_minmax(0,1fr)] gap-3">
            <span
              className={`${cormorant.className} text-3xl text-[#c8c4bb]`}
              style={{ fontWeight: 300, lineHeight: 1 }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <p
              className={`${inter.className} text-[13px] leading-7 text-[#c8c4bb]`}
              style={{ fontWeight: 300 }}
            >
              {takeaway}
            </p>
          </div>
        ))}
      </div>
    </section>
  ) : null

  const actionSection = (
    <section className="space-y-5 border-t border-[rgba(195,190,182,0.12)] pt-6">
      <p
        className={`${inter.className} text-[10px] uppercase tracking-[0.5em] text-[#8a8780]`}
        style={{ fontWeight: 500 }}
      >
        Your Action Step
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={pillClass(selectedActionTab === "bare_minimum")}
          onClick={() => setSelectedActionTab("bare_minimum")}
        >
          Bare Minimum
        </button>
        <button
          type="button"
          className={pillClass(selectedActionTab === "bold_move")}
          onClick={() => setSelectedActionTab("bold_move")}
        >
          Bold Move
        </button>
        <button
          type="button"
          className={pillClass(selectedActionTab === "bonus_vibe")}
          onClick={() => setSelectedActionTab("bonus_vibe")}
        >
          Bonus Vibe
        </button>
      </div>

      <p
        className={`${inter.className} text-sm leading-8 text-[#c8c4bb]`}
        style={{ fontWeight: 300 }}
      >
        {selectedActionText}
      </p>

      <div className="space-y-3">
        <p
          className={`${inter.className} text-[10px] uppercase tracking-[0.5em] text-[#8a8780]`}
          style={{ fontWeight: 500 }}
        >
          Which level did you choose?
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={pillClass(chosenActionLevel === "bare_minimum")}
            onClick={() => handleChooseActionLevel("bare_minimum")}
          >
            Bare Minimum
          </button>
          <button
            type="button"
            className={pillClass(chosenActionLevel === "bold_move")}
            onClick={() => handleChooseActionLevel("bold_move")}
          >
            Bold Move
          </button>
          <button
            type="button"
            className={pillClass(chosenActionLevel === "bonus_vibe")}
            onClick={() => handleChooseActionLevel("bonus_vibe")}
          >
            Bonus Vibe
          </button>
        </div>
        {savedFlash ? (
          <p className="text-xs text-[#c8c4bb]">Saved</p>
        ) : null}
      </div>
    </section>
  )

  const reflectionSection = (
    <section className="space-y-5 border-t border-[rgba(195,190,182,0.12)] pt-6">
      <p
        className={`${inter.className} text-[10px] uppercase tracking-[0.5em] text-[#8a8780]`}
        style={{ fontWeight: 500 }}
      >
        Your Reflection
      </p>
      {lessonContent.reflection_prompt ? (
        <p
          className={`${inter.className} text-sm leading-8 text-[#8a8780]`}
          style={{ fontWeight: 300 }}
        >
          {lessonContent.reflection_prompt}
        </p>
      ) : null}
      <textarea
        value={reflection}
        onChange={(event) => setReflection(event.target.value)}
        onBlur={handleReflectionBlur}
        placeholder="Write your thoughts here..."
        className={`${inter.className} min-h-40 w-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.08)] px-4 py-4 text-sm leading-7 text-[#f0ede8] outline-none placeholder:text-[#8a8780] focus:border-[rgba(195,190,182,0.45)]`}
        style={{ fontWeight: 300 }}
      />

      {hasProfileField ? (
        <div className="space-y-5 border-t border-[rgba(195,190,182,0.12)] pt-6">
          <p
            className={`${inter.className} text-[10px] uppercase tracking-[0.5em] text-[#8a8780]`}
            style={{ fontWeight: 500 }}
          >
            Save to Your Maya Profile
          </p>
          {lessonContent.profile_question ? (
            <p
              className={`${inter.className} text-sm leading-8 text-[#8a8780]`}
              style={{ fontWeight: 300 }}
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
            className={`${inter.className} min-h-32 w-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.08)] px-4 py-4 text-sm leading-7 text-[#f0ede8] outline-none placeholder:text-[#8a8780] focus:border-[rgba(195,190,182,0.45)]`}
            style={{ fontWeight: 300 }}
          />
          <button
            type="button"
            onClick={handleSaveProfileAnswer}
            className={pillClass(false)}
            disabled={isPending || !profileAnswer.trim()}
          >
            Save to Maya Profile
          </button>
          {profileSaved ? (
            <p
              className={`${inter.className} text-sm leading-7 text-[#c9a96e]`}
              style={{ fontWeight: 500 }}
            >
              ✓ Saved to your Maya profile — Maya will use this in every session.
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  )

  const resourcesSection = resources.length > 0 ? (
    <section className="space-y-5 border-t border-[rgba(195,190,182,0.12)] pt-6">
      <p
        className={`${inter.className} text-[10px] uppercase tracking-[0.5em] text-[#8a8780]`}
        style={{ fontWeight: 500 }}
      >
        Downloads
      </p>
      <div className="space-y-3">
        {resources.map((resource) => (
          <a
            key={`${resource.title}-${resource.url}`}
            href={resource.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between gap-4 border border-[rgba(195,190,182,0.15)] px-4 py-4 transition-colors hover:bg-[rgba(175,170,162,0.10)]"
          >
            <span
              className={`${inter.className} text-sm leading-7 text-[#c8c4bb]`}
              style={{ fontWeight: 300 }}
            >
              {resource.title}
            </span>
            <span
              className={`${inter.className} shrink-0 text-[11px] uppercase tracking-[0.3em] text-[#f0ede8]`}
              style={{ fontWeight: 500 }}
            >
              ↓ Download
            </span>
          </a>
        ))}
      </div>
    </section>
  ) : null

  return (
    <main className="min-h-screen bg-[#0d0c0b] text-[#f0ede8]">
      <div className="mx-auto max-w-[1500px] px-6 py-8 md:px-10 md:py-10">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.9fr)]">
          <section className="space-y-6">
            <Link
              href={`/academy/courses/${course.id}`}
              className={`${inter.className} text-[10px] uppercase tracking-[0.5em] text-[#8a8780] transition-opacity hover:opacity-80`}
              style={{ fontWeight: 500 }}
            >
              ← Back to {course.title}
            </Link>

            <div className="relative overflow-hidden border border-[rgba(195,190,182,0.15)] bg-black" style={{ aspectRatio: "16 / 9" }}>
              {vimeoId ? (
                <iframe
                  src={`https://player.vimeo.com/video/${vimeoId}?badge=0&autopause=0&player_id=0&app_id=58479`}
                  className="absolute inset-0 h-full w-full"
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-[#8a8780]">
                  Lesson video unavailable.
                </div>
              )}
            </div>

            <div className="space-y-4">
              <p
                className={`${inter.className} text-[10px] uppercase tracking-[0.5em] text-[#8a8780]`}
                style={{ fontWeight: 500 }}
              >
                Lesson {String(lesson.lesson_number).padStart(2, "0")} · {formatLessonDuration(lesson.durationSeconds)}
              </p>
              <h1
                className={`${cormorant.className} text-4xl uppercase md:text-6xl`}
                style={{ fontWeight: 300, lineHeight: 0.95 }}
              >
                {lesson.title}
              </h1>
            </div>

            <div className="flex items-center justify-between gap-6 border-t border-[rgba(195,190,182,0.12)] pt-6">
              {previousLesson ? (
                <Link
                  href={`/academy/courses/${course.id}/lessons/${previousLesson.id}`}
                  className={`${inter.className} text-[11px] uppercase tracking-[0.3em] text-[#8a8780] transition-colors hover:text-[#f0ede8]`}
                  style={{ fontWeight: 500 }}
                >
                  ← Previous lesson
                </Link>
              ) : (
                <span />
              )}

              {nextLesson ? (
                <Link
                  href={`/academy/courses/${course.id}/lessons/${nextLesson.id}`}
                  className={`${inter.className} text-[11px] uppercase tracking-[0.3em] text-[#8a8780] transition-colors hover:text-[#f0ede8]`}
                  style={{ fontWeight: 500 }}
                >
                  Next lesson →
                </Link>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t border-[rgba(195,190,182,0.12)] pt-6">
              <button
                type="button"
                onClick={handleToggleComplete}
                className={pillClass(currentLessonCompleted)}
              >
                {currentLessonCompleted ? "✓ Completed" : "Mark as complete"}
              </button>
              {currentLessonCompleted ? (
                <button
                  type="button"
                  onClick={handleToggleComplete}
                  className={`${inter.className} text-[11px] uppercase tracking-[0.3em] text-[#8a8780] transition-colors hover:text-[#f0ede8]`}
                  style={{ fontWeight: 500 }}
                >
                  Mark incomplete
                </button>
              ) : null}
            </div>

            <div className="border-t border-[rgba(195,190,182,0.12)] pt-6 md:hidden">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={pillClass(mobileTab === "lesson")}
                  onClick={() => setMobileTab("lesson")}
                >
                  Lesson
                </button>
                <button
                  type="button"
                  className={pillClass(mobileTab === "action")}
                  onClick={() => setMobileTab("action")}
                >
                  Action
                </button>
                <button
                  type="button"
                  className={pillClass(mobileTab === "resources")}
                  onClick={() => setMobileTab("resources")}
                >
                  Resources
                </button>
              </div>

              <div className="mt-6 space-y-6">
                {mobileTab === "lesson" ? (
                  <>
                    {desktopLessonList}
                    {keyTakeawaysSection}
                    {reflectionSection}
                  </>
                ) : null}
                {mobileTab === "action" ? actionSection : null}
                {mobileTab === "resources" ? resourcesSection || (
                  <p
                    className={`${inter.className} text-sm text-[#8a8780]`}
                    style={{ fontWeight: 300 }}
                  >
                    Nothing to download for this lesson yet.
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <aside className="hidden md:block">
            <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto border border-[rgba(195,190,182,0.15)] bg-[rgba(175,170,162,0.10)] p-6 backdrop-blur-[50px]">
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

        {error ? (
          <p
            className={`${inter.className} mt-6 text-sm text-red-400`}
            style={{ fontWeight: 300 }}
          >
            {error}
          </p>
        ) : null}

        {!notesLoaded ? (
          <p
            className={`${inter.className} mt-6 text-xs uppercase tracking-[0.3em] text-[#8a8780]`}
            style={{ fontWeight: 500 }}
          >
            Loading lesson companion…
          </p>
        ) : null}
      </div>
    </main>
  )
}
