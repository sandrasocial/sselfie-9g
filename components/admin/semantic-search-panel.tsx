"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface SearchResult {
  id: string
  score: number
  metadata: {
    contentId?: number
    competitorId?: number
    contentType?: string
    engagementRate?: number
    messageId?: number
    chatId?: number
  }
}

interface SemanticSearchPanelProps {
  onInsertResult: (text: string) => void
}

export function SemanticSearchPanel({ onInsertResult }: SemanticSearchPanelProps) {
  const [query, setQuery] = useState("")
  const [searchType, setSearchType] = useState<"competitors" | "campaigns">("competitors")
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [indexing, setIndexing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const response = await fetch("/api/admin/agent/semantic-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          namespace: searchType === "competitors" ? "competitor:content" : "user:campaigns",
          limit: 10,
        }),
      })

      const data = await response.json()
      
      if (data.message) {
        setMessage(data.message)
      }
      
      if (data.error && !data.results) {
        setError(data.error)
        setResults([])
      } else {
        setResults(data.results || [])
      }
    } catch (error) {
      console.error("[v0] Search error:", error)
      setError("Failed to perform search. Please try again.")
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleIndexContent = async () => {
    setIndexing(true)
    try {
      const response = await fetch("/api/admin/agent/index-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: searchType }),
      })

      const data = await response.json()
      alert(`Indexed ${data.indexed} items successfully!`)
    } catch (error) {
      console.error("[v0] Indexing error:", error)
      alert("Failed to index content")
    } finally {
      setIndexing(false)
    }
  }

  return (
    <div className="bg-stone-50 border-b border-stone-200 p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h3
            className="text-sm uppercase tracking-wider text-stone-900"
            style={{ fontFamily: "'Times New Roman', serif", letterSpacing: "0.2em" }}
          >
            SEMANTIC SEARCH
          </h3>
          <Button
            onClick={handleIndexContent}
            disabled={indexing}
            className="bg-stone-900 text-stone-50 hover:bg-stone-800 text-xs uppercase tracking-wider"
          >
            {indexing ? "INDEXING..." : "INDEX NEW CONTENT"}
          </Button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSearchType("competitors")}
            className={`px-4 py-2 text-xs uppercase tracking-wider transition-colors ${
              searchType === "competitors"
                ? "bg-stone-900 text-stone-50"
                : "bg-stone-200 text-stone-700 hover:bg-stone-300"
            }`}
          >
            COMPETITORS
          </button>
          <button
            onClick={() => setSearchType("campaigns")}
            className={`px-4 py-2 text-xs uppercase tracking-wider transition-colors ${
              searchType === "campaigns"
                ? "bg-stone-900 text-stone-50"
                : "bg-stone-200 text-stone-700 hover:bg-stone-300"
            }`}
          >
            PAST CAMPAIGNS
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search for similar content..."
            className="flex-1 px-4 py-3 bg-white border border-stone-300 text-stone-900 text-sm focus:outline-none focus:border-stone-500"
          />
          <Button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="bg-stone-900 text-stone-50 hover:bg-stone-800 px-6 text-xs uppercase tracking-wider"
          >
            {loading ? "SEARCHING..." : "SEARCH"}
          </Button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        
        {message && (
          <div className="bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
            {message}
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div
                key={index}
                className="bg-white border border-stone-200 p-4 hover:border-stone-400 transition-colors cursor-pointer"
                onClick={() => {
                  onInsertResult(
                    `Found similar content (${Math.round(result.score * 100)}% match): ${JSON.stringify(result.metadata)}`,
                  )
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider text-stone-500">
                    {result.metadata.contentType || "Campaign"}
                  </span>
                  <span className="text-xs text-stone-900 font-medium">{Math.round(result.score * 100)}% MATCH</span>
                </div>
                <p className="text-sm text-stone-700">
                  {result.metadata.engagementRate && <span>Engagement: {result.metadata.engagementRate}% • </span>}
                  Click to insert into chat
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
