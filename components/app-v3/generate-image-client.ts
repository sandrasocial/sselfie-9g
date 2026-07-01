// SSELFIE Studio 3.0 - client engine.
// Connects the Concierge "Generate" button to the synchronous OpenAI route. Compiles the
// prompt(s), fires one call per image (carousels = one call per slide, kept cohesive),
// and returns the finished image URLs. Conversational edits re-run with the previous
// image as the reference. The route persists each image to the gallery (ai_images).

import { compileMayaPrompt, MAX_CAROUSEL_SLIDES } from "@/lib/app-v3/prompt-compiler"
import type { Aesthetic, GraphicTextSpec, OutputFormat } from "./types"

const OPENAI_ROUTE = "/api/maya/generate-image-openai"

export interface MayaGenerateInput {
  aesthetic: Aesthetic
  outputFormat: OutputFormat
  referenceSelfieUrl: string | null
  userText?: string
  graphicText?: GraphicTextSpec | null
  /** Conversational edit: previous image becomes the reference for this turn. */
  refineFromImageUrl?: string | null
}

export type ProgressState = "compiling" | "generating" | "saving" | "done"
export interface ProgressEvent {
  state: ProgressState
  index?: number
  total?: number
}

export interface MayaGenerateResult {
  images: string[]
  engine: "openai"
}

async function generateOne(
  prompt: string,
  size: "1024x1024" | "1024x1792",
  referenceImageUrl: string | null,
): Promise<string> {
  const res = await fetch(OPENAI_ROUTE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      size,
      ...(referenceImageUrl ? { referenceImageUrl } : {}),
    }),
  })
  const data = (await res.json().catch(() => null)) as { imageUrl?: string; error?: string } | null
  if (!res.ok || !data?.imageUrl) {
    throw new Error(data?.error || `Generation failed (${res.status})`)
  }
  return data.imageUrl
}

export async function generateMayaImage(
  input: MayaGenerateInput,
  opts?: { onProgress?: (e: ProgressEvent) => void },
): Promise<MayaGenerateResult> {
  const onProgress = opts?.onProgress
  onProgress?.({ state: "compiling" })

  const { prompts, size } = compileMayaPrompt({
    aestheticIntent: input.aesthetic.intent,
    aestheticName: input.aesthetic.name,
    outputFormat: input.outputFormat,
    userText: input.userText,
    graphicText: input.graphicText,
    isEdit: Boolean(input.refineFromImageUrl),
  })

  // Edit turns refine the previous image; first-pass uses the reference selfie.
  const reference = input.refineFromImageUrl ?? input.referenceSelfieUrl
  const boundedPrompts = prompts.slice(0, MAX_CAROUSEL_SLIDES)
  const images: string[] = []

  for (let i = 0; i < boundedPrompts.length; i++) {
    onProgress?.({ state: "generating", index: i + 1, total: boundedPrompts.length })
    // Sequential keeps slide cohesion and avoids rate spikes.
    images.push(await generateOne(boundedPrompts[i], size, reference))
  }

  onProgress?.({ state: "done", total: boundedPrompts.length })
  return { images, engine: "openai" }
}
