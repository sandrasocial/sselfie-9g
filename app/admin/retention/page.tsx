"use client"

import { useEffect, useState } from "react"

export const dynamic = "force-dynamic"

interface CohortRow {
  cohort_month: string
  signups: number
  currently_active: number
  cancelled: number
  past_due: number
}

interface Totals {
  total_signups: number
  total_active: number
  total_cancelled: number
  total_past_due: number
}

function pct(numerator: number, denominator: number): string {
  if (!denominator) return "—"
  return `${Math.round((numerator / denominator) * 100)}%`
}

function formatMonth(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
}

export default function RetentionPage() {
  const [cohorts, setCohorts] = useState<CohortRow[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/retention")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        setCohorts(data.cohorts ?? [])
        setTotals(data.totals ?? null)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return (
    <div style={{ padding: "2rem", maxWidth: 900, margin: "0 auto", fontFamily: "Inter, sans-serif" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.25rem" }}>Studio Retention</h1>
      <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "2rem" }}>
        Studio membership cohorts by signup month. Use this to assess whether month-3 users are staying.
      </p>

      {loading && <p style={{ color: "#6b7280" }}>Loading…</p>}
      {error && <p style={{ color: "#dc2626" }}>Error: {error}</p>}

      {totals && !loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          {[
            { label: "Total signups", value: totals.total_signups },
            { label: "Currently active", value: `${totals.total_active} (${pct(totals.total_active, totals.total_signups)})` },
            { label: "Cancelled", value: `${totals.total_cancelled} (${pct(totals.total_cancelled, totals.total_signups)})` },
            { label: "Past due", value: `${totals.total_past_due} (${pct(totals.total_past_due, totals.total_signups)})` },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "1rem 1.25rem" }}
            >
              <p style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {stat.label}
              </p>
              <p style={{ fontSize: "1.5rem", fontWeight: 600, color: "#111827" }}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {cohorts.length > 0 && !loading && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
              {["Cohort month", "Signups", "Active now", "Active %", "Cancelled", "Cancelled %", "Past due"].map((h) => (
                <th
                  key={h}
                  style={{ textAlign: "left", padding: "0.5rem 0.75rem", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohorts.map((row) => (
              <tr key={row.cohort_month} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "0.625rem 0.75rem", fontWeight: 500, color: "#111827" }}>
                  {formatMonth(row.cohort_month)}
                </td>
                <td style={{ padding: "0.625rem 0.75rem", color: "#374151" }}>{row.signups}</td>
                <td style={{ padding: "0.625rem 0.75rem", color: "#059669", fontWeight: 500 }}>{row.currently_active}</td>
                <td style={{ padding: "0.625rem 0.75rem", color: "#059669" }}>{pct(row.currently_active, row.signups)}</td>
                <td style={{ padding: "0.625rem 0.75rem", color: "#dc2626" }}>{row.cancelled}</td>
                <td style={{ padding: "0.625rem 0.75rem", color: "#dc2626" }}>{pct(row.cancelled, row.signups)}</td>
                <td style={{ padding: "0.625rem 0.75rem", color: "#d97706" }}>{row.past_due}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && cohorts.length === 0 && !error && (
        <p style={{ color: "#6b7280" }}>No Studio membership data found.</p>
      )}
    </div>
  )
}
