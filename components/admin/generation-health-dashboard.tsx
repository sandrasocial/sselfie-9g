"use client"

import { useState } from "react"
import useSWR from "swr"
import Link from "next/link"
import { AdminNav } from "./admin-nav"
import { AdminLoadingState, AdminMetricCard } from "./shared"
import { formatAdminDate } from "@/lib/admin/format-utils"
import { RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react"

type GenerationHealthResponse = {
  now: string
  feedPosts: {
    stuckOver15m: number
    stuckOver60m: number
    inconsistentCompleted: number
    oldestPending: Array<any>
  }
  aiImages: {
    stuckOver15m: number
    stuckOver60m: number
    oldestPending: Array<any>
  }
  proPhotoshoot: {
    stuckOver15m: number
    stuckOver60m: number
    oldestPending: Array<any>
  }
  recommendations: string[]
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

async function postJson(url: string, body?: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body || {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = String(data?.error || data?.details || `Request failed (${res.status})`)
    throw new Error(msg)
  }
  return data
}

export function GenerationHealthDashboard() {
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const { data, error, isLoading, mutate, isValidating } = useSWR<GenerationHealthResponse>(
    "/api/admin/generation/health?limit=50",
    fetcher,
    { refreshInterval: 0 },
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <AdminNav />
        <AdminLoadingState message="Loading generation health..." fullScreen={false} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-stone-50">
        <AdminNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="bg-white border border-stone-200 p-6 rounded-none">
            <h1 className="font-['Times_New_Roman'] text-2xl sm:text-3xl font-extralight tracking-[0.2em] uppercase text-stone-950">
              GENERATION HEALTH
            </h1>
            <p className="text-xs text-stone-500 tracking-[0.1em] uppercase mt-2">Failed to load report.</p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => mutate()}
                className="inline-flex items-center justify-center gap-2 bg-stone-950 text-white px-4 py-3 text-xs tracking-[0.2em] uppercase hover:bg-stone-800 transition-colors rounded-none"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <Link
                href="/admin"
                className="inline-flex items-center justify-center border border-stone-200 bg-white px-4 py-3 text-xs tracking-[0.2em] uppercase text-stone-700 hover:bg-stone-50 transition-colors rounded-none"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const reportTime = data.now ? new Date(data.now) : new Date()
  const problemCount =
    Number(data.feedPosts.stuckOver15m || 0) + Number(data.feedPosts.stuckOver60m || 0) + Number(data.feedPosts.inconsistentCompleted || 0)
  const isOk = problemCount === 0

  const runReconcile = async () => {
    setActionMessage(null)
    setActionLoading(true)
    try {
      const result = await postJson("/api/admin/generation/reconcile-feed-posts", { limit: 25, minAgeMinutes: 2 })
      const s = result?.summary
      setActionMessage(
        `Reconcile complete. Scanned ${Number(s?.scanned || 0)}. Completed ${Number(s?.completed || 0)}. Failed ${Number(s?.failed || 0)}. Still processing ${Number(s?.stillProcessing || 0)}. Errors ${Number(s?.errors || 0)}.`,
      )
      await mutate()
    } catch (e: any) {
      setActionMessage(`Reconcile failed: ${String(e?.message || e)}`)
    } finally {
      setActionLoading(false)
    }
  }

  const runReconcileAiImages = async () => {
    setActionMessage(null)
    setActionLoading(true)
    try {
      const result = await postJson("/api/admin/generation/reconcile-ai-images", { limit: 25, minAgeMinutes: 2 })
      const s = result?.summary
      setActionMessage(
        `AI Images reconcile complete. Scanned ${Number(s?.scanned || 0)}. Completed ${Number(s?.completed || 0)}. Failed ${Number(s?.failed || 0)}. Still processing ${Number(s?.stillProcessing || 0)}. Errors ${Number(s?.errors || 0)}.`,
      )
      await mutate()
    } catch (e: any) {
      setActionMessage(`AI Images reconcile failed: ${String(e?.message || e)}`)
    } finally {
      setActionLoading(false)
    }
  }

  const runReconcileProPhotoshoot = async () => {
    setActionMessage(null)
    setActionLoading(true)
    try {
      const result = await postJson("/api/admin/generation/reconcile-pro-photoshoot-grids", { limit: 6, minAgeMinutes: 2 })
      const s = result?.summary
      setActionMessage(
        `Pro Photoshoot reconcile complete. Scanned ${Number(s?.scanned || 0)}. Completed ${Number(s?.completed || 0)}. Failed ${Number(s?.failed || 0)}. Still processing ${Number(s?.stillProcessing || 0)}. Frames created ${Number(s?.framesCreated || 0)}. Errors ${Number(s?.errors || 0)}.`,
      )
      await mutate()
    } catch (e: any) {
      setActionMessage(`Pro Photoshoot reconcile failed: ${String(e?.message || e)}`)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-10 sm:mb-14">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h1 className="font-['Times_New_Roman'] text-3xl sm:text-4xl lg:text-5xl font-extralight tracking-[0.2em] sm:tracking-[0.3em] uppercase text-stone-950 mb-3 sm:mb-4">
                GENERATION HEALTH
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 tracking-[0.1em] uppercase">
                {formatAdminDate(reportTime, "full")} • Last updated {formatAdminDate(reportTime, "time")}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => mutate()}
                className="inline-flex items-center justify-center gap-2 bg-stone-950 text-white px-4 py-3 text-xs tracking-[0.2em] uppercase hover:bg-stone-800 transition-colors rounded-none disabled:opacity-60"
                disabled={isValidating}
              >
                <RefreshCw className="w-4 h-4" />
                {isValidating ? "Refreshing" : "Refresh"}
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            {isOk ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-600" aria-hidden="true" />
                <p className="text-[10px] sm:text-xs tracking-[0.15em] uppercase text-stone-600">Status: OK</p>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />
                <p className="text-[10px] sm:text-xs tracking-[0.15em] uppercase text-stone-600">Status: NEEDS ATTENTION</p>
              </>
            )}
          </div>
        </div>

        <div className="bg-white border border-stone-200 p-6 rounded-none mb-10 sm:mb-14">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
                OPERATIONS
              </h2>
              <p className="text-[10px] tracking-[0.15em] uppercase text-stone-400 mt-2">
                Reconcile finalizes pending feed post generations. It does not create new generations.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={runReconcile}
                disabled={actionLoading}
                className="inline-flex items-center justify-center gap-2 bg-stone-950 text-white px-4 py-3 text-xs tracking-[0.2em] uppercase hover:bg-stone-800 transition-colors rounded-none disabled:opacity-60"
              >
                Run Reconcile
              </button>
              <button
                onClick={runReconcileAiImages}
                disabled={actionLoading}
                className="inline-flex items-center justify-center gap-2 border border-stone-200 bg-white px-4 py-3 text-xs tracking-[0.2em] uppercase text-stone-700 hover:bg-stone-50 transition-colors rounded-none disabled:opacity-60"
              >
                Reconcile AI Images
              </button>
              <button
                onClick={runReconcileProPhotoshoot}
                disabled={actionLoading}
                className="inline-flex items-center justify-center gap-2 border border-stone-200 bg-white px-4 py-3 text-xs tracking-[0.2em] uppercase text-stone-700 hover:bg-stone-50 transition-colors rounded-none disabled:opacity-60"
              >
                Reconcile Pro Photoshoot
              </button>
            </div>
          </div>
          {actionMessage && (
            <div className="mt-4 border border-stone-200 bg-stone-50 p-4 rounded-none">
              <p className="text-xs text-stone-700 leading-relaxed">{actionMessage}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10 sm:mb-14">
          <AdminMetricCard
            label="Stuck (15m+)"
            value={data.feedPosts.stuckOver15m || 0}
            variant={data.feedPosts.stuckOver15m > 0 ? "primary" : "default"}
            subtitle="pending/generating + prediction_id"
            source="feed_posts"
          />
          <AdminMetricCard
            label="Stuck (60m+)"
            value={data.feedPosts.stuckOver60m || 0}
            subtitle="oldest backlog"
            source="feed_posts"
          />
          <AdminMetricCard
            label="Inconsistent Completed"
            value={data.feedPosts.inconsistentCompleted || 0}
            subtitle="image_url present but status not completed"
            source="feed_posts"
          />
          <AdminMetricCard
            label="Oldest Pending (Sample)"
            value={data.feedPosts.oldestPending.length || 0}
            subtitle="oldest rows returned"
            source="feed_posts"
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10 sm:mb-14">
          <AdminMetricCard
            label="AI Images Stuck (15m+)"
            value={data.aiImages.stuckOver15m || 0}
            variant={data.aiImages.stuckOver15m > 0 ? "primary" : "default"}
            subtitle="prediction_id + empty image_url"
            source="ai_images"
          />
          <AdminMetricCard
            label="AI Images Stuck (60m+)"
            value={data.aiImages.stuckOver60m || 0}
            subtitle="oldest backlog"
            source="ai_images"
          />
          <AdminMetricCard
            label="AI Images Pending (Sample)"
            value={data.aiImages.oldestPending.length || 0}
            subtitle="oldest rows returned"
            source="ai_images"
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10 sm:mb-14">
          <AdminMetricCard
            label="Pro Grids Stuck (15m+)"
            value={data.proPhotoshoot.stuckOver15m || 0}
            variant={data.proPhotoshoot.stuckOver15m > 0 ? "primary" : "default"}
            subtitle="prediction_id + missing grid_url"
            source="pro_photoshoot_grids"
          />
          <AdminMetricCard
            label="Pro Grids Stuck (60m+)"
            value={data.proPhotoshoot.stuckOver60m || 0}
            subtitle="oldest backlog"
            source="pro_photoshoot_grids"
          />
          <AdminMetricCard
            label="Pro Grids Pending (Sample)"
            value={data.proPhotoshoot.oldestPending.length || 0}
            subtitle="oldest rows returned"
            source="pro_photoshoot_grids"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-stone-200 p-6 rounded-none">
            <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
              OLDEST PENDING
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="py-2 pr-4 text-[10px] tracking-[0.2em] uppercase text-stone-500">Post</th>
                    <th className="py-2 pr-4 text-[10px] tracking-[0.2em] uppercase text-stone-500">Status</th>
                    <th className="py-2 pr-4 text-[10px] tracking-[0.2em] uppercase text-stone-500">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.feedPosts.oldestPending || []).slice(0, 20).map((row: any) => (
                    <tr key={row.id} className="border-b border-stone-100">
                      <td className="py-2 pr-4 text-xs text-stone-900 whitespace-nowrap">
                        {row.feed_layout_id} / {row.position}
                      </td>
                      <td className="py-2 pr-4 text-xs text-stone-700 whitespace-nowrap">{row.generation_status || "pending"}</td>
                      <td className="py-2 pr-4 text-xs text-stone-700 whitespace-nowrap">
                        {formatAdminDate(row.updated_at, "relative")}
                      </td>
                    </tr>
                  ))}
                  {(data.feedPosts.oldestPending || []).length === 0 && (
                    <tr>
                      <td className="py-3 text-xs text-stone-600" colSpan={3}>
                        No pending generations found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-stone-200 p-6 rounded-none">
            <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
              AI IMAGES PENDING
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="py-2 pr-4 text-[10px] tracking-[0.2em] uppercase text-stone-500">Image</th>
                    <th className="py-2 pr-4 text-[10px] tracking-[0.2em] uppercase text-stone-500">Status</th>
                    <th className="py-2 pr-4 text-[10px] tracking-[0.2em] uppercase text-stone-500">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.aiImages.oldestPending || []).slice(0, 20).map((row: any) => (
                    <tr key={row.id} className="border-b border-stone-100">
                      <td className="py-2 pr-4 text-xs text-stone-900 whitespace-nowrap">
                        {row.source || "unknown"} / {row.id}
                      </td>
                      <td className="py-2 pr-4 text-xs text-stone-700 whitespace-nowrap">
                        {row.generation_status || "generating"}
                      </td>
                      <td className="py-2 pr-4 text-xs text-stone-700 whitespace-nowrap">
                        {formatAdminDate(row.created_at, "relative")}
                      </td>
                    </tr>
                  ))}
                  {(data.aiImages.oldestPending || []).length === 0 && (
                    <tr>
                      <td className="py-3 text-xs text-stone-600" colSpan={3}>
                        No pending AI images found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-stone-200 p-6 rounded-none">
            <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
              PRO GRIDS PENDING
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="py-2 pr-4 text-[10px] tracking-[0.2em] uppercase text-stone-500">Grid</th>
                    <th className="py-2 pr-4 text-[10px] tracking-[0.2em] uppercase text-stone-500">Status</th>
                    <th className="py-2 pr-4 text-[10px] tracking-[0.2em] uppercase text-stone-500">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.proPhotoshoot.oldestPending || []).slice(0, 20).map((row: any) => (
                    <tr key={row.id} className="border-b border-stone-100">
                      <td className="py-2 pr-4 text-xs text-stone-900 whitespace-nowrap">
                        {row.session_id} / {row.grid_number}
                      </td>
                      <td className="py-2 pr-4 text-xs text-stone-700 whitespace-nowrap">
                        {row.generation_status || "generating"}
                      </td>
                      <td className="py-2 pr-4 text-xs text-stone-700 whitespace-nowrap">
                        {formatAdminDate(row.updated_at, "relative")}
                      </td>
                    </tr>
                  ))}
                  {(data.proPhotoshoot.oldestPending || []).length === 0 && (
                    <tr>
                      <td className="py-3 text-xs text-stone-600" colSpan={3}>
                        No pending Pro Photoshoot grids found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white border border-stone-200 p-6 rounded-none">
            <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">
              RECOMMENDATIONS
            </h2>
            {data.recommendations.length === 0 ? (
              <p className="text-xs text-stone-600">No recommendations.</p>
            ) : (
              <ul className="space-y-2">
                {data.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-xs text-stone-700 leading-relaxed">
                    {rec}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
