"use client"

import type { CSSProperties } from "react"
import {
  computeOverlayLayout,
  OVERLAY_HEADLINE_MAX,
  OVERLAY_SUBLINE_MAX,
  resolveOverlayStyle,
  safeZoneFor,
  typeScaleFor,
  type OverlayScrim,
  type TextOverlaySpec,
} from "@/lib/app-v3/text-overlay"

type TextOverlayLayerProps = {
  spec: TextOverlaySpec
}

/** Token hex -> rgba so panel/strip fills can carry the preset alpha without opacity leaks. */
function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "")
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** The soft fade that guarantees contrast behind the words (never raw text on a busy photo). */
function fadeScrimStyle(spec: TextOverlaySpec): CSSProperties | null {
  const preset = resolveOverlayStyle(spec.style)
  if (preset.backdrop !== "fade") return null
  const fade =
    spec.position === "top"
      ? `linear-gradient(180deg, ${preset.backdropColor} 0%, transparent 100%)`
      : spec.position === "center"
        ? `linear-gradient(180deg, transparent 0%, ${preset.backdropColor} 48%, transparent 100%)`
        : `linear-gradient(180deg, transparent 0%, ${preset.backdropColor} 100%)`
  return {
    position: "absolute",
    inset:
      spec.position === "top"
        ? "0 0 auto 0"
        : spec.position === "center"
          ? "28% 0 28% 0"
          : "auto 0 0 0",
    height: spec.position === "center" ? undefined : "42%",
    background: fade,
    opacity: preset.backdropAlpha,
  }
}

/** Anchor the block inside the format's IG safe zone (matches the export layout math). */
function blockPosition(spec: TextOverlaySpec): CSSProperties {
  const safe = safeZoneFor(spec.format)
  if (spec.position === "top") return { top: `${(safe.top * 100).toFixed(1)}%` }
  if (spec.position === "center") return { top: "50%", transform: "translateY(-50%)" }
  return { bottom: `${(safe.bottom * 100).toFixed(1)}%` }
}

