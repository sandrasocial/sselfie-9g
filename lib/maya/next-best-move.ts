import type { MayaUserSnapshot } from "@/lib/maya/user-snapshot"

export type MayaNextBestMoveJob =
  | "decide"
  | "post"
  | "caption"
  | "photo"
  | "video"
  | "sell"
  | "train_model"

export interface MayaNextBestMoveAction {
  label: string
  prompt: string
  job?: MayaNextBestMoveJob
}

export interface MayaNextBestMove {
  job: MayaNextBestMoveJob
  eyebrow: string
  headline: string
  why: string
  primaryActionLabel: string
  prompt: string
  secondaryActions: MayaNextBestMoveAction[]
  signals: string[]
}

function hasMemoryValue(memoryData: Record<string, unknown>, keys: string[]): boolean {
  return keys.some((key) => {
    const value = memoryData[key]
    if (typeof value === "string") return value.trim().length > 0
    if (Array.isArray(value)) return value.length > 0
    if (value && typeof value === "object") return Object.keys(value).length > 0
    return false
  })
}

export function getMayaNextBestMove(snapshot: MayaUserSnapshot): MayaNextBestMove {
  const signals: string[] = []
  const hasOfferContext = snapshot.offerBrief.hasCoreFields
  const hasAnyMemory = Object.keys(snapshot.memoryData || {}).length > 0
  const hasIdentityNotes = hasMemoryValue(snapshot.memoryData, [
    "identity_notes",
    "preference_notes",
    "latest_offer_brief",
    "agent_context_note",
  ])

  if (hasOfferContext) signals.push("Offer context found")
  if (hasAnyMemory || hasIdentityNotes) signals.push("Maya memory found")
  if (snapshot.generation.hasTrainedModel) signals.push("My Model trained")
  if (snapshot.uploads.hasAny) signals.push("Reference assets available")

  if (!hasOfferContext) {
    return {
      job: "sell",
      eyebrow: "Next best move",
      headline: "Decide what you are selling this week.",
      why:
        "Before Maya plans posts or photos, she needs one clear offer or invitation to point the content toward.",
      primaryActionLabel: "Plan what to sell",
      prompt:
        "Help me decide what to sell this week. Ask only for what is missing, then turn it into one simple offer, one sales angle, and the first post I should make.",
      secondaryActions: [
        {
          label: "Make a post anyway",
          job: "post",
          prompt:
            "Make one useful post for this week even if my offer is not fully clear yet. Keep it simple and tell me what to do next.",
        },
        {
          label: "Write my caption",
          job: "caption",
          prompt:
            "Write a caption that helps my audience trust me and softly points to working with me.",
        },
      ],
      signals: signals.length ? signals : ["Offer context missing"],
    }
  }

  if (!snapshot.generation.hasTrainedModel && !snapshot.uploads.hasAny) {
    return {
      job: "post",
      eyebrow: "Next best move",
      headline: "Make the first sales-aware post before touching setup.",
      why:
        "You can build momentum now with words and direction. Training your model can come after the first post is clear.",
      primaryActionLabel: "Make a post",
      prompt:
        "Create one sales-aware post for this week from my offer context. Include the hook, caption, soft CTA, and the photo direction I should use.",
      secondaryActions: [
        {
          label: "Train my model",
          job: "train_model",
          prompt:
            "I want to train my model so Maya can create consistent images of me. Explain what I need and send me to Train My Model.",
        },
        {
          label: "Make a photo",
          job: "photo",
          prompt:
            "Give me one photo direction for my first sales-aware post. Keep it simple and realistic.",
        },
      ],
      signals: [...signals, "No trained model yet", "No reference assets yet"],
    }
  }

  return {
    job: "post",
    eyebrow: "Next best move",
    headline: "Turn your offer into one post people can act on.",
    why:
      "Maya has enough context to move from planning into execution: a post, a caption, and the photo or video direction that supports it.",
    primaryActionLabel: "Make the post",
    prompt:
      "Use what you know about my offer and brand to make one post for this week. Give me the hook, caption, soft CTA, photo direction, and the next action.",
    secondaryActions: [
      {
        label: "Write the caption",
        job: "caption",
        prompt:
          "Write the caption for my next offer-aware post. Make it sound like me, keep it human, and include a soft CTA.",
      },
      {
        label: snapshot.generation.hasTrainedModel ? "Make a photo" : "Make a photo idea",
        job: "photo",
        prompt:
          "Create one photo direction for my next offer-aware post. If my model or selfies are ready, tell me the best source to use before generating.",
      },
      {
        label: "Help me decide",
        job: "decide",
        prompt:
          "Look at what you know about me and tell me the single best move to make today. Keep it practical.",
      },
    ],
    signals,
  }
}
