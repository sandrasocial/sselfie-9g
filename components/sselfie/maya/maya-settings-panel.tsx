"use client"

import type React from "react"

interface MayaSettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  
  // Settings values
  styleStrength: number
  promptAccuracy: number
  aspectRatio: string
  realismStrength: number
  enhancedAuthenticity: boolean
  
  // Settings change handlers
  onStyleStrengthChange: (value: number) => void
  onPromptAccuracyChange: (value: number) => void
  onAspectRatioChange: (value: string) => void
  onRealismStrengthChange: (value: number) => void
  onEnhancedAuthenticityChange: (value: boolean) => void
  
  // Mode
  studioProMode?: boolean
}

/**
 * Maya Settings Panel Component
 * 
 * Modal panel for adjusting generation settings:
 * - Style Strength
 * - Prompt Accuracy
 * - Realism Boost
 * - Aspect Ratio
 * - Enhanced Authenticity (Classic Mode only)
 */
export default function MayaSettingsPanel({
  isOpen,
  onClose,
  styleStrength,
  promptAccuracy,
  aspectRatio,
  realismStrength,
  enhancedAuthenticity,
  onStyleStrengthChange,
  onPromptAccuracyChange,
  onAspectRatioChange,
  onRealismStrengthChange,
  onEnhancedAuthenticityChange,
  studioProMode = false,
}: MayaSettingsPanelProps) {
  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Settings Panel */}
      <div className="fixed inset-x-4 top-20 bottom-4 sm:bottom-auto sm:max-h-[85vh] bg-[rgba(10,10,10,0.94)] backdrop-blur-[20px] border border-[rgba(255,255,255,0.08)] rounded-2xl shadow-xl shadow-black/40 animate-in slide-in-from-top-2 duration-300 z-[101] max-w-md mx-auto flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4 p-6 pb-4 flex-shrink-0">
          <div className="min-w-0 pr-2">
            <h3 className="text-sm font-serif font-extralight tracking-[0.2em] uppercase text-white">
              Photo generation
            </h3>
            <p className="text-[11px] text-white/50 mt-1 tracking-wide">
              How strongly Maya follows your prompt and trained look
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close settings"
          >
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/75">Close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
          <div className="space-y-6">
            {/* Style Strength */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs tracking-wider uppercase text-white/65">Style Strength</label>
                <span className="text-sm font-medium text-white">{styleStrength.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.9"
                max="1.2"
                step="0.05"
                value={styleStrength}
                onChange={(e) => onStyleStrengthChange(Number.parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Prompt Accuracy */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs tracking-wider uppercase text-white/65">Prompt Accuracy</label>
                <span className="text-sm font-medium text-white">{promptAccuracy.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="2.5"
                max="5.0"
                step="0.5"
                value={promptAccuracy}
                onChange={(e) => onPromptAccuracyChange(Number.parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Realism Boost */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs tracking-wider uppercase text-white/65">Realism Boost</label>
                <span className="text-sm font-medium text-white">{realismStrength.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.8"
                step="0.1"
                value={realismStrength}
                onChange={(e) => onRealismStrengthChange(Number.parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-white/55 mt-1">Higher = more photorealistic, lower = more stylized</p>
            </div>

            {/* Aspect Ratio */}
            <div>
              <label className="text-xs tracking-wider uppercase text-white/65 mb-2 block">Aspect Ratio</label>
              <select
                value={aspectRatio}
                onChange={(e) => onAspectRatioChange(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/15 rounded-lg text-sm text-white"
              >
                <option value="1:1">Square (1:1)</option>
                <option value="4:5">Portrait (4:5)</option>
                <option value="16:9">Landscape (16:9)</option>
              </select>
            </div>

            {/* Enhanced Authenticity Toggle - Only show in Classic mode */}
            {!studioProMode && (
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="text-xs tracking-wider uppercase text-white/65 mb-1 block">
                      Enhanced Authenticity
                    </label>
                    <p className="text-xs text-white/55 mt-1">
                      More muted colors, iPhone quality, and film grain for a more authentic look
                    </p>
                  </div>
                  <button
                    onClick={() => onEnhancedAuthenticityChange(!enhancedAuthenticity)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 ${
                      enhancedAuthenticity ? "bg-white/30" : "bg-white/15"
                    }`}
                    role="switch"
                    aria-checked={enhancedAuthenticity}
                    aria-label="Enhanced Authenticity"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        enhancedAuthenticity ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
