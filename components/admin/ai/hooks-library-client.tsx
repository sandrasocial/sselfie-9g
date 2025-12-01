"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Search, RefreshCw } from "lucide-react"

interface Hook {
  id: string
  hook_text: string
  category?: string
  framework?: string
  performance_score?: number
  created_at: string
}

export function HooksLibraryClient() {
  const [hooks, setHooks] = useState<Hook[]>([])
  const [filteredHooks, setFilteredHooks] = useState<Hook[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    fetchHooks()
  }, [])

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredHooks(hooks)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredHooks(
        hooks.filter(
          (hook) =>
            hook.hook_text.toLowerCase().includes(query) ||
            hook.category?.toLowerCase().includes(query) ||
            hook.framework?.toLowerCase().includes(query),
        ),
      )
    }
  }, [searchQuery, hooks])

  const fetchHooks = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/ai/hooks", {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      })
      if (!response.ok) {
        const errorText = await response.text()
        console.error("Failed to fetch hooks:", errorText)
        return
      }
      const data = await response.json()
      setHooks(data.hooks || [])
      setFilteredHooks(data.hooks || [])
    } catch (error) {
      console.error("Error fetching hooks:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateMoreHooks = async () => {
    try {
      setGenerating(true)
      const response = await fetch("/api/admin/pipelines/run", {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          steps: [
            {
              agent: "FeedOptimizerPipeline",
              input: {
                userId: "admin",
                feedData: {},
              },
            },
          ],
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          // Refresh hooks
          await fetchHooks()
        } else {
          alert(`Pipeline failed: ${result.failedAt}`)
        }
      } else {
        // Try alternative: use DailyContentAgent directly
        const altResponse = await fetch("/api/admin/agents/run", {
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agent: "DailyContentAgent",
            input: {
              type: "hook",
              topic: "personal branding",
            },
          }),
        })

        if (altResponse.ok) {
          await fetchHooks()
        } else {
          alert("Failed to generate hooks")
        }
      }
    } catch (error) {
      console.error("Error generating hooks:", error)
      alert("Error generating hooks")
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-stone-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-['Times_New_Roman'] text-3xl md:text-4xl font-extralight tracking-[0.3em] uppercase text-stone-950 mb-2">
              Hooks Library
            </h1>
            <p className="text-stone-600 text-sm md:text-base">
              {hooks.length} scroll-stopping hooks ready to use
            </p>
          </div>
          <Button
            onClick={generateMoreHooks}
            disabled={generating}
            className="bg-stone-950 text-white hover:bg-stone-800"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Generate 10 More Hooks
              </>
            )}
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 w-5 h-5" />
          <Input
            placeholder="Search hooks by text, category, or framework..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Hooks Grid */}
        {filteredHooks.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredHooks.map((hook) => (
              <Card key={hook.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-base">{hook.hook_text}</CardTitle>
                  <CardDescription>
                    {hook.category && <span className="mr-2">{hook.category}</span>}
                    {hook.framework && <span className="text-xs">({hook.framework})</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {hook.performance_score && (
                    <div className="text-xs text-stone-500">
                      Performance: {hook.performance_score}%
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-stone-600 mb-4">
                {searchQuery ? "No hooks match your search." : "No hooks in library yet."}
              </p>
              {!searchQuery && (
                <Button onClick={generateMoreHooks} disabled={generating}>
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Generate 50 Hooks
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

