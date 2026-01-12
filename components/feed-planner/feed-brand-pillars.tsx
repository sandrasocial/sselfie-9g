"use client"

import { useState, useEffect } from "react"
import { Copy, Check, MessageCircle, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import useSWR from "swr"

interface ContentPillar {
  name: string
  description: string
  contentIdeas: string[]
}

interface FeedBrandPillarsProps {
  businessType?: string
}

/**
 * Brand Pillars Component for Feed Planner
 * 
 * Displays user's content pillars from user_personal_brand
 * Allows users to regenerate pillars if needed
 */
export default function FeedBrandPillars({ businessType }: FeedBrandPillarsProps) {
  const [copiedPillar, setCopiedPillar] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [pillarExplanation, setPillarExplanation] = useState("")

  const fetcher = (url: string) => fetch(url).then((res) => res.json())
  const { data: personalBrandData, mutate: mutateBrand } = useSWR(
    "/api/profile/personal-brand",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  )

  // Extract content pillars from personal brand data
  // API returns camelCase (contentPillars), not snake_case (content_pillars)
  const contentPillars: ContentPillar[] = personalBrandData?.exists && personalBrandData?.data?.contentPillars
    ? (typeof personalBrandData.data.contentPillars === "string"
        ? JSON.parse(personalBrandData.data.contentPillars)
        : personalBrandData.data.contentPillars)
    : []

  // Debug logging to help diagnose issues
  useEffect(() => {
    if (personalBrandData) {
      console.log("[Feed Brand Pillars] Personal brand data:", {
        exists: personalBrandData.exists,
        hasData: !!personalBrandData.data,
        hasContentPillars: !!personalBrandData.data?.contentPillars,
        contentPillarsType: typeof personalBrandData.data?.contentPillars,
        contentPillarsValue: personalBrandData.data?.contentPillars,
        parsedPillars: contentPillars,
        pillarsCount: contentPillars.length,
      })
    }
  }, [personalBrandData, contentPillars])

  const copyToClipboard = (text: string, pillarName: string) => {
    navigator.clipboard.writeText(text)
    setCopiedPillar(pillarName)
    setTimeout(() => setCopiedPillar(null), 2000)
    toast({
      title: "Copied!",
      description: "Content idea copied to clipboard",
    })
  }

  const generateNewPillars = async () => {
    setIsGenerating(true)
    try {
      // Prepare user answers for Maya
      // API returns camelCase field names, not snake_case
      const userAnswers = {
        businessType: personalBrandData?.data?.businessType || businessType || "",
        idealAudience: personalBrandData?.data?.idealAudience || "",
        audienceChallenge: personalBrandData?.data?.audienceChallenge || "",
        audienceTransformation: personalBrandData?.data?.audienceTransformation || "",
        transformationStory: personalBrandData?.data?.transformationStory || "",
        visualAesthetic: personalBrandData?.data?.visualAesthetic
          ? (typeof personalBrandData.data.visualAesthetic === "string"
              ? JSON.parse(personalBrandData.data.visualAesthetic).join(", ")
              : Array.isArray(personalBrandData.data.visualAesthetic)
              ? personalBrandData.data.visualAesthetic.join(", ")
              : "")
          : "",
        feedStyle: personalBrandData?.data?.settingsPreference
          ? (typeof personalBrandData.data.settingsPreference === "string"
              ? JSON.parse(personalBrandData.data.settingsPreference)[0] || ""
              : Array.isArray(personalBrandData.data.settingsPreference)
              ? personalBrandData.data.settingsPreference[0] || ""
              : "")
          : "",
      }

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
      setPillarExplanation(data.explanation)

      // Save new pillars to user_personal_brand
      const updateResponse = await fetch("/api/profile/personal-brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          contentPillars: data.pillars,
        }),
      })

      if (updateResponse.ok) {
        await mutateBrand() // Refresh data
        toast({
          title: "Success!",
          description: "Your content pillars have been updated",
        })
      }
    } catch (error) {
      console.error("[Feed Brand Pillars] Error generating pillars:", error)
      toast({
        title: "Error",
        description: "Failed to generate content pillars. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  if (!personalBrandData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-stone-500">Loading brand pillars...</div>
      </div>
    )
  }

  if (contentPillars.length === 0) {
    return (
      <div className="px-4 md:px-8 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2
            style={{ fontFamily: "'Times New Roman', serif" }}
            className="text-2xl sm:text-3xl md:text-4xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-4 text-stone-950"
          >
            Your Content Pillars
          </h2>
          <p className="text-sm font-light text-stone-600 leading-relaxed max-w-2xl mx-auto mb-8">
            Content pillars are the main themes you'll create content around. They keep your feed organized and make it easy to come up with post ideas.
          </p>
          <Button
            onClick={generateNewPillars}
            disabled={isGenerating}
            className="bg-stone-950 hover:bg-stone-800 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Maya is thinking...
              </>
            ) : (
              <>
                <MessageCircle size={16} className="mr-2" />
                Generate my content pillars
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-8 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2
              style={{ fontFamily: "'Times New Roman', serif" }}
              className="text-2xl sm:text-3xl md:text-4xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase mb-2 text-stone-950"
            >
              Your Content Pillars
            </h2>
            <p className="text-xs sm:text-sm font-light text-stone-600 leading-relaxed">
              These are the main themes you'll create content around. Use them to plan your posts and keep your feed organized.
            </p>
          </div>
          <Button
            onClick={generateNewPillars}
            disabled={isGenerating}
            variant="outline"
            className="border-stone-300 text-stone-700 hover:bg-stone-50"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Regenerating...
              </>
            ) : (
              "Regenerate"
            )}
          </Button>
        </div>

        {/* Maya's Explanation */}
        {pillarExplanation && (
          <div className="flex gap-4 items-start bg-stone-50 rounded-xl p-4 mb-8">
            <div className="flex-shrink-0 w-12 h-12 bg-stone-950 rounded-full flex items-center justify-center">
              <MessageCircle size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-stone-950 mb-1">Maya</p>
              <p className="text-sm text-stone-600 leading-relaxed">{pillarExplanation}</p>
            </div>
          </div>
        )}

        {/* Content Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contentPillars.map((pillar, index) => (
            <Card key={index} className="p-6 border-stone-200 bg-white">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-stone-950 mb-2">{pillar.name}</h3>
                <p className="text-sm text-stone-600 leading-relaxed">{pillar.description}</p>
              </div>

              {/* Content Ideas */}
              {pillar.contentIdeas && pillar.contentIdeas.length > 0 && (
                <div className="mt-4 pt-4 border-t border-stone-200">
                  <p className="text-xs font-medium text-stone-500 mb-3 uppercase tracking-wider">Post Ideas</p>
                  <div className="space-y-2">
                    {pillar.contentIdeas.map((idea, i) => (
                      <div key={i} className="flex items-start justify-between gap-2">
                        <p className="text-xs text-stone-600 leading-relaxed flex-1">{idea}</p>
                        <button
                          onClick={() => copyToClipboard(idea, `${pillar.name}-${i}`)}
                          className="p-1.5 hover:bg-stone-100 rounded transition-colors shrink-0"
                          title="Copy idea"
                        >
                          {copiedPillar === `${pillar.name}-${i}` ? (
                            <Check className="w-3.5 h-3.5 text-green-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-stone-400" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
