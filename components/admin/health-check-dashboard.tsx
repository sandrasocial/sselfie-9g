"use client"

import { useState, useEffect } from "react"
import { CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AdminNav } from "./admin-nav"

interface FlowResult {
  status: "ok" | "degraded" | "failed" | "skipped"
  message: string
  duration: number
  details?: Record<string, unknown>
}

interface E2EHealthResult {
  overall: "healthy" | "degraded" | "unhealthy"
  e2eRunId: string
  timestamp: string
  duration: number
  flows: {
    auth: FlowResult
    credits: FlowResult
    classic_generation: FlowResult
    pro_generation: FlowResult
    feed: FlowResult
    cron: FlowResult
  }
}

export function HealthCheckDashboard() {
  const [healthData, setHealthData] = useState<E2EHealthResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHealthData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/admin/health/e2e")

      // Even if status is not OK (503 for unhealthy, etc.), try to parse the response
      // The health check endpoint returns data even when unhealthy
      const data = await response.json()

      // If we got valid health data, use it (even if status was 503)
      if (data.overall && data.flows) {
        setHealthData(data)
        // Only set error if there's an actual error message and no health data structure
        if (!response.ok && data.error && !data.flows) {
          setError(data.message || `Health check returned ${response.status}: ${response.statusText}`)
        }
      } else {
        // No valid health data structure - this is a real error
        throw new Error(data.message || `Health check failed: ${response.statusText}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch health data")
      console.error("Error fetching health data:", err)
    } finally {
      setLoading(false)
    }
  }

  const runHealthCheck = async () => {
    try {
      setRunning(true)
      setError(null)
      const response = await fetch("/api/admin/health/e2e", {
        cache: "no-store",
      })

      // Even if status is not OK (503 for unhealthy, etc.), try to parse the response
      const data = await response.json()

      // If we got valid health data, use it (even if status was 503)
      if (data.overall && data.flows) {
        setHealthData(data)
        // Only set error if there's an actual error message and no health data structure
        if (!response.ok && data.error && !data.flows) {
          setError(data.message || `Health check returned ${response.status}: ${response.statusText}`)
        }
      } else {
        // No valid health data structure - this is a real error
        throw new Error(data.message || `Health check failed: ${response.statusText}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run health check")
      console.error("Error running health check:", err)
    } finally {
      setRunning(false)
    }
  }

  useEffect(() => {
    fetchHealthData()
  }, [])

  const getStatusIcon = (status: FlowResult["status"]) => {
    switch (status) {
      case "ok":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />
      case "degraded":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case "failed":
        return <XCircle className="w-5 h-5 text-red-600" />
      case "skipped":
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: FlowResult["status"]) => {
    switch (status) {
      case "ok":
        return "bg-green-50 border-green-200 text-green-900"
      case "degraded":
        return "bg-yellow-50 border-yellow-200 text-yellow-900"
      case "failed":
        return "bg-red-50 border-red-200 text-red-900"
      case "skipped":
        return "bg-gray-50 border-gray-200 text-gray-600"
    }
  }

  const getOverallStatusColor = (overall: string) => {
    switch (overall) {
      case "healthy":
        return "bg-green-100 text-green-800 border-green-300"
      case "degraded":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "unhealthy":
        return "bg-red-100 text-red-800 border-red-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  const getFlowName = (key: string) => {
    const names: Record<string, string> = {
      auth: "Auth & Routing",
      credits: "Credits & Mode Toggle",
      classic_generation: "Classic Image Generation",
      pro_generation: "Pro Image Generation",
      feed: "Feed Flow",
      cron: "Cron Sanity",
    }
    return names[key] || key
  }

  const getFlowDescription = (key: string) => {
    const descriptions: Record<string, string> = {
      auth: "User login, authentication, and page routing",
      credits: "Credit system and Classic/Pro mode toggle",
      classic_generation: "Classic mode image generation configuration",
      pro_generation: "Pro mode image generation configuration",
      feed: "Feed planner endpoints and functionality",
      cron: "Background job execution and scheduling",
    }
    return descriptions[key] || ""
  }

  if (loading && !healthData) {
    return (
      <div className="min-h-screen bg-stone-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white border border-stone-200 p-8 rounded-lg">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-950"></div>
              <span className="ml-3 text-stone-600">Loading health check data...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />
      <div className="p-4 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white border border-stone-200 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-['Times_New_Roman'] font-light text-stone-950 mb-2">
                E2E Health Check Monitor
              </h1>
              <p className="text-sm text-stone-600">
                Monitor critical user flows and detect silent failures
              </p>
            </div>
            <Button
              onClick={runHealthCheck}
              disabled={running}
              className="bg-stone-950 text-white hover:bg-stone-800"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${running ? "animate-spin" : ""}`} />
              {running ? "Running..." : "Run Now"}
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Overall Status */}
          {healthData && (
            <div className="mt-6">
              <div
                className={`inline-flex items-center px-4 py-2 rounded-lg border-2 ${getOverallStatusColor(
                  healthData.overall,
                )}`}
              >
                <span className="text-sm font-medium uppercase tracking-wide">
                  Overall Status: {healthData.overall}
                </span>
              </div>
              <div className="mt-4 text-sm text-stone-600 space-y-1">
                <p>
                  <strong>Last Check:</strong> {new Date(healthData.timestamp).toLocaleString()}
                </p>
                <p>
                  <strong>Run ID:</strong> {healthData.e2eRunId}
                </p>
                <p>
                  <strong>Duration:</strong> {healthData.duration}ms
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Flow Status Cards */}
        {healthData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(healthData.flows).map(([key, flow]) => (
              <div
                key={key}
                className={`bg-white border-2 rounded-lg p-6 ${getStatusColor(flow.status)}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(flow.status)}
                    <div>
                      <h3 className="font-semibold text-lg">{getFlowName(key)}</h3>
                      <p className="text-xs text-stone-500 mt-1">{getFlowDescription(key)}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wide px-2 py-1 bg-white/50 rounded">
                    {flow.status}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-sm">{flow.message}</p>
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span>Duration: {flow.duration}ms</span>
                    {flow.details && Object.keys(flow.details).length > 0 && (
                      <details className="cursor-pointer">
                        <summary className="hover:text-stone-700">Details</summary>
                        <pre className="mt-2 p-2 bg-white/50 rounded text-xs overflow-auto">
                          {JSON.stringify(flow.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Data State */}
        {!healthData && !loading && (
          <div className="bg-white border border-stone-200 p-8 rounded-lg text-center">
            <p className="text-stone-600 mb-4">No health check data available yet</p>
            <Button onClick={runHealthCheck} disabled={running} className="bg-stone-950 text-white">
              <RefreshCw className={`w-4 h-4 mr-2 ${running ? "animate-spin" : ""}`} />
              Run Health Check
            </Button>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">About E2E Health Checks</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Health checks run automatically daily at 6 AM UTC</li>
            <li>All checks use a synthetic test user (no real user impact)</li>
            <li>
              <strong>Healthy:</strong> All flows working correctly
            </li>
            <li>
              <strong>Degraded:</strong> Some flows have warnings but still work
            </li>
            <li>
              <strong>Unhealthy:</strong> Critical flows are broken - fix immediately
            </li>
          </ul>
          <p className="text-xs text-blue-700 mt-4">
            See <code className="bg-blue-100 px-1 rounded">docs/HOW_TO_READ_E2E_LOGS.md</code> for
            detailed information
          </p>
        </div>
        </div>
      </div>
    </div>
  )
}

