"use client"

interface JsonEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  rows?: number
}

export default function JsonEditor({
  value,
  onChange,
  placeholder = '{\n  "key": "value"\n}',
  disabled = false,
  rows = 12,
}: JsonEditorProps) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      rows={rows}
      placeholder={placeholder}
      className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl text-sm font-mono text-stone-950 focus:outline-none focus:border-stone-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed resize-y"
      style={{ fontFamily: "monospace" }}
    />
  )
}

