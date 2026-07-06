import type { SyntheticEvent } from "react"

/**
 * One delayed retry for generated-image tiles. A brand-new Vercel Blob URL can miss on its
 * very first paint (edge cache is populated lazily on first read), and without any onError
 * handling that one blip leaves a permanently broken tile — the "first image in a
 * collection shows a broken link" report from live QA. Retry once with a cache-busting
 * param; if it fails again, the browser's broken state stands (the URL is genuinely dead).
 */
export function retryGeneratedImageOnce(event: SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget
  if (!img || img.dataset.retriedLoad === "1") return
  img.dataset.retriedLoad = "1"
  const original = img.src
  if (!original || !original.startsWith("http")) return
  window.setTimeout(() => {
    img.src = original.includes("?") ? `${original}&retry=1` : `${original}?retry=1`
  }, 900)
}
