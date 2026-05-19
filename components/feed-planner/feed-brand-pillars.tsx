"use client"

import { useState, useEffect } from "react"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
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
  // API already parses JSONB, so it should be an array/object, not a string
  const contentPillars: ContentPillar[] = (() => {
    if (!personalBrandData?.exists || !personalBrandData?.data?.contentPillars) {
      return []
    }
    
    const pillarsData = personalBrandData.data.contentPillars
    
    // Handle different data formats
    if (Array.isArray(pillarsData)) {
      // Already an array - use directly
      return pillarsData
    } else if (typeof pillarsData === "string") {
      // String - try to parse
      try {
        const parsed = JSON.parse(pillarsData)
        return Array.isArray(parsed) ? parsed : []
      } catch (e) {
        console.error("[Feed Brand Pillars] Failed to parse contentPillars string:", e)
        return []
      }
    } else if (typeof pillarsData === "object" && pillarsData !== null) {
      // Object - check if it has a "pillars" property (from Maya API response)
      if ("pillars" in pillarsData && Array.isArray(pillarsData.pillars)) {
        return pillarsData.pillars
      }
      // Otherwise, try to use as array if it looks like one
      return Array.isArray(pillarsData) ? pillarsData : []
    }
    
    return []
  })()

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
        <div className="text-sm text-[color:var(--app-text-secondary)]">Loading brand pillars...</div>
      </div>
    )
  }

  if (contentPillars.length === 0) {
    return (
      <div className="app-light-panel-text px-4 py-8 md:px-8">
        <div className="mx-auto max-w-4xl rounded-[16px] border border-[color:var(--app-glass-border)] bg-[rgba(255,255,255,0.74)] p-8 text-center shadow-[0_18px_50px_rgba(61,56,48,0.08)] backdrop-blur-[18px]">
          <h2
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
            className="mb-4 text-2xl font-light uppercase tracking-[0.15em] text-[color:var(--app-text-primary)] sm:text-3xl md:text-4xl"
          >
            Your Content Ideas
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-sm font-light leading-relaxed text-[color:var(--app-text-secondary)]">
            These are the themes Maya can use when you need a post idea, caption, or direction for your next photo.
          </p>
          <Button
            onClick={generateNewPillars}
            disabled={isGenerating}
            className="rounded-[6px] border border-[color:var(--app-btn-primary-bg)] bg-[color:var(--app-btn-primary-bg)] text-[color:var(--app-btn-primary-text)] hover:opacity-90"
          >
            {isGenerating ? (
              <>
                <span className="mr-2 h-4 w-4 rounded-full border border-[rgba(237,233,226,0.42)] border-t-[color:var(--app-btn-primary-text)] animate-spin" />
                Maya is thinking...
              </>
            ) : (
              "Generate my content ideas"
            )}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-light-panel-text px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h2
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
              className="mb-2 text-2xl font-light uppercase tracking-[0.15em] text-[color:var(--app-text-primary)] sm:text-3xl md:text-4xl"
            >
              Your Content Ideas
            </h2>
            <p className="text-xs font-light leading-relaxed text-[color:var(--app-text-secondary)] sm:text-sm">
              Use these themes when you need a post idea, caption, or direction for your next photo.
            </p>
          </div>
          <Button
            onClick={generateNewPillars}
            disabled={isGenerating}
            variant="outline"
            className="rounded-[6px] border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] text-[color:var(--app-text-primary)] hover:bg-[color:var(--app-btn-secondary-hover)] hover:text-[color:var(--app-text-primary)]"
          >
            {isGenerating ? (
              <>
                <span className="mr-2 h-4 w-4 rounded-full border border-[color:var(--app-glass-border)] border-t-[color:var(--app-text-primary)] animate-spin" />
                Regenerating...
              </>
            ) : (
              "Regenerate"
            )}
          </Button>
        </div>

        {/* Maya's Explanation */}
        {pillarExplanation && (
          <div className="mb-8 flex items-start gap-4 rounded-[16px] border border-[color:var(--app-glass-border)] bg-[rgba(255,255,255,0.74)] p-4 shadow-[0_12px_32px_rgba(61,56,48,0.06)] backdrop-blur-[18px]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)]">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--app-text-secondary)]">Maya</span>
            </div>
            <div className="flex-1">
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--app-text-primary)]">Maya</p>
              <p className="text-sm leading-relaxed text-[color:var(--app-text-secondary)]">{pillarExplanation}</p>
            </div>
          </div>
        )}

        {/* Content Pillars Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {contentPillars.map((pillar, index) => (
            <div key={index} className="rounded-[16px] border border-[color:var(--app-glass-border)] bg-[rgba(255,255,255,0.74)] p-6 shadow-[0_12px_32px_rgba(61,56,48,0.06)] backdrop-blur-[18px]">
              <div className="mb-4 space-y-2">
                <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--app-text-muted)]">{`0${index + 1}`.slice(-2)}</div>
                <h3
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  className="text-xl font-light uppercase tracking-[0.12em] text-[color:var(--app-text-primary)]"
                >
                  {pillar.name}
                </h3>
                <p className="text-sm leading-relaxed text-[color:var(--app-text-secondary)]">{pillar.description}</p>
              </div>

              {/* Content Ideas */}
              {pillar.contentIdeas && pillar.contentIdeas.length > 0 && (
                <div className="mt-4 border-t border-[color:var(--app-glass-border)] pt-4">
                  <p className="mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[color:var(--app-text-secondary)]">Post Ideas</p>
                  <div className="space-y-2">
                    {pillar.contentIdeas.map((idea, i) => (
                      <div key={i} className="flex items-start justify-between gap-2">
                        <p className="flex-1 text-xs leading-relaxed text-[color:var(--app-text-secondary)]">{idea}</p>
                        <button
                          onClick={() => copyToClipboard(idea, `${pillar.name}-${i}`)}
                          className="shrink-0 rounded-[4px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-[color:var(--app-text-secondary)] transition-colors hover:bg-[color:var(--app-btn-secondary-hover)] hover:text-[color:var(--app-text-primary)]"
                          title="Copy idea"
                        >
                          {copiedPillar === `${pillar.name}-${i}` ? "Done" : "Copy"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
