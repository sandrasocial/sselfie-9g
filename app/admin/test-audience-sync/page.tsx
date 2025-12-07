"use client"

import { useState } from "react"

export default function TestAudienceSyncPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [contactInfo, setContactInfo] = useState<any>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const handleTestSync = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/admin/audience/test-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to run test sync")
        return
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message || "Network error")
    } finally {
      setLoading(false)
    }
  }

  const handleFullSync = async (dryRun: boolean = false, limit?: number) => {
    setSyncing(true)
    setSyncResult(null)
    setError(null)

    try {
      const response = await fetch("/api/admin/audience/sync-segments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dryRun, limit, batchSize: 100 }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to run full sync")
        return
      }

      setSyncResult(data)
    } catch (err: any) {
      setError(err.message || "Network error")
    } finally {
      setSyncing(false)
    }
  }

  const loadStats = async () => {
    setLoadingStats(true)
    try {
      const response = await fetch("/api/admin/audience/get-segment-stats")
      const data = await response.json()
      if (data.success) {
        setStats(data)
      }
    } catch (err: any) {
      console.error("Failed to load stats:", err)
    } finally {
      setLoadingStats(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Audience Segmentation</h1>

      {/* Segment Statistics */}
      <div className="bg-white rounded-lg border border-stone-200 p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Segment Statistics</h2>
          <button
            onClick={loadStats}
            disabled={loadingStats}
            className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors disabled:opacity-50 text-sm"
          >
            {loadingStats ? "Loading..." : "Refresh Stats"}
          </button>
        </div>
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-stone-50 rounded">
              <div className="text-2xl font-bold">{stats.stats?.totalContacts || 0}</div>
              <div className="text-sm text-stone-600">Total Contacts</div>
            </div>
            <div className="text-center p-4 bg-stone-50 rounded">
              <div className="text-2xl font-bold">{stats.stats?.beta_users || 0}</div>
              <div className="text-sm text-stone-600">Beta Users</div>
            </div>
            <div className="text-center p-4 bg-stone-50 rounded">
              <div className="text-2xl font-bold">{stats.stats?.paid_users || 0}</div>
              <div className="text-sm text-stone-600">Paid Users</div>
            </div>
            <div className="text-center p-4 bg-stone-50 rounded">
              <div className="text-2xl font-bold">{stats.stats?.cold_users || 0}</div>
              <div className="text-sm text-stone-600">Cold Users</div>
            </div>
          </div>
        )}
      </div>

      {/* Test Sync (Admin Email Only) */}
      <div className="bg-white rounded-lg border border-stone-200 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Phase 1: Test Sync</h2>
        <p className="text-stone-600 mb-4">
          This will run segmentation for your admin email (ssa@ssasocial.com) only.
        </p>

        <div className="flex gap-4">
          <button
            onClick={handleTestSync}
            disabled={loading}
            className="px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Running Test..." : "Run Test Sync"}
          </button>
          
          <button
            onClick={async () => {
              setVerifying(true)
              setContactInfo(null)
              try {
                const response = await fetch("/api/admin/audience/verify-contact?email=ssa@ssasocial.com")
                const data = await response.json()
                setContactInfo(data)
              } catch (err: any) {
                setError(err.message || "Failed to verify contact")
              } finally {
                setVerifying(false)
              }
            }}
            disabled={verifying}
            className="px-6 py-3 bg-stone-200 text-stone-900 rounded-lg hover:bg-stone-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verifying ? "Verifying..." : "Verify Contact in Resend"}
          </button>
        </div>
      </div>

      {/* Full Sync */}
      <div className="bg-white rounded-lg border border-stone-200 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Phase 2: Full Sync</h2>
        <p className="text-stone-600 mb-4">
          Sync all contacts in Resend into correct segments. Start with a dry run or limited batch for testing.
        </p>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => handleFullSync(true)}
            disabled={syncing}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? "Running..." : "Dry Run (Test)"}
          </button>
          
          <button
            onClick={() => handleFullSync(false, 10)}
            disabled={syncing}
            className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? "Running..." : "Sync 10 Contacts"}
          </button>
          
          <button
            onClick={() => handleFullSync(false, 100)}
            disabled={syncing}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? "Running..." : "Sync 100 Contacts"}
          </button>
          
          <button
            onClick={() => handleFullSync(false)}
            disabled={syncing}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? "Running..." : "Sync All Contacts"}
          </button>
          
          <button
            onClick={async () => {
              setSyncing(true)
              setSyncResult(null)
              setError(null)
              try {
                const response = await fetch("/api/admin/audience/test-cron", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                })
                const data = await response.json()
                if (!response.ok) {
                  setError(data.error || "Failed to test cron")
                  return
                }
                setSyncResult(data)
              } catch (err: any) {
                setError(err.message || "Network error")
              } finally {
                setSyncing(false)
              }
            }}
            disabled={syncing}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? "Testing..." : "Test Cron (5 contacts)"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-red-900 mb-2">Error</h3>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {contactInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Contact Verification (Resend)</h2>
          {contactInfo.success ? (
            <div className="space-y-3">
              <div>
                <strong>Email:</strong> {contactInfo.contact.email}
              </div>
              <div>
                <strong>Contact ID:</strong> {contactInfo.contact.id}
              </div>
              <div>
                <strong>Unsubscribed:</strong> {contactInfo.contact.unsubscribed ? "Yes" : "No"}
              </div>
              <div>
                <strong>Current Tags:</strong>
                <pre className="mt-2 bg-white p-3 rounded text-xs overflow-auto">
                  {JSON.stringify(contactInfo.contact.tags, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="text-red-700">
              <p><strong>Error:</strong> {contactInfo.error}</p>
              {contactInfo.details && <p className="text-sm mt-2">{contactInfo.details}</p>}
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="bg-stone-50 rounded-lg border border-stone-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Test Results</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-stone-900 mb-2">Email:</h3>
              <p className="text-stone-600">{result.testEmail}</p>
            </div>

            <div>
              <h3 className="font-medium text-stone-900 mb-2">Segments:</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <span className={result.result.segments.all_subscribers ? "text-green-600" : "text-stone-400"}>
                    {result.result.segments.all_subscribers ? "✓" : "✗"}
                  </span>
                  <span>all_subscribers</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={result.result.segments.beta_users ? "text-green-600" : "text-stone-400"}>
                    {result.result.segments.beta_users ? "✓" : "✗"}
                  </span>
                  <span>beta_users</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={result.result.segments.paid_users ? "text-green-600" : "text-stone-400"}>
                    {result.result.segments.paid_users ? "✓" : "✗"}
                  </span>
                  <span>paid_users</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={result.result.segments.cold_users ? "text-green-600" : "text-stone-400"}>
                    {result.result.segments.cold_users ? "✓" : "✗"}
                  </span>
                  <span>cold_users</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-stone-900 mb-2">Reasoning:</h3>
              <div className="bg-white rounded p-3 space-y-2 text-sm">
                {result.result.reasoning.beta_users && (
                  <p><strong>Beta Users:</strong> {result.result.reasoning.beta_users}</p>
                )}
                {result.result.reasoning.paid_users && (
                  <p><strong>Paid Users:</strong> {result.result.reasoning.paid_users}</p>
                )}
                {result.result.reasoning.cold_users && (
                  <p><strong>Cold Users:</strong> {result.result.reasoning.cold_users}</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-medium text-stone-900 mb-2">Status:</h3>
              <p className={result.result.tagsUpdated ? "text-green-600" : "text-red-600"}>
                {result.result.tagsUpdated ? "✓ Tags updated successfully" : "✗ Tags not updated"}
              </p>
              {result.result.error && (
                <p className="text-red-600 text-sm mt-1">Error: {result.result.error}</p>
              )}
            </div>

            <details className="mt-4">
              <summary className="cursor-pointer text-stone-600 hover:text-stone-900">
                View Full Response (JSON)
              </summary>
              <pre className="mt-2 bg-stone-900 text-stone-100 p-4 rounded text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}

      {/* Full Sync Results */}
      {syncResult && (
        <div className="bg-stone-50 rounded-lg border border-stone-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Full Sync Results</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white rounded">
                <div className="text-2xl font-bold">{syncResult.summary?.processed || 0}</div>
                <div className="text-sm text-stone-600">Processed</div>
              </div>
              <div className="text-center p-4 bg-white rounded">
                <div className="text-2xl font-bold text-green-600">{syncResult.summary?.successful || 0}</div>
                <div className="text-sm text-stone-600">Successful</div>
              </div>
              <div className="text-center p-4 bg-white rounded">
                <div className="text-2xl font-bold text-red-600">{syncResult.summary?.failed || 0}</div>
                <div className="text-sm text-stone-600">Failed</div>
              </div>
              <div className="text-center p-4 bg-white rounded">
                <div className="text-2xl font-bold">{syncResult.summary?.totalContacts || 0}</div>
                <div className="text-sm text-stone-600">Total Contacts</div>
              </div>
            </div>

            {syncResult.summary?.segmentCounts && (
              <div>
                <h3 className="font-medium mb-2">Segments Updated:</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>all_subscribers: {syncResult.summary.segmentCounts.all_subscribers}</div>
                  <div>beta_users: {syncResult.summary.segmentCounts.beta_users}</div>
                  <div>paid_users: {syncResult.summary.segmentCounts.paid_users}</div>
                  <div>cold_users: {syncResult.summary.segmentCounts.cold_users}</div>
                </div>
              </div>
            )}

            {syncResult.errors && syncResult.errors.length > 0 && (
              <div>
                <h3 className="font-medium mb-2 text-red-600">Errors ({syncResult.totalErrors || syncResult.errors.length}):</h3>
                <div className="bg-red-50 rounded p-3 max-h-40 overflow-y-auto text-sm">
                  {syncResult.errors.slice(0, 10).map((err: any, idx: number) => (
                    <div key={idx} className="mb-1">
                      <strong>{err.email}:</strong> {err.error}
                    </div>
                  ))}
                  {syncResult.errors.length > 10 && (
                    <div className="text-stone-500 mt-2">... and {syncResult.errors.length - 10} more</div>
                  )}
                </div>
              </div>
            )}

            {syncResult.nextSteps && (
              <div>
                <h3 className="font-medium mb-2">Next Steps:</h3>
                <ul className="list-disc list-inside text-sm text-stone-600 space-y-1">
                  {syncResult.nextSteps.map((step: string, idx: number) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              </div>
            )}

            <details className="mt-4">
              <summary className="cursor-pointer text-stone-600 hover:text-stone-900">
                View Full Response (JSON)
              </summary>
              <pre className="mt-2 bg-stone-900 text-stone-100 p-4 rounded text-xs overflow-auto">
                {JSON.stringify(syncResult, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  )
}

