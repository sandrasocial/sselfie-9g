/**
 * Email Sequence Admin Dashboard
 * Shows user progress across 8-email sequence
 */

"use client"

import { useState, useEffect } from "react"

interface SequenceStatus {
  userId: string | null
  email: string
  currentStep: number | null
  lastEmailSentAt: string | null
  nextEmailDueAt: string | null
  completed: boolean
}

export default function EmailSequenceAdminPage() {
  const [statuses, setStatuses] = useState<SequenceStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    loadStatuses()
  }, [])

  const loadStatuses = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/email-sequence/status")
      if (!response.ok) {
        throw new Error("Failed to load statuses")
      }
      const data = await response.json()
      setStatuses(data.statuses || [])
    } catch (error) {
      console.error("Error loading statuses:", error)
      setMessage("Failed to load statuses")
    } finally {
      setLoading(false)
    }
  }

  const handleTrigger = async () => {
    try {
      setTriggering(true)
      setMessage(null)
      const response = await fetch("/api/email-sequence/trigger", {
        method: "POST",
      })
      const data = await response.json()
      if (data.success) {
        setMessage(
          `Triggered: ${data.sent} sent, ${data.skipped} skipped, ${data.errors?.length || 0} errors`,
        )
        await loadStatuses()
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error("Error triggering:", error)
      setMessage("Failed to trigger sequence")
    } finally {
      setTriggering(false)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      setMessage(null)
      const response = await fetch("/api/email-sequence/sync", {
        method: "POST",
      })
      const data = await response.json()
      if (data.success) {
        setMessage(`Synced: ${data.synced} new, ${data.updated} updated`)
        await loadStatuses()
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error("Error syncing:", error)
      setMessage("Failed to sync audience")
    } finally {
      setSyncing(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never"
    return new Date(dateString).toLocaleString()
  }

  const getStepStatus = (step: number, currentStep: number | null, completed: boolean) => {
    if (completed && step === 8) return "✓"
    if (currentStep !== null && step <= currentStep) return "✓"
    if (currentStep !== null && step === currentStep + 1) return "→"
    return "-"
  }

  return (
    <div style={{ padding: "40px", fontFamily: "system-ui" }}>
      <h1>Email Sequence Admin Dashboard</h1>

      <div style={{ marginBottom: "20px", display: "flex", gap: "10px" }}>
        <button
          onClick={handleTrigger}
          disabled={triggering}
          style={{
            padding: "10px 20px",
            backgroundColor: "#1c1917",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: triggering ? "not-allowed" : "pointer",
          }}
        >
          {triggering ? "Triggering..." : "Trigger Now"}
        </button>
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            padding: "10px 20px",
            backgroundColor: "#57534e",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: syncing ? "not-allowed" : "pointer",
          }}
        >
          {syncing ? "Syncing..." : "Resync Audience"}
        </button>
        <button
          onClick={loadStatuses}
          disabled={loading}
          style={{
            padding: "10px 20px",
            backgroundColor: "#78716c",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: "10px",
            marginBottom: "20px",
            backgroundColor: message.includes("Error") ? "#fee2e2" : "#dcfce7",
            borderRadius: "4px",
          }}
        >
          {message}
        </div>
      )}

      {loading ? (
        <div>Loading...</div>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "20px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f5f5f4", borderBottom: "2px solid #e7e5e4" }}>
              <th style={{ padding: "12px", textAlign: "left" }}>Email</th>
              <th style={{ padding: "12px", textAlign: "left" }}>User ID</th>
              <th style={{ padding: "12px", textAlign: "center" }}>1</th>
              <th style={{ padding: "12px", textAlign: "center" }}>2</th>
              <th style={{ padding: "12px", textAlign: "center" }}>3</th>
              <th style={{ padding: "12px", textAlign: "center" }}>4</th>
              <th style={{ padding: "12px", textAlign: "center" }}>5</th>
              <th style={{ padding: "12px", textAlign: "center" }}>6</th>
              <th style={{ padding: "12px", textAlign: "center" }}>7</th>
              <th style={{ padding: "12px", textAlign: "center" }}>8</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Last Sent</th>
              <th style={{ padding: "12px", textAlign: "left" }}>Next Due</th>
            </tr>
          </thead>
          <tbody>
            {statuses.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ padding: "20px", textAlign: "center" }}>
                  No subscribers found
                </td>
              </tr>
            ) : (
              statuses.map((status, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: "1px solid #e7e5e4",
                    backgroundColor: idx % 2 === 0 ? "white" : "#fafaf9",
                  }}
                >
                  <td style={{ padding: "12px" }}>{status.email}</td>
                  <td style={{ padding: "12px", fontSize: "12px", color: "#78716c" }}>
                    {status.userId || "Guest"}
                  </td>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((step) => (
                    <td
                      key={step}
                      style={{
                        padding: "12px",
                        textAlign: "center",
                        fontWeight: "bold",
                      }}
                    >
                      {getStepStatus(step, status.currentStep, status.completed)}
                    </td>
                  ))}
                  <td style={{ padding: "12px", fontSize: "12px" }}>
                    {formatDate(status.lastEmailSentAt)}
                  </td>
                  <td style={{ padding: "12px", fontSize: "12px" }}>
                    {formatDate(status.nextEmailDueAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  )
}

