"use client"

import { useState } from "react"
import { Aperture, Sparkles, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface ContentPillar {
  name: string
  description: string
  contentIdeas: string[]
}

interface ContentPillarBuilderProps {
  userAnswers: Record<string, string>
  onComplete: (pillars: ContentPillar[]) => void
  onSkip: () => void
}

export default function ContentPillarBuilder({ userAnswers, onComplete, onSkip }: ContentPillarBuilderProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [pillars, setPillars] = useState<ContentPillar[]>([])
  const [explanation, setExplanation] = useState("")
  const [selectedPillars, setSelectedPillars] = useState<Set<number>>(new Set())

  const generatePillars = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch("/api/maya/content-pillars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userAnswers }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate content pillars")
      }

      const data = await response.json()
      setPillars(data.pillars)
      setExplanation(data.explanation)
      // Select all pillars by default
      setSelectedPillars(new Set(data.pillars.map((_: any, i: number) => i)))
    } catch (error) {
      console.error("[v0] Error generating pillars:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const togglePillar = (index: number) => {
    const newSelected = new Set(selectedPillars)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedPillars(newSelected)
  }

  const handleComplete = () => {
    const selected = pillars.filter((_, i) => selectedPillars.has(i))
    onComplete(selected)
  }

  if (pillars.length === 0) {
    return (
      <div className="space-y-6">
        {/* Maya's Introduction */}
        <div className="flex gap-4 items-start bg-stone-50 rounded-xl p-4">
          <div className="flex-shrink-0 w-12 h-12 bg-stone-950 rounded-full flex items-center justify-center">
            <Aperture size={20} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-stone-950 mb-1">Maya</p>
            <p className="text-sm text-stone-600 leading-relaxed">
              Now let's figure out what you'll actually post about! Content pillars are the main themes you'll create
              content around. Think of them as your content categories - they keep your feed organized and make it easy
              to come up with post ideas.
            </p>
            <p className="text-sm text-stone-600 leading-relaxed mt-2">
              Based on everything you've told me about your brand, I can suggest pillars that will work perfectly for
              you. Ready?
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={generatePillars}
            disabled={isGenerating}
            className="flex-1 bg-stone-950 hover:bg-stone-800 text-white"
          >
            {isGenerating ? (
              <>
                <Sparkles size={16} className="mr-2 animate-pulse" />
                Maya is thinking...
              </>
            ) : (
              <>
                <Sparkles size={16} className="mr-2" />
                Help me create content pillars
              </>
            )}
          </Button>
          <Button onClick={onSkip} variant="ghost" className="text-stone-600">
            Skip for now
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Maya's Explanation */}
      <div className="flex gap-4 items-start bg-stone-50 rounded-xl p-4">
        <div className="flex-shrink-0 w-12 h-12 bg-stone-950 rounded-full flex items-center justify-center">
          <Aperture size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-stone-950 mb-1">Maya</p>
          <p className="text-sm text-stone-600 leading-relaxed">{explanation}</p>
          <p className="text-sm text-stone-600 leading-relaxed mt-2">
            Click on any pillar to remove it, or keep them all. You can always change these later!
          </p>
        </div>
      </div>

      {/* Content Pillars Grid */}
      <div className="grid gap-4">
        {pillars.map((pillar, index) => {
          const isSelected = selectedPillars.has(index)
          return (
            <Card
              key={index}
              onClick={() => togglePillar(index)}
              className={`p-4 cursor-pointer transition-all ${
                isSelected ? "border-stone-950 bg-stone-50" : "border-stone-200 bg-white opacity-50 hover:opacity-75"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-stone-950">{pillar.name}</h3>
                    {isSelected && <Check size={16} className="text-stone-950" />}
                  </div>
                  <p className="text-sm text-stone-600">{pillar.description}</p>
                </div>
              </div>

              {/* Content Ideas */}
              <div className="mt-3 space-y-1">
                <p className="text-xs font-medium text-stone-500 mb-2">Post ideas:</p>
                {pillar.contentIdeas.map((idea, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-xs text-stone-400 mt-0.5">•</span>
                    <p className="text-xs text-stone-600">{idea}</p>
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-stone-200">
        <Button onClick={() => setPillars([])} variant="ghost" className="text-stone-600">
          Start over
        </Button>
        <Button
          onClick={handleComplete}
          disabled={selectedPillars.size === 0}
          className="flex-1 bg-stone-950 hover:bg-stone-800 text-white"
        >
          Use these pillars ({selectedPillars.size})
          <Check size={16} className="ml-2" />
        </Button>
      </div>
    </div>
  )
}
