"use client"

import { useState, useEffect } from "react"

interface WorkbenchPromptBoxProps {
  onGenerate?: (prompt: string) => void
  hasImages?: boolean
  isGenerating?: boolean
  onEnhancePrompt?: (prompt: string) => Promise<string | null>
  externalPrompt?: string // Allow external control of prompt
  onPromptChange?: (prompt: string) => void // Notify parent of changes
}

export default function WorkbenchPromptBox({ onGenerate, hasImages = false, isGenerating = false, onEnhancePrompt, externalPrompt, onPromptChange }: WorkbenchPromptBoxProps) {
  const [prompt, setPrompt] = useState("")
  
  // Sync with external prompt if provided
  useEffect(() => {
    if (externalPrompt !== undefined && externalPrompt !== prompt) {
      setPrompt(externalPrompt)
    }
  }, [externalPrompt]) // eslint-disable-line react-hooks/exhaustive-deps
  
  // Listen for custom events to update prompt from outside
  useEffect(() => {
    const handlePromptUpdate = (event: CustomEvent) => {
      const newPrompt = event.detail?.prompt
      console.log('[WORKBENCH-PROMPT-BOX] Received prompt update event:', newPrompt)
      if (newPrompt && typeof newPrompt === 'string') {
        console.log('[WORKBENCH-PROMPT-BOX] Setting prompt to:', newPrompt)
        setPrompt(newPrompt)
        if (onPromptChange) {
          onPromptChange(newPrompt)
        }
      }
    }
    
    window.addEventListener('workbench-prompt-update', handlePromptUpdate as EventListener)
    return () => {
      window.removeEventListener('workbench-prompt-update', handlePromptUpdate as EventListener)
    }
  }, [onPromptChange])
  
  const handlePromptChange = (newPrompt: string) => {
    setPrompt(newPrompt)
    if (onPromptChange) {
      onPromptChange(newPrompt)
    }
  }
  const [isEnhancing, setIsEnhancing] = useState(false)
  
  const handleGenerate = () => {
    if (!prompt.trim() || !hasImages || isGenerating) {
      return
    }
    
    if (onGenerate) {
      // Parent component manages images separately via WorkbenchInputStrip
      onGenerate(prompt)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow Cmd/Ctrl + Enter to generate
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleGenerate()
    }
  }

  const handleEnhancePrompt = async () => {
    if (!prompt.trim() || !onEnhancePrompt || isEnhancing) return

    setIsEnhancing(true)
    try {
      const enhancedPrompt = await onEnhancePrompt(prompt)
      if (enhancedPrompt) {
        setPrompt(enhancedPrompt)
        if (onPromptChange) {
          onPromptChange(enhancedPrompt)
        }
      }
    } catch (error) {
      console.error('[WORKBENCH] Error enhancing prompt:', error)
    } finally {
      setIsEnhancing(false)
    }
  }

  return (
    <div className="w-full space-y-5">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-serif font-extralight tracking-[0.2em] text-stone-950 uppercase">Prompt</h3>
        <div className="flex items-center gap-3">
          {prompt.trim() && onEnhancePrompt && (
            <button
              onClick={handleEnhancePrompt}
              disabled={isEnhancing}
              className="px-3 py-1.5 text-xs font-light tracking-[0.1em] uppercase text-stone-600 hover:text-stone-950 bg-stone-50/80 hover:bg-stone-100/80 rounded-lg border border-stone-200/60 hover:border-stone-300/80 transition-all duration-200 backdrop-blur-sm touch-manipulation active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Enhance this prompt with Maya"
            >
              {isEnhancing ? (
                <span className="flex items-center gap-1.5">
                  <div className="w-3 h-3 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                  Enhancing...
                </span>
              ) : (
                'Enhance with Maya'
              )}
            </button>
          )}
          <span className="text-xs font-light tracking-[0.1em] text-stone-500 uppercase">{prompt.length} chars</span>
        </div>
      </div>
      
      <div className="relative">
        <textarea
          style={{ textOrientation: 'mixed', writingMode: 'horizontal-tb' }}
          value={prompt}
          onChange={(e) => handlePromptChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste your prompt here, or ask Maya for suggestions..."
          className="w-full min-h-[120px] px-5 py-4 text-sm leading-relaxed border border-stone-300/60 rounded-2xl bg-white/90 backdrop-blur-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-950/20 focus:border-stone-950/30 transition-all duration-300 placeholder:text-stone-400/80 placeholder:font-light shadow-[0_2px_12px_rgba(0,0,0,0.04)] focus:shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
          rows={5}
        />
        {!prompt.trim() && (
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <span className="text-[10px] text-stone-400/60 font-light tracking-[0.1em] uppercase">Cmd/Ctrl + Enter</span>
          </div>
        )}
      </div>
      
      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || !hasImages || isGenerating}
        className="w-full px-8 py-4 bg-stone-950 text-white rounded-2xl font-light text-sm tracking-[0.15em] uppercase hover:bg-stone-900 active:scale-[0.98] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-stone-950 touch-manipulation shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.16)] disabled:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Generating...
          </span>
        ) : (
          'Generate'
        )}
      </button>
      
      {!hasImages && (
        <div className="bg-stone-50/60 border border-stone-200/60 rounded-xl px-4 py-3 backdrop-blur-sm">
          <p className="text-xs text-stone-500 text-center font-light tracking-wide">
            Select at least one image to generate
          </p>
        </div>
      )}
    </div>
  )
}
