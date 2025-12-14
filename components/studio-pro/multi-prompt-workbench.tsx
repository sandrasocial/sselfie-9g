"use client"

import { useState, useRef, useEffect } from "react"
import MultiPromptBox from "./multi-prompt-box"

interface WorkbenchPrompt {
  id: string
  title: string
  description: string
  prompt: string
  category?: string
}

interface MultiPromptWorkbenchProps {
  prompts: WorkbenchPrompt[]
  guide?: string
  onPromptGenerated?: (promptId: string, imageUrl: string) => void
}

export default function MultiPromptWorkbench({ prompts, guide, onPromptGenerated }: MultiPromptWorkbenchProps) {
  const [generatingPromptId, setGeneratingPromptId] = useState<string | null>(null)
  const [generatedPrompts, setGeneratedPrompts] = useState<Map<string, string>>(new Map())
  const pollIntervalRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())
  
  // Shared images across all prompt boxes
  const [sharedImages, setSharedImages] = useState<Array<{ url: string; type: 'base' | 'product' } | null>>([
    null, null, null
  ])

  const handleGenerate = async (
    promptId: string,
    prompt: string,
    images: Array<{ url: string; type: 'base' | 'product' } | null>
  ) => {
    if (generatingPromptId !== null) return

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

    setGeneratingPromptId(promptId)

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
          aspectRatio: '1:1', // Default aspect ratio for regular prompts
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

      // Start polling for this prompt
      startPolling(promptId, data.predictionId)

    } catch (err) {
      console.error('[MULTI-PROMPT-WORKBENCH] Generation error:', err)
      alert(err instanceof Error ? err.message : 'Failed to generate image')
      setGeneratingPromptId(null)
    }
  }

  const startPolling = (promptId: string, predictionId: string) => {
    // Clear any existing polling for this prompt
    const existingInterval = pollIntervalRefs.current.get(promptId)
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
          setGeneratedPrompts(prev => new Map(prev).set(promptId, imageUrl))
          setGeneratingPromptId(null)
          
          if (onPromptGenerated) {
            onPromptGenerated(promptId, imageUrl)
          }
          
          // Clear polling
          const interval = pollIntervalRefs.current.get(promptId)
          if (interval) {
            clearInterval(interval)
            pollIntervalRefs.current.delete(promptId)
          }
        } else if (data.status === 'failed') {
          alert(data.error || 'Generation failed')
          setGeneratingPromptId(null)
          
          // Clear polling
          const interval = pollIntervalRefs.current.get(promptId)
          if (interval) {
            clearInterval(interval)
            pollIntervalRefs.current.delete(promptId)
          }
        }
      } catch (err) {
        console.error('[MULTI-PROMPT-WORKBENCH] Polling error:', err)
      }
    }, 3000) // Poll every 3 seconds

    pollIntervalRefs.current.set(promptId, interval)
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollIntervalRefs.current.forEach(interval => clearInterval(interval))
      pollIntervalRefs.current.clear()
    }
  }, [])

  const totalPrompts = prompts.length

  return (
    <div className="flex-shrink-0 bg-gradient-to-b from-stone-50 via-white to-white backdrop-blur-2xl border-t border-stone-200/80 shadow-[0_-8px_32px_rgba(0,0,0,0.04)] px-4 sm:px-6 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-stone-950 mb-2">
            YOUR PHOTO IDEAS
          </h2>
          <p className="text-sm text-stone-600">
            Work through each prompt below. Customize prompts, add images, and generate one at a time.
          </p>
        </div>

        {/* Guide Section - Match carousel guide styling */}
        {guide && (
          <div className="mb-8 w-full sm:w-80 flex-shrink-0 bg-stone-50/80 backdrop-blur-sm rounded-2xl p-6 border border-stone-200/60">
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

        {/* Prompt Boxes */}
        <div className="space-y-6">
          {prompts.map((promptItem, index) => {
            // Get the previous prompt's generated image (if available)
            const previousPromptId = index > 0 ? prompts[index - 1].id : null
            const previousGeneratedImage = previousPromptId 
              ? generatedPrompts.get(previousPromptId) 
              : null
            
            return (
              <MultiPromptBox
                key={promptItem.id}
                slideNumber={index + 1}
                totalSlides={totalPrompts}
                initialPrompt={promptItem.prompt}
                sharedImages={sharedImages}
                onSharedImagesChange={setSharedImages}
                previousGeneratedImage={previousGeneratedImage}
                onGenerate={async (prompt, images) => {
                  await handleGenerate(promptItem.id, prompt, images)
                }}
                onImageGenerated={(imageUrl) => {
                  setGeneratedPrompts(prev => new Map(prev).set(promptItem.id, imageUrl))
                }}
                isGenerating={generatingPromptId === promptItem.id}
                generatedImageUrl={generatedPrompts.get(promptItem.id) || null}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
