"use client"

import { useState, useEffect, useRef } from "react"
import { useChat } from "@ai-sdk/react"
import { Send, Sliders, X, Check, XCircle, Image as ImageIcon, Wand2, Loader2 } from "lucide-react"
import MayaChatHistory from "@/components/sselfie/maya-chat-history"
import ConceptCard from "@/components/sselfie/concept-card"
import UnifiedLoading from "@/components/sselfie/unified-loading"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

const PROMPT_BUILDER_SYSTEM = `You are Maya, helping Sandra create and refine image generation prompts for her SSELFIE Studio prompt guides.

When Sandra describes what she wants:
1. Understand the concept (e.g., "Chanel luxury editorial", "ALO workout shots")
2. Reference the Universal AI Image Prompts collection she uploaded
3. Suggest 2-3 prompt variations as concept cards
4. Include: concept title, description, and full prompt text
5. Wait for Sandra to pick one and click "Generate Image"

After image generation:
- Show the result
- Ask if she wants to approve it or refine the prompt
- If approved, offer to add to the current guide

Keep responses concise and action-oriented.`

interface PromptBuilderChatProps {
  userId: string
}

export default function PromptBuilderChat({ userId }: PromptBuilderChatProps) {
  const [chatId, setChatId] = useState<number | null>(null)
  const [isLoadingChat, setIsLoadingChat] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showSettings, setShowSettings] = useState(false)

  // Generation settings
  const [styleStrength, setStyleStrength] = useState(1.0)
  const [promptAccuracy, setPromptAccuracy] = useState(3.5)
  const [aspectRatio, setAspectRatio] = useState("4:5")
  const [realismStrength, setRealismStrength] = useState(0.2)

  // Track approved/rejected images
  const [approvedImages, setApprovedImages] = useState<Set<string>>(new Set())
  const [rejectedImages, setRejectedImages] = useState<Set<string>>(new Set())

  // Track generating images
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set())
  const [generatedImages, setGeneratedImages] = useState<Map<string, {
    imageUrl: string
    predictionId: string
    generationId: number
    concept: any
  }>>(new Map())

  // Track current guide category (will be set when guide is selected)
  const [currentGuideCategory, setCurrentGuideCategory] = useState<string>("portrait")

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
    append,
  } = useChat({
    api: "/api/maya/chat",
    body: {
      chatId: chatId || undefined,
      chatType: "prompt_builder",
      // TODO: Add systemPrompt support to API route
      // systemPrompt: PROMPT_BUILDER_SYSTEM,
    },
    onFinish: async (message) => {
      // Messages are automatically saved by the chat API
      // No need to manually save here
    },
  })

  // Load chat on mount or when chatId changes
  useEffect(() => {
    if (chatId) {
      loadChat(chatId)
    } else {
      setIsLoadingChat(false)
    }
  }, [chatId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const loadChat = async (id: number) => {
    setIsLoadingChat(true)
    try {
      const response = await fetch(`/api/maya/load-chat?chatId=${id}&chatType=prompt_builder`)
      if (response.ok) {
        const data = await response.json()
        if (data.messages) {
          setMessages(data.messages)
        }
      }
    } catch (error) {
      console.error("[PromptBuilder] Error loading chat:", error)
    } finally {
      setIsLoadingChat(false)
    }
  }

  const handleNewChat = async () => {
    try {
      const response = await fetch("/api/maya/new-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatType: "prompt_builder",
        }),
      })
      if (response.ok) {
        const data = await response.json()
        setChatId(data.chatId)
        setMessages([])
      }
    } catch (error) {
      console.error("[PromptBuilder] Error creating chat:", error)
    }
  }

  const handleSelectChat = (id: number) => {
    setChatId(id)
  }

  const handleDeleteChat = async (id: number) => {
    if (id === chatId) {
      setChatId(null)
      setMessages([])
    }
  }

  const handleGenerateImage = async (concept: any, conceptIndex?: number) => {
    const conceptKey = `concept-${conceptIndex ?? Date.now()}-${concept.title || concept.label || "unknown"}`
    setGeneratingImages((prev) => new Set(prev).add(conceptKey))

    try {
      const response = await fetch("/api/maya/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conceptPrompt: concept.prompt || concept.promptText || concept.description,
          conceptTitle: concept.title || concept.label,
          conceptDescription: concept.description,
          category: concept.category || currentGuideCategory || "portrait",
          customSettings: {
            styleStrength: styleStrength,
            promptAccuracy: promptAccuracy,
            aspectRatio: aspectRatio,
            realismStrength: realismStrength,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate image")
      }

      const data = await response.json()

      if (data.success && data.predictionId && data.generationId) {
        // Start polling for completion
        pollPrediction(data.predictionId, data.generationId, conceptKey, concept)
      } else {
        throw new Error("Invalid response from generation API")
      }
    } catch (error: any) {
      console.error("[PromptBuilder] Error generating image:", error)
      setGeneratingImages((prev) => {
        const next = new Set(prev)
        next.delete(conceptKey)
        return next
      })
      // TODO: Show error message to user
    }
  }

  const pollPrediction = async (
    predictionId: string,
    generationId: number,
    conceptKey: string,
    concept: any
  ) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/maya/check-generation?predictionId=${predictionId}&generationId=${generationId}`
        )
        const data = await response.json()

        if (data.status === "succeeded") {
          // Image is ready
          setGeneratingImages((prev) => {
            const next = new Set(prev)
            next.delete(conceptKey)
            return next
          })
          setGeneratedImages((prev) => {
            const next = new Map(prev)
            next.set(conceptKey, {
              imageUrl: data.imageUrl,
              predictionId,
              generationId,
              concept,
            })
            return next
          })
          clearInterval(pollInterval)

          // Add image as a message in the chat
          append({
            role: "assistant",
            content: `Image generated for "${concept.title || concept.label}":`,
            parts: [
              {
                type: "text",
                text: `Image generated for "${concept.title || concept.label}":`,
              },
              {
                type: "image",
                image: data.imageUrl,
              },
            ],
          })
        } else if (data.status === "failed") {
          setGeneratingImages((prev) => {
            const next = new Set(prev)
            next.delete(conceptKey)
            return next
          })
          clearInterval(pollInterval)
          // TODO: Show error message
        }
      } catch (error) {
        console.error("[PromptBuilder] Error polling prediction:", error)
        setGeneratingImages((prev) => {
          const next = new Set(prev)
          next.delete(conceptKey)
          return next
        })
        clearInterval(pollInterval)
      }
    }, 3000) // Poll every 3 seconds

    // Cleanup after 5 minutes (timeout)
    setTimeout(() => {
      clearInterval(pollInterval)
      setGeneratingImages((prev) => {
        const next = new Set(prev)
        next.delete(conceptKey)
        return next
      })
    }, 5 * 60 * 1000)
  }

  const handleApproveImage = async (imageUrl: string, conceptKey: string) => {
    const imageData = generatedImages.get(conceptKey)
    if (!imageData) return

    try {
      const response = await fetch("/api/admin/prompt-guide/approve-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideId: null, // TODO: Get from current guide context
          promptText: imageData.concept.prompt || imageData.concept.promptText || imageData.concept.description,
          conceptTitle: imageData.concept.title || imageData.concept.label,
          conceptDescription: imageData.concept.description,
          category: imageData.concept.category || currentGuideCategory,
          imageUrl: imageUrl,
          replicatePredictionId: imageData.predictionId,
          generationSettings: {
            styleStrength,
            promptAccuracy,
            aspectRatio,
            realismStrength,
          },
        }),
      })

      if (response.ok) {
        setApprovedImages((prev) => new Set(prev).add(imageUrl))
        setRejectedImages((prev) => {
          const next = new Set(prev)
          next.delete(imageUrl)
          return next
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to approve image")
      }
    } catch (error) {
      console.error("[PromptBuilder] Error approving image:", error)
      // TODO: Show error message to user
    }
  }

  const handleRejectImage = (imageUrl: string) => {
    setRejectedImages((prev) => new Set(prev).add(imageUrl))
    setApprovedImages((prev) => {
      const next = new Set(prev)
      next.delete(imageUrl)
      return next
    })
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    // Create chat if doesn't exist
    if (!chatId) {
      handleNewChat().then(() => {
        // Wait a bit for chat to be created, then send message
        setTimeout(() => {
          handleSubmit(e)
        }, 500)
      })
    } else {
      handleSubmit(e)
    }
  }

  if (isLoadingChat) {
    return <UnifiedLoading message="Loading chat..." />
  }

  return (
    <div className="grid grid-cols-[300px_1fr] gap-6 h-[calc(100vh-200px)]">
      {/* Left: Chat History */}
      <div className="border-r border-stone-200 pr-6">
        <MayaChatHistory
          currentChatId={chatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          chatType="prompt_builder"
        />
      </div>

      {/* Right: Chat Messages + Controls */}
      <div className="flex flex-col min-h-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <p className="text-sm text-stone-600 font-light">
                  Start a conversation to create prompt guides
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const isUser = message.role === "user"
              const content = typeof message.content === "string" ? message.content : JSON.stringify(message.content)

              // Check if message has concept cards
              const hasConcepts = message.parts?.some((p: any) => p.type === "tool-generateConcepts")

              return (
                <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      isUser
                        ? "bg-stone-950 text-white rounded-tr-none"
                        : "bg-white border border-stone-200 rounded-tl-none"
                    }`}
                  >
                    <p className={`text-sm font-light ${isUser ? "text-white" : "text-stone-900"}`}>
                      {content}
                    </p>

                    {/* Render concept cards if present */}
                    {hasConcepts &&
                      message.parts
                        ?.filter((p: any) => p.type === "tool-generateConcepts")
                        .map((part: any, idx: number) => {
                          const concepts = part.output?.concepts || []
                          return (
                            <div key={idx} className="mt-4 space-y-3">
                              {concepts.map((concept: any, conceptIdx: number) => {
                                const conceptKey = `concept-${conceptIdx}-${concept.title || concept.label || "unknown"}`
                                const isGenerating = Array.from(generatingImages).some((key) => key.startsWith(`concept-${conceptIdx}-`))
                                const generatedImage = Array.from(generatedImages.entries()).find(([key]) => 
                                  key.startsWith(`concept-${conceptIdx}-`)
                                )?.[1]

                                return (
                                  <Card key={conceptIdx} className="p-4 bg-stone-50 border-stone-200">
                                    <div className="space-y-2">
                                      <h4 className="font-medium text-stone-950">{concept.title || concept.label}</h4>
                                      {concept.description && (
                                        <p className="text-xs text-stone-600 font-light">{concept.description}</p>
                                      )}
                                      {(concept.prompt || concept.promptText) && (
                                        <p className="text-xs text-stone-500 font-light italic mt-2">
                                          {(concept.prompt || concept.promptText).substring(0, 100)}...
                                        </p>
                                      )}
                                      {!generatedImage && (
                                        <Button
                                          onClick={() => handleGenerateImage(concept, conceptIdx)}
                                          disabled={isGenerating}
                                          className="w-full bg-stone-950 text-white hover:bg-stone-800 text-xs disabled:opacity-50"
                                          size="sm"
                                        >
                                          {isGenerating ? (
                                            <>
                                              <Loader2 size={14} className="mr-2 animate-spin" />
                                              Generating...
                                            </>
                                          ) : (
                                            <>
                                              <Wand2 size={14} className="mr-2" />
                                              Generate Image
                                            </>
                                          )}
                                        </Button>
                                      )}
                                      {generatedImage && (
                                        <div className="mt-2 space-y-2">
                                          <img
                                            src={generatedImage.imageUrl}
                                            alt="Generated"
                                            className="rounded-lg w-full"
                                          />
                                          <div className="flex gap-2">
                                            <Button
                                              onClick={() => handleApproveImage(generatedImage.imageUrl, conceptKey)}
                                              size="sm"
                                              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs"
                                              disabled={approvedImages.has(generatedImage.imageUrl)}
                                            >
                                              <Check size={12} className="mr-1" />
                                              {approvedImages.has(generatedImage.imageUrl) ? "Approved" : "Approve"}
                                            </Button>
                                            <Button
                                              onClick={() => handleRejectImage(generatedImage.imageUrl)}
                                              size="sm"
                                              className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs"
                                              disabled={rejectedImages.has(generatedImage.imageUrl)}
                                            >
                                              <XCircle size={12} className="mr-1" />
                                              {rejectedImages.has(generatedImage.imageUrl) ? "Rejected" : "Reject"}
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </Card>
                                )
                              })}
                            </div>
                          )
                        })}

                    {/* Render generated images with approve/reject buttons */}
                    {message.parts
                      ?.filter((p: any) => p.type === "image" || p.type === "file")
                      .map((part: any, idx: number) => {
                        const imageUrl = part.image || part.url || part.src
                        if (!imageUrl) return null

                        // Find the concept key for this image
                        const imageEntry = Array.from(generatedImages.entries()).find(
                          ([_, data]) => data.imageUrl === imageUrl
                        )
                        const conceptKey = imageEntry ? imageEntry[0] : null

                        const isApproved = approvedImages.has(imageUrl)
                        const isRejected = rejectedImages.has(imageUrl)

                        return (
                          <div key={idx} className="mt-4 relative group">
                            <img
                              src={imageUrl}
                              alt="Generated"
                              className="rounded-lg w-full max-w-md"
                            />
                            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!isApproved && !isRejected && conceptKey && (
                                <>
                                  <Button
                                    onClick={() => handleApproveImage(imageUrl, conceptKey)}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white h-8 w-8 p-0"
                                  >
                                    <Check size={14} />
                                  </Button>
                                  <Button
                                    onClick={() => handleRejectImage(imageUrl)}
                                    size="sm"
                                    className="bg-red-600 hover:bg-red-700 text-white h-8 w-8 p-0"
                                  >
                                    <XCircle size={14} />
                                  </Button>
                                </>
                              )}
                              {isApproved && (
                                <div className="bg-green-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                                  <Check size={12} />
                                  Approved
                                </div>
                              )}
                              {isRejected && (
                                <div className="bg-red-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                                  <XCircle size={12} />
                                  Rejected
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input + Generation Controls */}
        <div className="border-t border-stone-200 pt-4 space-y-4">
          {/* Generation Settings */}
          {showSettings && (
            <Card className="p-4 bg-stone-50 border-stone-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs tracking-wider uppercase text-stone-600 font-light">Generation Settings</h3>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-stone-500 hover:text-stone-950"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs tracking-wider uppercase text-stone-600">Style Strength</label>
                    <span className="text-sm font-medium text-stone-950">{styleStrength.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.9"
                    max="1.2"
                    step="0.05"
                    value={styleStrength}
                    onChange={(e) => setStyleStrength(Number.parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs tracking-wider uppercase text-stone-600">Prompt Accuracy</label>
                    <span className="text-sm font-medium text-stone-950">{promptAccuracy.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="2.5"
                    max="5.0"
                    step="0.5"
                    value={promptAccuracy}
                    onChange={(e) => setPromptAccuracy(Number.parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs tracking-wider uppercase text-stone-600">Realism Strength</label>
                    <span className="text-sm font-medium text-stone-950">{realismStrength.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="0.8"
                    step="0.1"
                    value={realismStrength}
                    onChange={(e) => setRealismStrength(Number.parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-xs tracking-wider uppercase text-stone-600 mb-2 block">Aspect Ratio</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm"
                  >
                    <option value="1:1">Square (1:1)</option>
                    <option value="4:5">Portrait (4:5)</option>
                    <option value="16:9">Landscape (16:9)</option>
                  </select>
                </div>
              </div>
            </Card>
          )}

          {/* Chat Input */}
          <form onSubmit={onSubmit} className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg transition-colors ${
                showSettings
                  ? "bg-stone-950 text-white"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              <Sliders size={18} />
            </button>
            <textarea
              value={input}
              onChange={handleInputChange}
              placeholder="Describe the prompt concept you want to create..."
              className="flex-1 min-h-[60px] max-h-[120px] px-4 py-3 bg-white border border-stone-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-stone-950 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  onSubmit(e)
                }
              }}
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-stone-950 text-white hover:bg-stone-800 px-4 py-3"
            >
              <Send size={18} />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
