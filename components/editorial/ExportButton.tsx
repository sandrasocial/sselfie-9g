"use client"

import type Konva from "konva"
import { useCallback, type RefObject } from "react"
import type { EditorState } from "./types"

type Props = {
  stageRef: RefObject<Konva.Stage | null>
  state: EditorState
  disabled?: boolean
}

/** Exports at logical stage size (1080×…) with pixelRatio 1 for platform-accurate dimensions. */
export function ExportButton({ stageRef, state, disabled }: Props) {
  const onExport = useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    const dataUrl = stage.toDataURL({
      mimeType: "image/png",
      pixelRatio: 1,
    })
    const a = document.createElement("a")
    a.href = dataUrl
    a.download = `editorial-${state.format}.png`
    document.body.appendChild(a)
    a.click()
    a.remove()
  }, [stageRef, state.format])

  return (
    <button
      type="button"
      onClick={onExport}
      disabled={disabled}
      className="w-full rounded-md bg-[#0a0a0a] px-4 py-3 text-xs uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
    >
      Download PNG
    </button>
  )
}
