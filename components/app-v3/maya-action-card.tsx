"use client"

import { useReducer, useRef, useState } from "react"

import {
  MayaActionExecutor,
  executeMayaActionAdapter,
  mayaActionCreditLabel,
  mayaActionReducer,
  type MayaActionDescriptor,
} from "@/lib/app-v3/maya/action-protocol"

interface MayaActionCardProps {
  descriptor: MayaActionDescriptor
  preview: string
  onExecute: (descriptor: MayaActionDescriptor) => Promise<void>
  onCancel?: () => void
  onUndo?: (descriptor: MayaActionDescriptor) => Promise<void>
  className?: string
  /** Free + undoable actions may run in ONE tap from the recommended state. The 2026-07-28
   *  audit found a free caption rewrite behind four identical confirmations — preview →
   *  confirm is for credit spends and non-undoable mutations, not for undoable free work. */
  directExecute?: boolean
  /** What the action produced (e.g. the rewritten caption), shown once it succeeds so
   *  "Done" is never the only evidence that anything happened. */
  result?: string | null
}

function confirmLabel(kind: MayaActionDescriptor["kind"]): string {
  if (kind === "apply_to_post") return "Confirm and apply"
  if (kind === "continue_lesson") return "Confirm and continue"
  if (kind === "improve_caption") return "Confirm and improve"
  if (kind === "update_grid") return "Confirm and update"
  if (kind === "create_grid") return "Confirm and create grid"
  return "Confirm and create"
}

function directLabel(kind: MayaActionDescriptor["kind"]): string {
  if (kind === "improve_caption") return "Rewrite caption"
  if (kind === "continue_lesson") return "Continue"
  return "Do it"
}

