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
  const sourceLabel = proMode ? "Use this selfie" : hasTrainedModel ? "Maya knows my look" : "Photo ideas"
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
        subtitle="Start with a selfie, a look, or a vibe. Maya will help you turn it into a photo you can actually use."
        surface="plain"
        aside={<MayaInlinePill tone="muted">{normalizedCredits.toLocaleString()} credits</MayaInlinePill>}
        actionsLayout="column"
        actions={
          <>
            <MayaInlineAction variant="primary" className="w-full" onClick={onOpenUpload}>
              Upload Your Selfie
            </MayaInlineAction>
            <MayaInlineAction
              variant="secondary"
              className="w-full"
              onClick={() =>
                onSendPrompt(
                  getPhotoPrompt(
                    "Use my trained model and create one polished photo direction that makes my selfie look expensive.",
                    "Use my selfie and create one polished photo direction that makes it look expensive.",
                    "Create one polished photo direction that makes my selfie look expensive.",
                  ),
                )
              }
            >
              Make This Look Expensive
            </MayaInlineAction>
            <details className="group w-full rounded-[10px] border border-[color:var(--app-glass-border)] bg-[rgba(255,255,255,0.42)]">
              <summary className="cursor-pointer list-none px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-[color:var(--app-text-secondary)] transition-colors hover:text-[color:var(--app-text-primary)]">
                More ways to start
              </summary>
              <div className="grid w-full gap-2 border-t border-[color:var(--app-glass-border)] p-2 sm:grid-cols-2">
                <MayaInlineAction
                  variant="secondary"
                  className="w-full justify-start text-left"
                  onClick={() => onSendPrompt("Show me my gallery so I can reuse an existing brand photo.")}
                >
                  Use a Saved Photo
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
                <MayaInlineAction variant="secondary" className="w-full justify-start text-left" onClick={onOpenPlan}>
                  Plan My Post
                </MayaInlineAction>
                <MayaInlineAction
                  variant="secondary"
                  className="w-full justify-start text-left"
                  onClick={onOpenPlan}
                >
                  Plan a Few Posts
                </MayaInlineAction>
                {!hasTrainedModel && !proMode ? (
                  <MayaInlineAction
                    variant="secondary"
                    className="w-full justify-start text-left"
                    onClick={onTrainModel}
                  >
                    Set Up My Look
                  </MayaInlineAction>
                ) : null}
              </div>
            </details>
          </>
        }
      >
        <div className="grid gap-4 border-t border-[color:var(--app-glass-border)] pt-6 md:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--app-text-secondary)]">
              Best for
            </p>
            <p className="mt-3 text-xl font-light leading-snug text-[color:var(--app-text-primary)]">
              Selfies, photo ideas, and polished content.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--app-text-secondary)]">
              Ask for a look, a vibe, a location, or a feeling. Maya will turn it into a photo direction you can make, save, or post.
            </p>
          </div>
          <div className="rounded-[12px] border border-[color:var(--app-glass-border)] bg-[rgba(255,255,255,0.54)] p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--app-text-secondary)]">
              Photo setup
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <MayaInlinePill tone={hasTrainedModel || proMode ? "strong" : "muted"}>{sourceLabel}</MayaInlinePill>
            </div>
          </div>
        </div>
      </MayaInlineCard>
    </div>
  )
}
