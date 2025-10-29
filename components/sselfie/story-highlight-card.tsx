"use client"

import { useState } from "react"
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
}

export default function StoryHighlightCard({
  highlight,
  index,
  onUpdate,
  onRemove,
  userColorTheme,
  feedId,
}: StoryHighlightCardProps) {
  const [isEditing, setIsEditing] = useState(!highlight.title)
  const [isViewingFullSize, setIsViewingFullSize] = useState(false)
  const [title, setTitle] = useState(highlight.title || "")
  const [description, setDescription] = useState(highlight.description || "")
  const [mode, setMode] = useState<"image" | "color">("color")
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedColor, setSelectedColor] = useState(
    highlight.coverUrl && highlight.coverUrl.startsWith("#") ? highlight.coverUrl : "#D4C5B9",
  )
  const [error, setError] = useState<string | null>(null)

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

  const handleGenerateImage = async () => {
    if (!title.trim()) {
      setError("Please enter a title first")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const mayaResponse = await fetch("/api/maya/generate-feed-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postType: "Story Highlight",
          caption: title,
          feedPosition: index + 1,
          colorTheme: userColorTheme,
          brandVibe: description || `Story highlight cover for ${title}`,
        }),
      })

      let conceptPrompt: string
      if (!mayaResponse.ok) {
        console.error("[v0] Maya prompt generation failed, using fallback")
        conceptPrompt = `Create a beautiful Instagram story highlight cover for "${title}". ${description}. Professional, aesthetic, and eye-catching design.`
      } else {
        const mayaData = await mayaResponse.json()
        conceptPrompt = mayaData.prompt
        console.log("[v0] Maya generated highlight prompt:", conceptPrompt)
      }

      const response = await fetch("/api/maya/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conceptTitle: title,
          conceptDescription: description || `Story highlight cover for ${title}`,
          conceptPrompt,
          category: "Close-Up",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image")
      }

      const predictionId = data.predictionId
      const generationId = data.generationId

      const pollInterval = setInterval(async () => {
        try {
          const checkResponse = await fetch(
            `/api/maya/check-generation?predictionId=${predictionId}&generationId=${generationId}`,
          )
          const checkData = await checkResponse.json()

          if (checkData.status === "succeeded") {
            clearInterval(pollInterval)
            onUpdate(index, {
              title,
              coverUrl: checkData.imageUrl,
              description,
              type: "image",
            })
            setIsGenerating(false)
            setIsEditing(false)
          } else if (checkData.status === "failed") {
            clearInterval(pollInterval)
            setError(checkData.error || "Generation failed")
            setIsGenerating(false)
          }
        } catch (err) {
          clearInterval(pollInterval)
          setError("Failed to check generation status")
          setIsGenerating(false)
        }
      }, 3000)
    } catch (err) {
      console.error("[v0] Error generating highlight image:", err)
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

  if (isViewingFullSize) {
    const isColorHighlight = highlight.coverUrl.startsWith("#")

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

          {isColorHighlight ? (
            <div
              className="w-full aspect-square rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: highlight.coverUrl }}
            >
              <span className="text-9xl font-bold text-primary-foreground drop-shadow-2xl">
                {highlight.title.charAt(0).toUpperCase()}
              </span>
            </div>
          ) : (
            <img
              src={highlight.coverUrl || "/placeholder.svg"}
              alt={highlight.title}
              className="w-full h-auto rounded-2xl shadow-2xl"
            />
          )}

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
                    onClick={handleGenerateImage}
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

  const isColorHighlight = highlight.coverUrl.startsWith("#")

  return (
    <div className="flex flex-col items-center gap-2 flex-shrink-0 w-[80px]">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsViewingFullSize(true)
        }}
        className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px] group"
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
      </button>

      <button
        onClick={() => setIsEditing(true)}
        className="text-xs text-muted-foreground hover:text-foreground text-center leading-tight max-w-[80px] truncate transition-colors"
      >
        {highlight.title}
      </button>
    </div>
  )
}
