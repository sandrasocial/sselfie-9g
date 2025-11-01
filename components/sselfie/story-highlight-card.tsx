"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface StoryHighlightCardProps {
  highlight: {
    title: string
    coverUrl: string
    description: string
  }
  index: number
  onUpdate: (
    index: number,
    data: { title: string; coverUrl: string; description: string; type: "image" | "color" },
  ) => void
  onRemove: (index: number) => void
  userColorTheme?: string
  feedId?: string
  isEditing?: boolean
}

export default function StoryHighlightCard({
  highlight,
  index,
  onUpdate,
  onRemove,
  userColorTheme,
  feedId,
  isEditing: parentIsEditing,
}: StoryHighlightCardProps) {
  const [isEditing, setIsEditing] = useState(!highlight.title)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerated, setIsGenerated] = useState(
    !!highlight.coverUrl &&
      !highlight.coverUrl.startsWith("#") &&
      !highlight.coverUrl.includes("placeholder.svg") &&
      highlight.coverUrl !== "generating" &&
      highlight.coverUrl.startsWith("http"), // Must be a real URL
  )
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(
    highlight.coverUrl &&
      !highlight.coverUrl.startsWith("#") &&
      !highlight.coverUrl.includes("placeholder.svg") &&
      highlight.coverUrl !== "generating" &&
      highlight.coverUrl.startsWith("http") // Must be a real URL
      ? highlight.coverUrl
      : null,
  )
  const [error, setError] = useState<string | null>(null)
  const [predictionId, setPredictionId] = useState<string | null>(null)
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [isViewingFullSize, setIsViewingFullSize] = useState(false)
  const [title, setTitle] = useState(highlight.title || "")
  const [description, setDescription] = useState(highlight.description || "")
  const [mode, setMode] = useState<"image" | "color">("color")
  const [selectedColor, setSelectedColor] = useState(
    highlight.coverUrl && highlight.coverUrl.startsWith("#") ? highlight.coverUrl : "#D4C5B9",
  )

  // Color palettes based on brand themes
  const colorPalettes = {
    "Dark & Moody": ["#1A1A1A", "#2D2D2D", "#3D3D3D", "#4A4A4A"],
    "Minimalistic & Clean": ["#FFFFFF", "#F5F5F5", "#E8E8E8", "#D4D4D4"],
    "Bold & Colorful": ["#FF6B6B", "#4ECDC4", "#FFE66D", "#A8E6CF"],
    "Beige & Creamy": ["#F5E6D3", "#E8D5C4", "#D4C5B9", "#C9B8A8"],
    "Pastel & Coastal": ["#B8E6E1", "#C4E8E6", "#A8D5D1", "#8FC5C1"],
    Monochrome: ["#000000", "#808080", "#C0C0C0", "#FFFFFF"],
  }

  const currentPalette =
    userColorTheme && colorPalettes[userColorTheme as keyof typeof colorPalettes]
      ? colorPalettes[userColorTheme as keyof typeof colorPalettes]
      : colorPalettes["Beige & Creamy"]

  useEffect(() => {
    if (!predictionId || !generationId || isGenerated) {
      return
    }

    console.log("[v0] Starting polling for highlight", index, "with prediction", predictionId)

    const pollInterval = setInterval(async () => {
      try {
        console.log("[v0] Polling highlight generation status...")
        const response = await fetch(
          `/api/maya/check-generation?predictionId=${predictionId}&generationId=${generationId}`,
        )
        const data = await response.json()

        console.log("[v0] Highlight generation status:", data.status)

        if (data.status === "succeeded") {
          console.log("[v0] Highlight generation succeeded! Image URL:", data.imageUrl)

          const overlayedImageUrl = await addTextOverlay(data.imageUrl, highlight.title)

          console.log("[v0] Text overlay complete, final URL:", overlayedImageUrl)

          setGeneratedImageUrl(overlayedImageUrl)
          setIsGenerated(true)
          setIsGenerating(false)
          clearInterval(pollInterval)

          console.log("[v0] Calling onUpdate to save highlight to database")
          onUpdate(index, {
            title: highlight.title,
            coverUrl: overlayedImageUrl,
            description: highlight.description,
            type: "image",
          })
        } else if (data.status === "failed") {
          console.log("[v0] Highlight generation failed:", data.error)
          setError(data.error || "Generation failed")
          setIsGenerating(false)
          clearInterval(pollInterval)
        }
      } catch (err) {
        console.error("[v0] Error polling generation:", err)
        setError("Failed to check generation status")
        setIsGenerating(false)
        clearInterval(pollInterval)
      }
    }, 3000)

    return () => {
      console.log("[v0] Cleaning up polling interval")
      clearInterval(pollInterval)
    }
  }, [predictionId, generationId, isGenerated, index])

  const addTextOverlay = async (imageUrl: string, text: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"

      img.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          reject(new Error("Failed to get canvas context"))
          return
        }

        // Draw the background image
        ctx.drawImage(img, 0, 0)

        // Add semi-transparent overlay for better text readability
        ctx.fillStyle = "rgba(0, 0, 0, 0.2)"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Configure text styling - elegant serif font
        const fontSize = Math.floor(canvas.width * 0.15) // 15% of image width
        ctx.font = `${fontSize}px "Playfair Display", serif`
        ctx.fillStyle = "#FFFFFF"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"

        // Add text shadow for depth
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)"
        ctx.shadowBlur = 10
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2

        // Draw the text in the center
        ctx.fillText(text, canvas.width / 2, canvas.height / 2)

        // Convert canvas to blob and resolve with data URL
        resolve(canvas.toDataURL("image/png"))
      }

      img.onerror = () => {
        reject(new Error("Failed to load image"))
      }

      img.src = imageUrl
    })
  }

  const handleGenerate = async () => {
    if (!highlight.title) {
      setError("Highlight needs a title")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      console.log("[v0] Generating highlight:", highlight.title)

      const conceptPrompt =
        highlight.description ||
        `Create a beautiful Instagram story highlight cover for "${highlight.title}". Professional, aesthetic, and eye-catching design.`

      console.log("[v0] Using Maya's saved prompt:", conceptPrompt)

      const response = await fetch("/api/maya/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conceptTitle: highlight.title,
          conceptDescription: highlight.description || `Story highlight cover for ${highlight.title}`,
          conceptPrompt,
          category: "feed-design",
          isHighlight: true, // Flag to indicate this is a highlight cover
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 402 || data.error === "Insufficient credits") {
          throw new Error(
            `Need ${data.required || 1} credit${data.required > 1 ? "s" : ""}. Please purchase more credits or upgrade your plan.`,
          )
        }
        throw new Error(data.error || "Failed to generate image")
      }

      console.log("[v0] Generation started with prediction ID:", data.predictionId)
      setPredictionId(data.predictionId)
      setGenerationId(data.generationId)
    } catch (err) {
      console.error("[v0] Error generating highlight:", err)
      setError(err instanceof Error ? err.message : "Failed to generate image")
      setIsGenerating(false)
    }
  }

  const handleSaveColor = () => {
    if (!title.trim()) {
      setError("Please enter a title")
      return
    }

    onUpdate(index, {
      title,
      coverUrl: selectedColor,
      description,
      type: "color",
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    if (!highlight.title) {
      onRemove(index)
    } else {
      setIsEditing(false)
      setTitle(highlight.title)
      setDescription(highlight.description)
    }
  }

  if (isViewingFullSize && generatedImageUrl) {
    return (
      <div
        className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => setIsViewingFullSize(false)}
      >
        <div className="relative max-w-2xl w-full">
          <button
            onClick={() => setIsViewingFullSize(false)}
            className="absolute -top-12 right-0 px-4 py-2 text-sm text-foreground hover:text-muted-foreground transition-colors"
          >
            Close
          </button>

          <img
            src={generatedImageUrl || "/placeholder.svg"}
            alt={highlight.title}
            className="w-full h-auto rounded-2xl shadow-2xl"
          />

          <div className="mt-4 text-center">
            <h3 className="text-xl font-bold text-foreground">{highlight.title}</h3>
            {highlight.description && <p className="text-sm text-muted-foreground mt-2">{highlight.description}</p>}
          </div>
        </div>
      </div>
    )
  }

  if (isEditing) {
    return (
      <>
        <div className="fixed inset-0 bg-primary/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-xl border border-border shadow-xl max-w-sm w-full p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">Edit Highlight</h3>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>

              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Highlight title"
                className="text-sm"
                maxLength={15}
              />

              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                className="text-sm"
              />

              <div className="flex gap-2">
                <Button
                  onClick={() => setMode("color")}
                  variant={mode === "color" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                >
                  Color
                </Button>
                <Button
                  onClick={() => setMode("image")}
                  variant={mode === "image" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                >
                  Image
                </Button>
              </div>

              {mode === "color" && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">Choose a color:</p>
                  <div className="grid grid-cols-4 gap-2">
                    {currentPalette.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-full aspect-square rounded-lg border-2 transition-all ${
                          selectedColor === color ? "border-primary scale-110" : "border-border hover:border-ring"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground">Or choose a custom color:</p>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="text"
                        value={selectedColor}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value.startsWith("#")) {
                            setSelectedColor(value)
                          } else {
                            setSelectedColor("#" + value.replace(/[^0-9A-Fa-f]/g, ""))
                          }
                        }}
                        placeholder="#D4C5B9"
                        className="text-sm font-mono flex-1"
                        maxLength={7}
                      />
                      <input
                        type="color"
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border-2 border-border"
                      />
                    </div>
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-2 pt-2">
                {mode === "color" ? (
                  <Button
                    onClick={handleSaveColor}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Save
                  </Button>
                ) : (
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {isGenerating ? "Generating..." : "Generate"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 flex-shrink-0 w-[80px]">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
            <div className="w-full h-full rounded-full bg-card p-[2px]">
              <div
                className="w-full h-full rounded-full flex items-center justify-center"
                style={{ backgroundColor: selectedColor }}
              >
                {isGenerating && (
                  <div className="w-8 h-8 border-3 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                )}
              </div>
            </div>
          </div>
          <span className="text-xs text-muted-foreground text-center">
            {isGenerating ? "Generating..." : "Editing..."}
          </span>
        </div>
      </>
    )
  }

  if (!isGenerating && !isGenerated && !error) {
    return (
      <div className="flex flex-col items-center gap-2 flex-shrink-0 w-[80px]">
        <button
          onClick={handleGenerate}
          className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px] group relative"
        >
          <div className="w-full h-full rounded-full bg-stone-100 flex items-center justify-center group-hover:bg-stone-50 transition-all">
            <span className="text-xs font-semibold text-stone-700">Generate</span>
          </div>
        </button>
        <span className="text-xs text-muted-foreground text-center leading-tight max-w-[80px] truncate">
          {highlight.title || "Highlight"}
        </span>
      </div>
    )
  }

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center gap-2 flex-shrink-0 w-[80px]">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px]">
          <div className="w-full h-full rounded-full bg-card p-[2px]">
            <div className="w-full h-full rounded-full bg-stone-950/5 flex items-center justify-center">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 rounded-full bg-stone-200/20 animate-ping"></div>
                <div className="relative w-8 h-8 rounded-full bg-stone-950 animate-spin border-4 border-transparent border-t-white"></div>
              </div>
            </div>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">Creating...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 flex-shrink-0 w-[80px]">
        <button
          onClick={handleGenerate}
          className="w-16 h-16 rounded-full bg-gradient-to-tr from-red-400 via-red-500 to-red-600 p-[2px]"
        >
          <div className="w-full h-full rounded-full bg-red-50 flex items-center justify-center">
            <span className="text-xs font-semibold text-red-700">Retry</span>
          </div>
        </button>
        <span className="text-xs text-red-600 text-center leading-tight max-w-[80px]">{error}</span>
      </div>
    )
  }

  if (isGenerated && generatedImageUrl) {
    return (
      <div className="flex flex-col items-center gap-2 flex-shrink-0 w-[80px]">
        <button
          onClick={() => setIsViewingFullSize(true)}
          className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px] group relative"
        >
          <div className="w-full h-full rounded-full bg-card p-[2px]">
            <img
              src={generatedImageUrl || "/placeholder.svg"}
              alt={highlight.title}
              className="w-full h-full rounded-full object-cover group-hover:opacity-80 transition-opacity"
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-stone-950/50 rounded-full">
            <span className="text-xs text-white font-medium">View</span>
          </div>
        </button>

        <span className="text-xs text-muted-foreground text-center leading-tight max-w-[80px] truncate">
          {highlight.title}
        </span>
      </div>
    )
  }

  const isColorHighlight = highlight.coverUrl.startsWith("#")

  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0 w-[80px]">
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (parentIsEditing) {
            setIsEditing(true)
          } else {
            setIsViewingFullSize(true)
          }
        }}
        className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px] group relative"
      >
        <div className="w-full h-full rounded-full bg-card p-[2px]">
          {isColorHighlight ? (
            <div
              className="w-full h-full rounded-full flex items-center justify-center group-hover:opacity-80 transition-opacity"
              style={{ backgroundColor: highlight.coverUrl }}
            >
              <span className="text-lg font-bold text-primary-foreground drop-shadow-lg">
                {highlight.title.charAt(0).toUpperCase()}
              </span>
            </div>
          ) : (
            <img
              src={highlight.coverUrl || "/placeholder.svg"}
              alt={highlight.title}
              className="w-full h-full rounded-full object-cover group-hover:opacity-80 transition-opacity"
            />
          )}
        </div>
        {!isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-stone-950/50 rounded-full">
            <span className="text-xs text-white font-medium">{parentIsEditing ? "Edit" : "View"}</span>
          </div>
        )}
      </button>

      <span className="text-xs text-muted-foreground text-center leading-tight max-w-[80px] truncate">
        {highlight.title}
      </span>
    </div>
  )
}
