"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, Send, Calendar } from "lucide-react"

interface DailyDrop {
  id: string
  date: string
  reel_content: any
  caption_content: any
  stories_content: any
  layout_ideas: any
  created_at: string
}

export function DailyDropsClient() {
  const [todayDrop, setTodayDrop] = useState<DailyDrop | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    fetchTodayDrop()
  }, [])

  const fetchTodayDrop = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/ai/daily-drops", {
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      })
      if (!response.ok) {
        const errorText = await response.text()
        console.error("Failed to fetch daily drop:", errorText)
        return
      }
      const data = await response.json()
      setTodayDrop(data.drop)
    } catch (error) {
      console.error("Error fetching daily drop:", error)
    } finally {
      setLoading(false)
    }
  }

  const runPipeline = async () => {
    try {
      setRunning(true)
      const response = await fetch("/api/admin/pipelines/run", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          steps: [
            {
              agent: "DailyContentAgent",
              input: { type: "reel", topic: "personal branding and visibility" },
            },
            {
              agent: "DailyContentAgent",
              input: { type: "caption", topic: "personal branding", contentType: "reel" },
            },
            {
              agent: "DailyContentAgent",
              input: { type: "story" },
            },
            {
              agent: "FeedDesignerAgent",
              input: { action: "generateLayoutIdeas", params: { count: 5, style: "editorial_luxury" } },
            },
          ],
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.ok) {
          // Refresh the drop
          await fetchTodayDrop()
        } else {
          alert(`Pipeline failed: ${result.failedAt}`)
        }
      } else {
        alert("Failed to run pipeline")
      }
    } catch (error) {
      console.error("Error running pipeline:", error)
      alert("Error running pipeline")
    } finally {
      setRunning(false)
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
              Daily Drops
            </h1>
            <p className="text-stone-600 text-sm md:text-base">
              Today's generated content ready to post
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={runPipeline}
              disabled={running}
              className="bg-stone-950 text-white hover:bg-stone-800"
            >
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Run Again
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Today's Content */}
        {todayDrop ? (
          <div className="grid gap-6 md:grid-cols-2">
            {/* Reel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Reel
                </CardTitle>
                <CardDescription>{todayDrop.date}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {todayDrop.reel_content && (
                  <>
                    <div>
                      <h3 className="font-semibold text-sm mb-2">Title</h3>
                      <p className="text-sm text-stone-600">{todayDrop.reel_content.title}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm mb-2">Hook</h3>
                      <p className="text-sm text-stone-600">{todayDrop.reel_content.hook}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm mb-2">Script</h3>
                      <p className="text-sm text-stone-600 whitespace-pre-wrap">
                        {todayDrop.reel_content.script}
                      </p>
                    </div>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => alert("Send to Instagram Planner - Coming soon")}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send to Instagram Planner
                </Button>
              </CardContent>
            </Card>

            {/* Caption */}
            <Card>
              <CardHeader>
                <CardTitle>Caption</CardTitle>
                <CardDescription>{todayDrop.date}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {todayDrop.caption_content && (
                  <>
                    <div>
                      <h3 className="font-semibold text-sm mb-2">Caption</h3>
                      <p className="text-sm text-stone-600 whitespace-pre-wrap">
                        {todayDrop.caption_content.caption}
                      </p>
                    </div>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => alert("Send to Instagram Planner - Coming soon")}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send to Instagram Planner
                </Button>
              </CardContent>
            </Card>

            {/* Stories */}
            <Card>
              <CardHeader>
                <CardTitle>Stories</CardTitle>
                <CardDescription>{todayDrop.date}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {todayDrop.stories_content && (
                  <>
                    <div>
                      <h3 className="font-semibold text-sm mb-2">Title</h3>
                      <p className="text-sm text-stone-600">{todayDrop.stories_content.title}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm mb-2">Script</h3>
                      <p className="text-sm text-stone-600 whitespace-pre-wrap">
                        {todayDrop.stories_content.script}
                      </p>
                    </div>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => alert("Send to Instagram Planner - Coming soon")}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send to Instagram Planner
                </Button>
              </CardContent>
            </Card>

            {/* Layout Ideas */}
            <Card>
              <CardHeader>
                <CardTitle>Feed Layout</CardTitle>
                <CardDescription>{todayDrop.date}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {todayDrop.layout_ideas && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">Layout Ideas</h3>
                    <pre className="text-xs text-stone-600 whitespace-pre-wrap bg-stone-50 p-3 rounded">
                      {JSON.stringify(todayDrop.layout_ideas, null, 2)}
                    </pre>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => alert("Send to Instagram Planner - Coming soon")}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send to Instagram Planner
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-stone-600 mb-4">No daily drop generated for today yet.</p>
              <Button onClick={runPipeline} disabled={running}>
                {running ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generate Today's Content
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

