"use client"

import type React from "react"

import { useState, useEffect } from "react"

interface Knowledge {
  id: number
  knowledge_type: string
  category: string
  title: string
  content: string
  use_cases: string[]
  confidence_level: number
  related_tags: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export function AdminKnowledgeManager() {
  const [knowledge, setKnowledge] = useState<Knowledge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    knowledge_type: "best_practice",
    category: "instagram",
    title: "",
    content: "",
    use_cases: [] as string[],
    confidence_level: 0.8,
    related_tags: [] as string[],
  })

  useEffect(() => {
    fetchKnowledge()
  }, [])

  const fetchKnowledge = async () => {
    try {
      setError(null)
      const response = await fetch("/api/admin/knowledge")
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server returned non-JSON response")
      }
      
      const data = await response.json()
      setKnowledge(data.knowledge || [])
    } catch (error) {
      console.error("[v0] Error fetching knowledge:", error)
      setError(error instanceof Error ? error.message : "Failed to load knowledge base")
      setKnowledge([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingId ? "/api/admin/knowledge" : "/api/admin/knowledge"
      const method = editingId ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ...formData, id: editingId } : formData),
      })

      if (response.ok) {
        await fetchKnowledge()
        setShowForm(false)
        setEditingId(null)
        setFormData({
          knowledge_type: "best_practice",
          category: "instagram",
          title: "",
          content: "",
          use_cases: [],
          confidence_level: 0.8,
          related_tags: [],
        })
      }
    } catch (error) {
      console.error("Error saving knowledge:", error)
    }
  }

  const handleEdit = (item: Knowledge) => {
    setFormData({
      knowledge_type: item.knowledge_type,
      category: item.category,
      title: item.title,
      content: item.content,
      use_cases: item.use_cases || [],
      confidence_level: item.confidence_level,
      related_tags: item.related_tags || [],
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this knowledge item?")) return

    try {
      await fetch(`/api/admin/knowledge?id=${id}`, { method: "DELETE" })
      await fetchKnowledge()
    } catch (error) {
      console.error("Error deleting knowledge:", error)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading knowledge base...</div>
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">Error: {error}</p>
          <button
            onClick={fetchKnowledge}
            className="mt-2 text-sm text-red-600 hover:text-red-800 uppercase"
            style={{ letterSpacing: "0.1em" }}
          >
            RETRY
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2
          className="text-3xl font-extralight uppercase text-stone-950"
          style={{ fontFamily: "'Times New Roman', serif", letterSpacing: "0.2em" }}
        >
          KNOWLEDGE BASE
        </h2>
        <button
          onClick={() => {
            setShowForm(!showForm)
            setEditingId(null)
            setFormData({
              knowledge_type: "best_practice",
              category: "instagram",
              title: "",
              content: "",
              use_cases: [],
              confidence_level: 0.8,
              related_tags: [],
            })
          }}
          className="bg-stone-950 text-white px-6 py-2 rounded-lg text-sm uppercase"
          style={{ letterSpacing: "0.1em" }}
        >
          {showForm ? "CANCEL" : "ADD KNOWLEDGE"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase text-stone-600 mb-2" style={{ letterSpacing: "0.1em" }}>
                Type
              </label>
              <select
                value={formData.knowledge_type}
                onChange={(e) => setFormData({ ...formData, knowledge_type: e.target.value })}
                className="w-full px-4 py-2 border border-stone-300 rounded-lg"
              >
                <option value="best_practice">Best Practice</option>
                <option value="strategy">Strategy</option>
                <option value="content_pattern">Content Pattern</option>
                <option value="template">Template</option>
                <option value="case_study">Case Study</option>
                <option value="industry_insight">Industry Insight</option>
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase text-stone-600 mb-2" style={{ letterSpacing: "0.1em" }}>
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-stone-300 rounded-lg"
              >
                <option value="instagram">Instagram</option>
                <option value="email">Email</option>
                <option value="branding">Branding</option>
                <option value="growth">Growth</option>
                <option value="photography">Photography</option>
                <option value="copywriting">Copywriting</option>
                <option value="general">General</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase text-stone-600 mb-2" style={{ letterSpacing: "0.1em" }}>
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-xs uppercase text-stone-600 mb-2" style={{ letterSpacing: "0.1em" }}>
              Content
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg min-h-[120px]"
              required
            />
          </div>

          <div>
            <label className="block text-xs uppercase text-stone-600 mb-2" style={{ letterSpacing: "0.1em" }}>
              Confidence Level: {Math.round(formData.confidence_level * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={formData.confidence_level}
              onChange={(e) => setFormData({ ...formData, confidence_level: Number.parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          <button
            type="submit"
            className="bg-stone-950 text-white px-8 py-3 rounded-lg text-sm uppercase w-full"
            style={{ letterSpacing: "0.1em" }}
          >
            {editingId ? "UPDATE" : "ADD"} KNOWLEDGE
          </button>
        </form>
      )}

      <div className="space-y-4">
        {knowledge.map((item) => (
          <div key={item.id} className="bg-white p-6 rounded-2xl border border-stone-200">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex gap-2 mb-2">
                  <span className="text-xs uppercase bg-stone-100 px-3 py-1 rounded-full text-stone-700">
                    {item.knowledge_type.replace("_", " ")}
                  </span>
                  <span className="text-xs uppercase bg-stone-100 px-3 py-1 rounded-full text-stone-700">
                    {item.category}
                  </span>
                  <span className="text-xs uppercase bg-stone-100 px-3 py-1 rounded-full text-stone-700">
                    {Math.round(item.confidence_level * 100)}% confidence
                  </span>
                </div>
                <h3 className="text-lg font-medium text-stone-950">{item.title}</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="text-sm text-stone-600 hover:text-stone-950 uppercase"
                  style={{ letterSpacing: "0.1em" }}
                >
                  EDIT
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-sm text-red-600 hover:text-red-800 uppercase"
                  style={{ letterSpacing: "0.1em" }}
                >
                  DELETE
                </button>
              </div>
            </div>
            <p className="text-sm text-stone-700 leading-relaxed">{item.content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
