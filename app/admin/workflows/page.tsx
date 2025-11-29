"use client"

import { useState, useEffect } from "react"
import { Loader2 } from "lucide-react"
import Link from "next/link"

interface WorkflowQueueItem {
  id: string
  subscriber_id: string
  subscriber_email: string
  subscriber_name: string | null
  workflow_type: string
  status: string
  created_at: string
}

export default function AdminWorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowQueueItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const fetchWorkflows = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/workflows/list")
      const data = await response.json()
      if (data.workflows) {
        setWorkflows(data.workflows)
      }
    } catch (error) {
      console.error("Error fetching workflows:", error)
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
            <h1 className="font-serif text-4xl font-extralight tracking-[0.3em] uppercase text-stone-950">Workflows</h1>
            <p className="text-sm text-stone-600 mt-2 font-light">Review and approve pending marketing workflows</p>
          </div>
          <Link
            href="/admin"
            className="px-6 py-3 bg-stone-950 text-white rounded-xl text-sm tracking-wider uppercase hover:bg-stone-800 transition-colors font-light"
          >
            Back to Admin
          </Link>
        </div>

        {workflows.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-stone-200 text-center">
            <p className="text-stone-500 font-light">No pending workflows</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left px-6 py-4 text-xs uppercase tracking-wider text-stone-600 font-light">
                    Subscriber
                  </th>
                  <th className="text-left px-6 py-4 text-xs uppercase tracking-wider text-stone-600 font-light">
                    Workflow Type
                  </th>
                  <th className="text-left px-6 py-4 text-xs uppercase tracking-wider text-stone-600 font-light">
                    Created
                  </th>
                  <th className="text-right px-6 py-4 text-xs uppercase tracking-wider text-stone-600 font-light">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {workflows.map((workflow) => (
                  <tr
                    key={workflow.id}
                    className="border-b border-stone-100 last:border-0 hover:bg-stone-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm text-stone-950 font-light">{workflow.subscriber_email}</div>
                        {workflow.subscriber_name && (
                          <div className="text-xs text-stone-500 font-light">{workflow.subscriber_name}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-stone-700 font-light">
                        {workflow.workflow_type.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-stone-600 font-light">
                        {new Date(workflow.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/workflows/${workflow.id}`}
                        className="inline-block px-4 py-2 bg-stone-950 text-white rounded-lg text-xs hover:bg-stone-800 transition-colors font-light uppercase tracking-wider"
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
