"use client"

import { useState } from 'react'
import { X, Check } from 'lucide-react'

export interface AlexSuggestion {
  id?: number
  type: string
  text: string
  action?: string
  reasoning: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  metadata?: Record<string, any>
  created_at?: Date
}

interface AlexSuggestionCardProps {
  suggestion: AlexSuggestion
  onDismiss: (suggestionId: number) => Promise<void>
  onActUpon: (suggestionId: number) => Promise<void>
  onActionClick?: (suggestion: AlexSuggestion) => void
}

export function AlexSuggestionCard({ 
  suggestion, 
  onDismiss, 
  onActUpon,
  onActionClick 
}: AlexSuggestionCardProps) {
  const [isDismissing, setIsDismissing] = useState(false)
  const [isActingUpon, setIsActingUpon] = useState(false)

  const handleDismiss = async () => {
    if (!suggestion.id) return
    setIsDismissing(true)
    try {
      await onDismiss(suggestion.id)
    } catch (error) {
      console.error('Error dismissing suggestion:', error)
    } finally {
      setIsDismissing(false)
    }
  }

  const handleAction = async () => {
    if (!suggestion.id) return
    
    // If onActionClick is provided, call it first
    if (onActionClick) {
      onActionClick(suggestion)
    }
    
    // Mark as acted upon
    setIsActingUpon(true)
    try {
      await onActUpon(suggestion.id)
    } catch (error) {
      console.error('Error marking suggestion acted upon:', error)
    } finally {
      setIsActingUpon(false)
    }
  }

  const getPriorityColor = () => {
    switch (suggestion.priority) {
      case 'urgent':
        return 'bg-red-50 border-red-200'
      case 'high':
        return 'bg-amber-50 border-amber-200'
      case 'medium':
        return 'bg-blue-50 border-blue-200'
      case 'low':
        return 'bg-stone-50 border-stone-200'
      default:
        return 'bg-stone-50 border-stone-200'
    }
  }

  const getPriorityBadge = () => {
    switch (suggestion.priority) {
      case 'urgent':
        return 'Urgent'
      case 'high':
        return 'High Priority'
      case 'medium':
        return 'Suggestion'
      case 'low':
        return 'Optional'
      default:
        return 'Suggestion'
    }
  }

  // Extract emoji from text if present (usually at the start)
  const emojiMatch = suggestion.text.match(/^([📧📈💡🎉😔✨⏰🎯])\s*/)
  const emoji = emojiMatch ? emojiMatch[1] : '💡'
  const textWithoutEmoji = suggestion.text.replace(/^[📧📈💡🎉😔✨⏰🎯]\s*/, '')

  return (
    <div className={`border rounded-lg overflow-hidden bg-white ${getPriorityColor()}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-stone-900 flex items-center justify-center">
            <span className="text-lg">{emoji}</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-stone-900">
              {getPriorityBadge()}
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Quick Win Opportunity
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          disabled={isDismissing}
          className="text-stone-400 hover:text-stone-600 transition-colors disabled:opacity-50"
          title="Dismiss suggestion"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        <p className="text-sm text-stone-900 leading-relaxed mb-4">
          {textWithoutEmoji}
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {suggestion.action && (
            <button
              onClick={handleAction}
              disabled={isActingUpon || isDismissing}
              className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              {isActingUpon ? 'Acting...' : suggestion.action}
            </button>
          )}
          <button
            onClick={handleDismiss}
            disabled={isDismissing || isActingUpon}
            className="px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDismissing ? 'Dismissing...' : 'Not Now'}
          </button>
        </div>
      </div>
    </div>
  )
}

