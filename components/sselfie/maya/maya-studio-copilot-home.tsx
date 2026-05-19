"use client"

import useSWR from "swr"
import { MayaInlineAction, MayaInlineCard, MayaInlinePill } from "./maya-inline-card"
import type { MayaNextBestMove, MayaNextBestMoveJob } from "@/lib/maya/next-best-move"

interface MayaStudioCopilotHomeProps {
  creditsReady: number
  hasTrainedModel: boolean
  onSendPrompt: (prompt: string) => void
  onTrainModel: () => void
  onMakeVideo: () => void
}

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("Could not load Maya's next move")
    return res.json()
  })

const DEFAULT_MOVE: MayaNextBestMove = {
  job: "decide",
  eyebrow: "Next best move",
  headline: "Let Maya choose the first thing to make.",
  why: "Start with one clear action. Maya will help you decide, then turn it into something you can use.",
  primaryActionLabel: "Help me decide",
  prompt:
    "Look at what you know about me and tell me the single best move to make today. Then help me make it.",
  secondaryActions: [
    {
      label: "Make a post",
      job: "post",
      prompt:
        "Make one post for this week. Include the hook, caption, soft CTA, and the photo direction I should use.",
    },
    {
      label: "Plan what to sell",
      job: "sell",
      prompt:
        "Help me decide what to sell this week and turn it into one simple offer and one sales post.",
    },
  ],
  signals: ["Ready to start"],
}

const ACTIONS: Array<{ label: string; job: MayaNextBestMoveJob; prompt: string }> = [
  {
    label: "Help me decide",
    job: "decide",
    prompt:
      "Look at what you know about me and tell me the single best move to make today. Keep it practical, then help me make it.",
  },
  {
    label: "Make a post",
    job: "post",
    prompt:
      "Make one post for this week. Give me the hook, caption, soft CTA, and the photo direction I should use.",
  },
  {
    label: "Plan a few posts",
    job: "post",
    prompt:
      "Plan a few posts for me. First use any strong existing gallery images that fit, then mark only the missing slots as new images to create.",
  },
  {
    label: "Write the caption",
    job: "caption",
    prompt:
      "Write the caption for my next offer-aware post. Make it human, clear, and soft-selling.",
  },
  {
    label: "Make a photo",
    job: "photo",
    prompt:
      "Create one photo direction for my next post. Keep the setup simple and tell me what photo to use before creating it.",
  },
  {
    label: "Make a video",
    job: "video",
    prompt:
      "Help me turn one brand photo into a simple video idea for this week's content.",
  },
  {
    label: "Plan what to sell",
    job: "sell",
    prompt:
      "Help me decide what to sell this week. Turn it into one clear offer, one sales angle, and the first post I should make.",
  },
  {
    label: "Set up my look",
    job: "train_model",
    prompt:
      "I want Maya to recognize my look for more consistent photos. Explain what I need and take me to the setup step.",
  },
]

export default function MayaStudioCopilotHome({
  creditsReady,
  hasTrainedModel,
  onSendPrompt,
  onTrainModel,
  onMakeVideo,
}: MayaStudioCopilotHomeProps) {
  const { data } = useSWR<{ nextBestMove: MayaNextBestMove }>(
    "/api/maya/next-best-move",
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 60_000 },
  )

  const nextMove = data?.nextBestMove || DEFAULT_MOVE
  const normalizedCredits = Math.max(0, Math.round(creditsReady))
  const quickStartActions = ACTIONS.filter((action) => action.label === "Make a post" || action.job === "caption")
  const moreStartActions = ACTIONS.filter(
    (action) => action.job !== "decide" && !quickStartActions.some((quickAction) => quickAction.label === action.label),
  )

  function runAction(job: MayaNextBestMoveJob | undefined, prompt: string) {
    if (job === "train_model") {
      onTrainModel()
      return
    }
    if (job === "video") {
      onMakeVideo()
      return
    }
    onSendPrompt(prompt)
  }

  return (
    <div className="w-full max-w-3xl space-y-5">
      <MayaInlineCard
        eyebrow="Maya"
        title="What are we making today?"
        subtitle="Tell Maya what you want, or let her choose one simple next step for your photo, caption, or post."
        surface="plain"
        aside={<MayaInlinePill tone="muted">{normalizedCredits.toLocaleString()} credits</MayaInlinePill>}
        actionsLayout="column"
        actions={
          <>
            <MayaInlineAction
              variant="primary"
              className="w-full"
              onClick={() => runAction(nextMove.job, nextMove.prompt)}
            >
              {nextMove.primaryActionLabel}
            </MayaInlineAction>
            <div className="grid w-full gap-2 sm:grid-cols-2">
              {quickStartActions.map((action) => (
                <MayaInlineAction
                  key={action.label}
                  variant="secondary"
                  className="w-full justify-start text-left"
                  onClick={() => runAction(action.job, action.prompt)}
                >
                  {action.label}
                </MayaInlineAction>
              ))}
            </div>
            <details className="group w-full rounded-[10px] border border-[color:var(--app-glass-border)] bg-[rgba(255,255,255,0.42)]">
              <summary className="cursor-pointer list-none px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-[color:var(--app-text-secondary)] transition-colors hover:text-[color:var(--app-text-primary)]">
                More ways to start
              </summary>
              <div className="grid w-full gap-2 border-t border-[color:var(--app-glass-border)] p-2 sm:grid-cols-2">
                {moreStartActions.map((action) => (
                  <MayaInlineAction
                    key={action.label}
                    variant="secondary"
                    className="w-full justify-start text-left"
                    onClick={() => runAction(action.job, action.prompt)}
                  >
                    {action.label}
                  </MayaInlineAction>
                ))}
              </div>
            </details>
          </>
        }
      >
        <div className="grid gap-4 border-t border-[color:var(--app-glass-border)] pt-6 md:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--app-text-secondary)]">
              {nextMove.eyebrow}
            </p>
            <p className="mt-3 text-xl font-light leading-snug text-[color:var(--app-text-primary)]">
              {nextMove.headline}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-[color:var(--app-text-secondary)]">
              {nextMove.why}
            </p>
          </div>

          <div className="rounded-[12px] border border-[color:var(--app-glass-border)] bg-[rgba(255,255,255,0.54)] p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--app-text-secondary)]">
              Maya knows
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(nextMove.signals.length ? nextMove.signals : ["Ready to start"]).slice(0, 4).map((signal) => (
                <MayaInlinePill key={signal} tone="muted">
                  {signal}
                </MayaInlinePill>
              ))}
              <MayaInlinePill tone={hasTrainedModel ? "strong" : "muted"}>
                {hasTrainedModel ? "Maya knows my look" : "Photo setup open"}
              </MayaInlinePill>
            </div>
          </div>
        </div>

        {nextMove.secondaryActions.length > 0 ? (
          <div className="mt-6 border-t border-[color:var(--app-glass-border)] pt-4">
            <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[color:var(--app-text-secondary)]">
              Other good starts
            </p>
            <div className="flex flex-col">
              {nextMove.secondaryActions.slice(0, 3).map((action) => (
                <MayaInlineAction
                  key={action.label}
                  variant="ghost"
                  onClick={() => runAction(action.job, action.prompt)}
                >
                  {action.label}
                </MayaInlineAction>
              ))}
            </div>
          </div>
        ) : null}
      </MayaInlineCard>
    </div>
  )
}
