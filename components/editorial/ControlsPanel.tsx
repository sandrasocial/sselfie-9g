"use client"

import { type RefObject } from "react"
import { Textarea } from "@/components/ui/textarea"
import { ExportButton } from "./ExportButton"
import { FormatToggle, formatDimensionsLabel } from "./FormatToggle"
import { ImageUploader } from "./ImageUploader"
import type { EditorState, EditorialFormat, EditorialPresetId } from "./types"
import { EDITORIAL_PRESETS } from "./types"

type Props = {
  state: EditorState
  stageRef: RefObject<import("konva").Stage | null>
  onFile: (file: File) => void
  onChange: (patch: Partial<EditorState>) => void
  onApplyPreset: (id: EditorialPresetId) => void
  titleClassName?: string
}

function RangeRow({
  label,
  min,
  max,
  value,
  onChange,
  suffix,
}: {
  label: string
  min: number
  max: number
  value: number
  onChange: (n: number) => void
  suffix?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-[#666666]">
        <span>{label}</span>
        <span className="tabular-nums text-[#0a0a0a]">
          {value}
          {suffix ?? ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#e5e5e5] accent-[#0a0a0a]"
      />
    </div>
  )
}

export function ControlsPanel({
  state,
  stageRef,
  onFile,
  onChange,
  onApplyPreset,
  titleClassName = "",
}: Props) {
  const onFormat = (format: EditorialFormat) => onChange({ format })

  return (
    <div className="flex h-full min-h-0 w-full max-w-md flex-col gap-6 overflow-y-auto border-t border-[#e5e5e5] bg-white p-6 lg:border-l lg:border-t-0">
      <div>
        <h1 className={`text-2xl font-light tracking-tight text-[#0a0a0a] ${titleClassName}`}>
          Editorial generator
        </h1>
        <p className="mt-1 text-xs text-[#666666]">
          Export {formatDimensionsLabel(state.format)} · luxury layout
        </p>
      </div>

      <ImageUploader onFile={onFile} />

      <div className="space-y-2">
        <span className="text-xs uppercase tracking-[0.2em] text-[#666666]">Format</span>
        <FormatToggle value={state.format} onChange={onFormat} />
      </div>

      <div className="space-y-3">
        <span className="text-xs uppercase tracking-[0.2em] text-[#666666]">Presets</span>
        <div className="flex gap-2">
          {(Object.keys(EDITORIAL_PRESETS) as EditorialPresetId[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onApplyPreset(id)}
              className="flex-1 rounded-md bg-[#f5f5f5] px-2 py-2 text-[10px] uppercase tracking-[0.15em] text-[#0a0a0a] ring-1 ring-[#e5e5e5] transition-opacity hover:opacity-80"
            >
              {EDITORIAL_PRESETS[id].label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.2em] text-[#666666]" htmlFor="ed-headline">
          Headline
        </label>
        <Textarea
          id="ed-headline"
          value={state.headline}
          onChange={(e) => onChange({ headline: e.target.value })}
          placeholder="Two lines work well"
          rows={3}
          className="resize-none border-[#e5e5e5] bg-[#fafafa] text-sm text-[#0a0a0a]"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-[0.2em] text-[#666666]" htmlFor="ed-sub">
          Subtext
        </label>
        <Textarea
          id="ed-sub"
          value={state.subtext}
          onChange={(e) => onChange({ subtext: e.target.value })}
          placeholder="Supporting line"
          rows={2}
          className="resize-none border-[#e5e5e5] bg-[#fafafa] text-sm text-[#0a0a0a]"
        />
      </div>

      <RangeRow
        label="Headline size"
        min={48}
        max={160}
        value={state.fontSize}
        onChange={(fontSize) => onChange({ fontSize })}
        suffix="px"
      />

      <RangeRow
        label="Text position (up)"
        min={0}
        max={280}
        value={state.textY}
        onChange={(textY) => onChange({ textY })}
        suffix="px"
      />

      <label className="flex cursor-pointer items-center gap-3 text-sm text-[#0a0a0a]">
        <input
          type="checkbox"
          checked={state.showOverlay}
          onChange={(e) => onChange({ showOverlay: e.target.checked })}
          className="size-4 rounded border-[#e5e5e5] accent-[#0a0a0a]"
        />
        <span>Gradient overlay</span>
      </label>

      <div className="mt-auto border-t border-[#e5e5e5] pt-6">
        <ExportButton stageRef={stageRef} state={state} disabled={!state.image} />
      </div>
    </div>
  )
}
