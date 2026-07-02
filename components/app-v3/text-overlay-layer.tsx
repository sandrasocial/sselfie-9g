"use client"

import { useEffect, useMemo, useState, type CSSProperties } from "react"
import {
  computeOverlayLayout,
  getOverlayMarkableWords,
  isVerticalOverlayFormat,
  overlayCanvasFont,
  overlayNominalCanvas,
  OVERLAY_HEADLINE_MAX,
  OVERLAY_STYLE_PRESETS,
  OVERLAY_SUBLINE_MAX,
  resolveOverlayStyle,
  toggleMarkedWord,
  type OverlayLayout,
  type OverlayMeasure,
  type OverlayScrim,
  type OverlaySize,
  type TextOverlaySpec,
} from "@/lib/app-v3/text-overlay"

type TextOverlayLayerProps = {
  spec: TextOverlaySpec
}

// ─── Shared text measurement (one hidden canvas; the same engine the export uses) ──

let measureCtx: CanvasRenderingContext2D | null | undefined

function getMeasure(): OverlayMeasure {
  if (measureCtx === undefined && typeof document !== "undefined") {
    measureCtx = document.createElement("canvas").getContext("2d")
  }
  return (text, font) => {
    if (measureCtx) {
      measureCtx.font = font
      return measureCtx.measureText(text).width
    }
    // SSR fallback: rough average glyph width so the first paint is sane.
    const px = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 16)
    return text.length * px * 0.5
  }
}

/** Token hex -> rgba so scrim fills can carry the preset alpha without opacity leaks. */
function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace("#", "")
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function scrimGradient(scrim: OverlayScrim): string {
  const color = withAlpha(scrim.color, scrim.alpha)
  if (scrim.fade === "up") return `linear-gradient(180deg, ${color} 0%, transparent 100%)`
  if (scrim.fade === "band")
    return `linear-gradient(180deg, transparent 0%, ${color} 50%, transparent 100%)`
  return `linear-gradient(180deg, transparent 0%, ${color} 100%)`
}

/**
 * The live overlay. Renders the EXACT export layout (computeOverlayLayout) scaled to the
 * image box with container-query units, so what the member sees on screen is what the
 * flattened download produces: same wraps, same strip, same circle, same arrow.
 */
