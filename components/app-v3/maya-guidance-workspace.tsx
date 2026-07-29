"use client"

import { useEffect, useRef, useState } from "react"

import { recordMayaGuidanceServed } from "@/lib/app-v3/maya/job-analytics"
import type { MayaActionDescriptor } from "@/lib/app-v3/maya/action-protocol"
import type { MayaGuidanceRequest, MayaGuidanceResult } from "@/lib/app-v3/maya/guidance/types"
import { Markdown } from "./markdown"
import { MayaActionCard } from "./maya-action-card"

export function guidanceLessonHref(result: MayaGuidanceResult): string | null {
  const source = result.sourceRefs.find(item => item.courseId && item.lessonId)
  return source?.courseId && source.lessonId
    ? `/academy/courses/${source.courseId}/lessons/${source.lessonId}`
    : null
}

// Guidance answers were regenerated (a fresh non-zero-temperature LLM call) on EVERY drawer
// open because this component remounts each time and kept its result in local state only —
// the member saw different advice wording each open and every open cost tokens (UX audit
// 2026-07-29, B3). Same request in the same tab now answers from this cache.
const guidanceResultCache = new Map<string, MayaGuidanceResult>()

export function MayaGuidanceWorkspace({
  request,
  onResult,
  onUnavailable,
  onExecuteAction,
  className = "",
}: {
  request: MayaGuidanceRequest
  onResult?: (result: MayaGuidanceResult) => void
  onUnavailable?: () => void
  onExecuteAction?: (action: MayaActionDescriptor, result: MayaGuidanceResult) => Promise<void>
  className?: string
}) {
  const [result, setResult] = useState<MayaGuidanceResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [question, setQuestion] = useState(request.question ?? "")
  const [submittedQuestion, setSubmittedQuestion] = useState(request.question ?? "")
  const [retry, setRetry] = useState(0)
  const callbacksRef = useRef({ onResult, onUnavailable })
  callbacksRef.current = { onResult, onUnavailable }

  const requestKey = JSON.stringify({ ...request, question: submittedQuestion || undefined })

  useEffect(() => {
    const cached = retry === 0 ? guidanceResultCache.get(requestKey) : undefined
    if (cached) {
      setResult(cached)
      setError(null)
      setLoading(false)
      callbacksRef.current.onResult?.(cached)
      return
    }
    const controller = new AbortController()
    const startedAt = Date.now()
    setLoading(true)
    setError(null)
    fetch("/api/app-v3/maya/guidance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      signal: controller.signal,
      body: requestKey,
    })
      .then(async response => {
        if (response.status === 404) {
          callbacksRef.current.onUnavailable?.()
          return null
        }
        if (!response.ok) throw new Error("Maya couldn't load Sandra's guidance. Try again.")
        return (await response.json()) as MayaGuidanceResult
      })
      .then(next => {
        if (!next || controller.signal.aborted) return
        guidanceResultCache.set(requestKey, next)
        setResult(next)
        callbacksRef.current.onResult?.(next)
        recordMayaGuidanceServed(request.job, next.sourceRefs.length, Date.now() - startedAt)
      })
      .catch(fetchError => {
        if (controller.signal.aborted) return
        setError(fetchError instanceof Error ? fetchError.message : "Maya guidance is unavailable.")
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [request.job, requestKey, retry])

  async function executeAction(action: MayaActionDescriptor) {
    if (onExecuteAction && result) {
      await onExecuteAction(action, result)
      return
    }
    if (action.kind === "continue_lesson" && result) {
      const href = guidanceLessonHref(result)
      if (!href) throw new Error("That lesson is not available yet.")
      window.location.assign(href)
      return
    }
    throw new Error("That next step needs a specific destination.")
  }

  return (
    <div
      data-maya-guidance-workspace
      className={`min-h-0 min-w-0 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 ${className}`}
    >
      <div className="mx-auto max-w-xl space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#6D6E70]">
            Sandra&apos;s method
          </p>
          <h3 className="mt-1 font-serif text-[25px] font-light leading-tight text-[#0D0E10]">
            One useful next step
          </h3>
        </div>

        {loading ? (
          <p role="status" aria-live="polite" className="text-[13px] text-[#4F5052]">
            Finding the most relevant lesson…
          </p>
        ) : null}
        {error ? (
          <div role="alert" className="rounded-[10px] border border-[#C5C6C8]/60 bg-white p-4">
            <p className="text-[13px] leading-relaxed text-[#4F5052]">{error}</p>
            <button
              type="button"
              onClick={() => setRetry(value => value + 1)}
              className="mt-2 min-h-11 text-[11px] uppercase tracking-[0.14em] text-[#0D0E10] underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        ) : null}

        {result ? (
          <>
            <article className="rounded-[12px] border border-[#C5C6C8]/60 bg-white p-4">
              <div className="text-[14px] leading-relaxed text-[#282728]">
                <Markdown>{result.recommendation}</Markdown>
              </div>
              <div className="mt-2 text-[13px] leading-relaxed text-[#4F5052]">
                <Markdown>{result.reason}</Markdown>
              </div>
              <div className="mt-4 border-t border-[#C5C6C8]/45 pt-3">
                <p className="text-[9px] uppercase tracking-[0.18em] text-[#818283]">Sources</p>
                <ul className="mt-1.5 space-y-1">
                  {result.sourceRefs.map(source => (
                    <li
                      key={`${source.kind}:${source.courseId ?? 0}:${source.lessonId ?? 0}:${source.version}`}
                      className="text-[11px] leading-relaxed text-[#6D6E70]"
                    >
                      {source.title}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
            <MayaActionCard
              key={result.nextAction.id}
              descriptor={result.nextAction}
              preview={
                guidanceLessonHref(result)
                  ? "Open the exact lesson Maya used, with your progress and chosen action kept intact."
                  : "Carry this recommendation into your current Maya task."
              }
              onExecute={executeAction}
            />
          </>
        ) : null}

        <form
          onSubmit={event => {
            event.preventDefault()
            const clean = question.trim()
            if (!clean || clean === submittedQuestion) return
            setResult(null)
            setSubmittedQuestion(clean)
          }}
          className="rounded-[12px] border border-[#C5C6C8]/60 bg-white p-3"
        >
          <label htmlFor="maya-guidance-question" className="text-[11px] text-[#4F5052]">
            Ask about this lesson or your next step
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="maya-guidance-question"
              value={question}
              onChange={event => setQuestion(event.target.value)}
              maxLength={500}
              className="min-h-11 min-w-0 flex-1 rounded-[8px] border border-[#C5C6C8]/60 px-3 text-[14px] text-[#282728] outline-none focus:border-[#0D0E10]"
            />
            <button
              type="submit"
              disabled={!question.trim() || loading}
              className="min-h-11 rounded-[8px] bg-[#0D0E10] px-4 text-[11px] uppercase tracking-[0.14em] text-white disabled:opacity-40"
            >
              Ask
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
