"use client"

import { useState, useEffect } from "react"
import { Loader2, ChevronDown, ChevronUp } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface WorkflowDetail {
  id: string
  subscriber_id: string
  subscriber_email: string
  subscriber_name: string | null
  workflow_type: string
  status: string
  created_at: string
  lead_intelligence: any
  drafts: any[]
}

export default function WorkflowDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedDraft, setExpandedDraft] = useState<number | null>(null)
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  useEffect(() => {
    fetchWorkflowDetail()
  }, [params.id])

  const fetchWorkflowDetail = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/workflows/detail?id=${params.id}`)
      const data = await response.json()
      if (data.workflow) {
        setWorkflow(data.workflow)
      }
    } catch (error) {
      console.error("Error fetching workflow detail:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (
      !confirm("Are you sure you want to approve this workflow? This will execute the workflow and send the email.")
    ) {
      return
    }

    try {
      setIsApproving(true)
      const response = await fetch("/api/workflows/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: params.id }),
      })

      if (response.ok) {
        alert("Workflow approved and executed successfully")
        router.push("/admin/workflows")
      } else {
        alert("Failed to approve workflow")
      }
    } catch (error) {
      console.error("Error approving workflow:", error)
      alert("Failed to approve workflow")
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    if (!confirm("Are you sure you want to reject this workflow?")) {
      return
    }

    try {
      setIsRejecting(true)
      const response = await fetch("/api/workflows/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: params.id }),
      })

      if (response.ok) {
        alert("Workflow rejected")
        router.push("/admin/workflows")
      } else {
        alert("Failed to reject workflow")
      }
    } catch (error) {
      console.error("Error rejecting workflow:", error)
      alert("Failed to reject workflow")
    } finally {
      setIsRejecting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    )
  }

  if (!workflow) {
    return (
      <div className="min-h-screen bg-stone-50 p-8">
        <div className="max-w-4xl mx-auto">
          <p className="text-stone-600">Workflow not found</p>
          <Link href="/admin/workflows" className="text-stone-950 underline mt-4 inline-block">
            Back to Workflows
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link
            href="/admin/workflows"
            className="text-sm text-stone-600 hover:text-stone-950 transition-colors font-light"
          >
            ← Back to Workflows
          </Link>
          <h1 className="font-serif text-4xl font-extralight tracking-[0.3em] uppercase text-stone-950 mt-4">
            Workflow Detail
          </h1>
        </div>

        {/* Overview Section */}
        <div className="bg-white rounded-2xl p-8 border border-stone-200 mb-6">
          <h2 className="text-[22px] font-semibold text-stone-950 mb-6">Overview</h2>
          <div className="space-y-4">
            <div>
              <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">Workflow Type</div>
              <div className="text-sm text-stone-950 font-light">{workflow.workflow_type.replace(/_/g, " ")}</div>
            </div>
            <div>
              <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">Subscriber</div>
              <div className="text-sm text-stone-950 font-light">{workflow.subscriber_email}</div>
              {workflow.subscriber_name && (
                <div className="text-xs text-stone-500 font-light">{workflow.subscriber_name}</div>
              )}
            </div>
            <div>
              <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">Date Created</div>
              <div className="text-sm text-stone-600 font-light">
                {new Date(workflow.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Lead Intelligence Section */}
        {workflow.lead_intelligence && (
          <div className="bg-white rounded-2xl p-8 border border-stone-200 mb-6">
            <h2 className="text-[22px] font-semibold text-stone-950 mb-6">Lead Intelligence</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">Persona</div>
                <div className="text-sm text-stone-950 font-light">
                  {workflow.lead_intelligence.personaType || "N/A"}
                </div>
              </div>
              <div>
                <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">Stage</div>
                <div className="text-sm text-stone-950 font-light">{workflow.lead_intelligence.stage || "N/A"}</div>
              </div>
              <div>
                <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">Buying Likelihood</div>
                <div className="text-sm text-stone-950 font-light">
                  {workflow.lead_intelligence.buyingLikelihood
                    ? `${workflow.lead_intelligence.buyingLikelihood}%`
                    : "N/A"}
                </div>
              </div>
              <div>
                <div className="text-xs text-stone-500 uppercase tracking-wider mb-1">Preferences</div>
                <div className="text-sm text-stone-950 font-light">
                  {workflow.lead_intelligence.preferences?.join(", ") || "N/A"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Draft Preview Section */}
        {workflow.drafts && workflow.drafts.length > 0 && (
          <div className="bg-white rounded-2xl p-8 border border-stone-200 mb-6">
            <h2 className="text-[22px] font-semibold text-stone-950 mb-6">Draft Preview</h2>
            <div className="space-y-4">
              {workflow.drafts.map((draft, index) => (
                <div key={draft.id} className="border border-stone-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedDraft(expandedDraft === index ? null : index)}
                    className="w-full px-6 py-4 flex items-center justify-between bg-stone-50 hover:bg-stone-100 transition-colors"
                  >
                    <div className="text-left">
                      <div className="text-sm font-light text-stone-950">
                        {draft.content_json?.subject || "Email Draft"}
                      </div>
                      <div className="text-xs text-stone-500 font-light mt-1">
                        {new Date(draft.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    {expandedDraft === index ? (
                      <ChevronUp className="w-5 h-5 text-stone-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-stone-400" />
                    )}
                  </button>
                  {expandedDraft === index && (
                    <div className="px-6 py-4 border-t border-stone-200">
                      <div className="mb-4">
                        <div className="text-xs text-stone-500 uppercase tracking-wider mb-2">Subject</div>
                        <div className="text-sm text-stone-950 font-light">{draft.content_json?.subject}</div>
                      </div>
                      <div>
                        <div className="text-xs text-stone-500 uppercase tracking-wider mb-2">Body</div>
                        <div
                          className="text-sm text-stone-700 font-light prose prose-stone max-w-none"
                          dangerouslySetInnerHTML={{ __html: draft.content_json?.html || "" }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions Section */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleReject}
            disabled={isRejecting || isApproving}
            className="w-full px-6 py-4 bg-white border-2 border-stone-300 text-stone-700 rounded-xl text-sm tracking-wider uppercase hover:bg-stone-100 transition-colors font-light disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRejecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                Rejecting...
              </>
            ) : (
              "Reject Workflow"
            )}
          </button>
          <button
            onClick={handleApprove}
            disabled={isApproving || isRejecting}
            className="w-full px-6 py-4 bg-stone-950 text-white rounded-xl text-sm tracking-wider uppercase hover:bg-stone-800 transition-colors font-light disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isApproving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                Approving...
              </>
            ) : (
              "Approve Workflow"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
