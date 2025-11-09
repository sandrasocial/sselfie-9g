"use client"

import { useState, useEffect } from "react"
import { Loader2, Filter, CheckCircle, Clock, AlertCircle, Camera, Reply } from "lucide-react"
import Link from "next/link"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

interface Feedback {
  id: string
  user_id: string
  user_email: string | null
  user_name: string | null
  type: string
  subject: string
  message: string
  images: string[] | null
  status: string
  admin_notes: string | null
  admin_reply: string | null
  replied_at: string | null
  created_at: string
  updated_at: string
}

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [isSendingReply, setIsSendingReply] = useState(false)

  useEffect(() => {
    fetchFeedback()
  }, [filterType, filterStatus])

  const fetchFeedback = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterType !== "all") params.set("type", filterType)
      if (filterStatus !== "all") params.set("status", filterStatus)

      const response = await fetch(`/api/admin/feedback?${params.toString()}`)
      if (response.ok) {
        const data = await response.json()
        setFeedback(data.feedback || [])
      }
    } catch (error) {
      console.error("Error fetching feedback:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (feedbackId: string, status: string) => {
    try {
      const response = await fetch("/api/admin/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId, status }),
      })

      if (response.ok) {
        fetchFeedback()
      }
    } catch (error) {
      console.error("Error updating feedback:", error)
    }
  }

  const sendReply = async (feedbackId: string) => {
    if (!replyText.trim()) return

    setIsSendingReply(true)
    try {
      const response = await fetch("/api/admin/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedbackId, adminReply: replyText.trim() }),
      })

      if (response.ok) {
        setReplyingTo(null)
        setReplyText("")
        fetchFeedback()
      }
    } catch (error) {
      console.error("Error sending reply:", error)
    } finally {
      setIsSendingReply(false)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "share_sselfies":
        return "bg-stone-200 text-stone-700"
      case "testimonial":
        return "bg-stone-100 text-stone-600"
      default:
        return "bg-stone-50 text-stone-600"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "new":
        return <AlertCircle className="w-4 h-4 text-blue-500" />
      case "reviewing":
        return <Clock className="w-4 h-4 text-amber-500" />
      case "resolved":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-stone-950" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-4xl font-extralight tracking-[0.3em] uppercase text-stone-950">Feedback</h1>
            <p className="text-sm text-stone-600 mt-2 font-light">
              User feedback, bug reports, testimonials, and shared SSELFIEs
            </p>
          </div>
          <Link
            href="/admin"
            className="px-6 py-3 bg-stone-950 text-white rounded-xl text-sm tracking-wider uppercase hover:bg-stone-800 transition-colors font-light"
          >
            Back to Admin
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-6 mb-6 border border-stone-200">
          <div className="flex gap-4 items-center flex-wrap">
            <Filter className="w-5 h-5 text-stone-400" strokeWidth={1.5} />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-stone-200 rounded-lg text-sm bg-white"
            >
              <option value="all">All Types</option>
              <option value="share_sselfies">Shared SSELFIEs</option>
              <option value="bug">Bugs</option>
              <option value="feature">Features</option>
              <option value="testimonial">Testimonials</option>
              <option value="general">General</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-stone-200 rounded-lg text-sm bg-white"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="reviewing">Reviewing</option>
              <option value="resolved">Resolved</option>
            </select>
            <span className="text-sm text-stone-500 ml-auto font-light">{feedback.length} items</span>
          </div>
        </div>

        {/* Feedback List */}
        <div className="space-y-4">
          {feedback.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-6 border border-stone-200 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <div>{getStatusIcon(item.status)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-light uppercase tracking-wider ${getTypeColor(item.type)}`}
                      >
                        {item.type === "share_sselfies" ? (
                          <span className="flex items-center gap-1.5">
                            <Camera className="w-3 h-3" strokeWidth={2} />
                            SSELFIEs
                          </span>
                        ) : (
                          item.type.replace("_", " ")
                        )}
                      </span>
                      <span className="text-xs text-stone-500 font-light">
                        {new Date(item.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <h3 className="font-serif text-xl font-extralight text-stone-950 mb-2 tracking-wide">
                      {item.subject}
                    </h3>
                    <p className="text-sm text-stone-600 leading-relaxed mb-3 font-light">{item.message}</p>

                    {item.images && item.images.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
                        {item.images.map((url, idx) => (
                          <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="group">
                            <img
                              src={url || "/placeholder.svg"}
                              alt={`SSELFIE ${idx + 1}`}
                              className="w-full h-32 object-cover rounded-lg border border-stone-200 group-hover:border-stone-400 transition-colors"
                            />
                          </a>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-stone-500 font-light">
                      From: {item.user_name || "Unknown"} ({item.user_email || "No email"})
                    </p>

                    {item.admin_reply && (
                      <div className="mt-4 p-4 bg-stone-100 border border-stone-200 rounded-lg">
                        <p className="text-xs text-stone-600 font-medium mb-1 tracking-wide">Your Reply:</p>
                        <p className="text-sm text-stone-700 font-light">{item.admin_reply}</p>
                        <p className="text-xs text-stone-500 mt-2 font-light">
                          Sent:{" "}
                          {new Date(item.replied_at!).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    )}

                    {replyingTo === item.id && (
                      <div className="mt-4 space-y-3">
                        <Textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write your reply to this user... (They'll receive it via email)"
                          className="min-h-[100px] resize-none"
                          maxLength={500}
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setReplyingTo(null)
                              setReplyText("")
                            }}
                            variant="outline"
                            size="sm"
                            disabled={isSendingReply}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => sendReply(item.id)}
                            disabled={!replyText.trim() || isSendingReply}
                            size="sm"
                            className="bg-stone-950 hover:bg-stone-800"
                          >
                            {isSendingReply ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              "Send Reply"
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!item.admin_reply && replyingTo !== item.id && (
                    <button
                      onClick={() => setReplyingTo(item.id)}
                      className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-xs hover:bg-stone-200 transition-colors flex items-center gap-1.5 font-light"
                    >
                      <Reply className="w-3 h-3" strokeWidth={2} />
                      Reply
                    </button>
                  )}
                  {item.status === "new" && (
                    <button
                      onClick={() => updateStatus(item.id, "reviewing")}
                      className="px-4 py-2 bg-stone-200 text-stone-700 rounded-lg text-xs hover:bg-stone-300 transition-colors font-light"
                    >
                      Review
                    </button>
                  )}
                  {item.status === "reviewing" && (
                    <button
                      onClick={() => updateStatus(item.id, "resolved")}
                      className="px-4 py-2 bg-stone-300 text-stone-800 rounded-lg text-xs hover:bg-stone-400 transition-colors font-light"
                    >
                      Resolve
                    </button>
                  )}
                  {item.status === "resolved" && (
                    <button
                      onClick={() => updateStatus(item.id, "new")}
                      className="px-4 py-2 bg-stone-100 text-stone-700 rounded-lg text-xs hover:bg-stone-200 transition-colors font-light"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {feedback.length === 0 && (
          <div className="text-center py-12">
            <p className="text-stone-500 font-light">No feedback yet. Start collecting user feedback.</p>
          </div>
        )}
      </div>
    </div>
  )
}
