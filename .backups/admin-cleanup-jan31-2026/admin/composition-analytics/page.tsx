"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown, Loader2, RefreshCw } from "lucide-react"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface CompositionMetrics {
  avgDiversityScore: number
  componentReuseRate: number
  conceptsGenerated: number
  compositionSuccessRate: number
  diversityTrend: number
  reuseTrend: number
  successTrend: number
  conceptsTrend: number
  // Part 5 Success Metrics
  similarityScore: number
  poseRepetitionRate: number
  locationRepetitionRate: number
  avgPromptLength: number
  technicalSpecsRate: number
  lightingDetailsRate: number
  brandIntegrationRate: number
  conceptApprovalRate: number
  regenerationRequests: number
}

interface SuccessMetrics {
  diversity: {
    avgSimilarityScore: number
    avgPoseRepetitionRate: number
    avgLocationRepetitionRate: number
    avgComponentReuseRate: number
  }
  quality: {
    avgPromptLength: number
    technicalSpecsRate: number
    lightingDetailsRate: number
    brandIntegrationRate: number
    detailLevelDistribution: Record<string, number>
  }
  userExperience: {
    avgApprovalRate: number
    totalRegenerationRequests: number
    avgTimeToFirstGeneration: number
  }
}

interface ComponentUsage {
  componentId: string
  componentType: string
  usageCount: number
  category: string
}

interface DiversityDistribution {
  poseTypes: Array<{ name: string; count: number }>
  locationTypes: Array<{ name: string; count: number }>
  lightingTypes: Array<{ name: string; count: number }>
}

interface RecentBatch {
  id: string
  timestamp: string
  category: string
  count: number
  avgDiversityScore: number
  components: string[]
}

const COLORS = ['#1c1917', '#78716c', '#a8a29e', '#d6d3d1', '#e7e5e4', '#f5f5f4']

