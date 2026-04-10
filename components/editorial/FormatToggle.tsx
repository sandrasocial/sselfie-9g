"use client"

import type { EditorialFormat } from "./types"
import { FORMATS } from "./types"

type Props = {
  value: EditorialFormat
  onChange: (format: EditorialFormat) => void
}

export function FormatToggle({ value, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {(["story", "portrait"] as const).map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex-1 rounded-md px-3 py-2 text-xs uppercase tracking-[0.2em] transition-opacity ${
            value === key
              ? "bg-[#0a0a0a] text-white"
              : "bg-white text-[#0a0a0a] ring-1 ring-[#e5e5e5] hover:opacity-80"
          }`}
        >
          {key === "story" ? "Story" : "Portrait"}
        </button>
      ))}
    </div>
  )
}

export function formatDimensionsLabel(format: EditorialFormat) {
  const f = FORMATS[format]
  return `${f.width}×${f.height}`
}
