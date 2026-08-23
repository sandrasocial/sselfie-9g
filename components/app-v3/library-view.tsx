"use client"

// SSELFIE Studio 3.0 - Library (BRIDGE-01 Phase C).
// "Your SSELFIE" - every product she owns in one place: courses with progress, one-time
// products, and the weekly drops. Locked previews for what she doesn't own yet, with one
// upgrade CTA (D3: members own everything, so members never see a lock). Editorial tiles,
// same visual language as Content. Course/product links open the existing Academy and
// access routes; v3-native rendering comes later.

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { trackAnalyticsEvent } from "@/lib/analytics/client"
import {
  finishMayaJob,
  recordMayaGuidanceServed,
  recordMayaJobDecision,
  recordMayaJobHandoff,
  startMayaJob,
} from "@/lib/app-v3/maya/job-analytics"
import type { MayaGuidanceResult, MayaGuidanceSourceRef } from "@/lib/app-v3/maya/guidance/types"
import type { LessonMayaTarget } from "./types"
import { LEARNING_DESTINATIONS } from "@/lib/app-v3/learning-destinations"

interface LibraryCourse {
  id: number
  title: string
  description: string | null
  lessonCount: number
  completedLessons: number
  progressPercentage: number
  started: boolean
  href: string
}

interface LibraryProduct {
  id: string
  name: string
  tagline: string | null
  eyebrow: string
  actionLabel: string
  thumbnailUrl: string | null
  accessUrl: string
}

interface LockedProduct {
  id: string
  eyebrow: string
  title: string
  description: string
  thumbnailUrl: string | null
  href: string
  ctaLabel: string
}

interface LibraryDrop {
  id: number | string
  title: string
  description: string | null
  thumbnailUrl: string | null
  month: string | null
  category: string | null
  publishedAt?: string | null
}

// A drop counts as new for two weeks after it lands, so the Library always shows
// what changed since the last Monday email without any extra state.
const NEW_DROP_WINDOW_MS = 14 * 24 * 60 * 60 * 1000

function isNewDrop(publishedAt: string | null | undefined): boolean {
  if (!publishedAt) return false
  const time = Date.parse(publishedAt)
  if (Number.isNaN(time)) return false
  const age = Date.now() - time
  return age >= 0 && age < NEW_DROP_WINDOW_MS
}

interface LibraryData {
  membershipActive: boolean
  courses: LibraryCourse[]
  ownedProducts: LibraryProduct[]
  lockedProducts: LockedProduct[]
  drops: LibraryDrop[]
  learningPlan?: {
    goal: LearnGoal
    recommendation: LearnRecommendation
    status: "active" | "completed"
    updated_at: string
  } | null
}

type LearnGoal = "what-to-post" | "sound-like-me" | "photos-no-plan" | "connect-offer"

interface LearnRecommendation {
  type: "course" | "product"
  id: string
  title: string
  href: string
  reason: string
  guidanceReason?: string
  taskId?: string
  courseId?: number
  lessonId?: number
  sourceRefs?: MayaGuidanceSourceRef[]
}

const LEARN_GOALS: Array<{ id: LearnGoal; label: string; reason: string }> = [
  {
    id: "what-to-post",
    label: "I don't know what to post",
    reason:
      "This gives you one clear place to start, then we can turn the lesson into your next post.",
  },
  {
    id: "sound-like-me",
    label: "My content doesn't sound like me",
    reason:
      "Start here to make your message clearer and more personal before creating more content.",
  },
  {
    id: "photos-no-plan",
    label: "I have photos but no plan",
    reason: "Use this lesson, then take what you learn straight into your Calendar.",
  },
  {
    id: "connect-offer",
    label: "I want my content to support my offer",
    reason: "This helps connect what you teach, what you sell and what your audience needs next.",
  },
]

function recommendationFor(data: LibraryData, goal: LearnGoal): LearnRecommendation | null {
  const incomplete = data.courses.filter(course => course.progressPercentage < 100)
  const keywords =
    goal === "photos-no-plan"
      ? /content|brand|plan/i
      : goal === "connect-offer"
        ? /brand|business|content/i
        : /brand|content|story/i
  const course =
    incomplete.find(item => keywords.test(`${item.title} ${item.description || ""}`)) ??
    incomplete[0] ??
    data.courses[0]
  const goalCopy = LEARN_GOALS.find(item => item.id === goal)
  if (course)
    return {
      type: "course",
      id: String(course.id),
      title: course.title,
      href: course.href,
      reason: goalCopy?.reason ?? "This is your clearest next step.",
    }
  const product = data.ownedProducts[0]
  if (product)
    return {
      type: "product",
      id: product.id,
      title: product.name,
      href: product.accessUrl,
      reason: goalCopy?.reason ?? "This is your clearest next step.",
    }
  return null
}