export default function CompositionAnalyticsPage() {
  const [metrics, setMetrics] = useState<CompositionMetrics | null>(null)
  const [componentUsage, setComponentUsage] = useState<ComponentUsage[]>([])
  const [diversityDistribution, setDiversityDistribution] = useState<DiversityDistribution | null>(null)
  const [recentBatches, setRecentBatches] = useState<RecentBatch[]>([])
  const [successMetrics, setSuccessMetrics] = useState<SuccessMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch("/api/admin/composition-analytics")
      if (response.ok) {
        const data = await response.json()
        setMetrics(data.metrics)
        setComponentUsage(data.componentUsage || [])
        setDiversityDistribution(data.diversityDistribution)
        setRecentBatches(data.recentBatches || [])
        setSuccessMetrics(data.successMetrics || null)
      }
    } catch (error) {
      console.error("[Analytics] Error fetching data:", error)
    } finally {
      setLoading(false)
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
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-xs md:text-sm text-stone-600 hover:text-stone-950 mb-3 md:mb-4 transition-colors"
            >
              <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" />
              Back to Admin
            </Link>
            <h1 className="font-['Times_New_Roman'] text-2xl md:text-4xl font-extralight tracking-[0.3em] uppercase text-stone-950">
              Composition Analytics
            </h1>
            <p className="text-xs md:text-sm text-stone-600 mt-2">
              Monitor composition system performance and diversity metrics
            </p>
          </div>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-stone-950 text-white rounded-lg hover:bg-stone-800 transition-colors flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <MetricCard
            title="Avg Diversity Score"
            value={metrics?.avgDiversityScore.toFixed(2) || "0.00"}
            trend={metrics?.diversityTrend || 0}
            description="Target: >0.65"
            goodThreshold={0.65}
          />
          <MetricCard
            title="Component Reuse Rate"
            value={`${metrics?.componentReuseRate.toFixed(1) || "0.0"}x`}
            trend={metrics?.reuseTrend || 0}
            description="Target: <2.0x"
            goodThreshold={2.0}
            lowerIsBetter
          />
          <MetricCard
            title="Concepts Generated"
            value={metrics?.conceptsGenerated.toLocaleString() || "0"}
            trend={metrics?.conceptsTrend || 0}
            description="Last 7 days"
          />
          <MetricCard
            title="Composition Success Rate"
            value={`${metrics?.compositionSuccessRate.toFixed(0) || "0"}%`}
            trend={metrics?.successTrend || 0}
            description="Target: >85%"
            goodThreshold={85}
          />
        </div>

        {/* Component Usage Heatmap */}
        <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-stone-200 shadow-lg mb-6 md:mb-8">
          <h2 className="font-['Times_New_Roman'] text-lg md:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4 md:mb-6">
            Component Usage
          </h2>
          <ComponentUsageHeatmap data={componentUsage} />
        </div>

        {/* Diversity Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-stone-200 shadow-lg">
            <h2 className="font-['Times_New_Roman'] text-lg md:text-xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4 md:mb-6">
              Pose Type Distribution
            </h2>
            <PoseDistributionChart data={diversityDistribution?.poseTypes || []} />
          </div>
          <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-stone-200 shadow-lg">
            <h2 className="font-['Times_New_Roman'] text-lg md:text-xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4 md:mb-6">
              Location Type Distribution
            </h2>
            <LocationDistributionChart data={diversityDistribution?.locationTypes || []} />
          </div>
        </div>

        {/* Lighting Distribution */}
        <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-stone-200 shadow-lg mb-6 md:mb-8">
          <h2 className="font-['Times_New_Roman'] text-lg md:text-xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4 md:mb-6">
            Lighting Type Distribution
          </h2>
          <LightingDistributionChart data={diversityDistribution?.lightingTypes || []} />
        </div>

        {/* Part 5: Success Metrics */}
        {successMetrics && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            {/* Diversity Metrics */}
            <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-stone-200 shadow-lg">
              <h2 className="font-['Times_New_Roman'] text-lg md:text-xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4 md:mb-6">
                Diversity Metrics
              </h2>
              <div className="space-y-4">
                <MetricRow
                  label="Similarity Score"
                  value={successMetrics.diversity.avgSimilarityScore.toFixed(2)}
                  target="<0.3"
                  isGood={successMetrics.diversity.avgSimilarityScore < 0.3}
                />
                <MetricRow
                  label="Pose Repetition"
                  value={`${successMetrics.diversity.avgPoseRepetitionRate.toFixed(1)}%`}
                  target="<20%"
                  isGood={successMetrics.diversity.avgPoseRepetitionRate < 20}
                />
                <MetricRow
                  label="Location Repetition"
                  value={`${successMetrics.diversity.avgLocationRepetitionRate.toFixed(1)}%`}
                  target="<30%"
                  isGood={successMetrics.diversity.avgLocationRepetitionRate < 30}
                />
                <MetricRow
                  label="Component Reuse"
                  value={`${(successMetrics.diversity.avgComponentReuseRate * 100).toFixed(1)}%`}
                  target=">80%"
                  isGood={successMetrics.diversity.avgComponentReuseRate > 0.8}
                />
              </div>
            </div>

            {/* Quality Metrics */}
            <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-stone-200 shadow-lg">
              <h2 className="font-['Times_New_Roman'] text-lg md:text-xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4 md:mb-6">
                Quality Metrics
              </h2>
              <div className="space-y-4">
                <MetricRow
                  label="Avg Prompt Length"
                  value={`${successMetrics.quality.avgPromptLength.toFixed(0)} words`}
                  target="150-250"
                  isGood={successMetrics.quality.avgPromptLength >= 150 && successMetrics.quality.avgPromptLength <= 250}
                />
                <MetricRow
                  label="Technical Specs"
                  value={`${successMetrics.quality.technicalSpecsRate.toFixed(0)}%`}
                  target="100%"
                  isGood={successMetrics.quality.technicalSpecsRate === 100}
                />
                <MetricRow
                  label="Lighting Details"
                  value={`${successMetrics.quality.lightingDetailsRate.toFixed(0)}%`}
                  target="100%"
                  isGood={successMetrics.quality.lightingDetailsRate === 100}
                />
                <MetricRow
                  label="Brand Integration"
                  value={`${successMetrics.quality.brandIntegrationRate.toFixed(0)}%`}
                  target=">50%"
                  isGood={successMetrics.quality.brandIntegrationRate > 50}
                />
                <div className="pt-2 border-t border-stone-200">
                  <p className="text-xs text-stone-600 mb-2">Detail Level Distribution</p>
                  {Object.entries(successMetrics.quality.detailLevelDistribution).map(([level, count]) => (
                    <div key={level} className="flex items-center justify-between text-sm mb-1">
                      <span className="capitalize text-stone-700">{level}</span>
                      <span className="font-medium text-stone-950">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* User Experience Metrics */}
            <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-stone-200 shadow-lg">
              <h2 className="font-['Times_New_Roman'] text-lg md:text-xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4 md:mb-6">
                User Experience
              </h2>
              <div className="space-y-4">
                <MetricRow
                  label="Approval Rate"
                  value={`${successMetrics.userExperience.avgApprovalRate.toFixed(1)}%`}
                  target=">60%"
                  isGood={successMetrics.userExperience.avgApprovalRate > 60}
                />
                <MetricRow
                  label="Regeneration Requests"
                  value={successMetrics.userExperience.totalRegenerationRequests.toString()}
                  target="<10%"
                  isGood={successMetrics.userExperience.totalRegenerationRequests < 10}
                  lowerIsBetter
                />
                <MetricRow
                  label="Time to First Gen"
                  value={`${successMetrics.userExperience.avgTimeToFirstGeneration.toFixed(1)}s`}
                  target="<30s"
                  isGood={successMetrics.userExperience.avgTimeToFirstGeneration < 30}
                  lowerIsBetter
                />
              </div>
            </div>
          </div>
        )}

        {/* Recent Batches */}
        <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-stone-200 shadow-lg">
          <h2 className="font-['Times_New_Roman'] text-lg md:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4 md:mb-6">
            Recent Concept Batches
          </h2>
          <RecentBatchesTable batches={recentBatches} />
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  trend,
  description,
  goodThreshold,
  lowerIsBetter = false,
}: {
  title: string
  value: string
  trend: number
  description: string
  goodThreshold?: number
  lowerIsBetter?: boolean
}) {
  const isGood = goodThreshold
    ? lowerIsBetter
      ? parseFloat(value.replace(/[^0-9.]/g, "")) < goodThreshold
      : parseFloat(value.replace(/[^0-9.]/g, "")) >= goodThreshold
    : true

  const trendColor = trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-stone-600"
  const TrendIcon = trend > 0 ? TrendingUp : TrendingDown

  return (
    <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 border border-stone-200 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] md:text-sm text-stone-600 uppercase tracking-wider">{title}</p>
        {trend !== 0 && (
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="w-3 h-3 md:w-4 md:h-4" />
            <span className="text-xs md:text-sm font-medium">{Math.abs(trend).toFixed(2)}</span>
          </div>
        )}
      </div>
      <p className={`text-2xl md:text-3xl font-['Times_New_Roman'] font-extralight text-stone-950 mb-1 ${!isGood ? "text-amber-600" : ""}`}>
        {value}
      </p>
      <p className="text-[10px] md:text-xs text-stone-500">{description}</p>
    </div>
  )
}

