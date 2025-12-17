"use client"

import { useState, useEffect, useRef } from "react"
import WorkbenchInputStrip from "./workbench-input-strip"
import WorkbenchPromptBox from "./workbench-prompt-box"
import WorkbenchResultCard from "./workbench-result-card"
import CarouselWorkbench from "./carousel-workbench"
import MultiPromptWorkbench from "./multi-prompt-workbench"

interface CarouselSlide {
  slideNumber: number
  label: string
  prompt: string
}

interface WorkbenchPrompt {
  id: string
  title: string
  description: string
  prompt: string
  category?: string
}

interface WorkbenchStripProps {
  onEnhancePrompt?: (prompt: string) => Promise<string | null>
  onImageCountChange?: (count: number) => void
  carouselSlides?: CarouselSlide[] // Optional carousel mode
  prompts?: WorkbenchPrompt[] // Unified prompts from Maya
  guide?: string // Guide text from Maya
}

export default function WorkbenchStrip({ onEnhancePrompt, onImageCountChange, carouselSlides, prompts, guide }: WorkbenchStripProps) {
  // If carousel slides are provided, show carousel workbench
  if (carouselSlides && carouselSlides.length > 0) {
    return (
      <div data-workbench-strip>
        <CarouselWorkbench 
          slides={carouselSlides}
          onSlideGenerated={(slideNumber, imageUrl) => {
            console.log(`[WORKBENCH] Slide ${slideNumber} generated:`, imageUrl)
            // Could trigger image generated callback here
          }}
        />
      </div>
    )
  }
  
  // If multiple prompts are provided (more than 1), show multi-prompt workbench
  if (prompts && prompts.length > 1) {
    return (
      <div data-workbench-strip>
        <MultiPromptWorkbench 
          prompts={prompts}
          guide={guide}
          onPromptGenerated={(promptId, imageUrl) => {
            console.log(`[WORKBENCH] Prompt ${promptId} generated:`, imageUrl)
            // Could trigger image generated callback here
          }}
        />
      </div>
    )
  }
  
  // If prompts are provided, show unified prompts workbench
  // We'll handle this in the main workbench render below by adding prompts section
  const [workbenchPrompt, setWorkbenchPrompt] = useState("")
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "4:5" | "9:16" | "16:9">("1:1")
  
  // Listen for custom events to update prompt from chat suggestions
  useEffect(() => {
    const handlePromptUpdate = (event: CustomEvent) => {
      const newPrompt = event.detail?.prompt
      console.log('[WORKBENCH] Received prompt update event:', newPrompt)
      if (newPrompt && typeof newPrompt === 'string') {
        console.log('[WORKBENCH] Updating workbench prompt to:', newPrompt)
        setWorkbenchPrompt(newPrompt)
      }
    }
    
    window.addEventListener('workbench-prompt-update', handlePromptUpdate as EventListener)
    return () => {
      window.removeEventListener('workbench-prompt-update', handlePromptUpdate as EventListener)
    }
  }, [])
  const [selectedImages, setSelectedImages] = useState<Array<{ url: string; type: 'base' | 'product' } | null>>([
    null, null, null
  ])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<'idle' | 'processing' | 'ready' | 'error'>('idle')
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null)
  const [predictionId, setPredictionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const handleImagesChange = (images: Array<{ url: string; type: 'base' | 'product' } | null>) => {
    setSelectedImages(images)
    // Notify parent of image count change
    const count = images.filter(img => img !== null).length
    if (onImageCountChange) {
      onImageCountChange(count)
    }
  }
  
  // Update image count when selectedImages changes
  useEffect(() => {
    const count = selectedImages.filter(img => img !== null).length
    if (onImageCountChange) {
      onImageCountChange(count)
    }
  }, [selectedImages, onImageCountChange])

  const handleGenerate = async (prompt: string) => {
    if (isGenerating) return

    // ============================================
    // WORKBENCH FLOW:
    // 1. User writes their own prompt (manual control)
    // 2. User selects images from gallery/upload
    // 3. Generate using user's prompt + selected images
    // ============================================

    const baseImages = selectedImages
      .filter((img): img is { url: string; type: 'base' | 'product' } => img !== null && img.type === 'base')
      .map(img => ({ url: img.url }))
    
    const productImages = selectedImages
      .filter((img): img is { url: string; type: 'base' | 'product' } => img !== null && img.type === 'product')
      .map(img => ({ url: img.url }))

    if (baseImages.length === 0 && productImages.length === 0) {
      alert("You are almost ready to generate. Add at least one photo so Maya can keep your look consistent.")
      return
    }

    setIsGenerating(true)
    setGenerationStatus('processing')
    setError(null)
    setResultImageUrl(null)

    try {
      // CRITICAL: Workbench ALWAYS uses user-written prompts (no AI transformation)
      // Mode "workbench" ensures prompt is used directly without modification
      const response = await fetch('/api/maya/generate-studio-pro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          mode: 'workbench', // Workbench mode: user's prompt used directly (no AI transformation)
          userRequest: prompt, // User-written prompt (NOT Maya-generated)
          inputImages: {
            baseImages: baseImages,
            productImages: productImages,
          },
          resolution: '2K',
          aspectRatio,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Generation failed: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.success || !data.predictionId) {
        throw new Error(data.error || 'Failed to start generation')
      }

      setPredictionId(data.predictionId)
      // Start polling for status
      startPolling(data.predictionId)

    } catch (err) {
      console.error('[WORKBENCH] Generation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate image')
      setGenerationStatus('error')
      setIsGenerating(false)
    }
  }

  const startPolling = (predictionId: string) => {
    // Clear any existing polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/maya/check-studio-pro?predictionId=${predictionId}`, {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to check status')
        }

        const data = await response.json()

        if (data.status === 'succeeded' && data.output) {
          // data.output is the image URL
          setResultImageUrl(data.output)
          setGenerationStatus('ready')
          setIsGenerating(false)
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
        } else if (data.status === 'failed') {
          setError(data.error || 'Generation failed')
          setGenerationStatus('error')
          setIsGenerating(false)
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
        }
        // If still processing, continue polling
      } catch (err) {
        console.error('[WORKBENCH] Polling error:', err)
        // Continue polling on error (might be temporary)
      }
    }, 3000) // Poll every 3 seconds
  }

  const handleUseInBox = (boxNumber: 1 | 2 | 3) => {
    if (!resultImageUrl) return

    const newImages = [...selectedImages]
    const boxIndex = boxNumber - 1
    
    // Ensure array is long enough
    while (newImages.length <= boxIndex) {
      newImages.push(null)
    }
    
    newImages[boxIndex] = {
      url: resultImageUrl,
      type: 'base'
    }
    
    // If filling box 3 and 4th box doesn't exist yet, add it
    if (boxIndex === 2 && newImages.length === 3) {
      newImages.push(null) // Add 4th box
    }
    
    setSelectedImages(newImages)
    
    // Notify input strip of the change (triggers re-render with new image)
    // The WorkbenchInputStrip will receive this via onImagesChange prop
    // We need to trigger a state update that flows back to the input strip
    // Since we're managing state in the parent, this should work automatically
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  const hasImages = selectedImages.some(img => img !== null)

  return (
    <div className="flex-shrink-0 bg-gradient-to-b from-stone-50 via-white to-white backdrop-blur-2xl border-t border-stone-200/80 shadow-[0_-8px_32px_rgba(0,0,0,0.04)] px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
        {/* Guide Section from Maya - Match carousel guide styling */}
        {guide && (
          <div className="w-full sm:w-80 flex-shrink-0 bg-stone-50/80 backdrop-blur-sm rounded-2xl p-6 border border-stone-200/60">
            <div className="space-y-6">
              {/* Maya Avatar/Header */}
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-stone-950 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">M</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-stone-950 mb-1">Maya</h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Here's how to use these prompts:
                  </p>
                </div>
              </div>

              {/* Instructions - Parse guide text into numbered steps */}
              <div className="space-y-4">
                {guide.split('\n').filter(line => line.trim()).map((line, idx) => {
                  // Check if line starts with bullet or dash
                  const isBullet = /^[-•]\s+/.test(line.trim())
                  if (isBullet) {
                    const stepNumber = idx + 1
                    const stepText = line.replace(/^[-•]\s+/, '').trim()
                    // Check if there's a bold title followed by description
                    const boldMatch = stepText.match(/\*\*([^*]+)\*\*\s*(.*)/)
                    if (boldMatch) {
                      const [, title, description] = boldMatch
                      return (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-stone-200 text-stone-700 text-xs font-medium flex items-center justify-center mt-0.5">
                            {stepNumber}
                          </span>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-stone-950 mb-1">{title}</p>
                            {description && (
                              <p className="text-xs text-stone-600 leading-relaxed">{description}</p>
                            )}
                          </div>
                        </div>
                      )
                    }
                    // Plain bullet point
                    return (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-stone-200 text-stone-700 text-xs font-medium flex items-center justify-center mt-0.5">
                          {stepNumber}
                        </span>
                        <div className="flex-1">
                          <p className="text-xs text-stone-600 leading-relaxed">{stepText}</p>
                        </div>
                      </div>
                    )
                  }
                  // Regular text (not a bullet)
                  if (line.includes('**')) {
                    // Has bold text - treat as header
                    const cleanText = line.replace(/\*\*/g, '').trim()
                    return (
                      <p key={idx} className="text-xs font-medium text-stone-950 mb-2">{cleanText}</p>
                    )
                  }
                  return (
                    <p key={idx} className="text-xs text-stone-600 leading-relaxed">{line.trim()}</p>
                  )
                })}
              </div>
            </div>
          </div>
        )}
        
        {/* Prompts List - if prompts are provided */}
        {prompts && prompts.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-stone-950">Your Photo Ideas</h3>
            <div className="space-y-2">
              {prompts.map((promptItem) => (
                <div
                  key={promptItem.id}
                  className="bg-white/80 backdrop-blur-md rounded-lg p-4 border border-stone-200/80 hover:border-stone-300 transition-all cursor-pointer"
                  onClick={() => {
                    // Dispatch event to update workbench prompt box
                    window.dispatchEvent(new CustomEvent('workbench-prompt-update', { 
                      detail: { prompt: promptItem.prompt } 
                    }))
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-stone-950 mb-1">{promptItem.title}</h4>
                      {promptItem.description && (
                        <p className="text-xs text-stone-600 mb-2">{promptItem.description}</p>
                      )}
                      {promptItem.category && (
                        <span className="inline-block text-[10px] px-2 py-0.5 bg-stone-100 text-stone-600 rounded uppercase tracking-wider">
                          {promptItem.category}
                        </span>
                      )}
                    </div>
                    <button
                      className="flex-shrink-0 text-xs font-medium text-stone-700 hover:text-stone-950 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        window.dispatchEvent(new CustomEvent('workbench-prompt-update', { 
                          detail: { prompt: promptItem.prompt } 
                        }))
                      }}
                    >
                      Use
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-stone-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
          <WorkbenchInputStrip selectedImages={selectedImages} onImagesChange={handleImagesChange} />
        </div>
        <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-stone-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)] space-y-4">
          {/* Aspect ratio selector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-[0.16em] text-stone-500 uppercase">
                Aspect Ratio
              </p>
              <p className="text-[11px] text-stone-500 mt-0.5">
                Choose the frame for this shot
              </p>
            </div>
            <div className="inline-flex rounded-full border border-stone-200/80 bg-stone-50/70 p-0.5">
              {[
                { value: "1:1" as const, label: "1:1", hint: "Square" },
                { value: "4:5" as const, label: "4:5", hint: "Portrait" },
                { value: "9:16" as const, label: "9:16", hint: "Reel/Story" },
                { value: "16:9" as const, label: "16:9", hint: "Wide" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAspectRatio(option.value)}
                  className={[
                    "px-3 py-1.5 rounded-full text-[11px] font-medium tracking-[0.12em] uppercase transition-all duration-200",
                    aspectRatio === option.value
                      ? "bg-stone-950 text-white shadow-[0_2px_10px_rgba(0,0,0,0.25)]"
                      : "bg-transparent text-stone-600 hover:bg-white/70 hover:text-stone-900",
                  ].join(" ")}
                  title={option.hint}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <WorkbenchPromptBox 
            onGenerate={handleGenerate} 
            hasImages={hasImages}
            isGenerating={isGenerating}
            onEnhancePrompt={onEnhancePrompt}
            externalPrompt={workbenchPrompt || undefined}
            onPromptChange={(prompt) => {
              setWorkbenchPrompt(prompt)
            }}
          />
        </div>
        
        {/* Result Card */}
        {(generationStatus === 'processing' || generationStatus === 'ready' || generationStatus === 'error') && (
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-stone-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
            <WorkbenchResultCard
              imageUrl={resultImageUrl || undefined}
              status={generationStatus === 'processing' ? 'processing' : generationStatus === 'ready' ? 'ready' : 'error'}
              resolution="2K"
              onUseInBox={generationStatus === 'ready' ? handleUseInBox : undefined}
            />
          </div>
        )}
      </div>
    </div>
  )
}
