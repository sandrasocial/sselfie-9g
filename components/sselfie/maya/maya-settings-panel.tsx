"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

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

  const aspectOptions = ["1:1", "4:5", "9:16", "16:9"] as const
  const aspectValue = aspectOptions.includes(aspectRatio as (typeof aspectOptions)[number])
    ? aspectRatio
    : "4:5"

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
              {studioProMode
                ? "Choose the photo size here. The extra sliders apply only to your saved look."
                : "Adjust how closely Maya follows your notes and saved look"}
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
            {/* Flux / LoRA sliders — Classic (My Model) only; hidden in Studio Pro / Selfie + Pro cards */}
            {!studioProMode && (
              <>
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

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs tracking-wider uppercase text-white/65">Follow My Notes</label>
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

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs tracking-wider uppercase text-white/65">Natural Look</label>
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
                  <p className="text-xs text-white/55 mt-1">Higher = more natural, lower = more stylized</p>
                </div>
              </>
            )}

            {/* Aspect Ratio — Radix select so list items are readable (native select can be white-on-white in dark UI) */}
            <div>
              <label className="text-xs tracking-wider uppercase text-white/65 mb-2 block">Aspect Ratio</label>
              <Select value={aspectValue} onValueChange={onAspectRatioChange}>
                <SelectTrigger className="h-auto w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white shadow-none ring-offset-0 focus:ring-2 focus:ring-white/25 data-[placeholder]:text-white/50 [&>svg]:text-white/60">
                  <SelectValue placeholder="Choose ratio" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  className="z-[200] border border-white/15 bg-[#141414] text-white shadow-lg"
                >
                  <SelectItem
                    value="1:1"
                    className="cursor-pointer text-white focus:bg-white/10 focus:text-white data-[highlighted]:bg-white/10 data-[highlighted]:text-white"
                  >
                    Square (1:1)
                  </SelectItem>
                  <SelectItem
                    value="4:5"
                    className="cursor-pointer text-white focus:bg-white/10 focus:text-white data-[highlighted]:bg-white/10 data-[highlighted]:text-white"
                  >
                    Portrait (4:5)
                  </SelectItem>
                  <SelectItem
                    value="9:16"
                    className="cursor-pointer text-white focus:bg-white/10 focus:text-white data-[highlighted]:bg-white/10 data-[highlighted]:text-white"
                  >
                    Story / Reel (9:16)
                  </SelectItem>
                  <SelectItem
                    value="16:9"
                    className="cursor-pointer text-white focus:bg-white/10 focus:text-white data-[highlighted]:bg-white/10 data-[highlighted]:text-white"
                  >
                    Landscape (16:9)
                  </SelectItem>
                </SelectContent>
              </Select>
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