const card = "suite-card rounded-[8px] border border-[#C5C6C8]/60 bg-white"

function ProductTile({
  title,
  eyebrow,
  description,
  thumbnailUrl,
  href,
  actionLabel,
  locked = false,
}: {
  title: string
  eyebrow: string
  description: string | null
  thumbnailUrl: string | null
  href: string
  actionLabel: string
  locked?: boolean
}) {
  return (
    <Link
      href={href}
      className={`${card} group block overflow-hidden transition-colors hover:border-[#0D0E10]/40`}
    >
      <div className="relative aspect-[16/11] bg-[#F1F2F2] sm:aspect-[4/5]">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            className={`object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02] ${
              locked ? "saturate-[0.82]" : ""
            }`}
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-[10px] uppercase tracking-[0.22em] text-[#818283]">
            SSELFIE
          </div>
        )}
        {locked && (
          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[9px] uppercase tracking-[0.16em] text-[#0D0E10]">
            Locked
          </div>
        )}
      </div>
      <div className="p-4">
        <span className="text-[9px] uppercase tracking-[0.16em] text-[#818283]">{eyebrow}</span>
        <h3 className="mt-1.5 font-serif text-[21px] font-light leading-tight text-[#0D0E10]">
          {title}
        </h3>
        {description && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#4F5052]">{description}</p>
        )}
        <span className="mt-3 inline-flex min-h-8 items-center text-[11px] uppercase tracking-[0.18em] text-[#0D0E10] sm:mt-4">
          {actionLabel}
        </span>
      </div>
    </Link>
  )
}

