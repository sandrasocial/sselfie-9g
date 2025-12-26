/**
 * SSELFIE Studio - Prompt Suggestion Card Component
 * Matches design system: stone palette, no emojis, minimal icons, editorial luxury aesthetic
 */

'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import type { PromptSuggestion, NanoBananaCapability } from '@/lib/maya/prompt-generator'

interface PromptSuggestionCardProps {
  suggestion: PromptSuggestion
  onCopyToWorkbench: (prompt: string) => void
  onUseInWorkbench: (prompt: string) => void
}

/**
 * Capability labels - text only, no emojis per SSELFIE design system
 */
const CAPABILITY_LABELS: Record<NanoBananaCapability, string> = {
  text_rendering: 'Text Rendering',
  multi_image_composition: 'Multi-Image',
  character_consistency: 'Character Lock',
  real_time_data: 'Live Data',
  professional_controls: 'Pro Controls',
  educational_excellence: 'Educational',
  multilingual: 'Multilingual'
}

export function PromptSuggestionCard({ 
  suggestion, 
  onCopyToWorkbench,
  onUseInWorkbench 
}: PromptSuggestionCardProps) {
  const [copied, setCopied] = useState(false)
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(suggestion.prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <div className="border border-stone-200 rounded-lg bg-white hover:border-stone-300 transition-all">
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-stone-950 tracking-tight">
              {suggestion.name}
            </h4>
            <p className="text-xs text-stone-600 mt-1 font-light leading-relaxed">
              {suggestion.description}
            </p>
          </div>
          
          {/* Confidence Score */}
          {suggestion.confidence !== undefined && (
            <div className="flex-shrink-0">
              <span className="inline-block px-2 py-1 bg-stone-100 text-stone-700 text-xs font-medium tracking-wider uppercase rounded">
                {Math.round((suggestion.confidence || 0) * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Capabilities - Clean text badges, no icons or emojis */}
      {suggestion.nanoBananaCapabilities && suggestion.nanoBananaCapabilities.length > 0 && (
        <div className="px-4 py-3 border-b border-stone-100">
          <div className="flex flex-wrap gap-2">
            {suggestion.nanoBananaCapabilities.map(cap => (
              <span 
                key={cap}
                className="inline-block px-2.5 py-1 bg-stone-50 text-stone-600 text-xs font-medium tracking-wider uppercase rounded border border-stone-200"
              >
                {CAPABILITY_LABELS[cap] || cap}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Prompt Preview */}
      <div className="px-4 py-3 bg-stone-50 border-b border-stone-100">
        <div className="max-h-32 overflow-y-auto">
          <pre className="text-xs text-stone-700 whitespace-pre-wrap font-mono leading-relaxed">
            {suggestion.prompt.length > 300 ? `${suggestion.prompt.slice(0, 300)}...` : suggestion.prompt}
          </pre>
        </div>
      </div>
      
      {/* Actions */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleCopy}
            className="px-4 py-2.5 border border-stone-300 rounded-lg hover:bg-stone-50 transition-all text-sm font-medium tracking-wider uppercase text-stone-950"
          >
            {copied ? (
              <span className="flex items-center justify-center gap-2">
                <Check className="w-4 h-4" strokeWidth={2} />
                COPIED
              </span>
            ) : (
              'COPY'
            )}
          </button>
          
          <button
            onClick={() => onUseInWorkbench(suggestion.prompt)}
            className="px-4 py-2.5 bg-stone-950 text-white rounded-lg hover:bg-stone-800 transition-all text-sm font-medium tracking-wider uppercase"
          >
            USE IN WORKBENCH
          </button>
        </div>
      </div>
      
      {/* Use Cases - Minimal footer */}
      {suggestion.useCases && suggestion.useCases.length > 0 && (
        <div className="px-4 py-3 border-t border-stone-100">
          <p className="text-xs text-stone-500 font-light tracking-wider uppercase mb-2">
            Best For
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestion.useCases.slice(0, 3).map(useCase => (
              <span 
                key={useCase} 
                className="inline-block px-2 py-0.5 bg-stone-100 text-stone-600 text-xs font-light rounded"
              >
                {useCase}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Loading state for suggestions - matches SSELFIE skeleton patterns
 */
export function PromptSuggestionSkeleton() {
  return (
    <div className="border border-stone-200 rounded-lg bg-white animate-pulse">
      <div className="px-4 py-3 border-b border-stone-200">
        <div className="h-4 bg-stone-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-stone-100 rounded w-full"></div>
      </div>
      <div className="px-4 py-3 border-b border-stone-100">
        <div className="flex gap-2">
          <div className="h-6 bg-stone-100 rounded w-20"></div>
          <div className="h-6 bg-stone-100 rounded w-24"></div>
        </div>
      </div>
      <div className="px-4 py-3 bg-stone-50 border-b border-stone-100">
        <div className="space-y-2">
          <div className="h-3 bg-stone-200 rounded w-full"></div>
          <div className="h-3 bg-stone-200 rounded w-5/6"></div>
          <div className="h-3 bg-stone-200 rounded w-4/6"></div>
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="h-10 bg-stone-200 rounded-lg"></div>
          <div className="h-10 bg-stone-950 rounded-lg"></div>
        </div>
      </div>
    </div>
  )
}

/**
 * Container for multiple suggestions
 */
interface PromptSuggestionsContainerProps {
  suggestions: PromptSuggestion[]
  onCopyToWorkbench: (prompt: string) => void
  onUseInWorkbench: (prompt: string) => void
  isLoading?: boolean
}

export function PromptSuggestionsContainer({ 
  suggestions, 
  onCopyToWorkbench,
  onUseInWorkbench,
  isLoading = false
}: PromptSuggestionsContainerProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <PromptSuggestionSkeleton />
        <PromptSuggestionSkeleton />
        <PromptSuggestionSkeleton />
      </div>
    )
  }
  
  if (suggestions.length === 0) {
    return null
  }
  
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wider uppercase text-stone-950">
          Suggested Prompts
        </h3>
        <span className="text-xs text-stone-500 font-light">
          {suggestions.length} option{suggestions.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      {/* Suggestions */}
      <div className="space-y-3">
        {suggestions.map(suggestion => (
          <PromptSuggestionCard
            key={suggestion.id}
            suggestion={suggestion}
            onCopyToWorkbench={onCopyToWorkbench}
            onUseInWorkbench={onUseInWorkbench}
          />
        ))}
      </div>
    </div>
  )
}
