export function TextOverlayLayer({ spec }: TextOverlayLayerProps) {
  const preset = resolveOverlayStyle(spec.style)
  const scale = typeScaleFor(spec.format)
  const safe = safeZoneFor(spec.format)
  const scrim = fadeScrimStyle(spec)
  const subline = preset.sublineUppercase ? spec.subline?.toUpperCase() : spec.subline
  const sidePct = `${(safe.side * 100).toFixed(1)}%`
  // cqw sizes type against the IMAGE box (not the viewport), so the on-screen layer keeps the
  // same proportions as the flattened export. The clamp classes below stay as a fallback for
  // browsers without container query units.
  const headlineSize = `${(scale.headlineFrac * 100).toFixed(2)}cqw`
  const sublineSize = `${(scale.sublineFrac * 100).toFixed(2)}cqw`

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      style={{ containerType: "inline-size" } as CSSProperties}
    >
      {scrim && <div style={scrim} />}
      <div
        className="absolute flex flex-col items-center text-center"
        style={{ left: sidePct, right: sidePct, ...blockPosition(spec) }}
      >
        <div
          className={preset.backdrop === "strip" ? "space-y-2" : undefined}
          style={
            preset.backdrop === "panel"
              ? {
                  backgroundColor: withAlpha(preset.backdropColor, preset.backdropAlpha),
                  borderRadius: 12,
                  padding: "4cqw 4.5cqw",
                }
              : undefined
          }
        >
          <h3
            className={
              preset.backdrop === "strip"
                ? "inline box-decoration-clone rounded-[3px] px-3 py-1 font-serif text-[clamp(16px,6.4vw,74px)] font-normal leading-[1.12]"
                : "font-serif text-[clamp(16px,6.4vw,74px)] font-normal leading-[1.12]"
            }
            style={{
              color: preset.headlineColor,
              fontSize: headlineSize,
              backgroundColor: preset.backdrop === "strip" ? preset.backdropColor : undefined,
            }}
          >
            {spec.headline}
          </h3>
          {subline && (
            <p
              className={
                preset.backdrop === "strip"
                  ? "mx-auto mt-3 table rounded-[3px] px-3 py-1 text-[clamp(9px,2.3vw,28px)] leading-[1.45] tracking-[0.16em]"
                  : "mx-auto mt-3 max-w-[90%] text-[clamp(9px,2.3vw,28px)] leading-[1.45] tracking-[0.12em]"
              }
              style={{
                color: preset.sublineColor,
                fontSize: sublineSize,
                backgroundColor: preset.backdrop === "strip" ? preset.backdropColor : undefined,
                textTransform: preset.sublineUppercase ? "uppercase" : undefined,
              }}
            >
              {subline}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function TextOverlayEditor({
  spec,
  onChange,
}: {
  spec: TextOverlaySpec
  onChange: (spec: TextOverlaySpec) => void
}) {
  return (
    <div className="mt-3 rounded-[6px] border border-[#C5C6C8]/60 bg-[#F8FAFA] p-3">
      <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#818283]">
        Text layer
      </p>
      <label className="block">
        <span className="mb-1 block text-[11px] text-[#818283]">
          Keep it short, like a magazine cover line.
        </span>
        <input
          value={spec.headline}
          maxLength={OVERLAY_HEADLINE_MAX}
          onChange={event => onChange({ ...spec, headline: event.target.value })}
          className="h-10 w-full rounded-[4px] border border-[#C5C6C8] bg-white px-3 text-[14px] text-[#0D0E10] outline-none focus:border-[#0D0E10]"
        />
      </label>
      <label className="mt-2 block">
        <span className="mb-1 block text-[11px] text-[#818283]">Supporting line</span>
        <input
          value={spec.subline ?? ""}
          maxLength={OVERLAY_SUBLINE_MAX}
          onChange={event =>
            onChange({ ...spec, subline: event.target.value.trim() ? event.target.value : undefined })
          }
          className="h-10 w-full rounded-[4px] border border-[#C5C6C8] bg-white px-3 text-[14px] text-[#0D0E10] outline-none focus:border-[#0D0E10]"
        />
      </label>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {(["top", "center", "bottom"] as const).map(position => (
          <button
            key={position}
            type="button"
            onClick={() => onChange({ ...spec, position })}
            className={`min-h-9 rounded-[4px] border px-2 text-[10px] uppercase tracking-[0.12em] ${
              spec.position === position
                ? "border-[#0D0E10] bg-[#0D0E10] text-white"
                : "border-[#C5C6C8] bg-white text-[#4F5052]"
            }`}
          >
            {position}
          </button>
        ))}
      </div>
    </div>
  )
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Could not load image for download"))
    image.src = url
  })
}

function drawScrim(ctx: CanvasRenderingContext2D, scrim: OverlayScrim) {
  ctx.save()
  if (scrim.kind === "panel") {
    ctx.globalAlpha = scrim.alpha
    ctx.fillStyle = scrim.color
    if (typeof ctx.roundRect === "function") {
      ctx.beginPath()
      ctx.roundRect(scrim.x, scrim.y, scrim.width, scrim.height, scrim.radius)
      ctx.fill()
    } else {
      ctx.fillRect(scrim.x, scrim.y, scrim.width, scrim.height)
    }
    ctx.restore()
    return
  }
  let gradient: CanvasGradient
  if (scrim.fade === "up") {
    gradient = ctx.createLinearGradient(0, scrim.y, 0, scrim.y + scrim.height)
    gradient.addColorStop(0, scrim.color)
    gradient.addColorStop(1, "transparent")
  } else if (scrim.fade === "band") {
    gradient = ctx.createLinearGradient(0, scrim.y, 0, scrim.y + scrim.height)
    gradient.addColorStop(0, "transparent")
    gradient.addColorStop(0.5, scrim.color)
    gradient.addColorStop(1, "transparent")
  } else {
    gradient = ctx.createLinearGradient(0, scrim.y, 0, scrim.y + scrim.height)
    gradient.addColorStop(0, "transparent")
    gradient.addColorStop(1, scrim.color)
  }
  ctx.globalAlpha = scrim.alpha
  ctx.fillStyle = gradient
  ctx.fillRect(scrim.x, scrim.y, scrim.width, scrim.height)
  ctx.restore()
}

/**
 * Flatten the editable text layer into the final PNG at the image's native resolution.
 * Falls back to opening the clean image if the canvas export is blocked (e.g. CORS taint),
 * so Download never dead-ends for the member.
 */
export async function downloadImageWithOverlay(
  imageUrl: string,
  spec: TextOverlaySpec,
  filename = "sselfie.png"
) {
  try {
    await document.fonts?.ready
    const image = await loadImage(imageUrl)
    const width = image.naturalWidth || 1080
    const height = image.naturalHeight || 1350
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Canvas 2D unavailable")
    ctx.drawImage(image, 0, 0, width, height)
    const layout = computeOverlayLayout(spec, width, height, (text, font) => {
      ctx.font = font
      return ctx.measureText(text).width
    })
    if (layout.scrim) drawScrim(ctx, layout.scrim)
    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    for (const line of layout.lines) {
      if (line.strip) {
        ctx.fillStyle = line.strip.color
        ctx.fillRect(line.strip.x, line.strip.y, line.strip.width, line.strip.height)
      }
      ctx.font = `${line.fontWeight} ${line.fontPx}px ${line.fontFamily}`
      ctx.fillStyle = line.color
      ctx.fillText(line.text, width / 2, line.y)
    }
    const link = document.createElement("a")
    link.href = canvas.toDataURL("image/png")
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (error) {
    console.error("[text-overlay] Flattened export failed, opening the clean image:", error)
    window.open(imageUrl, "_blank", "noreferrer")
  }
}
