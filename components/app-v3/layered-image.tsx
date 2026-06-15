"use client"

import type { TextLayerSpec } from "@/lib/app-v3/overlay-layer"
import type { OutputFormat } from "./types"

const ASPECT_CLASS: Record<OutputFormat, string> = {
  photo: "aspect-[4/5]",
  carousel: "aspect-[4/5]",
  "reel-cover": "aspect-[9/16]",
  "story-slide": "aspect-[9/16]",
}

const EXPORT_SIZE: Record<OutputFormat, { width: number; height: number }> = {
  photo: { width: 1080, height: 1350 },
  carousel: { width: 1080, height: 1350 },
  "reel-cover": { width: 1080, height: 1920 },
  "story-slide": { width: 1080, height: 1920 },
}

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ")
}

function presetFor(styleId: string, role: TextLayerSpec["role"]) {
  if (styleId === "quote-statement") return "quote"
  if (styleId === "top-band-minimal") return "top"
  if (styleId === "lower-third-accent") return "lower"
  if (styleId === "series-cover") return "series"
  if (role === "cta") return "series"
  return "editorial"
}

export function LayeredImage({
  imageUrl,
  overlay,
  alt,
  format,
  className,
  imageClassName,
}: {
  imageUrl: string
  overlay?: TextLayerSpec | null
  alt: string
  format: OutputFormat
  className?: string
  imageClassName?: string
}) {
  return (
    <div
      className={cx(
        "relative isolate overflow-hidden bg-[#F1F2F2]",
        ASPECT_CLASS[format],
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={alt}
        decoding="async"
        className={cx("h-full w-full object-cover", imageClassName)}
      />
      {overlay?.headline ? <TextOverlayLayer overlay={overlay} /> : null}
    </div>
  )
}

function TextOverlayLayer({ overlay }: { overlay: TextLayerSpec }) {
  const preset = presetFor(overlay.styleId, overlay.role)
  const headline = overlay.headline.trim()
  const subline = overlay.subline?.trim()

  if (preset === "quote") {
    return (
      <div className="absolute inset-x-[8%] top-1/2 -translate-y-1/2 text-center text-[var(--ss-seasalt)]">
        <div className="absolute inset-[-18%] -z-10 bg-[#0D0E10]/42 blur-2xl" />
        <p className="font-serif text-[clamp(2rem,9vw,4.75rem)] font-light leading-[0.94]">
          {headline}
        </p>
        {subline ? (
          <p className="mx-auto mt-5 max-w-[34em] text-[clamp(0.68rem,2.1vw,0.9rem)] font-medium uppercase leading-relaxed tracking-[0.18em]">
            {subline}
          </p>
        ) : null}
      </div>
    )
  }

  if (preset === "top") {
    return (
      <div className="absolute inset-x-[8%] top-[7%] text-center text-[var(--ss-night)]">
        <div className="absolute inset-x-[-4%] inset-y-[-18%] -z-10 bg-[var(--ss-seasalt)]/72 blur-xl" />
        <p className="font-serif text-[clamp(1.6rem,7vw,4rem)] font-light leading-[0.98]">
          {headline}
        </p>
        {subline ? (
          <p className="mx-auto mt-3 max-w-[32em] text-[clamp(0.64rem,2vw,0.86rem)] font-medium uppercase leading-relaxed tracking-[0.2em] text-[var(--ss-davy)]">
            {subline}
          </p>
        ) : null}
      </div>
    )
  }

  if (preset === "lower") {
    return (
      <div className="absolute inset-x-[7%] bottom-[8%] max-w-[78%] text-[var(--ss-night)]">
        <div className="absolute inset-[-12%] -z-10 bg-[var(--ss-seasalt)]/78 blur-xl" />
        <p className="font-serif text-[clamp(1.8rem,8vw,4.4rem)] font-light leading-[0.94]">
          {headline}
        </p>
        <span className="mt-3 block h-px w-20 bg-[var(--ss-night)]/70" />
        {subline ? (
          <p className="mt-3 max-w-[34em] text-[clamp(0.68rem,2.2vw,0.92rem)] leading-relaxed text-[var(--ss-davy)]">
            {subline}
          </p>
        ) : null}
      </div>
    )
  }

  if (preset === "series") {
    return (
      <div className="absolute inset-x-[8%] bottom-[10%] text-center text-[var(--ss-night)]">
        <div className="absolute inset-x-[-5%] inset-y-[-22%] -z-10 bg-[var(--ss-seasalt)]/78 blur-xl" />
        <p className="font-serif text-[clamp(2rem,8.5vw,4.9rem)] font-light uppercase leading-[0.92]">
          {headline}
        </p>
        {subline ? (
          <p className="mx-auto mt-4 max-w-[32em] text-[clamp(0.64rem,2vw,0.86rem)] font-medium uppercase leading-relaxed tracking-[0.22em] text-[var(--ss-davy)]">
            {subline}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="absolute inset-x-[8%] bottom-[10%] text-center text-[var(--ss-night)]">
      <div className="absolute inset-x-[-5%] inset-y-[-22%] -z-10 bg-[var(--ss-seasalt)]/74 blur-xl" />
      <p className="font-serif text-[clamp(2rem,8.5vw,5rem)] font-light leading-[0.94]">
        {headline}
      </p>
      {subline ? (
        <>
          <span className="mx-auto mt-4 block h-px w-24 bg-[var(--ss-night)]/60" />
          <p className="mx-auto mt-4 max-w-[34em] text-[clamp(0.66rem,2.1vw,0.9rem)] font-medium uppercase leading-relaxed tracking-[0.2em] text-[var(--ss-davy)]">
            {subline}
          </p>
        </>
      ) : null}
    </div>
  )
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    if (!src.startsWith("data:")) image.crossOrigin = "anonymous"
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Could not load image for export."))
    image.src = src
  })
}

function coverRect(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
) {
  const sourceRatio = sourceWidth / sourceHeight
  const targetRatio = targetWidth / targetHeight
  if (sourceRatio > targetRatio) {
    const width = sourceHeight * targetRatio
    return { sx: (sourceWidth - width) / 2, sy: 0, sw: width, sh: sourceHeight }
  }
  const height = sourceWidth / targetRatio
  return { sx: 0, sy: (sourceHeight - height) / 2, sw: sourceWidth, sh: height }
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ""
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width <= maxWidth || !line) {
      line = test
    } else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

function drawScrim(ctx: CanvasRenderingContext2D, preset: string, width: number, height: number) {
  ctx.save()
  if (preset === "quote") {
    ctx.fillStyle = "rgba(13,14,16,0.34)"
    ctx.fillRect(width * 0.08, height * 0.27, width * 0.84, height * 0.46)
  } else if (preset === "top") {
    ctx.fillStyle = "rgba(248,250,250,0.72)"
    ctx.fillRect(width * 0.05, height * 0.04, width * 0.9, height * 0.26)
  } else {
    ctx.fillStyle = "rgba(248,250,250,0.72)"
    ctx.fillRect(width * 0.05, height * 0.62, width * 0.9, height * 0.31)
  }
  ctx.restore()
}

function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  overlay: TextLayerSpec,
  width: number,
  height: number
) {
  const preset = presetFor(overlay.styleId, overlay.role)
  const headline = overlay.headline.trim()
  const subline = overlay.subline?.trim()
  const maxWidth = width * 0.78
  const headlineSize = preset === "top" ? width * 0.082 : width * 0.095
  const headlineLine = headlineSize * 0.98
  const color = preset === "quote" ? "#F8FAFA" : "#0D0E10"
  const muted = preset === "quote" ? "#F8FAFA" : "#4F5052"

  drawScrim(ctx, preset, width, height)

  ctx.save()
  ctx.fillStyle = color
  ctx.textAlign = preset === "lower" ? "left" : "center"
  ctx.textBaseline = "top"
  ctx.font = `300 ${headlineSize}px "Cormorant Garamond", Georgia, serif`

  const lines = wrapLines(ctx, headline, maxWidth).slice(0, 4)
  const textHeight = lines.length * headlineLine + (subline ? height * 0.055 : 0)
  let x = width / 2
  let y = height * 0.66

  if (preset === "quote") y = height * 0.5 - textHeight / 2
  if (preset === "top") y = height * 0.07
  if (preset === "lower") {
    x = width * 0.09
    y = height * 0.67
  }

  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * headlineLine, maxWidth)
  })

  if (subline) {
    const subSize = width * 0.026
    const subY = y + lines.length * headlineLine + height * 0.035
    ctx.fillStyle = muted
    ctx.font = `500 ${subSize}px Inter, Arial, sans-serif`
    const subLines = wrapLines(ctx, subline.toUpperCase(), maxWidth).slice(0, 3)
    subLines.forEach((line, index) => {
      ctx.fillText(line, x, subY + index * subSize * 1.55, maxWidth)
    })
  }
  ctx.restore()
}

export async function downloadLayeredImage({
  imageUrl,
  overlay,
  format,
  fileName = "sselfie-text-layer.png",
}: {
  imageUrl: string
  overlay?: TextLayerSpec | null
  format: OutputFormat
  fileName?: string
}) {
  const { width, height } = EXPORT_SIZE[format]
  const image = await loadImage(imageUrl)
  await document.fonts?.ready

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Could not prepare export.")

  const rect = coverRect(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    width,
    height
  )
  ctx.drawImage(image, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, width, height)
  if (overlay?.headline) drawTextLayer(ctx, overlay, width, height)

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png", 0.95))
  if (!blob) throw new Error("Could not export image.")

  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
