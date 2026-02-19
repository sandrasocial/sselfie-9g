"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { Eye, Loader2, Mail, Send } from "lucide-react"

type BroadcastCampaign = {
  id: number
  campaign_name: string
  campaign_type: string
  subject_line: string
  preview_text: string | null
  body_html: string | null
  status: string
  approval_status: string
  target_segment: string | null
  scheduled_for: string | null
  resend_broadcast_id: string | null
  approved_at: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}

type BroadcastState = {
  success: boolean
  campaign: BroadcastCampaign | null
  subscriberCount: number
  dbSubscriberCount?: number
  audienceMismatch?: boolean
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()
  if (!res.ok) throw new Error(String(data?.error || data?.details || `Request failed (${res.status})`))
  return data as BroadcastState
}

export function BrandEngineBroadcastPanel() {
  const [pending, setPending] = useState<"prepare" | "send" | null>(null)
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const { data, mutate, isLoading } = useSWR("/api/admin/marketing/brand-engine-broadcast", fetcher, {
    refreshInterval: 0,
  })

  const campaign = data?.campaign || null
  const subscriberCount = Number(data?.subscriberCount || 0)
  const dbSubscriberCount = Number(data?.dbSubscriberCount || 0)
  const audienceMismatch = Boolean(data?.audienceMismatch)
  const subscriberCountDisplay = useMemo(() => {
    if (!subscriberCount) return "~3,000"
    return `~${new Intl.NumberFormat("en-US").format(subscriberCount)}`
  }, [subscriberCount])
  const dbSubscriberCountDisplay = useMemo(() => {
    if (!dbSubscriberCount) return "n/a"
    return `~${new Intl.NumberFormat("en-US").format(dbSubscriberCount)}`
  }, [dbSubscriberCount])

  const prepareDraft = async () => {
    try {
      setPending("prepare")
      setMessage(null)
      const res = await fetch("/api/admin/marketing/brand-engine-broadcast", { method: "POST" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(String(json?.error || json?.details || "Failed to create draft"))
      setMessage({ kind: "ok", text: "Draft campaign is ready. Review preview before sending." })
      await mutate()
    } catch (error) {
      setMessage({ kind: "error", text: String(error instanceof Error ? error.message : error) })
    } finally {
      setPending(null)
    }
  }

  const approveAndSend = async () => {
    try {
      setPending("send")
      setMessage(null)
      const res = await fetch("/api/admin/marketing/brand-engine-broadcast/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedRecipients: subscriberCount }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(String(json?.error || json?.details || "Failed to approve and send"))
      setMessage({ kind: "ok", text: `Broadcast sent. Campaign ${json.campaignId}.` })
      await mutate()
    } catch (error) {
      setMessage({ kind: "error", text: String(error instanceof Error ? error.message : error) })
    } finally {
      setPending(null)
      setShowConfirm(false)
    }
  }

  return (
    <div className="bg-white border border-stone-200 p-6 rounded-none mb-10 sm:mb-14">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="font-['Times_New_Roman'] text-xl sm:text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
            BRAND ENGINE BROADCAST
          </h2>
          <p className="text-[10px] tracking-[0.15em] uppercase text-stone-400 mt-2">
            Manual only: preview first, then approve + send.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={prepareDraft}
            disabled={pending !== null}
            className="inline-flex items-center justify-center gap-2 bg-stone-950 text-white px-4 py-3 text-xs tracking-[0.2em] uppercase hover:bg-stone-800 transition-colors rounded-none disabled:opacity-60"
          >
            {pending === "prepare" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {campaign ? "Refresh Draft" : "Create Draft"}
          </button>
          <button
            onClick={() => setShowPreview(true)}
            disabled={!campaign}
            className="inline-flex items-center justify-center gap-2 border border-stone-200 bg-white px-4 py-3 text-xs tracking-[0.2em] uppercase text-stone-700 hover:bg-stone-50 transition-colors rounded-none disabled:opacity-50"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={!campaign || pending !== null || audienceMismatch}
            className="inline-flex items-center justify-center gap-2 border border-stone-200 bg-white px-4 py-3 text-xs tracking-[0.2em] uppercase text-stone-700 hover:bg-stone-50 transition-colors rounded-none disabled:opacity-50"
          >
            {pending === "send" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Approve + Send
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="border border-stone-200 p-4">
          <p className="text-[10px] tracking-[0.2em] uppercase text-stone-500">Subscribers</p>
          <p className="text-lg text-stone-950 mt-1">{subscriberCountDisplay}</p>
        </div>
        <div className="border border-stone-200 p-4">
          <p className="text-[10px] tracking-[0.2em] uppercase text-stone-500">Campaign Status</p>
          <p className="text-sm text-stone-900 mt-1">
            {campaign ? `${campaign.status} / ${campaign.approval_status}` : isLoading ? "loading" : "not created"}
          </p>
        </div>
        <div className="border border-stone-200 p-4">
          <p className="text-[10px] tracking-[0.2em] uppercase text-stone-500">Target Segment</p>
          <p className="text-sm text-stone-900 mt-1">{campaign?.target_segment || "all_subscribers"}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border border-stone-200 p-4">
          <p className="text-[10px] tracking-[0.2em] uppercase text-stone-500">Resend Audience Contacts</p>
          <p className="text-sm text-stone-900 mt-1">{subscriberCountDisplay}</p>
        </div>
        <div className="border border-stone-200 p-4">
          <p className="text-[10px] tracking-[0.2em] uppercase text-stone-500">DB Subscribers</p>
          <p className="text-sm text-stone-900 mt-1">{dbSubscriberCountDisplay}</p>
        </div>
      </div>

      {audienceMismatch && (
        <div className="mt-4 border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
          Audience mismatch detected. Resend audience count is much lower than DB subscribers. Sending is blocked
          until audience sync/env is fixed.
        </div>
      )}

      {campaign && (
        <div className="mt-4 border border-stone-200 p-4 bg-stone-50">
          <p className="text-[10px] tracking-[0.2em] uppercase text-stone-500">Subject</p>
          <p className="text-sm text-stone-900 mt-1">{campaign.subject_line}</p>
          <p className="text-[10px] tracking-[0.2em] uppercase text-stone-500 mt-3">Preview Text</p>
          <p className="text-sm text-stone-900 mt-1">{campaign.preview_text || "None"}</p>
        </div>
      )}

      {message && (
        <div
          className={`mt-4 border p-4 text-xs ${
            message.kind === "ok" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {showPreview && campaign && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 p-4 flex items-center justify-center">
          <div className="w-full max-w-5xl bg-white border border-stone-200 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-stone-200">
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-stone-500">Email Preview</p>
                <p className="text-sm text-stone-900 mt-1">{campaign.subject_line}</p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="border border-stone-200 px-3 py-2 text-[10px] tracking-[0.2em] uppercase text-stone-700 hover:bg-stone-50"
              >
                Close
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[78vh] bg-stone-100">
              <iframe
                title="Brand Engine Broadcast Preview"
                srcDoc={campaign.body_html || "<p>No preview available</p>"}
                className="w-full h-[70vh] border border-stone-200 bg-white"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}

      {showConfirm && campaign && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 p-4 flex items-center justify-center">
          <div className="w-full max-w-lg bg-white border border-stone-200 p-6">
            <h3 className="font-['Times_New_Roman'] text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
              Confirm Send
            </h3>
            <p className="text-sm text-stone-700 mt-4">
              Sending to {subscriberCountDisplay} subscribers.
            </p>
            <p className="text-sm text-stone-700 mt-2">
              Are you sure? This sends to {subscriberCountDisplay} people.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={pending !== null}
                className="flex-1 border border-stone-200 px-4 py-3 text-[10px] tracking-[0.2em] uppercase text-stone-700 hover:bg-stone-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={approveAndSend}
                disabled={pending !== null}
                className="flex-1 bg-stone-950 text-white px-4 py-3 text-[10px] tracking-[0.2em] uppercase hover:bg-stone-800 disabled:opacity-60"
              >
                {pending === "send" ? "Sending..." : "Approve + Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
