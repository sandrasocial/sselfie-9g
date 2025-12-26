'use client'

import React from 'react'

export type ConsistencyMode = 'variety' | 'consistent'

interface ConceptConsistencyToggleProps {
  value: ConsistencyMode
  onChange: (mode: ConsistencyMode) => void
  count?: number
  className?: string
}

export function ConceptConsistencyToggle({
  value,
  onChange,
  count = 6,
  className = ''
}: ConceptConsistencyToggleProps) {
  
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-stone-700 tracking-wide uppercase">
          Concept Style
        </label>
        <span className="text-[10px] text-stone-500">
          {count} cards
        </span>
      </div>
      
      {/* Toggle Options */}
      <div className="grid grid-cols-2 gap-2">
        {/* Variety Option */}
        <button
          type="button"
          onClick={() => onChange('variety')}
          className={`
            relative px-3 py-3 rounded-lg border-2 transition-all text-left
            ${value === 'variety'
              ? 'border-stone-900 bg-stone-50 shadow-sm'
              : 'border-stone-200 bg-white hover:border-stone-300'
            }
          `}
        >
          <div className="flex items-start gap-2">
            {/* Radio indicator */}
            <div className={`
              mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
              ${value === 'variety' ? 'border-stone-900' : 'border-stone-300'}
            `}>
              {value === 'variety' && (
                <div className="w-2 h-2 rounded-full bg-stone-900" />
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-stone-900 mb-0.5">
                Variety
              </div>
              <div className="text-[10px] text-stone-600 leading-relaxed">
                Different outfits & scenes
              </div>
            </div>
          </div>
        </button>
        
        {/* Consistency Option */}
        <button
          type="button"
          onClick={() => onChange('consistent')}
          className={`
            relative px-3 py-3 rounded-lg border-2 transition-all text-left
            ${value === 'consistent'
              ? 'border-stone-900 bg-stone-50 shadow-sm'
              : 'border-stone-200 bg-white hover:border-stone-300'
            }
          `}
        >
          <div className="flex items-start gap-2">
            {/* Radio indicator */}
            <div className={`
              mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0
              ${value === 'consistent' ? 'border-stone-900' : 'border-stone-300'}
            `}>
              {value === 'consistent' && (
                <div className="w-2 h-2 rounded-full bg-stone-900" />
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-stone-900 mb-0.5">
                Consistent
              </div>
              <div className="text-[10px] text-stone-600 leading-relaxed">
                Same look, different angles
              </div>
            </div>
          </div>
        </button>
      </div>
      
      {/* Helpful description */}
      <div className="text-[10px] text-stone-500 leading-relaxed px-1">
        {value === 'variety' ? (
          <>
            <span className="font-medium text-stone-700">Variety:</span> Each concept card will have different outfits, locations, and scenes. Perfect for diverse content.
          </>
        ) : (
          <>
            <span className="font-medium text-stone-700">Consistent:</span> All concept cards use the same outfit, location, and lighting — only poses and angles vary. Perfect for video editing.
          </>
        )}
      </div>
    </div>
  )
}


