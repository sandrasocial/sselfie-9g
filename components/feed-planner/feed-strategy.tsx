"use client"

import { useState, useEffect } from "react"
import ReactMarkdown from "react-markdown"
import { toast } from "@/hooks/use-toast"

interface FeedStrategyProps {
  feedData: any
  feedId: number
  onCreateStrategy?: () => void
  onStrategyGenerated?: () => void
}

export default function FeedStrategy({ feedData, feedId, onCreateStrategy, onStrategyGenerated }: FeedStrategyProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedStrategy, setGeneratedStrategy] = useState<string | null>(null)
  const [strategyFromDb, setStrategyFromDb] = useState<string | null>(null)
  const [isLoadingStrategy, setIsLoadingStrategy] = useState(true)
  
  // Fetch strategy from feed_strategy table on mount
  useEffect(() => {
    const fetchStrategy = async () => {
      if (!feedId) {
        setIsLoadingStrategy(false)
        return
      }
      
      try {
        const response = await fetch(`/api/feed/${feedId}/strategy`, {
          method: 'GET',
          credentials: 'include',
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.strategy) {
            setStrategyFromDb(data.strategy)
          }
        }
      } catch (error) {
        console.error("[FeedStrategy] Error fetching strategy:", error)
      } finally {
        setIsLoadingStrategy(false)
      }
    }
    
    fetchStrategy()
  }, [feedId])

  const handleCreateStrategy = async () => {
    if (!feedId) {
      toast({
        title: "Error",
        description: "Feed ID is missing",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    setGeneratedStrategy(null)

    try {
      const response = await fetch(`/api/feed/${feedId}/generate-strategy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate strategy' }))
        throw new Error(errorData.error || 'Failed to generate strategy')
      }

      const data = await response.json()
      
      if (data.success && data.strategy) {
        setGeneratedStrategy(data.strategy)
        
        // Auto-save strategy to feed_strategy table
        try {
          const saveResponse = await fetch(`/api/feed/${feedId}/add-strategy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ strategy: data.strategy }),
          })

          if (saveResponse.ok) {
            // Update local state to show saved strategy
            setStrategyFromDb(data.strategy)
            setGeneratedStrategy(null) // Clear generated state since it's now saved
            
            toast({
              title: "Strategy created!",
              description: "Your comprehensive Instagram strategy is ready",
            })
            
            if (onStrategyGenerated) {
              onStrategyGenerated()
            }
          }
        } catch (saveError) {
          console.error("[FeedStrategy] Error saving strategy:", saveError)
          // Don't show error - strategy is still generated, just not saved
        }
      } else {
        throw new Error(data.error || 'Failed to generate strategy')
      }
    } catch (error) {
      console.error("[FeedStrategy] Error generating strategy:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to generate strategy. Please try again."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Helper function to detect if description is a full strategy document
  const isFullStrategy = (text: string | null | undefined): boolean => {
    if (!text) return false
    // Strategy documents have markdown headers (# ## ###) and are longer
    const hasHeaders = /^#{1,3}\s/m.test(text)
    const isLongEnough = text.length > 500
    return hasHeaders && isLongEnough
  }

  // CRITICAL: Strategy documents are now stored in feed_strategy table, not feed_layouts.description
  // Check feed_strategy table first, then fallback to description for backward compatibility
  const feedDescription = feedData.feed?.description
  const hasFullStrategy = isFullStrategy(feedDescription)
  
  // Priority: generatedStrategy (just created) > strategyFromDb (from feed_strategy table) > feedDescription (backward compat)
  const displayStrategy = generatedStrategy || strategyFromDb || (hasFullStrategy ? feedDescription : null)

  return (
    <div className="p-4 md:p-8">
      {/* Create Strategy Button - Show if no full strategy exists */}
      {!displayStrategy && !hasFullStrategy && !isLoadingStrategy && (
        <div className="flex flex-col items-center justify-center py-12 space-y-6">
          {isGenerating ? (
            <div className="flex flex-col items-center space-y-4 max-w-md text-center">
              <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-stone-900">I'm crafting your comprehensive strategy...</p>
                <p className="text-xs text-stone-500">This includes posting schedules, reel ideas, hashtags, and growth tactics! ✨</p>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center space-y-2 max-w-md">
                <h3 className="text-lg font-semibold text-stone-900">Create Your Instagram Strategy</h3>
                <p className="text-sm text-stone-600">
                  Get a comprehensive strategy including posting schedules, reel ideas, hashtag strategy, growth tactics, and more.
                </p>
              </div>
              <button
                onClick={handleCreateStrategy}
                disabled={isGenerating}
                className="px-6 py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Create Strategy</span>
              </button>
            </>
          )}
        </div>
      )}
      {/* Full Strategy Document */}
      {displayStrategy && (
      <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl shadow-stone-900/5">
        {displayStrategy ? (
          <div className="prose prose-sm max-w-none prose-headings:font-serif prose-headings:font-light prose-headings:text-stone-900 prose-headings:tracking-wide prose-h1:text-2xl prose-h1:mb-4 prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-p:text-stone-700 prose-p:leading-relaxed prose-p:mb-4 prose-strong:text-stone-900 prose-strong:font-medium prose-ul:text-stone-700 prose-ol:text-stone-700 prose-li:text-stone-700 prose-li:leading-relaxed prose-li:mb-2 prose-code:text-stone-600 prose-code:bg-stone-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-blockquote:border-l-4 prose-blockquote:border-stone-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-stone-600">
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => (
                  <h1 className="text-2xl font-serif font-light text-stone-900 mb-4 mt-8 first:mt-0 tracking-wide" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-xl font-serif font-light text-stone-900 mb-4 mt-8 tracking-wide" {...props} />
                ),
                h3: ({ node, ...props }) => (
                  <h3 className="text-lg font-serif font-light text-stone-900 mb-3 mt-6 tracking-wide" {...props} />
                ),
                p: ({ node, ...props }) => (
                  <p className="text-sm font-light text-stone-700 leading-relaxed mb-4" {...props} />
                ),
                strong: ({ node, ...props }) => (
                  <strong className="font-medium text-stone-900" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul className="list-disc list-inside space-y-2 ml-4 mb-4 text-stone-700" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal list-inside space-y-2 ml-4 mb-4 text-stone-700" {...props} />
                ),
                li: ({ node, ...props }) => (
                  <li className="text-sm font-light text-stone-700 leading-relaxed" {...props} />
                ),
                code: ({ node, ...props }) => (
                  <code className="text-xs bg-stone-100 text-stone-600 px-1 py-0.5 rounded" {...props} />
                ),
                blockquote: ({ node, ...props }) => (
                  <blockquote className="border-l-4 border-stone-300 pl-4 italic text-stone-600 my-4" {...props} />
                ),
              }}
            >
              {displayStrategy}
            </ReactMarkdown>
          </div>
        ) : null}
      </div>
      )}

      {/* Posting Strategy */}
      {feedData.strategy?.posting_schedule && (
        <div className="space-y-4 mt-6">
          <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">When To Post</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {feedData.strategy.posting_schedule.optimalTimes?.map((time: any, idx: number) => (
              <div key={idx} className="bg-stone-50 rounded-xl p-4 space-y-2">
                <div className="text-sm font-medium text-stone-900">{time.day}</div>
                <div className="text-lg font-semibold text-stone-900">{time.time}</div>
                <div className="text-xs text-stone-600">{time.reason}</div>
              </div>
            ))}
          </div>
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <div className="text-xs text-stone-500 mb-2">Posting Frequency</div>
            <div className="text-sm text-stone-700">{feedData.strategy.posting_schedule.frequency}</div>
          </div>
        </div>
      )}

      {/* Content Strategy */}
      {feedData.strategy?.content_pillars && (
        <div className="space-y-4 mt-6">
          <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">
            Content Mix Strategy
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(feedData.strategy.content_pillars).map(([key, value]: any) => (
              <div key={key} className="bg-stone-50 rounded-xl p-4 space-y-2">
                <div className="text-sm font-medium text-stone-900 capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </div>
                <div className="text-xs text-stone-600 leading-relaxed">{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Story Strategy */}
      {feedData.strategy?.caption_templates && Array.isArray(feedData.strategy.caption_templates) && (
        <div className="space-y-4 mt-6">
          <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">
            Story Sequences For Each Post
          </div>
          {feedData.strategy.caption_templates.slice(0, 9).map((story: any, idx: number) => (
            <div key={idx} className="bg-stone-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-stone-900">Post {story.postNumber || idx + 1}</div>
                <div className="text-xs text-stone-500">{story.storyTiming}</div>
              </div>
              <div className="text-xs text-stone-600">{story.storyPurpose}</div>
              <div className="space-y-1.5">
                {story.storySequence?.map((seq: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] font-semibold text-stone-600">{i + 1}</span>
                    </div>
                    <div className="text-xs text-stone-700 leading-relaxed">{seq}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reel Strategy */}
      {feedData.strategy?.content_format_mix?.reels && (
        <div className="space-y-4 mt-6">
          <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">
            Reel Recommendations
          </div>
          {feedData.strategy.content_format_mix.reels.map((reel: any, idx: number) => (
            <div key={idx} className="bg-stone-50 rounded-xl p-4 space-y-3">
              <div className="text-sm font-medium text-stone-900">Post {reel.postNumber} → Reel</div>
              <div className="text-xs text-stone-600 leading-relaxed">{reel.reelConcept}</div>
              <div className="space-y-2">
                <div className="text-[10px] text-stone-500 uppercase tracking-wider">Hook</div>
                <div className="text-xs text-stone-700 font-medium">{reel.hookSuggestion}</div>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] text-stone-500 uppercase tracking-wider">Trending Audio</div>
                <div className="text-xs text-stone-700">{reel.audioRecommendation}</div>
              </div>
              <div className="text-[10px] text-stone-500">{reel.coverPhotoTips}</div>
            </div>
          ))}
        </div>
      )}

      {/* Carousel Strategy */}
      {feedData.strategy?.content_format_mix?.carousels && (
        <div className="space-y-4 mt-6">
          <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">Carousel Ideas</div>
          {feedData.strategy.content_format_mix.carousels.map((carousel: any, idx: number) => (
            <div key={idx} className="bg-stone-50 rounded-xl p-4 space-y-3">
              <div className="text-sm font-medium text-stone-900">Post {carousel.postNumber} → Carousel</div>
              <div className="text-xs text-stone-600 leading-relaxed">{carousel.carouselIdea}</div>
              <div className="space-y-1.5">
                {carousel.slideBreakdown?.map((slide: string, i: number) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-stone-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] font-semibold text-stone-600">{i + 1}</span>
                    </div>
                    <div className="text-xs text-stone-700">{slide}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Growth Tactics */}
      {feedData.strategy?.growth_tactics && (
        <div className="space-y-4 mt-6">
          <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">Growth Tactics</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(feedData.strategy.growth_tactics).map(([key, tactics]: any) => (
              <div key={key} className="bg-stone-50 rounded-xl p-4 space-y-3">
                <div className="text-sm font-medium text-stone-900 capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </div>
                <div className="space-y-1.5">
                  {tactics.map((tactic: string, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-stone-400 flex-shrink-0 mt-1.5" />
                      <div className="text-xs text-stone-600 leading-relaxed">{tactic}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hashtag Strategy */}
      {feedData.strategy?.hashtag_strategy && (
        <div className="space-y-4 mt-6">
          <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">Hashtag Strategy</div>
          <div className="bg-stone-50 rounded-xl p-4 space-y-4">
            <div>
              <div className="text-xs text-stone-500 mb-2">Main Hashtags (Use on every post)</div>
              <div className="flex flex-wrap gap-2">
                {feedData.strategy.hashtag_strategy.mainHashtags?.map((tag: string, i: number) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 bg-white border border-stone-200 text-stone-700 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs text-stone-500 mb-2">Rotating Hashtags (Vary by post)</div>
              <div className="flex flex-wrap gap-2">
                {feedData.strategy.hashtag_strategy.rotatingHashtags?.map((tag: string, i: number) => (
                  <span key={i} className="px-3 py-1.5 bg-stone-100 text-stone-600 text-xs rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-xs text-stone-600 pt-2 border-t border-stone-200">
              💡 {feedData.strategy.hashtag_strategy.hashtagPlacement}
            </div>
          </div>
        </div>
      )}

      {/* Trending Strategy */}
      {feedData.strategy?.content_format_mix?.trends && (
        <div className="bg-stone-50 rounded-xl p-6 space-y-4 mt-6">
          <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">Trend Strategy</div>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-stone-500 mb-1">When to Use Trends</div>
              <div className="text-sm text-stone-700 leading-relaxed">
                {feedData.strategy.content_format_mix.trends.whenToUseTrends}
              </div>
            </div>
            <div>
              <div className="text-xs text-stone-500 mb-1">Trending Audio</div>
              <div className="text-sm text-stone-700">
                {feedData.strategy.content_format_mix.trends.trendingAudio?.join(", ")}
              </div>
            </div>
            <div>
              <div className="text-xs text-stone-500 mb-1">Brand Alignment</div>
              <div className="text-sm text-stone-700 leading-relaxed">
                {feedData.strategy.content_format_mix.trends.personalBrandAlignment}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid Pattern */}
      <div className="bg-stone-50 rounded-xl p-4 space-y-3 mt-6">
        <div className="text-xs tracking-[0.2em] uppercase font-medium text-stone-500">Grid Pattern</div>
        <div className="text-sm font-light text-stone-700">{feedData.feed.layout_type || "Balanced Mix"}</div>
        <div className="text-sm font-light text-stone-600 leading-relaxed">
          {feedData.feed.visual_rhythm || "Dynamic flow with varied composition"}
        </div>
      </div>
    </div>
  )
}