export function TextOverlayLayer({ spec }: TextOverlayLayerProps) {
  // Re-layout once the display fonts finish loading (metrics change slightly).
  const [fontsTick, setFontsTick] = useState(0)
  useEffect(() => {
    let alive = true
    document.fonts?.ready.then(() => {
      if (alive) setFontsTick(tick => tick + 1)
    })
    return () => {
      alive = false
    }
  }, [])

  const nominal = overlayNominalCanvas(spec.format)
  const layout: OverlayLayout = useMemo(
    () => computeOverlayLayout(spec, nominal.width, nominal.height, getMeasure()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spec, nominal.width, nominal.height, fontsTick]
  )
  // cqw sizes everything against the IMAGE box (not the viewport), so the on-screen layer
  // keeps the exact proportions of the flattened export.
  const cq = (value: number) => `${((value / nominal.width) * 100).toFixed(3)}cqw`

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      style={{ containerType: "inline-size" } as CSSProperties}
    >
      {layout.scrim && (
        <div
          style={{
            position: "absolute",
            left: cq(layout.scrim.x),
            top: cq(layout.scrim.y),
            width: cq(layout.scrim.width),
            height: cq(layout.scrim.height),
            background: scrimGradient(layout.scrim),
          }}
        />
      )}
      {layout.lines.map((line, lineIndex) => (
        <div key={`line-${lineIndex}`}>
          {line.segments.map((segment, segmentIndex) =>
            segment.strip ? (
              <div
                key={`strip-${lineIndex}-${segmentIndex}`}
                style={{
                  position: "absolute",
                  left: cq(segment.strip.x),
                  top: cq(segment.strip.y),
                  width: cq(segment.strip.width),
                  height: cq(segment.strip.height),
                  backgroundColor: segment.strip.color,
                  borderRadius: cq(nominal.width * 0.003),
                }}
              />
            ) : null
          )}
          {line.segments.map((segment, segmentIndex) => (
            <span
              key={`seg-${lineIndex}-${segmentIndex}`}
              style={{
                position: "absolute",
                left: cq(segment.x),
                top: cq(line.y),
                fontSize: cq(line.fontPx),
                lineHeight: 1,
                whiteSpace: "pre",
                fontFamily: line.fontFamily,
                fontWeight: line.fontWeight,
                fontStyle: segment.italic ? "italic" : undefined,
                letterSpacing: line.trackingEm ? `${line.trackingEm}em` : undefined,
                color: segment.color,
              }}
            >
              {segment.text}
            </span>
          ))}
        </div>
      ))}
      {layout.rule && (
        <div
          style={{
            position: "absolute",
            left: cq(layout.rule.x),
            top: cq(layout.rule.y),
            width: cq(layout.rule.width),
            height: `max(1px, ${cq(layout.rule.height)})`,
            backgroundColor: layout.rule.color,
          }}
        />
      )}
      {layout.accents.length > 0 && (
        <svg
          viewBox={`0 0 ${nominal.width} ${nominal.height}`}
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          {layout.accents.map((accent, index) => (
            <path
              key={`accent-${index}`}
              d={accent.d}
              fill="none"
              stroke={accent.color}
              strokeWidth={accent.thickness}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
      )}
    </div>
  )
}

// ─── Editor (style, size, words, position - instant re-render, no regenerate) ──

const OVERLAY_SIZES: { id: OverlaySize; label: string }[] = [
  { id: "s", label: "S" },
  { id: "m", label: "M" },
  { id: "l", label: "L" },
]

/** Tappable word chips: tap a word to move the style's highlight, no asterisk typing. */
function MarkedWordChips({
  text,
  hint,
  onToggle,
}: {
  text: string
  hint: string
  onToggle: (wordIndex: number) => void
}) {
  const words = getOverlayMarkableWords(text)
  if (words.length === 0) return null
  return (
    <div className="mt-1.5">
      <p className="text-[11px] text-[#818283]">{hint}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {words.map((word, index) => (
          <button
            key={`word-${index}-${word.text}`}
            type="button"
            onClick={() => onToggle(index)}
            className={`min-h-9 rounded-full border px-3 py-1 text-[12px] leading-none ${
              word.marked
                ? "border-[#0D0E10] bg-[#0D0E10] text-white"
                : "border-[#C5C6C8] bg-white text-[#4F5052]"
            }`}
          >
            {word.text}
          </button>
        ))}
      </div>
    </div>
  )
}

export function TextOverlayEditor({
  spec,
  imageUrl,
  onChange,
}: {
  spec: TextOverlaySpec
  /** The generated image the layer sits on; every style card previews on it live. */
  imageUrl: string
  onChange: (spec: TextOverlaySpec) => void
}) {
  const preset = resolveOverlayStyle(spec.style)
  const thumbAspect = isVerticalOverlayFormat(spec.format) ? "aspect-[9/16]" : "aspect-[4/5]"
  return (
    <div className="mt-3 w-full min-w-0 rounded-[6px] border border-[#C5C6C8]/60 bg-[#F8FAFA] p-3">
      <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#818283]">
        Text layer
      </p>
      <div className="mb-1.5 text-[11px] text-[#818283]">
        Tap a style to see your words on your photo.
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {OVERLAY_STYLE_PRESETS.map(style => {
          const selected = preset.id === style.id
          // The card IS the explanation: her real image + her real words in that style.
          const previewSpec: TextOverlaySpec = {
            ...spec,
            style: style.id,
            position: style.lockedPosition ?? style.defaultPosition ?? spec.position,
          }
          return (
            <button
              key={style.id}
              type="button"
              onClick={() => onChange(previewSpec)}
              className="w-[108px] shrink-0 text-left"
            >
              <span
                className={`relative block overflow-hidden rounded-[6px] bg-[#F1F2F2] ${thumbAspect} ${
                  selected ? "ring-2 ring-[#0D0E10]" : "ring-1 ring-[#C5C6C8]/70"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt=""
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <TextOverlayLayer spec={previewSpec} />
              </span>
              <span
                className={`mt-1.5 block text-[10px] uppercase tracking-[0.12em] ${
                  selected ? "text-[#0D0E10]" : "text-[#818283]"
                }`}
              >
                {style.name}
              </span>
            </button>
          )
        })}
      </div>
      <label className="mt-2 block">
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
      {preset.headlineMark !== "none" && (
        <MarkedWordChips
          text={spec.headline}
          hint={
            preset.headlineMark === "strip"
              ? "Tap the words that get the strip."
              : "Tap the words that get the underline."
          }
          onToggle={wordIndex =>
            onChange({ ...spec, headline: toggleMarkedWord(spec.headline, wordIndex) })
          }
        />
      )}
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
      {preset.sublineMark !== "none" && (spec.subline ?? "").trim().length > 0 && (
        <MarkedWordChips
          text={spec.subline ?? ""}
          hint="Tap the words that get the circle."
          onToggle={wordIndex =>
            onChange({ ...spec, subline: toggleMarkedWord(spec.subline ?? "", wordIndex) })
          }
        />
      )}
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <div>
          <div className="mb-1 text-[11px] text-[#818283]">Text size</div>
          <div className="grid grid-cols-3 gap-1.5">
            {OVERLAY_SIZES.map(size => (
              <button
                key={size.id}
                type="button"
                onClick={() => onChange({ ...spec, size: size.id })}
                className={`min-h-9 rounded-[4px] border px-2 text-[10px] uppercase tracking-[0.12em] ${
                  (spec.size ?? "m") === size.id
                    ? "border-[#0D0E10] bg-[#0D0E10] text-white"
                    : "border-[#C5C6C8] bg-white text-[#4F5052]"
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[11px] text-[#818283]">Position</div>
          {preset.lockedPosition ? (
            <p className="flex min-h-9 items-center text-[11px] text-[#818283]">
              This style keeps one spot so your series matches.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {(["top", "center", "bottom"] as const).map(position => (
                <button
                  key={position}
                  type="button"
                  onClick={() => onChange({ ...spec, position })}
                  className={`min-h-9 rounded-[4px] border px-1 text-[10px] uppercase tracking-[0.12em] ${
                    spec.position === position
                      ? "border-[#0D0E10] bg-[#0D0E10] text-white"
                      : "border-[#C5C6C8] bg-white text-[#4F5052]"
                  }`}
                >
                  {position}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Flattened export (Download bakes the layer into the final PNG) ────────────

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
  const gradient = ctx.createLinearGradient(0, scrim.y, 0, scrim.y + scrim.height)
  if (scrim.fade === "up") {
    gradient.addColorStop(0, scrim.color)
    gradient.addColorStop(1, "transparent")
  } else if (scrim.fade === "band") {
    gradient.addColorStop(0, "transparent")
    gradient.addColorStop(0.5, scrim.color)
    gradient.addColorStop(1, "transparent")
  } else {
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
    ctx.textAlign = "left"
    ctx.textBaseline = "top"
    const supportsTracking = "letterSpacing" in ctx
    for (const line of layout.lines) {
      for (const segment of line.segments) {
        if (segment.strip) {
          ctx.fillStyle = segment.strip.color
          ctx.fillRect(segment.strip.x, segment.strip.y, segment.strip.width, segment.strip.height)
        }
      }
      if (supportsTracking) {
        ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
          `${line.trackingEm * line.fontPx}px`
      }
      for (const segment of line.segments) {
        ctx.font = overlayCanvasFont(line.fontWeight, line.fontPx, line.fontFamily, segment.italic)
        ctx.fillStyle = segment.color
        ctx.fillText(segment.text, segment.x, line.y)
      }
      if (supportsTracking) {
        ;(ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px"
      }
    }
    if (layout.rule) {
      ctx.fillStyle = layout.rule.color
      ctx.fillRect(layout.rule.x, layout.rule.y, layout.rule.width, layout.rule.height)
    }
    for (const accent of layout.accents) {
      ctx.strokeStyle = accent.color
      ctx.lineWidth = accent.thickness
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.stroke(new Path2D(accent.d))
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
