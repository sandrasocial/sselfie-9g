"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AdminNav } from "@/components/admin/admin-nav"
import { formatAdminDate } from "@/lib/admin/format-utils"

interface AdminError {
  toolName: string
  count: number
  lastSeen: string
  recentErrors: Array<{
    id: number
    error_message: string
    created_at: string
  }>
}

interface AdminErrorsResponse {
  success: boolean
  sinceHours: number
  total: number
  tools: AdminError[]
}

export default function AdminErrorsPage() {
  const [adminErrors, setAdminErrors] = useState<AdminError[]>([])
  const [sinceHours, setSinceHours] = useState(24)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAdminErrors()
  }, [sinceHours])

  const fetchAdminErrors = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/diagnostics/errors?since=${sinceHours}&limit=20`)
      const data: AdminErrorsResponse = await response.json()
      if (data.success) {
        setAdminErrors(data.tools || [])
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error("Error fetching admin errors:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />
      <div className="max-w-6xl mx-auto p-6 sm:p-8">
        <div className="mb-8 sm:mb-12">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-['Times_New_Roman'] text-stone-950 tracking-[0.1em] uppercase mb-2">
                Admin Errors
              </h1>
              <p className="text-xs sm:text-sm text-stone-600">
                Latest system and email errors grouped by tool
              </p>
            </div>
            <Link
              href="/admin"
              className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-600 hover:text-stone-950 transition-colors border-b border-stone-300 pb-1"
            >
              ← Back to Dashboard
            </Link>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <label className="text-xs sm:text-sm text-stone-600">Time Range:</label>
            <select
              value={sinceHours}
              onChange={(e) => setSinceHours(Number(e.target.value))}
              className="text-xs sm:text-sm border border-stone-300 bg-white px-3 py-1.5 rounded-none focus:outline-none focus:ring-1 focus:ring-stone-400"
            >
              <option value={1}>Last Hour</option>
              <option value={24}>Last 24 Hours</option>
              <option value={168}>Last 7 Days</option>
            </select>
            <span className="text-xs sm:text-sm text-stone-500">Total: {total}</span>
          </div>

          {loading ? (
            <div className="bg-white border border-stone-200 p-6 sm:p-8 rounded-none">
              <p className="text-sm text-stone-600">Loading errors...</p>
            </div>
          ) : adminErrors.length === 0 ? (
            <div className="bg-white border border-stone-200 p-6 sm:p-8 rounded-none">
              <p className="text-sm text-stone-600">No errors found for this time range.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {adminErrors.map((error) => (
                <div key={error.toolName} className="bg-white border border-stone-200 p-5 sm:p-6 rounded-none">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm sm:text-base font-medium text-stone-950">{error.toolName}</p>
                      <p className="text-xs text-stone-500">
                        Last seen {formatAdminDate(error.lastSeen, "relative")}
                      </p>
                    </div>
                    <span className="text-xs text-stone-500 bg-stone-100 px-2 py-1">
                      {error.count}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {error.recentErrors.map((recent) => (
                      <div key={recent.id} className="border border-stone-100 p-3 text-xs text-stone-600">
                        <p className="mb-1">{recent.error_message}</p>
                        <p className="text-[10px] text-stone-400">
                          {formatAdminDate(recent.created_at, "relative")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
