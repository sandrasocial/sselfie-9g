export const SUPPORTED_FEED_PLAN_POST_COUNTS = [6, 9, 12] as const
export const DEFAULT_INLINE_MAYA_FEED_POST_COUNT = 9

function returnIfValidFeedStrategyJson(candidate: string | null | undefined): string | null {
  if (!candidate) return null

  const trimmedCandidate = candidate.trim()
  if (!trimmedCandidate) return null

  try {
    JSON.parse(trimmedCandidate)
    return trimmedCandidate
  } catch {
    return null
  }
}

function removeInlineFeedStrategyBlocks(text: string): string {
  let cleanedText = text
  let feedStrategyIndex = cleanedText.search(/\[CREATE_FEED_STRATEGY:/i)

  while (feedStrategyIndex >= 0) {
    let bracketCount = 0
    let endIndex = -1

    for (let i = feedStrategyIndex; i < cleanedText.length; i += 1) {
      if (cleanedText[i] === "[") bracketCount += 1
      if (cleanedText[i] === "]") {
        bracketCount -= 1
        if (bracketCount === 0) {
          endIndex = i
          break
        }
      }
    }

    if (endIndex >= 0) {
      cleanedText = cleanedText.substring(0, feedStrategyIndex) + cleanedText.substring(endIndex + 1)
    } else {
      cleanedText = cleanedText.substring(0, feedStrategyIndex)
      break
    }

    feedStrategyIndex = cleanedText.search(/\[CREATE_FEED_STRATEGY:/i)
  }

  return cleanedText
}

export function isSupportedFeedPlanPostCount(count: number): boolean {
  return SUPPORTED_FEED_PLAN_POST_COUNTS.includes(count as (typeof SUPPORTED_FEED_PLAN_POST_COUNTS)[number])
}

export function hasFeedStrategyArtifacts(text: string): boolean {
  if (!text) return false

  return (
    text.includes("[CREATE_FEED_STRATEGY") ||
    /```json/i.test(text) ||
    /"feedStrategy"/i.test(text) ||
    /"feedTitle"/i.test(text) ||
    /"posts"\s*:/i.test(text) ||
    /"position"\s*:/i.test(text)
  )
}

export function extractFeedStrategyJson(text: string): string | null {
  if (!text || !text.includes("[CREATE_FEED_STRATEGY")) return null

  const inlineMatch = text.match(/\[CREATE_FEED_STRATEGY:\s*(\{[\s\S]*\})\]/i)
  if (inlineMatch?.[1]) return returnIfValidFeedStrategyJson(inlineMatch[1])

  const fencedJsonMatch = text.match(/\[CREATE_FEED_STRATEGY\][\s\S]*?```json\s*([\s\S]*?)\s*```/i)
  if (fencedJsonMatch?.[1]) return returnIfValidFeedStrategyJson(fencedJsonMatch[1])

  const fencedMatch = text.match(/\[CREATE_FEED_STRATEGY\][\s\S]*?```\s*([\s\S]*?)\s*```/i)
  if (fencedMatch?.[1]) return returnIfValidFeedStrategyJson(fencedMatch[1])

  const markerIndex = text.indexOf("[CREATE_FEED_STRATEGY]")
  if (markerIndex >= 0) {
    const afterMarker = text.slice(markerIndex)
    const jsonStart = afterMarker.indexOf("{")
    const jsonEnd = afterMarker.lastIndexOf("}") + 1
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      return returnIfValidFeedStrategyJson(afterMarker.slice(jsonStart, jsonEnd))
    }
  }

  return null
}

export function stripFeedStrategyArtifacts(text: string): string {
  if (!text) return ""

  let cleanedText = removeInlineFeedStrategyBlocks(text)
  const hadFeedArtifacts = hasFeedStrategyArtifacts(cleanedText)

  cleanedText = cleanedText.replace(/\[CREATE_FEED_STRATEGY\]/gi, "").trim()

  if (hadFeedArtifacts) {
    cleanedText = cleanedText.replace(/```json[\s\S]*?```/gi, "").trim()
    cleanedText = cleanedText.replace(/```[\s\S]*?```/g, "").trim()
    cleanedText = cleanedText.replace(/\{\s*"feedStrategy"[\s\S]*?\}/gi, "").trim()
    cleanedText = cleanedText.replace(/\{\s*"feedStrategy"[\s\S]*$/gi, "").trim()
    cleanedText = cleanedText.replace(/\{\s*"position"[\s\S]*$/gi, "").trim()

    // Handle split streaming text parts that can leak feed JSON fragments before the card is ready.
    cleanedText = cleanedText
      .replace(/^\s*\{\s*$/gm, "")
      .replace(/^\s*`{3}json\s*$/gmi, "")
      .replace(/^\s*`{3}\s*$/gm, "")
      .replace(/^\s*"feedTitle"\s*:\s*".*?,?\s*$/gmi, "")
      .replace(/^\s*"title"\s*:\s*".*?,?\s*$/gmi, "")
      .replace(/^\s*"aesthetic"\s*:\s*".*?,?\s*$/gmi, "")
      .replace(/^\s*"overallVibe"\s*:\s*".*?,?\s*$/gmi, "")
      .replace(/^\s*"colorPalette"\s*:\s*".*?,?\s*$/gmi, "")
      .replace(/^\s*"strategicRationale"\s*:\s*.*$/gmi, "")
      .replace(/^\s*"totalCredits"\s*:\s*\d+.*$/gmi, "")
      .replace(/^\s*\{?\s*"[^"]+"\s*:\s*.*$/gmi, "")
      .replace(/^\s*"posts"\s*:\s*\[.*$/gmi, "")
      .replace(/^\s*\{\s*"position"\s*:\s*\d+.*$/gmi, "")
      .replace(/^\s*"position"\s*:\s*\d+.*$/gmi, "")
      .replace(/^\s*"visualDirection"\s*:\s*".*?,?\s*$/gmi, "")
      .replace(/^\s*"caption"\s*:\s*".*?,?\s*$/gmi, "")
      .replace(/^\s*"prompt"\s*:\s*".*?,?\s*$/gmi, "")
      .replace(/^\s*[\]}],?\s*$/gm, "")
      .trim()
  }

  return cleanedText
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
}

export function shouldRetryInlineFeedGeneration(status: number): boolean {
  return status === 429 || status >= 500
}
