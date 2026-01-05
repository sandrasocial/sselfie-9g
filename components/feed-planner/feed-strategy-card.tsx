"use client"

import { useState } from "react"
import { Plus, FileText } from "lucide-react"
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
    <div className="bg-white/50 backdrop-blur-3xl border border-white/60 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl shadow-stone-900/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-stone-900 rounded-full flex items-center justify-center flex-shrink-0">
            <FileText size={20} className="text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-serif text-lg sm:text-xl font-extralight tracking-[0.15em] text-stone-900 uppercase">
              Feed Strategy
            </h3>
            <p className="text-xs text-stone-500">Comprehensive Instagram strategy document</p>
          </div>
        </div>
      </div>

      {/* Strategy Preview (Markdown) */}
      <div className="mb-4 max-h-96 overflow-y-auto prose prose-stone prose-sm max-w-none">
        <div className="text-sm text-stone-700 leading-relaxed">
          <ReactMarkdown
            components={{
              h1: ({ node, ...props }) => <h1 className="text-lg font-semibold text-stone-900 mt-4 mb-2" {...props} />,
              h2: ({ node, ...props }) => <h2 className="text-base font-semibold text-stone-900 mt-3 mb-2" {...props} />,
              h3: ({ node, ...props }) => <h3 className="text-sm font-semibold text-stone-900 mt-2 mb-1" {...props} />,
              p: ({ node, ...props }) => <p className="mb-2 text-stone-700" {...props} />,
              ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
              ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
              li: ({ node, ...props }) => <li className="text-stone-700" {...props} />,
              strong: ({ node, ...props }) => <strong className="font-semibold text-stone-900" {...props} />,
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
        className="w-full py-2.5 sm:py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors text-xs sm:text-sm font-medium tracking-wide uppercase flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus size={14} strokeWidth={2} />
        <span>{isAdding ? "Adding..." : "Add to Feed"}</span>
      </button>
    </div>
  )
}