export function MayaActionCard({
  descriptor,
  preview,
  onExecute,
  onCancel,
  onUndo,
  className = "",
  directExecute = false,
  result = null,
}: MayaActionCardProps) {
  const [action, dispatch] = useReducer(mayaActionReducer, descriptor)
  const [error, setError] = useState<string | null>(null)
  const executorRef = useRef(new MayaActionExecutor<void>())
  const executingRef = useRef(false)

  const execute = async (current: MayaActionDescriptor) => {
    if (executingRef.current) return
    executingRef.current = true
    setError(null)
    dispatch({ type: "execute" })
    try {
      await executorRef.current.run(current, next =>
        executeMayaActionAdapter(next, { [next.kind]: onExecute })
      )
      dispatch({ type: "succeed" })
    } catch (executionError) {
      setError(
        executionError instanceof Error ? executionError.message : "That action did not finish."
      )
      dispatch({ type: "fail" })
    } finally {
      executingRef.current = false
    }
  }

  const cancel = () => {
    dispatch({ type: "cancel" })
    setError(null)
    onCancel?.()
  }

  const retry = () => {
    const retrying = mayaActionReducer(action, { type: "retry" })
    dispatch({ type: "retry" })
    void execute(retrying)
  }

  const undo = async () => {
    if (!onUndo) return
    setError(null)
    try {
      await onUndo(action)
      dispatch({ type: "undo" })
    } catch (undoError) {
      setError(undoError instanceof Error ? undoError.message : "That did not undo. Try again.")
    }
  }

  return (
    <section
      data-maya-action-kind={action.kind}
      data-maya-action-status={action.status}
      className={`overflow-hidden rounded-[12px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-bg)] ${className}`}
      aria-label={action.title}
    >
      <div className="px-3.5 py-3">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--app-text-secondary)]">
          {action.status === "recommended" ? "Maya recommends" : "Next step"}
        </p>
        <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-[color:var(--app-text-primary)]">
          {action.title}
        </p>
        {action.status === "recommended" ? (
          <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--app-text-secondary)]">
            {action.reason}
          </p>
        ) : null}
        {action.status === "previewing" || action.status === "awaiting_confirmation" ? (
          <p className="mt-2 whitespace-pre-wrap text-[12px] leading-relaxed text-[color:var(--app-text-secondary)]">
            {preview}
          </p>
        ) : null}
        {action.status === "previewing" || action.status === "awaiting_confirmation" ? (
          <p className="mt-2 text-[11px] font-medium text-[color:var(--app-text-primary)]">
            {mayaActionCreditLabel(action.creditCost)}
          </p>
        ) : null}
        {action.status === "executing" ? (
          <p
            role="status"
            aria-live="polite"
            className="mt-2 text-[12px] text-[color:var(--app-text-secondary)]"
          >
            Working on it now…
          </p>
        ) : null}
        {action.status === "succeeded" ? (
          <div role="status" aria-live="polite" className="mt-2 space-y-2">
            <p className="text-[12px] text-[color:var(--app-text-secondary)]">Done</p>
            {result?.trim() ? (
              <p className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-[8px] bg-[color:var(--app-glass-border)]/25 px-3 py-2.5 text-[13px] leading-relaxed text-[color:var(--app-text-primary)]">
                {result}
              </p>
            ) : null}
          </div>
        ) : null}
        {action.status === "undone" ? (
          <p
            role="status"
            aria-live="polite"
            className="mt-2 text-[12px] text-[color:var(--app-text-secondary)]"
          >
            Undone
          </p>
        ) : null}
        {action.status === "failed" && error ? (
          <p
            role="alert"
            className="mt-2 text-[12px] leading-relaxed text-[color:var(--app-text-secondary)]"
          >
            {error}
          </p>
        ) : null}
        {action.status === "succeeded" && error ? (
          <p
            role="alert"
            className="mt-2 text-[12px] leading-relaxed text-[color:var(--app-text-secondary)]"
          >
            {error}
          </p>
        ) : null}
      </div>

      {action.status !== "executing" && action.status !== "undone" ? (
        <div className="flex min-h-14 items-center gap-2 border-t border-[color:var(--app-glass-border)] p-2.5">
          {action.status === "recommended" ? (
            <button
              type="button"
              onClick={() => {
                if (directExecute && action.creditCost === 0 && action.canUndo) {
                  // Keep the shared lifecycle strict even when the UI intentionally skips
                  // the visible preview step for free, undoable actions.
                  const previewed = mayaActionReducer(action, { type: "preview" })
                  dispatch({ type: "preview" })
                  void execute(previewed)
                } else {
                  dispatch({ type: "preview" })
                }
              }}
              className="ml-auto min-h-11 rounded-[8px] bg-[color:var(--app-btn-primary-bg)] px-4 text-[11px] uppercase tracking-[0.14em] text-[color:var(--app-btn-primary-text)]"
            >
              {directExecute && action.creditCost === 0 && action.canUndo
                ? directLabel(action.kind)
                : "Preview"}
            </button>
          ) : null}
          {action.status === "previewing" ? (
            <>
              <button
                type="button"
                onClick={cancel}
                className="min-h-11 rounded-[8px] px-3 text-[11px] text-[color:var(--app-text-secondary)]"
              >
                Cancel
              </button>
              {/* One decision, not two: the preview already shows exactly what will happen
                  and what it costs, so confirming happens HERE instead of on a third,
                  identical screen (2026-07-28 audit: preview→continue→confirm showed the
                  same copy three times). */}
              <button
                type="button"
                onClick={() => void execute(action)}
                className="ml-auto min-h-11 rounded-[8px] bg-[color:var(--app-btn-primary-bg)] px-4 text-[11px] uppercase tracking-[0.14em] text-[color:var(--app-btn-primary-text)]"
              >
                {confirmLabel(action.kind)}
              </button>
            </>
          ) : null}
          {action.status === "awaiting_confirmation" ? (
            <>
              <button
                type="button"
                onClick={cancel}
                className="min-h-11 rounded-[8px] px-3 text-[11px] text-[color:var(--app-text-secondary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void execute(action)}
                className="ml-auto min-h-11 rounded-[8px] bg-[color:var(--app-btn-primary-bg)] px-4 text-[11px] uppercase tracking-[0.14em] text-[color:var(--app-btn-primary-text)]"
              >
                {confirmLabel(action.kind)}
              </button>
            </>
          ) : null}
          {action.status === "failed" ? (
            <>
              <button
                type="button"
                onClick={cancel}
                className="min-h-11 rounded-[8px] px-3 text-[11px] text-[color:var(--app-text-secondary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={retry}
                className="ml-auto min-h-11 rounded-[8px] border border-[color:var(--app-text-primary)] px-4 text-[11px] uppercase tracking-[0.14em] text-[color:var(--app-text-primary)]"
              >
                Try again
              </button>
            </>
          ) : null}
          {action.status === "succeeded" && action.canUndo && onUndo ? (
            <button
              type="button"
              onClick={() => void undo()}
              className="ml-auto min-h-11 rounded-[8px] border border-[color:var(--app-text-primary)] px-4 text-[11px] uppercase tracking-[0.14em] text-[color:var(--app-text-primary)]"
            >
              Undo
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
