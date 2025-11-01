"use client"

import type React from "react"

import { useState, useEffect } from "react"

interface Competitor {
  id: number
  name: string
  business_type: string
  instagram_handle: string
  website_url: string
  target_audience: string
  unique_selling_points: string
  content_strategy: string
  posting_frequency: string
  engagement_rate: number
  follower_count: number
  notes: string
  analysis_count: number
  last_analysis_date: string
}

interface CompetitorTrackerProps {
  userId: string
}

export function CompetitorTracker({ userId }: CompetitorTrackerProps) {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null)

  useEffect(() => {
    fetchCompetitors()
  }, [userId])

  const fetchCompetitors = async () => {
    try {
      const response = await fetch(`/api/admin/agent/competitors?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setCompetitors(data.competitors || [])
      }
    } catch (error) {
      console.error("Error fetching competitors:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCompetitor = async (formData: any) => {
    try {
      const response = await fetch("/api/admin/agent/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...formData }),
      })

      if (response.ok) {
        await fetchCompetitors()
        setShowAddForm(false)
      }
    } catch (error) {
      console.error("Error adding competitor:", error)
    }
  }

  const handleDeleteCompetitor = async (id: number) => {
    if (!confirm("Are you sure you want to delete this competitor?")) return

    try {
      const response = await fetch(`/api/admin/agent/competitors?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchCompetitors()
      }
    } catch (error) {
      console.error("Error deleting competitor:", error)
    }
  }

  if (loading) {
    return (
      <div className="p-6 bg-stone-50 border border-stone-200 rounded-lg">
        <p className="text-sm text-stone-500">Loading competitors...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3
          className="text-lg font-light uppercase text-stone-900"
          style={{ fontFamily: "'Times New Roman', serif", letterSpacing: "0.2em" }}
        >
          Competitor Tracking
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-stone-900 text-stone-50 text-xs uppercase rounded hover:bg-stone-800 transition-colors"
          style={{ letterSpacing: "0.15em" }}
        >
          {showAddForm ? "Cancel" : "Add Competitor"}
        </button>
      </div>

      {showAddForm && <CompetitorForm onSubmit={handleAddCompetitor} onCancel={() => setShowAddForm(false)} />}

      {competitors.length === 0 ? (
        <div className="p-6 bg-stone-50 border border-stone-200 rounded-lg text-center">
          <p className="text-sm text-stone-500">No competitors tracked yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {competitors.map((competitor) => (
            <div key={competitor.id} className="p-4 bg-stone-50 border border-stone-200 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="text-base font-medium text-stone-900">{competitor.name}</h4>
                  {competitor.instagram_handle && (
                    <p className="text-sm text-stone-600">@{competitor.instagram_handle}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedCompetitor(competitor)}
                    className="text-xs text-stone-600 hover:text-stone-900"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDeleteCompetitor(competitor.id)}
                    className="text-xs text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {competitor.business_type && (
                  <div>
                    <span className="text-stone-500">Type:</span> {competitor.business_type}
                  </div>
                )}
                {competitor.follower_count && (
                  <div>
                    <span className="text-stone-500">Followers:</span> {competitor.follower_count.toLocaleString()}
                  </div>
                )}
                {competitor.engagement_rate && (
                  <div>
                    <span className="text-stone-500">Engagement:</span> {competitor.engagement_rate}%
                  </div>
                )}
                {competitor.analysis_count > 0 && (
                  <div>
                    <span className="text-stone-500">Analyses:</span> {competitor.analysis_count}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedCompetitor && (
        <CompetitorDetailModal competitor={selectedCompetitor} onClose={() => setSelectedCompetitor(null)} />
      )}
    </div>
  )
}

function CompetitorForm({ onSubmit, onCancel }: any) {
  const [formData, setFormData] = useState({
    name: "",
    businessType: "",
    instagramHandle: "",
    websiteUrl: "",
    targetAudience: "",
    uniqueSellingPoints: "",
    contentStrategy: "",
    postingFrequency: "",
    engagementRate: "",
    followerCount: "",
    notes: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white border border-stone-200 rounded-lg space-y-3">
      <div>
        <label className="block text-xs uppercase text-stone-500 mb-1" style={{ letterSpacing: "0.15em" }}>
          Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="w-full p-2 border border-stone-200 rounded text-sm"
        />
      </div>
      <div>
        <label className="block text-xs uppercase text-stone-500 mb-1" style={{ letterSpacing: "0.15em" }}>
          Instagram Handle
        </label>
        <input
          type="text"
          value={formData.instagramHandle}
          onChange={(e) => setFormData({ ...formData, instagramHandle: e.target.value })}
          className="w-full p-2 border border-stone-200 rounded text-sm"
          placeholder="@username"
        />
      </div>
      <div>
        <label className="block text-xs uppercase text-stone-500 mb-1" style={{ letterSpacing: "0.15em" }}>
          Business Type
        </label>
        <input
          type="text"
          value={formData.businessType}
          onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
          className="w-full p-2 border border-stone-200 rounded text-sm"
        />
      </div>
      <div>
        <label className="block text-xs uppercase text-stone-500 mb-1" style={{ letterSpacing: "0.15em" }}>
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full p-2 border border-stone-200 rounded text-sm"
          rows={3}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-stone-900 text-stone-50 text-xs uppercase rounded hover:bg-stone-800"
          style={{ letterSpacing: "0.15em" }}
        >
          Add Competitor
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-stone-200 text-stone-700 text-xs uppercase rounded hover:bg-stone-300"
          style={{ letterSpacing: "0.15em" }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function CompetitorDetailModal({ competitor, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3
            className="text-xl font-light uppercase text-stone-900"
            style={{ fontFamily: "'Times New Roman', serif", letterSpacing: "0.2em" }}
          >
            {competitor.name}
          </h3>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-900">
            Close
          </button>
        </div>
        <div className="space-y-3 text-sm">
          {competitor.instagram_handle && (
            <div>
              <p className="text-xs uppercase text-stone-500 mb-1">Instagram</p>
              <p className="text-stone-900">@{competitor.instagram_handle}</p>
            </div>
          )}
          {competitor.business_type && (
            <div>
              <p className="text-xs uppercase text-stone-500 mb-1">Business Type</p>
              <p className="text-stone-900">{competitor.business_type}</p>
            </div>
          )}
          {competitor.target_audience && (
            <div>
              <p className="text-xs uppercase text-stone-500 mb-1">Target Audience</p>
              <p className="text-stone-900">{competitor.target_audience}</p>
            </div>
          )}
          {competitor.content_strategy && (
            <div>
              <p className="text-xs uppercase text-stone-500 mb-1">Content Strategy</p>
              <p className="text-stone-900">{competitor.content_strategy}</p>
            </div>
          )}
          {competitor.notes && (
            <div>
              <p className="text-xs uppercase text-stone-500 mb-1">Notes</p>
              <p className="text-stone-900">{competitor.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
