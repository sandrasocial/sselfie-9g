"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, Pencil } from "lucide-react"

import {
  type CalendarPlanSettings,
  isCalendarPlanComplete,
} from "@/lib/feed-planner/calendar-plan-settings"

const FEED_STYLES = ["Light & Minimalistic", "Beige Aesthetic", "Dark & Moody"]

interface CalendarPlanSettingsCardProps {
  settings: CalendarPlanSettings
  onSave: (settings: CalendarPlanSettings) => Promise<void>
  onConfirm: () => void
  forceEditing?: boolean
}

export function CalendarPlanSettingsCard({
  settings,
  onSave,
  onConfirm,
  forceEditing = false,
}: CalendarPlanSettingsCardProps) {
  const complete = isCalendarPlanComplete(settings)
  const [editing, setEditing] = useState(forceEditing || !complete)
  const [draft, setDraft] = useState(settings)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setDraft(settings), [settings])
  useEffect(() => {
    if (forceEditing) setEditing(true)
  }, [forceEditing])

  async function save() {
    if (!isCalendarPlanComplete(draft) || saving) return
    setSaving(true)
    setError(null)
    try {
      await onSave(draft)
      setEditing(false)
      onConfirm()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Your settings could not be saved.")
    } finally {
      setSaving(false)
    }
  }

  if (!editing && complete) {
    return (
      <section
        aria-label="Plan settings"
        className="overflow-hidden rounded-[14px] border border-[color:var(--calendar-stone-4)]/70 bg-[color:var(--app-surface)]"
      >
        <div className="space-y-3 p-4">
          {/* DRAFT UX copy for Sandra approval before release. */}
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--app-text-secondary)]">
              Plan settings
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--app-text-primary)]">
              I pulled in your audience, current focus and visual direction. Here’s what I’m using.
            </p>
          </div>
          <dl className="grid gap-2 text-[12px] sm:grid-cols-2">
            {[
              ["Brand", settings.businessType],
              ["For", settings.idealAudience],
              ["Focus", settings.currentSituation],
              ["Visual world", settings.feedStyle],
            ].map(([label, value]) => (
              <div key={label} className="rounded-[10px] bg-white px-3 py-2.5">
                <dt className="text-[9px] uppercase tracking-[0.14em] text-[color:var(--app-text-secondary)]">
                  {label}
                </dt>
                <dd className="mt-1 line-clamp-2 text-[color:var(--app-text-primary)]">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex gap-2 border-t border-[color:var(--calendar-stone-4)]/55 p-2.5">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="flex min-h-11 items-center gap-2 rounded-[9px] px-3 text-[12px] text-[color:var(--app-text-secondary)] hover:bg-white"
          >
            <Pencil size={14} aria-hidden /> Adjust
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="ml-auto min-h-11 rounded-[9px] bg-[color:var(--app-btn-primary-bg)] px-4 text-[12px] font-medium text-white hover:opacity-90"
          >
            Use this plan
          </button>
        </div>
      </section>
    )
  }

  return (
    <section
      aria-label="Plan settings"
      className="rounded-[14px] border border-[color:var(--calendar-stone-4)]/70 bg-[color:var(--app-surface)] p-4"
    >
      {/* DRAFT UX copy for Sandra approval before release. */}
      <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--app-text-secondary)]">
        Plan settings
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--app-text-primary)]">
        {complete
          ? "Change anything that no longer fits. I’ll use the same details everywhere in SSELFIE."
          : "Tell me these four things so I can plan from your real business instead of guessing."}
      </p>
      <div className="mt-4 space-y-3">
        <label className="block text-[11px] text-[color:var(--app-text-secondary)]">
          What you do
          <input
            aria-label="What you do"
            value={draft.businessType}
            onChange={event =>
              setDraft(current => ({ ...current, businessType: event.target.value }))
            }
            className="mt-1.5 min-h-11 w-full rounded-[9px] border border-[color:var(--calendar-stone-4)] bg-white px-3 text-[13px] text-[color:var(--app-text-primary)] outline-none focus:border-[color:var(--app-text-primary)]"
          />
        </label>
        <label className="block text-[11px] text-[color:var(--app-text-secondary)]">
          Who this plan is for
          <input
            aria-label="Who this plan is for"
            value={draft.idealAudience}
            onChange={event =>
              setDraft(current => ({ ...current, idealAudience: event.target.value }))
            }
            className="mt-1.5 min-h-11 w-full rounded-[9px] border border-[color:var(--calendar-stone-4)] bg-white px-3 text-[13px] text-[color:var(--app-text-primary)] outline-none focus:border-[color:var(--app-text-primary)]"
          />
        </label>
        <label className="block text-[11px] text-[color:var(--app-text-secondary)]">
          Current offer or focus
          <input
            aria-label="Current offer or focus"
            value={draft.currentSituation}
            onChange={event =>
              setDraft(current => ({ ...current, currentSituation: event.target.value }))
            }
            className="mt-1.5 min-h-11 w-full rounded-[9px] border border-[color:var(--calendar-stone-4)] bg-white px-3 text-[13px] text-[color:var(--app-text-primary)] outline-none focus:border-[color:var(--app-text-primary)]"
          />
        </label>
        <fieldset>
          <legend className="text-[11px] text-[color:var(--app-text-secondary)]">
            Visual direction
          </legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {FEED_STYLES.map(style => {
              const selected = draft.feedStyle === style
              return (
                <button
                  key={style}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setDraft(current => ({ ...current, feedStyle: style }))}
                  className={`min-h-11 rounded-full border px-3 text-[11px] transition-colors ${
                    selected
                      ? "border-[color:var(--app-text-primary)] bg-[color:var(--app-btn-primary-bg)] text-white"
                      : "border-[color:var(--calendar-stone-4)] bg-white text-[color:var(--app-text-secondary)]"
                  }`}
                >
                  {selected ? <Check className="mr-1 inline" size={13} aria-hidden /> : null}
                  {style}
                </button>
              )
            })}
          </div>
        </fieldset>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-[12px] text-destructive">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void save()}
        disabled={!isCalendarPlanComplete(draft) || saving}
        className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-[9px] bg-[color:var(--app-btn-primary-bg)] px-4 text-[12px] font-medium text-white disabled:opacity-40"
      >
        {saving ? <Loader2 className="animate-spin" size={15} aria-hidden /> : null}
        Save plan settings
      </button>
    </section>
  )
}
