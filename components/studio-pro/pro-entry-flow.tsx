"use client"

import { useState } from "react"

interface ProEntryFlowProps {
  onSelection: (selection: 'just-me' | 'me-product' | 'editing' | 'full-brand') => void
}

export default function ProEntryFlow({ onSelection }: ProEntryFlowProps) {
  const [selected, setSelected] = useState<'just-me' | 'me-product' | 'editing' | 'full-brand' | null>(null)

  const options = [
    {
      id: 'just-me' as const,
      title: 'Just me',
      description: 'Personal brand content with consistent identity',
    },
    {
      id: 'me-product' as const,
      title: 'Me + product',
      description: 'Product placement and brand partnerships',
    },
    {
      id: 'editing' as const,
      title: 'Editing existing content',
      description: 'Transform and adapt your existing images',
    },
    {
      id: 'full-brand' as const,
      title: 'Full brand setup',
      description: 'Complete brand kit with colors, fonts, and assets',
    },
  ]

  const handleContinue = () => {
    if (selected) {
      onSelection(selected)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-gradient-to-b from-stone-50 to-white h-full overflow-y-auto">
      <div className="max-w-2xl w-full">
        <h2 className="text-xl font-serif font-extralight tracking-[0.2em] uppercase text-stone-950 mb-2 text-center">
          What are you creating today?
        </h2>
        <p className="text-sm text-stone-600 text-center mb-8 tracking-wide">
          This helps me set up your Pro workspace with exactly what you need
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {options.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelected(option.id)}
              className={`
                p-6 rounded-xl border transition-all duration-200 text-left
                ${selected === option.id
                  ? 'border-stone-900 bg-white/90 backdrop-blur-xl shadow-lg'
                  : 'border-stone-200/60 bg-white/80 backdrop-blur-xl hover:border-stone-300 hover:shadow-sm'
                }
              `}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-stone-950 mb-1.5 text-base">
                    {option.title}
                  </h3>
                  <p className="text-sm text-stone-600 leading-relaxed">
                    {option.description}
                  </p>
                </div>
                {selected === option.id && (
                  <div className="w-5 h-5 rounded-full bg-stone-900 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleContinue}
          disabled={!selected}
          className={`
            w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200
            ${selected
              ? 'bg-stone-900 text-white hover:bg-stone-800 shadow-lg'
              : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }
          `}
        >
          Continue
        </button>
      </div>
    </div>
  )
}




