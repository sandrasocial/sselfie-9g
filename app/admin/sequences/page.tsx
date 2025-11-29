"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import Link from "next/link"

interface Sequence {
  id: string
  name: string
  description: string | null
  step_count: number
  created_at: string
  updated_at: string
}

export default function AdminSequencesPage() {
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSequences()
  }, [])

  const fetchSequences = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/sequences/list")
      const data = await response.json()
      if (data.sequences) {
        setSequences(data.sequences)
      }
    } catch (error) {
      console.error("Error fetching sequences:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-['Times_New_Roman'] text-4xl font-extralight tracking-[0.3em] uppercase text-stone-950">
              Sequences
            </h1>
            <p className="text-sm text-stone-600 mt-2">Build and manage email sequences with AI assistance</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/admin/sequences/new"
              className="px-6 py-3 bg-stone-950 text-white rounded-xl text-sm tracking-wider uppercase hover:bg-stone-800 transition-colors"
            >
              Create New Sequence
            </Link>
            <Link
              href="/admin"
              className="px-6 py-3 bg-white border border-stone-200 text-stone-950 rounded-xl text-sm tracking-wider uppercase hover:bg-stone-50 transition-colors"
            >
              Back to Admin
            </Link>
          </div>
        </div>

        {sequences.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-stone-200 text-center">
            <p className="text-stone-500 mb-6">No sequences yet</p>
            <Link
              href="/admin/sequences/new"
              className="inline-block px-6 py-3 bg-stone-950 text-white rounded-xl text-sm tracking-wider uppercase hover:bg-stone-800 transition-colors"
            >
              Create Your First Sequence
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left px-6 py-4 text-xs uppercase tracking-wider text-stone-600">Name</th>
                  <th className="text-left px-6 py-4 text-xs uppercase tracking-wider text-stone-600">Steps</th>
                  <th className="text-left px-6 py-4 text-xs uppercase tracking-wider text-stone-600">Last Updated</th>
                  <th className="text-right px-6 py-4 text-xs uppercase tracking-wider text-stone-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {sequences.map((sequence) => (
                  <tr key={sequence.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm text-stone-950">{sequence.name}</div>
                        {sequence.description && (
                          <div className="text-xs text-stone-500 mt-1">{sequence.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-stone-700">{sequence.step_count} steps</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-stone-600">
                        {new Date(sequence.updated_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/sequences/${sequence.id}`}
                        className="inline-block px-4 py-2 bg-stone-950 text-white rounded-lg text-xs hover:bg-stone-800 transition-colors uppercase tracking-wider"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
