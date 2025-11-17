"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

interface Story {
  id: number
  story_type: string
  title: string
  content: string
  is_active: boolean
  created_at: string
}

interface WritingSample {
  id: number
  content_type: string
  sample_text: string
  context: string
  performance_score: number
  created_at: string
}

export function PersonalKnowledgeManager() {
  const [stories, setStories] = useState<Story[]>([])
  const [samples, setSamples] = useState<WritingSample[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"stories" | "samples">("stories")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const { toast } = useToast()

  const [storyForm, setStoryForm] = useState({
    story_type: "origin",
    title: "",
    content: "",
  })

  const [sampleForm, setSampleForm] = useState({
    content_type: "email",
    sample_text: "",
    context: "",
    performance_score: 0.8,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch("/api/admin/personal-knowledge")
      const data = await response.json()
      setStories(data.stories || [])
      setSamples(data.samples || [])
    } catch (error) {
      console.error("Error fetching personal knowledge:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitStory = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const method = editingId ? "PUT" : "POST"
      const body = editingId
        ? { type: "story", id: editingId, data: storyForm }
        : { type: "story", data: storyForm }

      const response = await fetch("/api/admin/personal-knowledge", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        await fetchData()
        setShowForm(false)
        setEditingId(null)
        setStoryForm({ story_type: "origin", title: "", content: "" })
        toast({ title: editingId ? "Story updated" : "Story added" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save story", variant: "destructive" })
    }
  }

  const handleSubmitSample = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const method = editingId ? "PUT" : "POST"
      const body = editingId
        ? { type: "sample", id: editingId, data: sampleForm }
        : { type: "sample", data: sampleForm }

      const response = await fetch("/api/admin/personal-knowledge", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        await fetchData()
        setShowForm(false)
        setEditingId(null)
        setSampleForm({ content_type: "email", sample_text: "", context: "", performance_score: 0.8 })
        toast({ title: editingId ? "Sample updated" : "Sample added" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save sample", variant: "destructive" })
    }
  }

  const handleDelete = async (type: "story" | "sample", id: number) => {
    if (!confirm("Are you sure you want to delete this?")) return

    try {
      await fetch(`/api/admin/personal-knowledge?type=${type}&id=${id}`, { method: "DELETE" })
      await fetchData()
      toast({ title: "Deleted successfully" })
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" })
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading personal knowledge...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2
          className="text-3xl font-extralight uppercase text-stone-950"
          style={{ fontFamily: "'Times New Roman', serif", letterSpacing: "0.2em" }}
        >
          PERSONAL KNOWLEDGE
        </h2>
        <button
          onClick={() => {
            setShowForm(!showForm)
            setEditingId(null)
            if (activeTab === "stories") {
              setStoryForm({ story_type: "origin", title: "", content: "" })
            } else {
              setSampleForm({ content_type: "email", sample_text: "", context: "", performance_score: 0.8 })
            }
          }}
          className="bg-stone-950 text-white px-6 py-2 rounded-lg text-sm uppercase"
          style={{ letterSpacing: "0.1em" }}
        >
          {showForm ? "CANCEL" : `ADD ${activeTab === "stories" ? "STORY" : "SAMPLE"}`}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setActiveTab("stories")
            setShowForm(false)
          }}
          className={`px-4 py-2 text-sm uppercase rounded-lg transition-colors ${
            activeTab === "stories"
              ? "bg-stone-950 text-white"
              : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
          }`}
          style={{ letterSpacing: "0.1em" }}
        >
          YOUR STORY ({stories.length})
        </button>
        <button
          onClick={() => {
            setActiveTab("samples")
            setShowForm(false)
          }}
          className={`px-4 py-2 text-sm uppercase rounded-lg transition-colors ${
            activeTab === "samples"
              ? "bg-stone-950 text-white"
              : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
          }`}
          style={{ letterSpacing: "0.1em" }}
        >
          WRITING SAMPLES ({samples.length})
        </button>
      </div>

      {/* Forms */}
      {showForm && activeTab === "stories" && (
        <form onSubmit={handleSubmitStory} className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4">
          <div>
            <label className="block text-xs uppercase text-stone-600 mb-2" style={{ letterSpacing: "0.1em" }}>
              Story Type
            </label>
            <select
              value={storyForm.story_type}
              onChange={(e) => setStoryForm({ ...storyForm, story_type: e.target.value })}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg"
            >
              <option value="origin">Origin Story</option>
              <option value="journey">Journey</option>
              <option value="daily_life">Daily Life</option>
              <option value="values">Values & Mission</option>
              <option value="struggles">Struggles & Challenges</option>
              <option value="wins">Wins & Successes</option>
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase text-stone-600 mb-2" style={{ letterSpacing: "0.1em" }}>
              Title
            </label>
            <input
              type="text"
              value={storyForm.title}
              onChange={(e) => setStoryForm({ ...storyForm, title: e.target.value })}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg"
              placeholder="e.g., How I Started SSELFIE"
              required
            />
          </div>

          <div>
            <label className="block text-xs uppercase text-stone-600 mb-2" style={{ letterSpacing: "0.1em" }}>
              Your Story
            </label>
            <textarea
              value={storyForm.content}
              onChange={(e) => setStoryForm({ ...storyForm, content: e.target.value })}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg min-h-[200px]"
              placeholder="Tell your story in your own words..."
              required
            />
          </div>

          <button
            type="submit"
            className="bg-stone-950 text-white px-8 py-3 rounded-lg text-sm uppercase w-full"
            style={{ letterSpacing: "0.1em" }}
          >
            {editingId ? "UPDATE" : "ADD"} STORY
          </button>
        </form>
      )}

      {showForm && activeTab === "samples" && (
        <form onSubmit={handleSubmitSample} className="bg-white p-6 rounded-2xl border border-stone-200 space-y-4">
          <div>
            <label className="block text-xs uppercase text-stone-600 mb-2" style={{ letterSpacing: "0.1em" }}>
              Content Type
            </label>
            <select
              value={sampleForm.content_type}
              onChange={(e) => setSampleForm({ ...sampleForm, content_type: e.target.value })}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg"
            >
              <option value="email">Email</option>
              <option value="caption">Instagram Caption</option>
              <option value="newsletter">Newsletter</option>
              <option value="dm">Direct Message</option>
              <option value="announcement">Announcement</option>
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase text-stone-600 mb-2" style={{ letterSpacing: "0.1em" }}>
              Writing Sample
            </label>
            <textarea
              value={sampleForm.sample_text}
              onChange={(e) => setSampleForm({ ...sampleForm, sample_text: e.target.value })}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg min-h-[200px]"
              placeholder="Paste your actual writing here (email, caption, etc.)"
              required
            />
          </div>

          <div>
            <label className="block text-xs uppercase text-stone-600 mb-2" style={{ letterSpacing: "0.1em" }}>
              Context
            </label>
            <input
              type="text"
              value={sampleForm.context}
              onChange={(e) => setSampleForm({ ...sampleForm, context: e.target.value })}
              className="w-full px-4 py-2 border border-stone-300 rounded-lg"
              placeholder="e.g., Welcome email for new beta users"
            />
          </div>

          <div>
            <label className="block text-xs uppercase text-stone-600 mb-2" style={{ letterSpacing: "0.1em" }}>
              Performance Score: {Math.round(sampleForm.performance_score * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={sampleForm.performance_score}
              onChange={(e) => setSampleForm({ ...sampleForm, performance_score: parseFloat(e.target.value) })}
              className="w-full"
            />
            <p className="text-xs text-stone-500 mt-1">How well did this perform? (engagement, conversions, etc.)</p>
          </div>

          <button
            type="submit"
            className="bg-stone-950 text-white px-8 py-3 rounded-lg text-sm uppercase w-full"
            style={{ letterSpacing: "0.1em" }}
          >
            {editingId ? "UPDATE" : "ADD"} SAMPLE
          </button>
        </form>
      )}

      {/* Content Display */}
      {activeTab === "stories" && (
        <div className="space-y-4">
          {stories.map((story) => (
            <div key={story.id} className="bg-white p-6 rounded-2xl border border-stone-200">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-xs uppercase bg-stone-100 px-3 py-1 rounded-full text-stone-700">
                    {story.story_type.replace("_", " ")}
                  </span>
                  <h3 className="text-lg font-medium text-stone-950 mt-2">{story.title}</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setStoryForm({
                        story_type: story.story_type,
                        title: story.title,
                        content: story.content,
                      })
                      setEditingId(story.id)
                      setShowForm(true)
                    }}
                    className="text-sm text-stone-600 hover:text-stone-950 uppercase"
                    style={{ letterSpacing: "0.1em" }}
                  >
                    EDIT
                  </button>
                  <button
                    onClick={() => handleDelete("story", story.id)}
                    className="text-sm text-red-600 hover:text-red-800 uppercase"
                    style={{ letterSpacing: "0.1em" }}
                  >
                    DELETE
                  </button>
                </div>
              </div>
              <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">{story.content}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === "samples" && (
        <div className="space-y-4">
          {samples.map((sample) => (
            <div key={sample.id} className="bg-white p-6 rounded-2xl border border-stone-200">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex gap-2 mb-2">
                    <span className="text-xs uppercase bg-stone-100 px-3 py-1 rounded-full text-stone-700">
                      {sample.content_type}
                    </span>
                    <span className="text-xs uppercase bg-green-100 px-3 py-1 rounded-full text-green-700">
                      {Math.round(sample.performance_score * 100)}% performance
                    </span>
                  </div>
                  {sample.context && <p className="text-sm text-stone-600 italic">{sample.context}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSampleForm({
                        content_type: sample.content_type,
                        sample_text: sample.sample_text,
                        context: sample.context,
                        performance_score: sample.performance_score,
                      })
                      setEditingId(sample.id)
                      setShowForm(true)
                    }}
                    className="text-sm text-stone-600 hover:text-stone-950 uppercase"
                    style={{ letterSpacing: "0.1em" }}
                  >
                    EDIT
                  </button>
                  <button
                    onClick={() => handleDelete("sample", sample.id)}
                    className="text-sm text-red-600 hover:text-red-800 uppercase"
                    style={{ letterSpacing: "0.1em" }}
                  >
                    DELETE
                  </button>
                </div>
              </div>
              <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">{sample.sample_text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
