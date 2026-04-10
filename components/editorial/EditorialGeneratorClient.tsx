"use client"

import type Konva from "konva"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { useCallback, useEffect, useRef, useState } from "react"
import { CanvasEditor } from "./CanvasEditor"
import { ControlsPanel } from "./ControlsPanel"
import {
  DEFAULT_EDITOR_STATE,
  EDITORIAL_PRESETS,
  type EditorState,
  type EditorialPresetId,
} from "./types"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
})

export function EditorialGeneratorClient() {
  const [state, setState] = useState<EditorState>(DEFAULT_EDITOR_STATE)
  const stageRef = useRef<Konva.Stage | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const revokeCurrent = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  useEffect(() => () => revokeCurrent(), [revokeCurrent])

  const onFile = useCallback(
    (file: File) => {
      revokeCurrent()
      const url = URL.createObjectURL(file)
      objectUrlRef.current = url
      setState((s) => ({ ...s, image: url }))
    },
    [revokeCurrent],
  )

  const onChange = useCallback((patch: Partial<EditorState>) => {
    setState((s) => ({ ...s, ...patch }))
  }, [])

  const onApplyPreset = useCallback((id: EditorialPresetId) => {
    const p = EDITORIAL_PRESETS[id]
    setState((s) => ({ ...s, headline: p.headline, subtext: p.subtext }))
  }, [])

  const fonts = {
    headline: cormorant.style.fontFamily,
    subtext: inter.style.fontFamily,
  }

  return (
    <div className={`flex min-h-screen flex-col bg-white lg:flex-row ${inter.className}`}>
      <div className="flex min-h-[min(55vh,520px)] min-h-0 min-w-0 flex-1 flex-col lg:min-h-screen">
        <CanvasEditor state={state} fonts={fonts} stageRef={stageRef} />
      </div>
      <ControlsPanel
        state={state}
        stageRef={stageRef}
        onFile={onFile}
        onChange={onChange}
        onApplyPreset={onApplyPreset}
        titleClassName={cormorant.className}
      />
    </div>
  )
}

export default EditorialGeneratorClient
