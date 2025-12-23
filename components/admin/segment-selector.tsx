"use client"

import { useState } from 'react'
import { Check } from 'lucide-react'

interface Segment {
  id: string
  name: string
  size: number
  description?: string
  icon?: string
}

interface SegmentSelectorProps {
  segments: Segment[]
  onSelect: (segmentId: string, segmentName: string) => void
  onCancel: () => void
}

export default function SegmentSelector({ 
  segments, 
  onSelect, 
  onCancel 
}: SegmentSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null)

  const handleContinue = () => {
    if (selected) {
      const segment = segments.find(s => s.id === selected)
      if (segment) {
        onSelect(segment.id, segment.name)
      }
    }
  }

  return (
    <div className="bg-white border border-stone-300 rounded-xl p-6 shadow-lg max-w-2xl mx-auto">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-stone-900 mb-1">
          Select Target Audience
        </h3>
        <p className="text-sm text-stone-600">
          Choose which segment should receive this email
        </p>
      </div>

      <div className="space-y-2 mb-6">
        {segments.map((segment) => (
          <button
            key={segment.id}
            onClick={() => setSelected(segment.id)}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
              selected === segment.id
                ? 'border-stone-900 bg-stone-50'
                : 'border-stone-200 hover:border-stone-400'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {segment.icon && <span>{segment.icon}</span>}
                  <span className="font-semibold text-stone-900">
                    {segment.name}
                  </span>
                  <span className="text-sm text-stone-600">
                    ({segment.size.toLocaleString()} contacts)
                  </span>
                </div>
                {segment.description && (
                  <p className="text-xs text-stone-600 mt-1">
                    {segment.description}
                  </p>
                )}
              </div>
              {selected === segment.id && (
                <Check className="w-5 h-5 text-stone-900 shrink-0 mt-0.5" />
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleContinue}
          disabled={!selected}
          className="flex-1 px-4 py-2.5 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}

