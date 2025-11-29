"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function NewSequencePage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleCreateSequence = async () => {
    if (!name.trim()) {
      setError("Name is required")
      return
    }

    try {
      setLoading(true)
      setError("")

      const response = await fetch("/api/sequences/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      })

      const data = await response.json()

      if (data.success && data.sequenceId) {
        router.push(`/admin/sequences/${data.sequenceId}`)
      } else {
        setError(data.error || "Failed to create sequence")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="font-['Times_New_Roman'] text-4xl font-extralight tracking-[0.3em] uppercase text-stone-950">
            New Sequence
          </h1>
          <p className="text-sm text-stone-600 mt-2">Create a new email sequence</p>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-stone-200">
          <div className="space-y-6">
            <div>
              <label className="block text-sm uppercase tracking-wider text-stone-700 mb-2">Sequence Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Welcome Series, Nurture Campaign"
                className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
            </div>

            <div>
              <label className="block text-sm uppercase tracking-wider text-stone-700 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this sequence..."
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-300 resize-none"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex gap-4 justify-end pt-4">
              <button
                onClick={() => router.push("/admin/sequences")}
                className="px-6 py-3 bg-white border border-stone-200 text-stone-950 rounded-xl text-sm tracking-wider uppercase hover:bg-stone-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSequence}
                disabled={loading}
                className="px-6 py-3 bg-stone-950 text-white rounded-xl text-sm tracking-wider uppercase hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Sequence
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
