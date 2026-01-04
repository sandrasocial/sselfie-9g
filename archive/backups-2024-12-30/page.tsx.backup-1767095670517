"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Send, CheckCircle, Clock, Mail, Users } from "lucide-react"
import Link from "next/link"
import EmailPreviewCard from "@/components/admin/email-preview-card"
import { useToast } from "@/hooks/use-toast"

export default function AutomationPreviewPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const sequenceId = params.id as string

  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(false)
  const [automation, setAutomation] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAutomation()
  }, [sequenceId])

  const loadAutomation = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/admin/email/check-automation?id=${sequenceId}`)
      const data = await response.json()

      if (!data.exists) {
        setError(`Automation ${sequenceId} not found`)
        setLoading(false)
        return
      }

      // Get full automation details with email content
      const detailsResponse = await fetch(`/api/admin/email/get-automation-details?id=${sequenceId}`)
      const detailsData = await detailsResponse.json()

      console.log("[Automation Preview] API Response:", detailsData)

      if (detailsData.success && detailsData.automation) {
        console.log("[Automation Preview] Setting automation:", {
          id: detailsData.automation.id,
          name: detailsData.automation.name,
          emailCount: detailsData.automation.emailCount,
          hasSequenceData: !!detailsData.automation.sequenceData,
          emailsLength: detailsData.automation.sequenceData?.emails?.length || 0
        })
        setAutomation(detailsData.automation)
      } else {
        console.warn("[Automation Preview] Using fallback data:", data.campaign)
        setAutomation(data.campaign)
      }
    } catch (err: any) {
      console.error("[Automation Preview] Error loading automation:", err)
      setError(err.message || "Failed to load automation")
    } finally {
      setLoading(false)
    }
  }

  const handleActivate = async () => {
    if (!confirm("Are you sure you want to activate this automation? Emails will be scheduled and sent according to their delay settings.")) {
      return
    }

    try {
      setActivating(true)
      const response = await fetch("/api/admin/email/activate-automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sequenceId: parseInt(sequenceId, 10),
          startTime: "now",
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Automation Activated! 🚀",
          description: `${data.scheduledEmails} emails have been scheduled and will be sent automatically.`,
        })
        // Reload to show updated status
        await loadAutomation()
        router.refresh()
      } else {
        throw new Error(data.error || "Failed to activate automation")
      }
    } catch (err: any) {
      console.error("Error activating automation:", err)
      toast({
        title: "Activation Failed",
        description: err.message || "Failed to activate automation",
        variant: "destructive",
      })
    } finally {
      setActivating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="font-serif text-xl sm:text-2xl font-extralight tracking-[0.3em] uppercase text-stone-900 mb-4">
            LOADING
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg p-8 text-center">
          <h2 className="font-serif text-2xl text-stone-900 mb-4">Error Loading Automation</h2>
          <p className="text-stone-600 mb-6">{error}</p>
          <Link
            href="/admin/alex"
            className="inline-block px-6 py-3 bg-stone-900 text-stone-50 rounded-lg hover:bg-stone-800 transition-colors"
          >
            Back to Alex
          </Link>
        </div>
      </div>
    )
  }

  if (!automation) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg p-8 text-center">
          <h2 className="font-serif text-2xl text-stone-900 mb-4">Automation Not Found</h2>
          <p className="text-stone-600 mb-6">Automation {sequenceId} not found</p>
          <Link
            href="/admin/alex"
            className="inline-block px-6 py-3 bg-stone-900 text-stone-50 rounded-lg hover:bg-stone-800 transition-colors"
          >
            Back to Alex
          </Link>
        </div>
      </div>
    )
  }

  const sequenceData = automation.sequenceData || {}
  const emails = sequenceData.emails || []
  const targetAudience = automation.targetAudience || {}

  console.log("[Automation Preview] Rendering with:", {
    automationName: automation.name,
    sequenceDataExists: !!sequenceData,
    emailsCount: emails.length,
    targetAudience: targetAudience
  })

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-6xl mx-auto p-6 sm:p-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/alex"
            className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Alex</span>
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl font-extralight tracking-[0.2em] uppercase text-stone-900 mb-2">
                {automation.name || automation.campaign?.name}
              </h1>
              <div className="flex items-center gap-4 text-sm text-stone-600">
                <span className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {targetAudience.segmentName || "Segment"}
                </span>
                <span className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {emails.length} emails
                </span>
                <span className={`flex items-center gap-2 ${
                  automation.status === 'active' ? 'text-green-600' : 
                  automation.status === 'draft' ? 'text-amber-600' : 
                  'text-stone-600'
                }`}>
                  {automation.status === 'active' ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Active
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4" />
                      {automation.status || 'Draft'}
                    </>
                  )}
                </span>
              </div>
            </div>

            {automation.status !== 'active' && (
              <button
                onClick={handleActivate}
                disabled={activating}
                className="px-6 py-3 bg-stone-900 text-stone-50 rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {activating ? "Activating..." : "Activate Automation"}
              </button>
            )}
          </div>
        </div>

        {/* Info Banner */}
        {automation.status === 'active' ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8">
            <p className="text-sm text-green-800">
              ✅ This automation is active. Emails are scheduled and will be sent automatically according to their delay settings.
            </p>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
            <p className="text-sm text-amber-800">
              📋 Review all emails below. When you're ready, click "Activate Automation" to schedule all emails in Resend.
            </p>
          </div>
        )}

        {/* Email Previews */}
        <div className="space-y-6">
          {emails.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center border border-stone-200">
              <p className="text-stone-600 mb-4">No emails found in this automation sequence.</p>
              <p className="text-xs text-stone-500">
                Sequence Data: {sequenceData ? "Found" : "Missing"} | 
                Emails Array: {Array.isArray(emails) ? `Empty (${emails.length})` : "Not an array"}
              </p>
              {process.env.NODE_ENV === 'development' && (
                <pre className="mt-4 text-xs text-left bg-stone-100 p-4 rounded overflow-auto max-h-96">
                  {JSON.stringify({ sequenceData, emails, automation }, null, 2)}
                </pre>
              )}
            </div>
          ) : (
            emails.map((email: any, index: number) => {
              if (!email || !email.html) {
                console.warn(`[Automation Preview] Email ${index} is missing HTML:`, email)
                return (
                  <div key={index} className="bg-white rounded-lg p-8 border border-red-200">
                    <p className="text-red-600">Email {index + 1} is missing content</p>
                  </div>
                )
              }
              const sendDate = new Date()
              sendDate.setDate(sendDate.getDate() + (email.delayDays || 0))
              
              return (
                <div key={index} className="bg-white rounded-lg border border-stone-200 overflow-hidden">
                  <div className="bg-stone-50 px-6 py-4 border-b border-stone-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-stone-900 mb-1">
                          Email {email.number || index + 1} of {emails.length}
                        </h3>
                        <p className="text-sm text-stone-600">{email.subject}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-stone-500 mb-1">Sends</p>
                        <p className="text-sm font-medium text-stone-900">
                          {email.delayDays === 0 
                            ? "Immediately" 
                            : `Day ${email.delayDays}${index > 0 ? ` (${email.delayDays} days after previous)` : ''}`
                          }
                        </p>
                        {automation.status === 'active' && (
                          <p className="text-xs text-stone-500 mt-1">
                            {sendDate.toLocaleDateString()} {sendDate.toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    <EmailPreviewCard
                      subject={email.subject}
                      preview={email.html?.replace(/<[^>]*>/g, '').substring(0, 200) || ""}
                      htmlContent={email.html || ""}
                      targetSegment={targetAudience.segmentName || "Segment"}
                      targetCount={0}
                      campaignType="resend"
                      onEdit={() => {
                        toast({
                          title: "Edit Email",
                          description: "Email editing coming soon. For now, ask Alex to regenerate this email.",
                        })
                      }}
                      onApprove={() => {
                        // If automation is not active, activate it
                        if (automation.status !== 'active') {
                          handleActivate()
                        } else {
                          toast({
                            title: "Already Active",
                            description: "This automation is already active and scheduled.",
                          })
                        }
                      }}
                      onSchedule={() => {
                        // Handled by activate button
                      }}
                      isSequence={true}
                      sequenceName={automation.name}
                      sequenceEmails={emails}
                      sequenceIndex={index}
                      sequenceTotal={emails.length}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Activation Button (Bottom) */}
        {automation.status !== 'active' && emails.length > 0 && (
          <div className="mt-8 pt-8 border-t border-stone-200">
            <div className="bg-stone-900 rounded-lg p-6 text-center">
              <h3 className="font-serif text-xl font-extralight tracking-[0.15em] uppercase text-stone-50 mb-3">
                Ready to Activate?
              </h3>
              <p className="text-stone-200 text-sm mb-6 max-w-2xl mx-auto">
                This will schedule all {emails.length} emails in Resend. The first email will send immediately, 
                and subsequent emails will be sent according to their delay settings.
              </p>
              <button
                onClick={handleActivate}
                disabled={activating}
                className="px-8 py-3 bg-stone-50 text-stone-900 rounded-lg hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {activating ? "Activating..." : "Activate Automation"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

