"use client"

import { useState } from "react"
import { toast } from "@/hooks/use-toast"
import ReactMarkdown from "react-markdown"

interface FeedStrategyCardProps {
  strategy: string // Markdown formatted strategy
  feedId: number
  onAddToFeed?: () => void
}

export default function FeedStrategyCard({
  strategy,
  feedId,
  onAddToFeed,
}: FeedStrategyCardProps) {
  const [isAdding, setIsAdding] = useState(false)

  const handleAddToFeed = async () => {
    if (onAddToFeed) {
      onAddToFeed()
      return
    }

    setIsAdding(true)
    try {
      const response = await fetch(`/api/feed/${feedId}/add-strategy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to add strategy')
      }

      toast({
        title: "Strategy added!",
        description: "Your feed strategy has been saved",
      })
    } catch (error) {
      console.error("[FeedStrategyCard] Error adding strategy:", error)
      toast({
        title: "Failed to add strategy",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 min-w-10 px-3 bg-[rgba(175,170,162,0.15)] border border-[rgba(195,190,182,0.25)] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="font-['Inter'] text-[10px] uppercase tracking-[0.5em] text-[#8a8780]">Plan</span>
          </div>
          <div>
            <h3 className="font-['Cormorant_Garamond'] text-lg sm:text-xl font-light tracking-[0.15em] text-[#f0ede8] uppercase">
              Feed Strategy
            </h3>
            <p className="text-xs text-[#8a8780]">Comprehensive Instagram strategy document</p>
          </div>
        </div>
      </div>

      {/* Strategy Preview (Markdown) */}
      <div className="mb-4 max-h-96 overflow-y-auto prose prose-sm prose-invert max-w-none">
        <div className="text-sm text-[#a8a49c] leading-relaxed">
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }) => <h1 className="text-lg font-semibold text-[#f0ede8] mt-4 mb-2" {...props} />,
              h2: ({ node, ...props }) => <h2 className="text-base font-semibold text-[#f0ede8] mt-3 mb-2" {...props} />,
              h3: ({ node, ...props }) => <h3 className="text-sm font-semibold text-[#c8c4bb] mt-2 mb-1" {...props} />,
              p: ({ node, ...props }) => <p className="mb-2 text-[#a8a49c]" {...props} />,
              ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
              ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
              li: ({ node, ...props }) => <li className="text-[#a8a49c]" {...props} />,
              strong: ({ node, ...props }) => <strong className="font-semibold text-[#f0ede8]" {...props} />,
              em: ({ node, ...props }) => <em className="italic" {...props} />,
            }}
          >
            {strategy}
          </ReactMarkdown>
        </div>
      </div>

      {/* Add to Feed Button */}
      <button
        onClick={handleAddToFeed}
        disabled={isAdding}
        className="w-full py-2.5 sm:py-3 bg-[#c8c4bb] text-[#0d0c0b] rounded-full hover:bg-[#f0ede8] transition-colors text-xs sm:text-sm font-medium tracking-[0.15em] uppercase disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span>{isAdding ? "Adding..." : "Add to Feed"}</span>
      </button>
    </div>
  )
}






