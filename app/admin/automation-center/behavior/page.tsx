"use client"

import { useEffect, useState } from "react"

interface BehaviorOverview {
  avgScore: number
  distribution: {
    cold: number
    warm: number
    hot: number
    ready: number
  }
  last7Days: number
}

interface Subscriber {
  id: number
  email: string
  name: string
  behavior_loop_score: number
  behavior_loop_stage: string
  last_behavior_loop_at: string
  last_apa_action_at: string | null
}

export default function BehaviorPage() {
  const [overview, setOverview] = useState<BehaviorOverview | null>(null)
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const res = await fetch("/api/admin/behavior-summary")
      const data = await res.json()
      setOverview(data.overview)
      setSubscribers(data.subscribers)
    } catch (error) {
      console.error("Failed to fetch behavior data:", error)
    } finally {
      setLoading(false)
    }
  }

  async function recomputeSubscriber(id: number) {
    try {
      await fetch("/api/behavior-loop/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriber_id: id }),
      })
      fetchData()
    } catch (error) {
      console.error("Failed to recompute behavior loop:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 p-8">
        <p className="font-serif text-stone-950">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <h1 className="mb-8 font-serif text-3xl font-light text-stone-950">Behavior Loop Intelligence</h1>

      {/* Overview Card */}
      {overview && (
        <div className="mb-8 rounded border border-stone-200 bg-white p-6">
          <h2 className="mb-4 font-serif text-xl font-light text-stone-950">Overview</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-light text-stone-500">Average Score</p>
              <p className="font-serif text-2xl text-stone-950">{overview.avgScore}</p>
            </div>
            <div>
              <p className="text-sm font-light text-stone-500">Last 7 Days Changes</p>
              <p className="font-serif text-2xl text-stone-950">
                {overview.last7Days > 0 ? "+" : ""}
                {overview.last7Days}
              </p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm font-light text-stone-500">Cold</p>
              <p className="font-serif text-xl text-stone-950">{overview.distribution.cold}</p>
            </div>
            <div>
              <p className="text-sm font-light text-stone-500">Warm</p>
              <p className="font-serif text-xl text-stone-950">{overview.distribution.warm}</p>
            </div>
            <div>
              <p className="text-sm font-light text-stone-500">Hot</p>
              <p className="font-serif text-xl text-stone-950">{overview.distribution.hot}</p>
            </div>
            <div>
              <p className="text-sm font-light text-stone-500">Ready</p>
              <p className="font-serif text-xl text-stone-950">{overview.distribution.ready}</p>
            </div>
          </div>
        </div>
      )}

      {/* Subscribers Table */}
      <div className="rounded border border-stone-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-200 bg-stone-50">
              <th className="p-4 text-left font-serif text-sm font-light text-stone-950">Subscriber</th>
              <th className="p-4 text-left font-serif text-sm font-light text-stone-950">Score</th>
              <th className="p-4 text-left font-serif text-sm font-light text-stone-950">Stage</th>
              <th className="p-4 text-left font-serif text-sm font-light text-stone-950">Last Activity</th>
              <th className="p-4 text-left font-serif text-sm font-light text-stone-950">Last APA</th>
              <th className="p-4 text-left font-serif text-sm font-light text-stone-950">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((sub, index) => (
              <tr key={sub.id} className={index % 2 === 0 ? "bg-white" : "bg-stone-50"}>
                <td className="p-4">
                  <p className="font-light text-stone-950">{sub.name || "—"}</p>
                  <p className="text-sm text-stone-500">{sub.email}</p>
                </td>
                <td className="p-4 font-serif text-stone-950">{sub.behavior_loop_score}</td>
                <td className="p-4">
                  <span
                    className={`inline-block rounded px-2 py-1 text-xs font-light ${
                      sub.behavior_loop_stage === "ready"
                        ? "bg-green-100 text-green-900"
                        : sub.behavior_loop_stage === "hot"
                          ? "bg-orange-100 text-orange-900"
                          : sub.behavior_loop_stage === "warm"
                            ? "bg-yellow-100 text-yellow-900"
                            : "bg-stone-100 text-stone-900"
                    }`}
                  >
                    {sub.behavior_loop_stage || "—"}
                  </span>
                </td>
                <td className="p-4 text-sm text-stone-500">
                  {sub.last_behavior_loop_at ? new Date(sub.last_behavior_loop_at).toLocaleDateString() : "—"}
                </td>
                <td className="p-4 text-sm text-stone-500">
                  {sub.last_apa_action_at ? new Date(sub.last_apa_action_at).toLocaleDateString() : "—"}
                </td>
                <td className="p-4">
                  <button
                    onClick={() => recomputeSubscriber(sub.id)}
                    className="text-sm font-light text-stone-950 underline hover:text-stone-700"
                  >
                    Recompute
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
