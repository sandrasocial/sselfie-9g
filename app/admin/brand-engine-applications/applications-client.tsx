"use client"

import { useState } from "react"
import Link from "next/link"

interface Application {
  id: number
  name: string
  email: string
  website: string
  revenue: string
  current_spend: string
  biggest_bottleneck: string
  hours_per_week: string
  business_description: string
  why_interested: string
  ready_to_invest: string
  qualified: boolean
  status: string
  calendly_sent: boolean
  notes: string | null
  created_at: string
}

export default function BrandEngineApplicationsClient({ applications }: { applications: Application[] }) {
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [updating, setUpdating] = useState<number | null>(null)

  const qualifiedApps = applications.filter(app => app.qualified)
  const disqualifiedApps = applications.filter(app => !app.qualified)

  const handleSendCalendly = async (appId: number) => {
    if (!confirm("Mark this application as 'Calendly Sent'?")) return

    setUpdating(appId)
    try {
      await fetch("/api/admin/brand-engine-calendly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId })
      })
      window.location.reload()
    } catch (error) {
      alert("Failed to update. Try again.")
    } finally {
      setUpdating(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="border-b border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div>
            <Link
              href="/admin/project-tracker"
              className="text-xs tracking-[0.2em] uppercase text-stone-400 hover:text-stone-600 transition-colors mb-2 inline-block"
            >
              ← Back to Tracker
            </Link>
            <h1 className="text-2xl font-['Times_New_Roman'] tracking-[0.05em] text-stone-950">
              Brand Engine Applications
            </h1>
          </div>
          <div className="text-right">
            <div className="text-xs tracking-[0.15em] uppercase text-stone-400 mb-1">
              Total Applications
            </div>
            <div className="text-3xl font-['Times_New_Roman'] text-stone-950">
              {applications.length}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-stone-200 p-6">
            <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Qualified</div>
            <div className="text-3xl font-['Times_New_Roman'] text-green-700">{qualifiedApps.length}</div>
          </div>
          <div className="bg-white border border-stone-200 p-6">
            <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Calendly Sent</div>
            <div className="text-3xl font-['Times_New_Roman'] text-blue-700">{qualifiedApps.filter(a => a.calendly_sent).length}</div>
          </div>
          <div className="bg-white border border-stone-200 p-6">
            <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Pending Review</div>
            <div className="text-3xl font-['Times_New_Roman'] text-amber-700">{qualifiedApps.filter(a => !a.calendly_sent).length}</div>
          </div>
          <div className="bg-white border border-stone-200 p-6">
            <div className="text-xs tracking-[0.2em] uppercase text-stone-400 mb-2">Disqualified</div>
            <div className="text-3xl font-['Times_New_Roman'] text-stone-400">{disqualifiedApps.length}</div>
          </div>
        </div>

        {/* Qualified Applications */}
        <div className="mb-8">
          <h2 className="text-lg font-['Times_New_Roman'] tracking-[0.05em] text-stone-950 mb-4">
            Qualified Applications ({qualifiedApps.length})
          </h2>
          <div className="space-y-4">
            {qualifiedApps.length === 0 ? (
              <div className="bg-white border border-stone-200 p-8 text-center text-stone-500">
                No qualified applications yet.
              </div>
            ) : (
              qualifiedApps.map((app) => (
                <div key={app.id} className="bg-white border border-stone-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-['Times_New_Roman'] text-stone-950">{app.name}</h3>
                      <p className="text-sm text-stone-600">{app.email}</p>
                      <a href={app.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                        {app.website}
                      </a>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-stone-500">{formatDate(app.created_at)}</div>
                      {app.calendly_sent ? (
                        <span className="inline-block mt-2 bg-green-100 text-green-800 px-3 py-1 text-xs uppercase tracking-wider">
                          Calendly Sent ✓
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendCalendly(app.id)}
                          disabled={updating === app.id}
                          className="mt-2 bg-blue-600 text-white px-4 py-2 text-xs uppercase tracking-wider hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {updating === app.id ? "Updating..." : "Send Calendly"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-stone-500">Revenue:</span> <strong>{app.revenue}</strong>
                    </div>
                    <div>
                      <span className="text-stone-500">Current Spend:</span> <strong>{app.current_spend}</strong>
                    </div>
                    <div>
                      <span className="text-stone-500">Hours/Week:</span> <strong>{app.hours_per_week}</strong>
                    </div>
                    <div>
                      <span className="text-stone-500">Ready to Invest:</span> <strong>{app.ready_to_invest}</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedApp(selectedApp?.id === app.id ? null : app)}
                    className="text-xs text-stone-500 hover:text-stone-950 transition-colors uppercase tracking-wider"
                  >
                    {selectedApp?.id === app.id ? "Hide Details ▲" : "Show Details ▼"}
                  </button>

                  {selectedApp?.id === app.id && (
                    <div className="mt-4 pt-4 border-t border-stone-200 space-y-4 text-sm">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">Biggest Bottleneck:</div>
                        <p className="text-stone-700">{app.biggest_bottleneck}</p>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">Business Description:</div>
                        <p className="text-stone-700">{app.business_description}</p>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wider text-stone-500 mb-1">Why Interested:</div>
                        <p className="text-stone-700">{app.why_interested}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Disqualified Applications */}
        {disqualifiedApps.length > 0 && (
          <div>
            <h2 className="text-lg font-['Times_New_Roman'] tracking-[0.05em] text-stone-950 mb-4">
              Disqualified Applications ({disqualifiedApps.length})
            </h2>
            <div className="space-y-4">
              {disqualifiedApps.map((app) => (
                <div key={app.id} className="bg-stone-100 border border-stone-300 p-6 opacity-60">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-['Times_New_Roman'] text-stone-950">{app.name}</h3>
                      <p className="text-sm text-stone-600">{app.email}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-stone-500">{formatDate(app.created_at)}</div>
                      <span className="inline-block mt-2 bg-red-100 text-red-800 px-3 py-1 text-xs uppercase tracking-wider">
                        Under $100k Revenue
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
