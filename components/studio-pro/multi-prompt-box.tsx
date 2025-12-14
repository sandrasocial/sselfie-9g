"use client"

import { useState, useEffect } from "react"
import WorkbenchInputStrip from "./workbench-input-strip"
import WorkbenchResultCard from "./workbench-result-card"

interface MultiPromptBoxProps {
  slideNumber: number
  totalSlides: number
  initialPrompt: string
  sharedImages?: Array<{ url: string; type: 'base' | 'product' } | null>
  onSharedImagesChange?: (images: Array<{ url: string; type: 'base' | 'product' } | null>) => void
  previousGeneratedImage?: string | null
  onGenerate: (prompt: string, images: Array<{ url: string; type: 'base' | 'product' } | null>) => Promise<void>
  onImageGenerated?: (imageUrl: string) => void
  isGenerating?: boolean
  generatedImageUrl?: string | null
}

export default function MultiPromptBox({ 
  slideNumber, 
  totalSlides, 
  initialPrompt, 
  sharedImages = [null, null, null],
  onSharedImagesChange,
  previousGeneratedImage,
  onGenerate,
  onImageGenerated,
  isGenerating: externalIsGenerating,
  generatedImageUrl: externalGeneratedImageUrl
}: MultiPromptBoxProps) {
  const [prompt, setPrompt] = useState(initialPrompt)
  // Initialize with shared images
  const [selectedImages, setSelectedImages] = useState<Array<{ url: string; type: 'base' | 'product' } | null>>(
    sharedImages.length > 0 ? [...sharedImages] : [null, null, null]
  )
  const [usePreviousImage, setUsePreviousImage] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'processing' | 'ready' | 'error'>('idle')
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Sync with shared images when they change (only for slide 1, or if not customized)
  useEffect(() => {
    if (sharedImages && sharedImages.length > 0) {
      // For slide 1, always sync with shared images
      // For other slides, only sync if images haven't been customized
      const isSlide1 = slideNumber === 1
      const hasCustomImages = selectedImages.some((img, idx) => 
        img !== null && (sharedImages[idx] === null || img.url !== sharedImages[idx]?.url)
      )
      
      if (isSlide1 || !hasCustomImages) {
        setSelectedImages([...sharedImages])
      }
    }
  }, [sharedImages, slideNumber])
  
  // Handle toggle for using previous generated image
  useEffect(() => {
    if (usePreviousImage && previousGeneratedImage) {
      // Add previous image to the first available slot (or replace first slot)
      const newImages = [...selectedImages]
      const slotIndex = newImages.findIndex(img => img === null)
      const targetIndex = slotIndex >= 0 ? slotIndex : 0
      
      newImages[targetIndex] = {
        url: previousGeneratedImage,
        type: 'base'
      }
      
      setSelectedImages(newImages)
      // Update shared images so other boxes can see it
      if (onSharedImagesChange) {
        onSharedImagesChange(newImages)
      }
    } else if (!usePreviousImage && previousGeneratedImage) {
      // Remove previous image if toggle is off
      const newImages = selectedImages.filter(img => 
        img === null || img.url !== previousGeneratedImage
      )
      // Ensure we have at least 3 slots
      while (newImages.length < 3) {
        newImages.push(null)
      }
      setSelectedImages(newImages)
      if (onSharedImagesChange) {
        onSharedImagesChange(newImages)
      }
    }
  }, [usePreviousImage, previousGeneratedImage])
  
  // Sync with external generation state
  useEffect(() => {
    if (externalIsGenerating !== undefined) {
      setIsGenerating(externalIsGenerating)
      setGenerationStatus(externalIsGenerating ? 'processing' : 'idle')
    }
  }, [externalIsGenerating])
  
  useEffect(() => {
    if (externalGeneratedImageUrl) {
      setResultImageUrl(externalGeneratedImageUrl)
      setGenerationStatus('ready')
      setIsGenerating(false)
    }
  }, [externalGeneratedImageUrl])
  
  // Listen for slide generation events
  useEffect(() => {
    const handleSlideGenerated = (event: CustomEvent) => {
      if (event.detail?.slideNumber === slideNumber && event.detail?.imageUrl) {
        setResultImageUrl(event.detail.imageUrl)
        setGenerationStatus('ready')
        setIsGenerating(false)
        if (onImageGenerated) {
          onImageGenerated(event.detail.imageUrl)
        }
      }
    }
    
    window.addEventListener('slide-generated', handleSlideGenerated as EventListener)
    return () => {
      window.removeEventListener('slide-generated', handleSlideGenerated as EventListener)
    }
  }, [slideNumber, onImageGenerated])
  
  // Listen for generation start events
  useEffect(() => {
    const handleGenerationStart = (event: CustomEvent) => {
      if (event.detail?.slideNumber === slideNumber) {
        setIsGenerating(true)
        setGenerationStatus('processing')
        setError(null)
        setResultImageUrl(null)
      }
    }
    
    window.addEventListener('slide-generation-start', handleGenerationStart as EventListener)
    return () => {
      window.removeEventListener('slide-generation-start', handleGenerationStart as EventListener)
    }
  }, [slideNumber])

  // Update prompt if initialPrompt changes
  useEffect(() => {
    setPrompt(initialPrompt)
  }, [initialPrompt])

  // Handle images change and sync with shared state
  const handleImagesChange = (images: Array<{ url: string; type: 'base' | 'product' } | null>) => {
    setSelectedImages(images)
    // Update shared images so all boxes stay in sync
    if (onSharedImagesChange) {
      onSharedImagesChange(images)
    }
  }

  const handleGenerate = async () => {
    if (isGenerating || !prompt.trim()) return

    const baseImages = selectedImages
      .filter((img): img is { url: string; type: 'base' | 'product' } => img !== null && img.type === 'base')
      .map(img => ({ url: img.url }))
    
    const productImages = selectedImages
      .filter((img): img is { url: string; type: 'base' | 'product' } => img !== null && img.type === 'product')
      .map(img => ({ url: img.url }))

    if (baseImages.length === 0 && productImages.length === 0) {
      alert("Please select at least one image")
      return
    }

    // Dispatch event to notify parent
    window.dispatchEvent(new CustomEvent('slide-generation-start', { 
      detail: { slideNumber } 
    }))
    
    setIsGenerating(true)
    setGenerationStatus('processing')
    setError(null)
    setResultImageUrl(null)

    try {
      await onGenerate(prompt, selectedImages)
      // Status will be updated by parent component via polling and slide-generated event
    } catch (err) {
      console.error('[MULTI-PROMPT-BOX] Generation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate image')
      setGenerationStatus('error')
      setIsGenerating(false)
    }
  }

  const handleUseInBox = (boxNumber: 1 | 2 | 3) => {
    if (!resultImageUrl) return

    const newImages = [...selectedImages]
    const boxIndex = boxNumber - 1
    
    while (newImages.length <= boxIndex) {
      newImages.push(null)
    }
    
    newImages[boxIndex] = {
      url: resultImageUrl,
      type: 'base'
    }
    
    setSelectedImages(newImages)
  }

  const hasImages = selectedImages.some(img => img !== null)

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 border border-stone-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] space-y-6">
      {/* Slide Header */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-200/60">
        <div>
          <h3 className="text-sm font-semibold text-stone-950">
            Slide {slideNumber} of {totalSlides}
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">Customize and generate this slide</p>
        </div>
        <div className="px-3 py-1 bg-stone-100 rounded-lg">
          <span className="text-xs font-medium text-stone-700">
            {Math.round((slideNumber / totalSlides) * 100)}%
          </span>
        </div>
      </div>

      {/* Image Selection */}
      <div className="space-y-3">
        {/* Option to use previous slide's generated image */}
        {previousGeneratedImage && slideNumber > 1 && (
          <div className="flex items-center gap-3 p-3 bg-stone-50/60 border border-stone-200/60 rounded-xl">
            <input
              type="checkbox"
              id={`use-previous-${slideNumber}`}
              checked={usePreviousImage}
              onChange={(e) => setUsePreviousImage(e.target.checked)}
              className="w-4 h-4 text-stone-950 border-stone-300 rounded focus:ring-stone-950/20"
            />
            <label 
              htmlFor={`use-previous-${slideNumber}`}
              className="text-xs text-stone-700 font-light cursor-pointer flex-1"
            >
              Use Slide {slideNumber - 1}'s generated image for consistency
            </label>
          </div>
        )}
        
        <WorkbenchInputStrip 
          selectedImages={selectedImages} 
          onImagesChange={handleImagesChange} 
        />
      </div>

      {/* Prompt Box */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-serif font-extralight tracking-[0.2em] text-stone-950 uppercase">Prompt</h4>
          <span className="text-xs font-light tracking-[0.1em] text-stone-500 uppercase">{prompt.length} chars</span>
        </div>
        
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Customize your prompt here..."
          className="w-full min-h-[200px] px-4 py-3 text-sm leading-relaxed border border-stone-300/60 rounded-xl bg-white/90 backdrop-blur-sm resize-none focus:outline-none focus:ring-2 focus:ring-stone-950/20 focus:border-stone-950/30 transition-all duration-300 placeholder:text-stone-400/80 placeholder:font-light shadow-[0_2px_12px_rgba(0,0,0,0.04)] focus:shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
          rows={8}
          style={{ textOrientation: 'mixed', writingMode: 'horizontal-tb' }}
        />
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!prompt.trim() || !hasImages || isGenerating}
        className="w-full px-6 py-3.5 bg-stone-950 text-white rounded-xl font-light text-sm tracking-[0.15em] uppercase hover:bg-stone-900 active:scale-[0.98] transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-stone-950 touch-manipulation shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.16)] disabled:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
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

      {/* Result Card */}
      {(generationStatus === 'processing' || generationStatus === 'ready' || generationStatus === 'error') && (
        <WorkbenchResultCard
          imageUrl={resultImageUrl || undefined}
          status={generationStatus === 'processing' ? 'processing' : generationStatus === 'ready' ? 'ready' : 'error'}
          resolution="2K"
          onUseInBox={generationStatus === 'ready' ? handleUseInBox : undefined}
        />
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}
