"use client"

import { useEffect, useState } from "react"

export default function FunnelHeatmapPage() {
  const [dropOffData, setDropOffData] = useState<any[]>([])
  const [highIntentActions, setHighIntentActions] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFunnelData()
  }, [])

  const loadFunnelData = async () => {
    try {
      setLoading(true)

      // Fetch drop-off points
      const dropOffs = await fetch("/api/funnel/sessions").then((r) => r.json())

      // Calculate drop-off rates by URL
      const urlStats: Record<string, { count: number; avgScroll: number; dropOffs: number }> = {}

      dropOffs.sessions?.forEach((session: any) => {
        const url = "/"
        if (!urlStats[url]) {
          urlStats[url] = { count: 0, avgScroll: 0, dropOffs: 0 }
        }
        urlStats[url].count++
        urlStats[url].avgScroll += session.scroll_depth || 0
        if (!session.blueprint_completed && session.page_count > 1) {
          urlStats[url].dropOffs++
        }
      })

      const dropOffArray = Object.entries(urlStats).map(([url, stats]) => ({
        url,
        visits: stats.count,
        avgScroll: Math.round(stats.avgScroll / stats.count),
        dropOffRate: Math.round((stats.dropOffs / stats.count) * 100),
      }))

      setDropOffData(dropOffArray.sort((a, b) => b.dropOffRate - a.dropOffRate))

      // High-intent actions
      const highIntent = dropOffs.sessions?.filter(
        (s: any) => s.scroll_depth >= 70 || s.blueprint_completed || s.purchased,
      )
      setHighIntentActions(highIntent || [])

      // Recent sessions
      setSessions(dropOffs.sessions?.slice(0, 20) || [])
    } catch (error) {
      console.error("Error loading funnel data:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadSessionEvents = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/funnel/events?session_id=${sessionId}`)
      const data = await response.json()
      setSelectedSession(data)
    } catch (error) {
      console.error("Error loading session events:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <p className="font-serif text-stone-950 text-lg">Loading funnel analytics...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="font-serif text-4xl text-stone-950 font-light mb-2">Funnel Analytics</h1>
          <p className="font-light text-stone-600">High-resolution user journey tracking</p>
        </div>

        {/* Drop-Off Points */}
        <div className="mb-12 bg-white p-8 rounded">
          <h2 className="font-serif text-2xl text-stone-950 font-light mb-6">Top Drop-Off Points</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left font-serif font-light text-stone-950 pb-4">Page</th>
                  <th className="text-left font-serif font-light text-stone-950 pb-4">Visits</th>
                  <th className="text-left font-serif font-light text-stone-950 pb-4">Avg Scroll %</th>
                  <th className="text-left font-serif font-light text-stone-950 pb-4">Drop-Off %</th>
                </tr>
              </thead>
              <tbody>
                {dropOffData.map((item, i) => (
                  <tr key={i} className="border-b border-stone-100">
                    <td className="py-4 font-light text-stone-700">{item.url}</td>
                    <td className="py-4 font-light text-stone-700">{item.visits}</td>
                    <td className="py-4 font-light text-stone-700">{item.avgScroll}%</td>
                    <td className="py-4 font-light text-stone-700">{item.dropOffRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* High-Intent Actions */}
        <div className="mb-12 bg-white p-8 rounded">
          <h2 className="font-serif text-2xl text-stone-950 font-light mb-6">High-Intent Sessions</h2>
          <div className="space-y-3">
            {highIntentActions.slice(0, 10).map((session: any, i: number) => (
              <div key={i} className="flex justify-between items-center py-3 border-b border-stone-100">
                <div>
                  <p className="font-light text-stone-700">{session.email || "Anonymous"}</p>
                  <p className="text-sm font-light text-stone-500">
                    Scroll: {session.scroll_depth}% • Pages: {session.page_count}
                  </p>
                </div>
                <div className="flex gap-2">
                  {session.blueprint_completed && (
                    <span className="text-xs font-light text-stone-600 bg-stone-100 px-2 py-1 rounded">
                      Blueprint ✓
                    </span>
                  )}
                  {session.purchased && (
                    <span className="text-xs font-light text-stone-600 bg-stone-100 px-2 py-1 rounded">
                      Purchased ✓
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Session Explorer */}
        <div className="bg-white p-8 rounded">
          <h2 className="font-serif text-2xl text-stone-950 font-light mb-6">Recent Sessions</h2>
          <div className="space-y-2">
            {sessions.map((session: any, i: number) => (
              <button
                key={i}
                onClick={() => loadSessionEvents(session.session_id)}
                className="w-full text-left p-4 hover:bg-stone-50 rounded transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-light text-stone-700">
                      {session.email || `Session ${session.session_id.slice(0, 8)}`}
                    </p>
                    <p className="text-sm font-light text-stone-500">
                      {new Date(session.first_seen_at).toLocaleDateString()} • {session.page_count} pages
                    </p>
                  </div>
                  <span className="text-stone-400">→</span>
                </div>
              </button>
            ))}
          </div>

          {/* Session Detail Modal */}
          {selectedSession && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-8 z-50">
              <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="font-serif text-2xl text-stone-950 font-light">Session Timeline</h3>
                  <button onClick={() => setSelectedSession(null)} className="text-stone-400 hover:text-stone-600">
                    ✕
                  </button>
                </div>
                <div className="space-y-4">
                  {selectedSession.events?.map((event: any, i: number) => (
                    <div key={i} className="flex gap-4 border-l-2 border-stone-200 pl-4">
                      <div className="flex-1">
                        <p className="font-light text-stone-950">{event.event_name}</p>
                        <p className="text-sm font-light text-stone-500">{event.url}</p>
                        <p className="text-xs font-light text-stone-400">
                          {new Date(event.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