function ComponentUsageHeatmap({ data }: { data: ComponentUsage[] }) {
  // Group by component type
  const byType = data.reduce((acc, item) => {
    if (!acc[item.componentType]) {
      acc[item.componentType] = []
    }
    acc[item.componentType].push(item)
    return acc
  }, {} as Record<string, ComponentUsage[]>)

  // Get top 10 most used components
  const topComponents = data
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 10)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(byType).map(([type, items]) => {
          const totalUsage = items.reduce((sum, item) => sum + item.usageCount, 0)
          const avgUsage = totalUsage / items.length
          const maxUsage = Math.max(...items.map((i) => i.usageCount))

          return (
            <div key={type} className="p-4 bg-stone-50 rounded-lg border border-stone-200">
              <p className="text-xs uppercase tracking-wider text-stone-600 mb-2">{type}</p>
              <p className="text-2xl font-serif font-extralight text-stone-950">{totalUsage}</p>
              <p className="text-xs text-stone-500 mt-1">Avg: {avgUsage.toFixed(1)}</p>
              <p className="text-xs text-stone-500">Max: {maxUsage}</p>
            </div>
          )
        })}
      </div>

      {topComponents.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-stone-950 mb-3">Top 10 Most Used Components</h3>
          <div className="space-y-2">
            {topComponents.map((component, index) => {
              const maxUsage = Math.max(...data.map((c) => c.usageCount))
              const percentage = (component.usageCount / maxUsage) * 100

              return (
                <div key={component.componentId} className="flex items-center gap-3">
                  <div className="w-8 text-xs text-stone-500">#{index + 1}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-stone-900">{component.componentId}</span>
                      <span className="text-sm font-medium text-stone-950">{component.usageCount}x</span>
                    </div>
                    <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          percentage > 80 ? "bg-red-500" : percentage > 50 ? "bg-amber-500" : "bg-stone-950"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function PoseDistributionChart({ data }: { data: Array<{ name: string; count: number }> }) {
  if (data.length === 0) {
    return <p className="text-sm text-stone-500 text-center py-8">No data available</p>
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis dataKey="name" stroke="#78716c" style={{ fontSize: "12px" }} />
        <YAxis stroke="#78716c" style={{ fontSize: "12px" }} />
        <Tooltip
          contentStyle={{ backgroundColor: "#fff", border: "1px solid #e7e5e4", borderRadius: "8px" }}
        />
        <Bar dataKey="count" fill="#1c1917" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function LocationDistributionChart({ data }: { data: Array<{ name: string; count: number }> }) {
  if (data.length === 0) {
    return <p className="text-sm text-stone-500 text-center py-8">No data available</p>
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="count"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}

function LightingDistributionChart({ data }: { data: Array<{ name: string; count: number }> }) {
  if (data.length === 0) {
    return <p className="text-sm text-stone-500 text-center py-8">No data available</p>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
        <XAxis type="number" stroke="#78716c" style={{ fontSize: "12px" }} />
        <YAxis dataKey="name" type="category" stroke="#78716c" style={{ fontSize: "12px" }} width={100} />
        <Tooltip
          contentStyle={{ backgroundColor: "#fff", border: "1px solid #e7e5e4", borderRadius: "8px" }}
        />
        <Bar dataKey="count" fill="#1c1917" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function MetricRow({
  label,
  value,
  target,
  isGood,
  lowerIsBetter = false,
}: {
  label: string
  value: string
  target: string
  isGood: boolean
  lowerIsBetter?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
      <div>
        <p className="text-sm text-stone-900 font-medium">{label}</p>
        <p className="text-xs text-stone-500">Target: {target}</p>
      </div>
      <div className="text-right">
        <p className={`text-lg font-['Times_New_Roman'] font-extralight ${isGood ? "text-green-600" : "text-amber-600"}`}>
          {value}
        </p>
        {isGood ? (
          <span className="text-xs text-green-600">✓ Good</span>
        ) : (
          <span className="text-xs text-amber-600">⚠ Needs improvement</span>
        )}
      </div>
    </div>
  )
}

function RecentBatchesTable({ batches }: { batches: RecentBatch[] }) {
  if (batches.length === 0) {
    return <p className="text-sm text-stone-500 text-center py-8">No batches yet</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-stone-200">
            <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-stone-600">Timestamp</th>
            <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-stone-600">Category</th>
            <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-stone-600">Count</th>
            <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-stone-600">Diversity</th>
            <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-stone-600">Components</th>
          </tr>
        </thead>
        <tbody>
          {batches.map((batch) => (
            <tr key={batch.id} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
              <td className="py-3 px-4 text-sm text-stone-900">
                {new Date(batch.timestamp).toLocaleString()}
              </td>
              <td className="py-3 px-4 text-sm text-stone-900">
                <span className="px-2 py-1 bg-stone-100 text-stone-700 rounded text-xs uppercase tracking-wider">
                  {batch.category}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-stone-900">{batch.count}</td>
              <td className="py-3 px-4">
                <span
                  className={`text-sm font-medium ${
                    batch.avgDiversityScore >= 0.65 ? "text-green-600" : "text-amber-600"
                  }`}
                >
                  {batch.avgDiversityScore.toFixed(2)}
                </span>
              </td>
              <td className="py-3 px-4 text-sm text-stone-600">{batch.components.length} unique</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
