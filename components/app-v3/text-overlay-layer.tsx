"use client"

import { useEffect, useMemo, useState, type CSSProperties } from "react"
import {
  computeOverlayLayout,
  overlayNominalCanvas,
  type OverlayLayout,
  type OverlayMeasure,
  type OverlayScrim,
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
