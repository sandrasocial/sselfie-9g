"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedExp, setSelectedExp] = useState<string | null>(null)
  const [expData, setExpData] = useState<any>(null)
  const [evaluating, setEvaluating] = useState(false)

  useEffect(() => {
    fetchExperiments()
  }, [])

  const fetchExperiments = async () => {
    try {
      // Mock data for now - in production, fetch from /api/experiments
      setExperiments([
        {
          slug: "blueprint_experience",
          name: "Blueprint Landing Page Test",
          status: "active",
          traffic_split: { A: 0.5, B: 0.5 },
          winning_variant: null,
          last_evaluated_at: new Date().toISOString(),
        },
      ])
      setLoading(false)
    } catch (error) {
      console.error("Error fetching experiments:", error)
      setLoading(false)
    }
  }

  const fetchExperimentData = async (slug: string) => {
    try {
      const response = await fetch(`/api/experiments/${slug}`)
      const data = await response.json()
      setExpData(data)
    } catch (error) {
      console.error("Error fetching experiment data:", error)
    }
  }

  const handleSelectExperiment = (slug: string) => {
    setSelectedExp(slug)
    fetchExperimentData(slug)
  }

  const handleEvaluate = async () => {
    if (!selectedExp) return

    setEvaluating(true)
    try {
      const response = await fetch(`/api/experiments/${selectedExp}/evaluate`, {
        method: "POST",
      })
      const result = await response.json()

      alert(
        `Evaluation complete!\nWinner: ${result.winner || "None (equal)"}\nNew split: A=${result.newSplit.A * 100}%, B=${result.newSplit.B * 100}%`,
      )

      // Refresh data
      await fetchExperiments()
      await fetchExperimentData(selectedExp)
    } catch (error) {
      console.error("Error evaluating experiment:", error)
      alert("Failed to evaluate experiment")
    } finally {
      setEvaluating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-950" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 px-8 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl text-stone-950">Experiment Manager</h1>
            <p className="text-sm text-stone-600 mt-2">A/B test performance and adaptive traffic allocation</p>
          </div>
          <Link
            href="/admin/automation-center"
            className="px-6 py-3 bg-stone-950 text-white text-sm tracking-wider uppercase hover:bg-stone-800 transition-colors font-light"
          >
            Back
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Experiments List */}
          <div className="bg-white border border-stone-200 p-6">
            <h2 className="font-serif text-xl mb-4 text-stone-950">Active Experiments</h2>
            <div className="space-y-3">
              {experiments.map((exp) => (
                <button
                  key={exp.slug}
                  onClick={() => handleSelectExperiment(exp.slug)}
                  className={`w-full text-left p-4 border transition-all ${
                    selectedExp === exp.slug
                      ? "border-stone-950 bg-stone-50"
                      : "border-stone-200 hover:border-stone-400"
                  }`}
                >
                  <div className="text-sm font-medium text-stone-950">{exp.name}</div>
                  <div className="text-xs text-stone-500 mt-1">
                    Split: A {(exp.traffic_split.A * 100).toFixed(0)}% / B {(exp.traffic_split.B * 100).toFixed(0)}%
                  </div>
                  {exp.winning_variant && (
                    <div className="text-xs text-stone-700 mt-1 font-medium">Winner: {exp.winning_variant}</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Experiment Details */}
          <div className="md:col-span-2 bg-white border border-stone-200 p-6">
            {!selectedExp ? (
              <div className="text-center text-stone-500 py-12">Select an experiment to view details</div>
            ) : !expData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-stone-950" />
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-serif text-2xl text-stone-950">{expData.experiment.name}</h2>
                  <button
                    onClick={handleEvaluate}
                    disabled={evaluating}
                    className="px-6 py-2 bg-stone-950 text-white text-xs tracking-wider uppercase hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {evaluating ? "Evaluating..." : "Run Evaluation Now"}
                  </button>
                </div>

                <div className="mb-6 p-4 bg-stone-50 border border-stone-200">
                  <div className="text-xs text-stone-600 mb-1">Current Traffic Split</div>
                  <div className="text-sm font-medium text-stone-950">
                    A: {(expData.experiment.traffic_split.A * 100).toFixed(0)}% / B:{" "}
                    {(expData.experiment.traffic_split.B * 100).toFixed(0)}%
                  </div>
                  {expData.experiment.winning_variant && (
                    <div className="text-xs text-stone-700 mt-2">
                      Winning Variant: <span className="font-medium">{expData.experiment.winning_variant}</span>
                    </div>
                  )}
                </div>

                {/* Performance Table */}
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200">
                      <th className="text-left py-3 px-4 text-xs font-medium text-stone-600 uppercase tracking-wider">
                        Metric
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-stone-600 uppercase tracking-wider">
                        A
                      </th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-stone-600 uppercase tracking-wider">
                        B
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-stone-100">
                      <td className="py-3 px-4 text-sm text-stone-700">Views</td>
                      <td className="py-3 px-4 text-center text-sm text-stone-950 font-medium">
                        {expData.performance.A.views}
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-stone-950 font-medium">
                        {expData.performance.B.views}
                      </td>
                    </tr>
                    <tr className="border-b border-stone-100">
                      <td className="py-3 px-4 text-sm text-stone-700">Submits</td>
                      <td className="py-3 px-4 text-center text-sm text-stone-950 font-medium">
                        {expData.performance.A.submits}
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-stone-950 font-medium">
                        {expData.performance.B.submits}
                      </td>
                    </tr>
                    <tr className="border-b border-stone-100">
                      <td className="py-3 px-4 text-sm text-stone-700">Conversions</td>
                      <td className="py-3 px-4 text-center text-sm text-stone-950 font-medium">
                        {expData.performance.A.conversions}
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-stone-950 font-medium">
                        {expData.performance.B.conversions}
                      </td>
                    </tr>
                    <tr className="border-b border-stone-100">
                      <td className="py-3 px-4 text-sm text-stone-700">Submit Rate</td>
                      <td className="py-3 px-4 text-center text-sm text-stone-950 font-medium">
                        {expData.performance.A.submitRate}
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-stone-950 font-medium">
                        {expData.performance.B.submitRate}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4 text-sm text-stone-700">Conversion Rate</td>
                      <td className="py-3 px-4 text-center text-sm text-stone-950 font-medium">
                        {expData.performance.A.conversionRate}
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-stone-950 font-medium">
                        {expData.performance.B.conversionRate}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
