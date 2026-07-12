"use client"

export const SUITE_REVIEW_ELIGIBLE_EVENT = "sselfie:suite-review-eligible"

export type SuiteDownloadReviewContext = {
  source: "concept-card" | "lightbox" | "gallery"
  format?: string | null
  assetId?: string | number | null
}

export async function recordSuiteDownloadForReview(
  context: SuiteDownloadReviewContext,
): Promise<void> {
  try {
    const response = await fetch("/api/testimonials/eligibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "download",
        source: context.source,
        format: context.format || undefined,
        assetId:
          context.assetId === null || context.assetId === undefined
            ? undefined
            : String(context.assetId),
      }),
      credentials: "include",
    })
    if (!response.ok) return

    const data = (await response.json().catch(() => null)) as {
      eligible?: boolean
      downloadCount?: number
    } | null
    if (!data?.eligible || typeof window === "undefined") return

    window.dispatchEvent(
      new CustomEvent(SUITE_REVIEW_ELIGIBLE_EVENT, {
        detail: { downloadCount: data.downloadCount || 0 },
      }),
    )
  } catch {
    // Review capture is best-effort and must never interrupt a download.
  }
}

export async function dismissSuiteReviewPrompt(source = "post-success-prompt"): Promise<void> {
  try {
    await fetch("/api/testimonials/eligibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss", source }),
      credentials: "include",
    })
  } catch {
    // Dismissal is best-effort; the local prompt still closes immediately.
  }
}
