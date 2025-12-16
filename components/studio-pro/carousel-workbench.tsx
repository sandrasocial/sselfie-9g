"use client"

import { useState, useRef, useEffect } from "react"
import WorkbenchGuideColumn from "./workbench-guide-column"
import MultiPromptBox from "./multi-prompt-box"

interface CarouselSlide {
  slideNumber: number
  label: string
  prompt: string
}

interface CarouselWorkbenchProps {
  slides: CarouselSlide[]
  onSlideGenerated?: (slideNumber: number, imageUrl: string) => void
}

export default function CarouselWorkbench({ slides, onSlideGenerated }: CarouselWorkbenchProps) {
  const [generatingSlide, setGeneratingSlide] = useState<number | null>(null)
  const [generatedSlides, setGeneratedSlides] = useState<Map<number, string>>(new Map())
  const pollIntervalRefs = useRef<Map<number, NodeJS.Timeout>>(new Map())
  
  // Shared images across all prompt boxes
  const [sharedImages, setSharedImages] = useState<Array<{ url: string; type: 'base' | 'product' } | null>>([
    null, null, null
  ])

  const handleGenerate = async (
    slideNumber: number,
    prompt: string,
    images: Array<{ url: string; type: 'base' | 'product' } | null>
  ) => {
    if (generatingSlide !== null) return

    const baseImages = images
      .filter((img): img is { url: string; type: 'base' | 'product' } => img !== null && img.type === 'base')
      .map(img => ({ url: img.url }))
    
    const productImages = images
      .filter((img): img is { url: string; type: 'base' | 'product' } => img !== null && img.type === 'product')
      .map(img => ({ url: img.url }))

    if (baseImages.length === 0 && productImages.length === 0) {
      alert("Please select at least one image")
      return
    }

    setGeneratingSlide(slideNumber)

    try {
      const response = await fetch('/api/maya/generate-studio-pro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          mode: 'workbench',
          userRequest: prompt,
          inputImages: {
            baseImages: baseImages,
            productImages: productImages,
          },
          resolution: '2K',
          aspectRatio: '4:5', // Instagram carousel format
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

      // Start polling for this slide
      startPolling(slideNumber, data.predictionId)

    } catch (err) {
      console.error('[CAROUSEL-WORKBENCH] Generation error:', err)
      alert(err instanceof Error ? err.message : 'Failed to generate image')
      setGeneratingSlide(null)
    }
  }

  const startPolling = (slideNumber: number, predictionId: string) => {
    // Clear any existing polling for this slide
    const existingInterval = pollIntervalRefs.current.get(slideNumber)
    if (existingInterval) {
      clearInterval(existingInterval)
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/maya/check-studio-pro?predictionId=${predictionId}`, {
          credentials: 'include',
        })

        if (!response.ok) {
          throw new Error('Failed to check status')
        }

        const data = await response.json()

        if (data.status === 'succeeded' && data.output) {
          const imageUrl = data.output
          setGeneratedSlides(prev => new Map(prev).set(slideNumber, imageUrl))
          setGeneratingSlide(null)
          
          if (onSlideGenerated) {
            onSlideGenerated(slideNumber, imageUrl)
          }
          
          // Dispatch event to update the specific prompt box
          window.dispatchEvent(new CustomEvent('slide-generated', { 
            detail: { slideNumber, imageUrl } 
          }))

          // Clear polling
          const interval = pollIntervalRefs.current.get(slideNumber)
          if (interval) {
            clearInterval(interval)
            pollIntervalRefs.current.delete(slideNumber)
          }
        } else if (data.status === 'failed') {
          alert(data.error || 'Generation failed')
          setGeneratingSlide(null)
          
          // Clear polling
          const interval = pollIntervalRefs.current.get(slideNumber)
          if (interval) {
            clearInterval(interval)
            pollIntervalRefs.current.delete(slideNumber)
          }
        }
      } catch (err) {
        console.error('[CAROUSEL-WORKBENCH] Polling error:', err)
      }
    }, 3000) // Poll every 3 seconds

    pollIntervalRefs.current.set(slideNumber, interval)
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollIntervalRefs.current.forEach(interval => clearInterval(interval))
      pollIntervalRefs.current.clear()
    }
  }, [])

  const totalSlides = slides.length

  return (
    <div className="flex-shrink-0 bg-gradient-to-b from-stone-50 via-white to-white backdrop-blur-2xl border-t border-stone-200/80 shadow-[0_-8px_32px_rgba(0,0,0,0.04)] px-4 sm:px-6 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-stone-950 mb-2">
            TO CREATE A MULTI-SLIDE INSTAGRAM CAROUSEL POST...
          </h2>
          <p className="text-sm text-stone-600">
            Work through each slide below. Customize prompts, add images, and generate one at a time.
          </p>
        </div>

        {/* Main Layout: Guide Column + Prompt Boxes */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Guide Column */}
          <div className="lg:w-80 flex-shrink-0">
            <WorkbenchGuideColumn slideCount={totalSlides} />
          </div>

          {/* Prompt Boxes Column */}
          <div className="flex-1 space-y-6">
            {slides.map((slide, index) => {
              // Get the previous slide's generated image (if available)
              const previousSlideNumber = slide.slideNumber - 1
              const previousGeneratedImage = previousSlideNumber > 0 
                ? generatedSlides.get(previousSlideNumber) 
                : null
              
              return (
                <MultiPromptBox
                  key={slide.slideNumber}
                  slideNumber={slide.slideNumber}
                  totalSlides={totalSlides}
                  initialPrompt={slide.prompt}
                  sharedImages={sharedImages}
                  onSharedImagesChange={setSharedImages}
                  previousGeneratedImage={previousGeneratedImage}
                  onGenerate={async (prompt, images) => {
                    await handleGenerate(slide.slideNumber, prompt, images)
                  }}
                  onImageGenerated={(imageUrl) => {
                    setGeneratedSlides(prev => new Map(prev).set(slide.slideNumber, imageUrl))
                  }}
                  isGenerating={generatingSlide === slide.slideNumber}
                  generatedImageUrl={generatedSlides.get(slide.slideNumber) || null}
                />
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}



