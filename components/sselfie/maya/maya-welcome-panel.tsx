"use client"

import { MayaInlineAction, MayaInlineCard, MayaInlinePill } from "./maya-inline-card"

interface MayaWelcomeAction {
  label: string
  onClick: () => void
  variant?: "primary" | "secondary"
}

interface MayaWelcomePanelProps {
  eyebrow?: string
  title: string
  subtitle: string
  uploadHint?: string
  actions: MayaWelcomeAction[]
  previewImageUrls?: string[]
}

const FALLBACK_PREVIEWS = [
  "/assets/brand-strategy/hero.png",
  "/assets/brand-strategy/woman.png",
  "/assets/brand-strategy/pillar1.png",
]

export default function MayaWelcomePanel({
  eyebrow = "Maya",
  title,
  subtitle,
  uploadHint,
  actions,
  previewImageUrls = [],
}: MayaWelcomePanelProps) {
  const images = (previewImageUrls.length > 0 ? previewImageUrls : FALLBACK_PREVIEWS).slice(0, 3)

  return (
    <div className="w-full max-w-3xl">
      <MayaInlineCard
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        aside={<MayaInlinePill tone="strong">Chat-first</MayaInlinePill>}
        actions={actions.map((action) => (
          <MayaInlineAction
            key={action.label}
            onClick={action.onClick}
            variant={action.variant || "secondary"}
          >
            {action.label}
          </MayaInlineAction>
        ))}
      >
        <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <div className="rounded-[22px] border border-[rgba(195,190,182,0.16)] bg-[rgba(175,170,162,0.12)] px-4 py-3 text-right text-sm text-[color:var(--color-porcelain)]">
              I need one photo for Monday&apos;s post
            </div>
            <div className="stone-inset-panel rounded-[22px] px-4 py-4">
              <div className="text-sm leading-relaxed text-[color:var(--color-porcelain)]">
                Perfect. I&apos;ll make the photo, map the week, and keep everything moving right here with you.
              </div>
            </div>
            {uploadHint ? (
              <div className="rounded-[22px] border border-[rgba(195,190,182,0.14)] bg-[rgba(175,170,162,0.08)] px-4 py-3 text-xs leading-relaxed text-[color:var(--text-accent)]">
                {uploadHint}
              </div>
            ) : null}
          </div>

          <div className="stone-inset-panel rounded-[24px] px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-smoke)]">Your preview</div>
              <MayaInlinePill tone="muted">3 photos</MayaInlinePill>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2.5">
              {images.map((imageUrl, index) => (
                <div key={`${imageUrl}-${index}`} className="overflow-hidden rounded-[18px] border border-[rgba(195,190,182,0.14)] bg-[rgba(18,16,13,0.82)]">
                  <div className="aspect-[4/5] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="" className="h-full w-full object-cover opacity-95" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs leading-relaxed text-[color:var(--text-accent)]">
              I&apos;ll show each result right here so you can tweak it, save it, or publish—no jumping to other screens.
            </div>
          </div>
        </div>
      </MayaInlineCard>
    </div>
  )
}
