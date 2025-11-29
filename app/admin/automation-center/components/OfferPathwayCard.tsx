"use client"

import { useEffect, useState } from "react"

interface OfferPathwayData {
  subscriberId: number
  currentRecommendation: string | null
  confidence: number | null
  offerSequence: string[]
  lastComputedAt: string | null
}

export function OfferPathwayCard() {
  const [data, setData] = useState<OfferPathwayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [recomputing, setRecomputing] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch("/api/admin/offer-pathway-summary")
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error("Error fetching offer pathway data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleRecompute = async (subscriberId: number) => {
    setRecomputing(true)
    try {
      const response = await fetch("/api/offer/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriber_id: subscriberId }),
      })
      const result = await response.json()
      alert(`Recomputed: ${result.recommendation} (confidence: ${Math.round((result.confidence || 0) * 100)}%)`)
      fetchData()
    } catch (error) {
      console.error("Error recomputing pathway:", error)
      alert("Error recomputing pathway")
    } finally {
      setRecomputing(false)
    }
  }

  if (loading) {
    return (
      <div className="border border-stone-300 bg-white p-6 font-serif">
        <h2 className="mb-4 font-['Times_New_Roman'] text-xl font-light tracking-wide text-stone-950">
          Offer Pathway Intelligence
        </h2>
        <p className="font-light text-stone-600">Loading...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="border border-stone-300 bg-white p-6 font-serif">
        <h2 className="mb-4 font-['Times_New_Roman'] text-xl font-light tracking-wide text-stone-950">
          Offer Pathway Intelligence
        </h2>
        <p className="font-light text-stone-600">No data available</p>
      </div>
    )
  }

  return (
    <div className="border border-stone-300 bg-white p-6 font-serif">
      <h2 className="mb-4 font-['Times_New_Roman'] text-xl font-light tracking-wide text-stone-950">
        Offer Pathway Intelligence
      </h2>

      <div className="space-y-4">
        <div>
          <p className="mb-1 text-sm font-light text-stone-500">Current Recommendation</p>
          <p className="font-['Times_New_Roman'] text-lg font-light text-stone-950">
            {data.currentRecommendation || "Not computed"}
          </p>
        </div>

        {data.confidence !== null && (
          <div>
            <p className="mb-1 text-sm font-light text-stone-500">Confidence</p>
            <p className="font-['Times_New_Roman'] text-lg font-light text-stone-950">
              {Math.round(data.confidence * 100)}%
            </p>
          </div>
        )}

        {data.offerSequence.length > 0 && (
          <div>
            <p className="mb-1 text-sm font-light text-stone-500">Offer Sequence</p>
            <p className="font-['Times_New_Roman'] text-sm font-light text-stone-700">
              {data.offerSequence.join(" → ")}
            </p>
          </div>
        )}

        {data.lastComputedAt && (
          <div>
            <p className="mb-1 text-sm font-light text-stone-500">Last Computed</p>
            <p className="text-sm font-light text-stone-700">
              {new Date(data.lastComputedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        )}

        <button
          onClick={() => handleRecompute(data.subscriberId)}
          disabled={recomputing}
          className="mt-4 border border-stone-950 bg-stone-950 px-4 py-2 font-['Times_New_Roman'] text-sm font-light text-white transition-colors hover:bg-stone-800 disabled:opacity-50"
        >
          {recomputing ? "Recomputing..." : "Recompute Pathway"}
        </button>
      </div>
    </div>
  )
}
