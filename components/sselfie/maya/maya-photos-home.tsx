"use client"

import { MayaInlineAction, MayaInlineCard, MayaInlinePill } from "./maya-inline-card"

interface MayaPhotosHomeProps {
  creditsReady: number
  hasTrainedModel: boolean
  proMode: boolean
  onSendPrompt: (prompt: string) => void
  onOpenUpload: () => void
  onTrainModel: () => void
  onOpenPlan: () => void
}

export default function MayaPhotosHome({
  creditsReady,
  hasTrainedModel,
  proMode,
  onSendPrompt,
  onOpenUpload,
  onTrainModel,
  onOpenPlan,
}: MayaPhotosHomeProps) {
  const normalizedCredits = Math.max(0, Math.round(creditsReady))
  const sourceLabel = proMode ? "Selfie mode" : hasTrainedModel ? "My Model ready" : "Base photos"
  const getPhotoPrompt = (modelPrompt: string, selfiePrompt: string, basePrompt: string) => {
    if (proMode) return selfiePrompt
    if (hasTrainedModel) return modelPrompt
    return basePrompt
  }

  return (
    <div className="w-full max-w-3xl space-y-5">
      <MayaInlineCard
        eyebrow="Photos"
        title="Let’s create the image first."
        subtitle="Use this space for brand photos, concept cards, style directions, and image prompts. When you want strategy, Plan is one tap away."
        surface="plain"
        aside={<MayaInlinePill tone="muted">{normalizedCredits.toLocaleString()} credits</MayaInlinePill>}
        actionsLayout="column"
        actions={
          <>
            <MayaInlineAction
              variant="primary"
              className="w-full"
              onClick={() =>
                onSendPrompt(
                  getPhotoPrompt(
                    "Use my trained model and create three strong photo concepts for my personal brand.",
                    "Use my selfies and create three strong photo concepts for my personal brand.",
                    "Create three strong photo concepts for my personal brand.",
                  ),
                )
              }
            >
              Create Concept Cards
            </MayaInlineAction>
            <div className="grid w-full gap-2 sm:grid-cols-2">
              <MayaInlineAction
                variant="secondary"
                className="w-full justify-start text-left"
                onClick={() => onSendPrompt("Show me my gallery so I can reuse an existing brand photo.")}
              >
                Reuse From Gallery
              </MayaInlineAction>
              <MayaInlineAction
                variant="secondary"
                className="w-full justify-start text-left"
                onClick={() =>
                  onSendPrompt(
                    getPhotoPrompt(
                      "Use my trained model and create a soft luxury photo for my brand.",
                      "Use my selfies and create a soft luxury photo for my brand.",
                      "Create a soft luxury photo direction for my brand.",
                    ),
                  )
                }
              >
                Soft Luxury Photo
              </MayaInlineAction>
              <MayaInlineAction
                variant="secondary"
                className="w-full justify-start text-left"
                onClick={() =>
                  onSendPrompt(
                    getPhotoPrompt(
                      "Use my trained model and create a natural light lifestyle photo for my brand.",
                      "Use my selfies and create a natural light lifestyle photo for my brand.",
                      "Create a natural light lifestyle photo direction for my brand.",
                    ),
                  )
                }
              >
                Natural Light Photo
              </MayaInlineAction>
              <MayaInlineAction variant="secondary" className="w-full justify-start text-left" onClick={onOpenUpload}>
                Upload References
              </MayaInlineAction>
              <MayaInlineAction variant="secondary" className="w-full justify-start text-left" onClick={onOpenPlan}>
                Plan The Post
              </MayaInlineAction>
              <MayaInlineAction
                variant="secondary"
                className="w-full justify-start text-left"
                onClick={onOpenPlan}
              >
                Mixed Feed Plan
              </MayaInlineAction>
            </div>
          </>
        }
      >
        <div className="grid gap-4 border-t border-[color:var(--app-glass-border)] pt-6 md:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--app-text-secondary)]">
              Best for
            </p>
            <p className="mt-3 text-xl font-light leading-snug text-[color:var(--app-text-primary)]">
              Photos, image prompts, and concept cards.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--app-text-secondary)]">
              Ask for a look, a vibe, a location, or a brand moment. Maya will turn it into a visual direction you can generate or save.
            </p>
          </div>
          <div className="rounded-[12px] border border-[color:var(--app-glass-border)] bg-[rgba(255,255,255,0.54)] p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--app-text-secondary)]">
              Current source
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <MayaInlinePill tone={hasTrainedModel || proMode ? "strong" : "muted"}>{sourceLabel}</MayaInlinePill>
              {!hasTrainedModel && !proMode ? (
                <button
                  type="button"
                  onClick={onTrainModel}
                  className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--app-text-primary)] underline-offset-4 hover:underline"
                >
                  Train My Model
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </MayaInlineCard>
    </div>
  )
}