export function LibraryView({
  onOpenMaya,
  onOpenCalendar,
  operatingLayerEnabled = false,
}: {
  onOpenMaya?: (target: LessonMayaTarget | string) => void
  onOpenCalendar?: () => void
  operatingLayerEnabled?: boolean
} = {}) {
  const [data, setData] = useState<LibraryData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guidanceError, setGuidanceError] = useState<string | null>(null)
  const [guidanceRequest, setGuidanceRequest] = useState<{
    goal: LearnGoal
    taskId: string
    memberGoal?: string
  } | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<LearnGoal | null>(null)
  const [recommendation, setRecommendation] = useState<LearnRecommendation | null>(null)
  const [savingPlan, setSavingPlan] = useState(false)
  const [planSaved, setPlanSaved] = useState(false)
  const [loadingGuidance, setLoadingGuidance] = useState(false)
  const [browseAllOpen, setBrowseAllOpen] = useState(false)

  async function requestGuidance(goal: LearnGoal, taskId: string, memberGoal?: string) {
    const startedAt = Date.now()
    setGuidanceError(null)
    setGuidanceRequest({ goal, taskId, memberGoal })
    setLoadingGuidance(true)
    setRecommendation(null)
    try {
      const goalLabel = memberGoal ?? LEARN_GOALS.find(item => item.id === goal)?.label ?? goal
      const response = await fetch("/api/app-v3/maya/guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, job: "learn_next", memberGoal: goalLabel }),
      })
      if (!response.ok) throw new Error("Guidance unavailable")
      const guidance = (await response.json()) as MayaGuidanceResult
      const lessonSource = guidance.sourceRefs.find(source => source.courseId && source.lessonId)
      if (!lessonSource?.courseId || !lessonSource.lessonId) {
        throw new Error("No owned lesson matched")
      }
      const nextRecommendation: LearnRecommendation = {
        type: "course",
        id: String(lessonSource.lessonId),
        title: lessonSource.title,
        href: `/academy/courses/${lessonSource.courseId}/lessons/${lessonSource.lessonId}`,
        reason: guidance.recommendation,
        guidanceReason: guidance.reason,
        taskId,
        courseId: lessonSource.courseId,
        lessonId: lessonSource.lessonId,
        sourceRefs: guidance.sourceRefs,
      }
      setRecommendation(nextRecommendation)
      recordMayaGuidanceServed("learn_next", guidance.sourceRefs.length, Date.now() - startedAt)
    } catch {
      setGuidanceError("Maya couldn't find your next lesson. Try again.")
    } finally {
      setLoadingGuidance(false)
    }
  }

  function loadLibrary() {
    setError(null)
    fetch("/api/app-v3/library")
      .then(r => {
        if (!r.ok) throw new Error(`Library returned ${r.status}`)
        return r.json()
      })
      .then(d => {
        if (d && Array.isArray(d.ownedProducts)) {
          const nextData = d as LibraryData
          setData(nextData)
          if (nextData.learningPlan?.goal && nextData.learningPlan?.recommendation) {
            setSelectedGoal(nextData.learningPlan.goal)
            const saved = nextData.learningPlan.recommendation
            if (operatingLayerEnabled && (!saved.courseId || !saved.lessonId || !saved.taskId)) {
              const taskId = startMayaJob({
                job: "learn_next",
                surface: "learn",
                entry: nextData.learningPlan.goal,
              })
              void requestGuidance(nextData.learningPlan.goal, taskId)
              setPlanSaved(false)
            } else {
              setRecommendation(saved)
              setPlanSaved(true)
            }
          } else if (operatingLayerEnabled && !nextData.learningPlan) {
            const goal: LearnGoal = "what-to-post"
            const taskId = startMayaJob({
              job: "learn_next",
              surface: "learn",
              entry: "maya_auto_recommendation",
            })
            setSelectedGoal(goal)
            void requestGuidance(
              goal,
              taskId,
              "Choose the most useful next lesson from what I own and my current progress."
            )
            setPlanSaved(false)
          }
        } else setError("Couldn't load your library. Try again.")
      })
      .catch(() => setError("Couldn't load your library. Try again."))
  }

  useEffect(() => {
    loadLibrary()
  }, [])

  // Courses already shown with progress are hidden from the flat product tiles to avoid
  // the same item appearing twice (the courses list is the richer surface).
  const courseProductIds = new Set(["masterclass", "branded_by_sselfie", "editing_masterclass"])
  const products = (data?.ownedProducts ?? []).filter(
    p => !(data?.courses?.length && courseProductIds.has(p.id))
  )

  const chooseGoal = (goal: LearnGoal) => {
    if (!data) return
    const taskId = startMayaJob({ job: "learn_next", surface: "learn", entry: goal })
    setSelectedGoal(goal)
    if (operatingLayerEnabled) void requestGuidance(goal, taskId)
    else setRecommendation(recommendationFor(data, goal))
    setPlanSaved(false)
    void trackAnalyticsEvent({ event: "learn_goal_selected", properties: { goal } })
  }

  const savePlan = async () => {
    if (!selectedGoal || !recommendation || savingPlan) return
    setSavingPlan(true)
    recordMayaJobDecision("learn_next")
    try {
      const response = await fetch("/api/app-v3/library/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: selectedGoal, recommendation }),
      })
      if (!response.ok) throw new Error("Could not save plan")
      setPlanSaved(true)
      finishMayaJob({ job: "learn_next", outcome: "completed" })
      void trackAnalyticsEvent({
        event: "learn_plan_saved",
        properties: { goal: selectedGoal, resourceId: recommendation.id },
      })
    } catch {
      setError("Couldn't save your plan. Try again.")
    } finally {
      setSavingPlan(false)
    }
  }

  return (
    <div className="suite-page mx-auto max-w-3xl space-y-7 px-4 py-6 sm:px-5 sm:py-8">
      <header>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#818283]">Library</p>
        <h1 className="mt-2 font-serif text-[30px] font-light leading-tight text-[#0D0E10]">
          Your SSELFIE
        </h1>
        <p className="mt-1.5 text-[14px] text-[#4F5052]">Everything you own lives here.</p>
      </header>

      <section aria-labelledby="learning-spaces-title">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--suite-accent)]">
          Learning spaces
        </p>
        <h2
          id="learning-spaces-title"
          className="mt-1 font-serif text-[25px] font-light text-[color:var(--suite-night)]"
        >
          Learn, practise, come back to create.
        </h2>
        <div className="mt-3 grid gap-[3px] bg-[color:var(--suite-night)] p-[3px] sm:grid-cols-2">
          {LEARNING_DESTINATIONS.map(destination => {
            const content = (
              <>
                <span className="text-[9px] uppercase tracking-[0.2em] text-[color:var(--suite-accent)]">
                  {destination.id === "skool" ? "Community & practice" : "Structured classes"}
                </span>
                <span className="mt-2 block font-serif text-[23px] font-light leading-tight">
                  {destination.label}
                </span>
                <span className="mt-2 block text-[12px] leading-relaxed text-[color:var(--suite-slate)]">
                  {destination.description}
                </span>
                <span className="mt-5 block text-[10px] uppercase tracking-[0.16em]">
                  {destination.href ? "Open learning space ↗" : "Coming soon"}
                </span>
              </>
            )

            return destination.href ? (
              <a
                key={destination.id}
                href={destination.href}
                target="_blank"
                rel="noreferrer"
                className="min-h-52 bg-white p-5 text-[color:var(--suite-night)] transition-colors hover:bg-[color:var(--suite-smoke)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color:var(--suite-accent)]"
              >
                {content}
              </a>
            ) : (
              <div
                key={destination.id}
                aria-disabled="true"
                className="min-h-52 bg-[color:var(--suite-smoke)] p-5 text-[color:var(--suite-night)]"
              >
                {content}
              </div>
            )
          })}
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-[8px] border border-[#C5C6C8]/60 bg-white p-4"
        >
          <p className="text-[14px] text-[#4F5052]">{error}</p>
          <button
            type="button"
            onClick={loadLibrary}
            className="min-h-11 px-2 text-[10px] uppercase tracking-[0.14em] text-[#0D0E10] underline underline-offset-2"
          >
            Retry
          </button>
        </div>
      )}
      {!data && !error && <p className="text-[14px] text-[#818283]">Opening your library…</p>}

      {data && (
        <>
          <section
            aria-labelledby="maya-coach-title"
            className="suite-card overflow-hidden rounded-[14px] border border-[#C5C6C8]/65 bg-white shadow-[0_12px_35px_rgba(13,14,16,.05)]"
          >
            <div className="border-b border-[#C5C6C8]/45 p-4 sm:p-5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#818283]">
                Your next step
              </p>
              <h2
                id="maya-coach-title"
                className="mt-1.5 font-serif text-[28px] font-light leading-tight text-[#0D0E10]"
              >
                {operatingLayerEnabled ? "Maya recommends next" : "Maya Coach"}
              </h2>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[#4F5052]">
                {operatingLayerEnabled
                  ? "One useful lesson from what you own, chosen for the next step in front of you."
                  : "Tell me where you feel stuck. I’ll choose one lesson you already own and help you use it."}
              </p>
            </div>
            <div className="p-4 sm:p-5">
              {!operatingLayerEnabled ? (
              <div
                className="grid gap-2 sm:grid-cols-2"
                role="group"
                aria-label="Choose what you need help with"
              >
                {LEARN_GOALS.map(goal => (
                  <button
                    key={goal.id}
                    type="button"
                    aria-pressed={selectedGoal === goal.id}
                    onClick={() => chooseGoal(goal.id)}
                    className={`min-h-12 rounded-[9px] border px-3 py-2.5 text-left text-[13px] leading-snug ${selectedGoal === goal.id ? "border-[#0D0E10] bg-[#F8FAFA] text-[#0D0E10]" : "border-[#C5C6C8]/70 text-[#4F5052] hover:border-[#0D0E10]/40"}`}
                  >
                    {goal.label}
                  </button>
                ))}
              </div>
              ) : null}

              {guidanceError ? (
                <div
                  role="alert"
                  className="mt-4 flex items-center justify-between gap-3 rounded-[8px] border border-[#C5C6C8]/60 bg-[#F8FAFA] p-4"
                >
                  <p className="text-[13px] text-[#4F5052]">{guidanceError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (guidanceRequest) {
                        void requestGuidance(
                          guidanceRequest.goal,
                          guidanceRequest.taskId,
                          guidanceRequest.memberGoal
                        )
                      }
                    }}
                    disabled={!guidanceRequest || loadingGuidance}
                    className="min-h-11 px-2 text-[10px] uppercase tracking-[0.14em] text-[#0D0E10] underline underline-offset-2 disabled:opacity-50"
                  >
                    Retry
                  </button>
                </div>
              ) : null}

              {recommendation ? (
                <div className="mt-4 rounded-[11px] bg-[#F1F2F2] p-4" aria-live="polite">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-[#818283]">
                    {planSaved ? "Your saved plan" : "Start here"}
                  </p>
                  <h3 className="mt-1.5 font-serif text-[22px] font-light leading-tight text-[#0D0E10]">
                    {recommendation.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[#4F5052]">
                    {recommendation.reason}
                  </p>
                  {recommendation.guidanceReason ? (
                    <p className="mt-1.5 text-[12px] leading-relaxed text-[#6D6E70]">
                      {recommendation.guidanceReason}
                    </p>
                  ) : null}
                  {recommendation.sourceRefs?.length ? (
                    <p className="mt-2 text-[10px] leading-relaxed text-[#818283]">
                      From{" "}
                      {Array.from(
                        new Set(recommendation.sourceRefs.map(source => source.title))
                      ).join(", ")}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <a
                      href={recommendation.href}
                      className="inline-flex min-h-11 items-center justify-center rounded-[8px] bg-[#0D0E10] px-4 text-[10px] uppercase tracking-[0.15em] text-white"
                    >
                      Open lesson
                    </a>
                    {onOpenCalendar && !operatingLayerEnabled ? (
                      <button
                        type="button"
                        onClick={() => {
                          void trackAnalyticsEvent({
                            event: "learn_calendar_handoff",
                            properties: { goal: selectedGoal },
                          })
                          onOpenCalendar()
                        }}
                        className="min-h-11 rounded-[8px] border border-[#0D0E10] bg-white px-4 text-[10px] uppercase tracking-[0.15em] text-[#0D0E10]"
                      >
                        Plan it in Calendar
                      </button>
                    ) : null}
                    {onOpenMaya &&
                    (!operatingLayerEnabled ||
                      (recommendation.taskId &&
                        recommendation.courseId &&
                        recommendation.lessonId)) ? (
                      <button
                        type="button"
                        onClick={() => {
                          void trackAnalyticsEvent({
                            event: "learn_maya_handoff",
                            properties: { goal: selectedGoal },
                          })
                          recordMayaJobHandoff("learn_next")
                          if (operatingLayerEnabled) {
                            onOpenMaya({
                              taskId: recommendation.taskId as string,
                              courseId: recommendation.courseId as number,
                              lessonId: recommendation.lessonId as number,
                              lessonTitle: recommendation.title,
                              memberGoal:
                                LEARN_GOALS.find(goal => goal.id === selectedGoal)?.label ??
                                undefined,
                            })
                          } else {
                            onOpenMaya(
                              `Help me use what I learned in ${recommendation.title} to create one useful piece of content.`
                            )
                          }
                        }}
                        className="min-h-11 px-2 text-[11px] text-[#0D0E10] underline underline-offset-4"
                      >
                        {operatingLayerEnabled ? "Do this with Maya" : "Use it with Maya"}
                      </button>
                    ) : null}
                  </div>
                  {!planSaved ? (
                    <button
                      type="button"
                      onClick={() => void savePlan()}
                      disabled={savingPlan}
                      className="mt-3 min-h-11 text-[11px] text-[#4F5052] underline underline-offset-4 disabled:opacity-50"
                    >
                      {savingPlan ? "Saving…" : "Save this plan"}
                    </button>
                  ) : (
                    <p className="mt-3 text-[11px] text-[#6D6E70]">
                      Saved. Come back here when you are ready for the next step.
                    </p>
                  )}
                </div>
              ) : null}
              {loadingGuidance ? (
                <p role="status" aria-live="polite" className="mt-4 text-[13px] text-[#6D6E70]">
                  Maya is finding the most useful lesson you own…
                </p>
              ) : null}
            </div>
          </section>

          {operatingLayerEnabled ? (
            <button
              type="button"
              onClick={() => setBrowseAllOpen(open => !open)}
              aria-expanded={browseAllOpen}
              aria-controls="maya-learn-catalogue"
              className="min-h-11 text-[11px] uppercase tracking-[0.16em] text-[#0D0E10] underline underline-offset-4"
            >
              {browseAllOpen ? "Hide catalogue" : "Browse all"}
            </button>
          ) : null}

          {!operatingLayerEnabled || browseAllOpen ? (
            <div id="maya-learn-catalogue" className="contents">
          {/* Courses with progress */}
          {data.courses.length > 0 && (
            <section>
              <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[#818283]">
                Your courses
              </p>
              <div className="space-y-3">
                {data.courses.map(c => (
                  <a
                    key={c.id}
                    href={c.href}
                    className={`${card} block p-4 transition-colors hover:border-[#0D0E10]/40`}
                  >
                    <div className="flex flex-col gap-1 min-[420px]:flex-row min-[420px]:items-baseline min-[420px]:justify-between min-[420px]:gap-3">
                      <h3 className="font-serif text-[20px] font-light leading-tight text-[#0D0E10]">
                        {c.title}
                      </h3>
                      <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-[#818283]">
                        {c.completedLessons}/{c.lessonCount} lessons
                      </span>
                    </div>
                    {c.description && (
                      <p className="mt-1.5 text-[13px] leading-relaxed text-[#4F5052]">
                        {c.description}
                      </p>
                    )}
                    <div
                      role="progressbar"
                      aria-label={`${c.title} progress`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.min(100, Math.max(0, c.progressPercentage))}
                      className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-[#F1F2F2]"
                    >
                      <div
                        className="h-full bg-[#0D0E10] transition-[width]"
                        style={{ width: `${Math.min(100, Math.max(0, c.progressPercentage))}%` }}
                      />
                    </div>
                    <span className="mt-3 inline-flex min-h-8 items-center text-[11px] uppercase tracking-[0.18em] text-[#0D0E10]">
                      {c.started ? "Continue" : "Start"}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Owned products */}
          {products.length > 0 && (
            <section>
              <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[#818283]">
                Your products
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {products.map(p => (
                  <ProductTile
                    key={p.id}
                    title={p.name}
                    eyebrow={p.eyebrow}
                    description={p.tagline}
                    thumbnailUrl={p.thumbnailUrl}
                    href={p.accessUrl}
                    actionLabel={p.actionLabel}
                  />
                ))}
              </div>
            </section>
          )}

          {data.courses.length === 0 && products.length === 0 && (
            <p className="text-[14px] text-[#4F5052]">
              Nothing here yet. Your products will show up the moment you own them.
            </p>
          )}

          {/* Weekly drops */}
          <section>
            <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[#818283]">Drops</p>
            {data.drops.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {data.drops.map(d => (
                  <Link
                    key={d.id}
                    href="/academy/access/monthly-drops"
                    className={`${card} flex min-h-[78px] gap-3 overflow-hidden p-3 transition-colors hover:border-[#0D0E10]/40`}
                  >
                    {d.thumbnailUrl && (
                      <div className="relative aspect-square w-16 shrink-0 overflow-hidden rounded-[6px] bg-[#F1F2F2]">
                        <Image
                          src={d.thumbnailUrl}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                    )}
                    <div className="min-w-0">
                      {isNewDrop(d.publishedAt) && (
                        <p className="mb-0.5 text-[9px] uppercase tracking-[0.18em] text-[#0D0E10]">
                          New
                        </p>
                      )}
                      <h3 className="font-serif text-[17px] font-light leading-tight text-[#0D0E10]">
                        {d.title}
                      </h3>
                      {d.month && (
                        <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-[#818283]">
                          {d.month}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={`${card} p-4`}>
                <p className="text-[14px] text-[#4F5052]">New drops land here every week.</p>
              </div>
            )}
          </section>

          {/* Locked previews + the one upgrade CTA (non-members only; D3 keeps members lock-free) */}
          {!data.membershipActive && (
            <section>
              {data.lockedProducts.length > 0 && (
                <>
                  <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[#818283]">
                    Not yours yet
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {data.lockedProducts.map(p => (
                      <ProductTile
                        key={p.id}
                        title={p.title}
                        eyebrow={p.eyebrow}
                        description={p.description}
                        thumbnailUrl={p.thumbnailUrl}
                        href={p.href}
                        actionLabel={p.ctaLabel}
                        locked
                      />
                    ))}
                  </div>
                </>
              )}
              <div className="mt-3 rounded-[8px] border border-[#0D0E10] bg-white p-4">
                <h3 className="font-serif text-[20px] font-light leading-tight text-[#0D0E10]">
                  Members get all of it.
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-[#4F5052]">
                  The SUITE includes every product here, plus Maya and 200 photos a month.
                </p>
                <a
                  href="/join/studio?source=app_library"
                  className="mt-3 inline-flex min-h-11 items-center justify-center rounded-[6px] border border-[#0D0E10] bg-[#0D0E10] px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-white transition-colors hover:bg-white hover:text-[#0D0E10]"
                >
                  See the SUITE
                </a>
              </div>
            </section>
          )}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
