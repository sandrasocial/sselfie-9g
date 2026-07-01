"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { MayaInlineAction, MayaInlineCard, MayaInlinePill } from "./maya-inline-card"

interface MayaWelcomeAction {
  label: string
  onClick: () => void
  variant?: "primary" | "secondary"
}

interface WeekTheme {
  id: string
  label: string
  description: string
}

interface WeekPlanResponse {
  themes: WeekTheme[]
  isoWeek: number
}

interface MayaWelcomePanelProps {
  eyebrow?: string
  title: string
  subtitle: string
  uploadHint?: string
  actions: MayaWelcomeAction[]
  previewImageUrls?: string[]
  /** Called when user taps a theme chip - sends the pre-built message */
  onThemeChipClick?: (message: string) => void
}

const FALLBACK_PREVIEWS = [
  "/assets/brand-strategy/hero.png",
  "/assets/brand-strategy/woman.png",
  "/assets/brand-strategy/pillar1.png",
]

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function splitPrimaryAction(actions: MayaWelcomeAction[]) {
  const primaryIndex = actions.findIndex((a) => a.variant === "primary")
  const idx = primaryIndex >= 0 ? primaryIndex : 0
  const primary = actions[idx]!
  const rest = actions.filter((_, i) => i !== idx)
  return { primary, rest }
}

export default function MayaWelcomePanel({
  eyebrow = "Maya",
  title,
  subtitle,
  uploadHint,
  actions,
  previewImageUrls = [],
  onThemeChipClick,
}: MayaWelcomePanelProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const images = (previewImageUrls.length > 0 ? previewImageUrls : FALLBACK_PREVIEWS).slice(0, 3)
  const { primary, rest } = useMemo(() => splitPrimaryAction(actions), [actions])

  const { data: weekPlanData } = useSWR<WeekPlanResponse>(
    onThemeChipClick ? "/api/maya/week-plan" : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  )
  const themes = weekPlanData?.themes ?? []

  return (
    <div className="w-full max-w-xl">
      <MayaInlineCard
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        surface="plain"
        actionsLayout="column"
        actions={
          <>
            <MayaInlineAction onClick={primary.onClick} variant="primary" className="w-full">
              {primary.label}
            </MayaInlineAction>
            {rest.length > 0 ? (
              <div className="w-full max-w-md border-t border-[rgba(195,190,182,0.12)] pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setMoreOpen((o) => !o)}
                  className="flex w-full items-center justify-between py-2 text-left text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-smoke)] hover:text-[color:var(--color-porcelain)] transition-colors"
                  aria-expanded={moreOpen}
                >
                  <span>{moreOpen ? "Hide" : "Other ways to start"}</span>
                  <span className="text-[#8a8780] tabular-nums">{moreOpen ? "−" : "+"}</span>
                </button>
                {moreOpen ? (
                  <div className="mt-1 flex flex-col border-t border-[rgba(195,190,182,0.08)]">
                    {rest.map((action) => (
                      <MayaInlineAction key={action.label} onClick={action.onClick} variant="ghost">
                        {action.label}
                      </MayaInlineAction>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        }
      >
        <div className="space-y-6 border-t border-[rgba(195,190,182,0.12)] pt-6">
          <p className="text-sm leading-relaxed text-[color:var(--text-accent)]">
            Start with the week ahead. I&apos;ll help you choose what to post, what photos to create, and what to say.
          </p>

          {uploadHint ? (
            <p className="text-xs leading-relaxed text-[color:var(--color-smoke)] border-l-2 border-[rgba(195,190,182,0.25)] pl-3">
              {uploadHint}
            </p>
          ) : null}

          {/* This week&apos;s themes - tapping one starts the weekly ritual */}
          {themes.length > 0 && onThemeChipClick ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-smoke)]">
                  This week&apos;s themes
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() =>
                      onThemeChipClick(`Let's plan my week around the ${theme.label} theme`)
                    }
                    className="rounded-full border border-[rgba(195,190,182,0.22)] px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-smoke)] transition-colors hover:border-[rgba(195,190,182,0.45)] hover:text-[color:var(--color-porcelain)]"
                  >
                    {theme.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-smoke)]">Content mood</span>
              <MayaInlinePill tone="muted">Photo direction</MayaInlinePill>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {images.map((imageUrl, index) => (
                <div
                  key={`${imageUrl}-${index}`}
                  className="overflow-hidden rounded-lg border border-[rgba(195,190,182,0.14)] bg-[rgba(18,16,13,0.82)]"
                >
                  <div className="aspect-[4/5] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="" className="h-full w-full object-cover opacity-90" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </MayaInlineCard>
    </div>
  )
}
