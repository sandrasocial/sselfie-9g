import { generateText } from "ai"
import { createMayaAnthropicModel, createMayaOpenRouterModel, getMayaMaxTokensForTask } from "@/lib/maya/openrouter"

const CHAT_PRO = "chat_pro" as const
const MAX_OUTPUT = Math.min(768, getMayaMaxTokensForTask(CHAT_PRO))
const MAX_IMAGE_BYTES = 4 * 1024 * 1024

type VisionContentPart = { type: "text"; text: string } | { type: "image"; image: string }

/**
 * Fetches an image from our CDN/blob and inlines it so upstream LLMs do not need
 * to fetch the URL themselves (OpenRouter often cannot reach signed or private URLs).
 */
export async function fetchImageAsDataUrlForVision(imageUrl: string): Promise<string | null> {
  if (!imageUrl.startsWith("https://") && !imageUrl.startsWith("http://")) return null
  const res = await fetch(imageUrl, {
    signal: AbortSignal.timeout(15_000),
    headers: { Accept: "image/*,*/*;q=0.8" },
  })
  if (!res.ok) return null
  const buf = Buffer.from(await res.arrayBuffer())
  if (!buf.length || buf.length > MAX_IMAGE_BYTES) return null
  const rawCt = res.headers.get("content-type")?.split(";")[0]?.trim()
  const ct = rawCt && rawCt.startsWith("image/") ? rawCt : "image/jpeg"
  return `data:${ct};base64,${buf.toString("base64")}`
}

function visionParts(promptInput: string, image: string): VisionContentPart[] {
  return [
    { type: "text", text: promptInput },
    { type: "image", image },
  ]
}

function textOnlyMotionParts(promptInput: string): VisionContentPart[] {
  return [
    {
      type: "text",
      text: `${promptInput}\n\nWrite one Wan 2.5 I2V motion line from this text alone. The reference image could not be analyzed; infer subtle natural movement that fits the scene. One line only, no markdown.`,
    },
  ]
}

async function runGenerate(
  system: string,
  model: Parameters<typeof generateText>[0]["model"],
  content: VisionContentPart[],
): Promise<string> {
  const { text } = await generateText({
    model,
    system,
    messages: [{ role: "user", content }],
    temperature: 0.65,
    maxOutputTokens: MAX_OUTPUT,
  })
  return text
}

/**
 * OpenRouter vision can fail when the provider must fetch a blob URL itself.
 * We retry with a server-fetched data URL, then direct Anthropic, then text-only.
 */
export async function generateMotionPromptWithVisionFallbacks(
  system: string,
  promptInput: string,
  imageUrl: string | undefined,
): Promise<string> {
  const openRouter = createMayaOpenRouterModel(CHAT_PRO)
  const anthropic = createMayaAnthropicModel(CHAT_PRO)

  const hasImage =
    typeof imageUrl === "string" &&
    imageUrl.length > 0 &&
    (imageUrl.startsWith("https://") ||
      imageUrl.startsWith("http://") ||
      imageUrl.startsWith("data:image/"))

  if (!hasImage) {
    return runGenerate(system, openRouter, [{ type: "text", text: promptInput }])
  }

  const url = imageUrl as string

  if (url.startsWith("data:image/")) {
    try {
      return await runGenerate(system, openRouter, visionParts(promptInput, url))
    } catch (e0) {
      console.warn("[motion-prompt] OpenRouter + data:image failed:", e0)
    }
    if (anthropic) {
      try {
        return await runGenerate(system, anthropic, visionParts(promptInput, url))
      } catch (e0b) {
        console.warn("[motion-prompt] Anthropic + data:image failed:", e0b)
      }
    }
    return runGenerate(system, openRouter, textOnlyMotionParts(promptInput))
  }

  try {
    return await runGenerate(system, openRouter, visionParts(promptInput, url))
  } catch (e1) {
    console.warn("[motion-prompt] OpenRouter + image URL failed:", e1)
  }

  if (anthropic) {
    try {
      return await runGenerate(system, anthropic, visionParts(promptInput, url))
    } catch (e2) {
      console.warn("[motion-prompt] Anthropic + image URL failed:", e2)
    }
  }

  let dataUrl: string | null = null
  try {
    dataUrl = await fetchImageAsDataUrlForVision(url)
  } catch (e) {
    console.warn("[motion-prompt] fetch image for inlining failed:", e)
  }

  if (dataUrl) {
    try {
      return await runGenerate(system, openRouter, visionParts(promptInput, dataUrl))
    } catch (e3) {
      console.warn("[motion-prompt] OpenRouter + inlined image failed:", e3)
    }
    if (anthropic) {
      try {
        return await runGenerate(system, anthropic, visionParts(promptInput, dataUrl))
      } catch (e4) {
        console.warn("[motion-prompt] Anthropic + inlined image failed:", e4)
      }
    }
  }

  return runGenerate(system, openRouter, textOnlyMotionParts(promptInput))
}
