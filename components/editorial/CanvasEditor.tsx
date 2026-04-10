"use client"

import type Konva from "konva"
import { useEffect, useMemo, useRef, useState, type RefObject } from "react"
import { Image as KonvaImage, Layer, Rect, Stage } from "react-konva"
import useImage from "use-image"
import { EditorialTextLayer } from "./TextLayer"
import type { EditorState } from "./types"
import { FORMATS } from "./types"

export type EditorialFontFamilies = {
  headline: string
  subtext: string
}

type Props = {
  state: EditorState
  fonts: EditorialFontFamilies
  stageRef: RefObject<Konva.Stage | null>
}

function coverRect(iw: number, ih: number, cw: number, ch: number) {
  const scale = Math.max(cw / iw, ch / ih)
  const w = iw * scale
  const h = ih * scale
  return { x: (cw - w) / 2, y: (ch - h) / 2, width: w, height: h }
}

export function CanvasEditor({ state, fonts, stageRef }: Props) {
  const { width: cw, height: ch } = FORMATS[state.format]
  const [bg] = useImage(state.image ?? "", "anonymous")
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.4)
  const [fontsReady, setFontsReady] = useState(false)

  useEffect(() => {
    if (typeof document === "undefined") return
    void document.fonts.ready.then(() => setFontsReady(true))
  }, [])

  const imageLayout = useMemo(() => {
    if (!bg) return null
    return coverRect(bg.naturalWidth || bg.width, bg.naturalHeight || bg.height, cw, ch)
  }, [bg, cw, ch])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver(() => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (!w || !h) return
      const s = Math.min(w / cw, h / ch, 1) * 0.98
      setScale(Math.max(0.15, s))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [cw, ch])

  return (
    <div
      ref={containerRef}
      className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#f5f5f5] p-6"
    >
      <div
        className="rounded-sm bg-white shadow-[0_24px_80px_rgba(0,0,0,0.08)] ring-1 ring-[#0a0a0a]/5"
        style={{
          width: cw * scale,
          height: ch * scale,
        }}
      >
        <div
          style={{
            width: cw,
            height: ch,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <Stage
            ref={stageRef}
            width={cw}
            height={ch}
            className="!bg-black"
          >
            <Layer>
              {imageLayout && bg ? (
                <KonvaImage
                  image={bg}
                  x={imageLayout.x}
                  y={imageLayout.y}
                  width={imageLayout.width}
                  height={imageLayout.height}
                  listening={false}
                />
              ) : (
                <Rect x={0} y={0} width={cw} height={ch} fill="#1a1a1a" listening={false} />
              )}
              {state.showOverlay ? (
                <Rect
                  x={0}
                  y={0}
                  width={cw}
                  height={ch}
                  fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                  fillLinearGradientEndPoint={{ x: 0, y: ch }}
                  fillLinearGradientColorStops={[0, "rgba(0,0,0,0)", 0.55, "rgba(0,0,0,0.15)", 1, "rgba(0,0,0,0.68)"]}
                  listening={false}
                />
              ) : null}
              {fontsReady ? <EditorialTextLayer state={state} fonts={fonts} /> : null}
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  )
}
