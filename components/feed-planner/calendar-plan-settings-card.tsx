"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2, Pencil } from "lucide-react"

import {
  type CalendarPlanSettings,
  EMPTY_CALENDAR_PLAN_SETTINGS,
  isCalendarPlanComplete,
} from "@/lib/feed-planner/calendar-plan-settings"

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
  const normalizedSettings = {
    ...EMPTY_CALENDAR_PLAN_SETTINGS,
    ...settings,
    transformationStory: settings.transformationStory ?? "",
    audienceChallenge: settings.audienceChallenge ?? "",
    audienceTransformation: settings.audienceTransformation ?? "",
    futureVision: settings.futureVision ?? "",
    contentGoals: settings.contentGoals ?? "",
    contentPillars: settings.contentPillars ?? [],
  }
  const complete = isCalendarPlanComplete(settings)
  const [editing, setEditing] = useState(forceEditing || !complete)
  const [draft, setDraft] = useState(normalizedSettings)
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const profileSignature = JSON.stringify(normalizedSettings)
  const lastProfileSignature = useRef(profileSignature)
  useEffect(() => {
    if (lastProfileSignature.current === profileSignature) return
    lastProfileSignature.current = profileSignature
    setDraft(JSON.parse(profileSignature) as CalendarPlanSettings)
  }, [profileSignature])
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
      setStep(0)
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
        aria-label="Content context"
        className="overflow-hidden rounded-[14px] border border-[color:var(--calendar-stone-4)]/70 bg-[color:var(--app-surface)]"
      >
        <div className="space-y-3 p-4">
          {/* DRAFT UX copy for Sandra approval before release. */}
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--app-text-secondary)]">
              Content context
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--app-text-primary)]">
              I pulled in your business, audience and current focus. Here’s what I’m using.
            </p>
          </div>
          <dl className="grid gap-2 text-[12px] sm:grid-cols-2">
            {[
              ["What you do", settings.businessType],
              ["Who you help", settings.idealAudience],
              ["Current focus", settings.currentSituation],
              ["Your story", settings.transformationStory],
              ["What she is struggling with", settings.audienceChallenge],
              ["What you help her change", settings.audienceTransformation],
              ["Where you are going", settings.futureVision],
              ["Content goal", settings.contentGoals],
              ["Content pillars", normalizedSettings.contentPillars.join(", ")],
            ]
              .filter(([, value]) => Boolean(value))
              .map(([label, value]) => (
                <div key={label} className="rounded-[10px] bg-white px-3 py-2.5">
                  <dt className="text-[9px] uppercase tracking-[0.14em] text-[color:var(--app-text-secondary)]">
                    {label}
                  </dt>
                  <dd className="mt-1 line-clamp-2 text-[color:var(--app-text-primary)]">
                    {value}
                  </dd>
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
            <Pencil size={14} aria-hidden /> Update what Maya knows
          </button>
        </div>
      </section>
    )
  }

  return (
    <section
      aria-label="Content context"
      className="rounded-[14px] border border-[color:var(--calendar-stone-4)]/70 bg-[color:var(--app-surface)] p-4"
    >
      {/* DRAFT UX copy for Sandra approval before release. */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[color:var(--app-text-secondary)]">
          What Maya knows
        </p>
        <p className="text-[10px] text-[color:var(--app-text-secondary)]">{step + 1} of 3</p>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--app-text-primary)]">
        {step === 0
          ? "Let’s start with the basics so Maya can plan from your real business instead of guessing. You only need to say it once."
          : step === 1
            ? "Now help Maya understand the real person behind your content and the woman you want to help."
            : "Last step. Tell Maya where you are going and what you want your content to do."}
      </p>
      <div className="mt-4 space-y-3">
        {step === 0 ? (
          <>
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
          </>
        ) : null}
        {step === 1 ? (
          <>
            <label className="block text-[11px] text-[color:var(--app-text-secondary)]">
              Your story
              <textarea
                aria-label="Your story"
                rows={3}
                value={draft.transformationStory}
                onChange={event =>
                  setDraft(current => ({ ...current, transformationStory: event.target.value }))
                }
                className="mt-1.5 w-full rounded-[9px] border border-[color:var(--calendar-stone-4)] bg-white px-3 py-2.5 text-[13px] text-[color:var(--app-text-primary)] outline-none focus:border-[color:var(--app-text-primary)]"
              />
            </label>
            <label className="block text-[11px] text-[color:var(--app-text-secondary)]">
              What she is struggling with
              <textarea
                aria-label="What your audience is struggling with"
                rows={3}
                value={draft.audienceChallenge}
                onChange={event =>
                  setDraft(current => ({ ...current, audienceChallenge: event.target.value }))
                }
                className="mt-1.5 w-full rounded-[9px] border border-[color:var(--calendar-stone-4)] bg-white px-3 py-2.5 text-[13px] text-[color:var(--app-text-primary)] outline-none focus:border-[color:var(--app-text-primary)]"
              />
            </label>
            <label className="block text-[11px] text-[color:var(--app-text-secondary)]">
              What you help her change
              <textarea
                aria-label="The change you help create"
                rows={3}
                value={draft.audienceTransformation}
                onChange={event =>
                  setDraft(current => ({ ...current, audienceTransformation: event.target.value }))
                }
                className="mt-1.5 w-full rounded-[9px] border border-[color:var(--calendar-stone-4)] bg-white px-3 py-2.5 text-[13px] text-[color:var(--app-text-primary)] outline-none focus:border-[color:var(--app-text-primary)]"
              />
            </label>
          </>
        ) : null}
        {step === 2 ? (
          <>
            <label className="block text-[11px] text-[color:var(--app-text-secondary)]">
              Where you want this to lead
              <textarea
                aria-label="Your future vision"
                rows={3}
                value={draft.futureVision}
                onChange={event =>
                  setDraft(current => ({ ...current, futureVision: event.target.value }))
                }
                className="mt-1.5 w-full rounded-[9px] border border-[color:var(--calendar-stone-4)] bg-white px-3 py-2.5 text-[13px] text-[color:var(--app-text-primary)] outline-none focus:border-[color:var(--app-text-primary)]"
              />
            </label>
            <label className="block text-[11px] text-[color:var(--app-text-secondary)]">
              What you want your content to do
              <textarea
                aria-label="Your content goal"
                rows={3}
                value={draft.contentGoals}
                onChange={event =>
                  setDraft(current => ({ ...current, contentGoals: event.target.value }))
                }
                className="mt-1.5 w-full rounded-[9px] border border-[color:var(--calendar-stone-4)] bg-white px-3 py-2.5 text-[13px] text-[color:var(--app-text-primary)] outline-none focus:border-[color:var(--app-text-primary)]"
              />
            </label>
            <label className="block text-[11px] text-[color:var(--app-text-secondary)]">
              Content pillars, separated by commas
              <input
                aria-label="Content pillars"
                value={draft.contentPillars.join(", ")}
                onChange={event =>
                  setDraft(current => ({
                    ...current,
                    contentPillars: event.target.value
                      .split(",")
                      .map(item => item.trim())
                      .filter(Boolean),
                  }))
                }
                className="mt-1.5 min-h-11 w-full rounded-[9px] border border-[color:var(--calendar-stone-4)] bg-white px-3 text-[13px] text-[color:var(--app-text-primary)] outline-none focus:border-[color:var(--app-text-primary)]"
              />
            </label>
          </>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-[12px] text-destructive">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex gap-2">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep(current => current - 1)}
            className="min-h-11 rounded-[9px] border border-[color:var(--calendar-stone-4)] bg-white px-4 text-[12px] text-[color:var(--app-text-primary)]"
          >
            Back
          </button>
        ) : null}
        {step < 2 ? (
          <button
            type="button"
            onClick={() => setStep(current => current + 1)}
            disabled={step === 0 && !isCalendarPlanComplete(draft)}
            className="flex min-h-11 flex-1 items-center justify-center rounded-[9px] bg-[color:var(--app-btn-primary-bg)] px-4 text-[12px] font-medium text-[color:var(--app-btn-primary-text)] disabled:opacity-40"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void save()}
            disabled={!isCalendarPlanComplete(draft) || saving}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[9px] bg-[color:var(--app-btn-primary-bg)] px-4 text-[12px] font-medium text-[color:var(--app-btn-primary-text)] disabled:opacity-40"
          >
            {saving ? <Loader2 className="animate-spin" size={15} aria-hidden /> : null}
            Save what Maya knows
          </button>
        )}
      </div>
    </section>
  )
}
