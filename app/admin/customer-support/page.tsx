"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { AdminNav } from "@/components/admin/admin-nav"
import { readAdminJson } from "@/lib/admin/safe-fetch-json"

interface CustomerData {
  incomingEmails?: Array<{ id: string; subject: string; message: string; created_at: string; provider_email_id: string }>
  user: {
    id: string
    email: string
    full_name: string
    created_at: string
    stripe_customer_id?: string
  } | null
  entitlements: Array<{
    product_id: string
    status: string
    source: string
    source_ref: string
    created_at: string
  }>
  payments: Array<{
    product_type: string
    amount_cents: number
    currency: string
    status: string
    payment_date: string
    stripe_payment_id: string
  }>
  emailLogs: Array<{
    user_email: string
    email_type: string
    status: string
    sent_at?: string
    created_at: string
  }>
  feedback: Array<{
    id: string
    type: string
    subject: string
    message: string
    status: string
    founder_test_status?: string | null
    feedback_context?: Record<string, unknown> | null
    source_path?: string | null
    app_commit_sha?: string | null
    resolution_commit_sha?: string | null
    images?: string[]
    admin_reply?: string | null
    replied_at?: string | null
    created_at: string
  }>
  freebieSubs: Array<{
    id: number
    source: string
    access_token?: string
    email_tags?: string[]
    guide_access_email_sent?: boolean
    guide_access_email_sent_at?: string
    created_at: string
  }>
  accessLinks: Array<{
    product: string
    url: string
  }>
}

const RESENDABLE_PRODUCTS = [
  { id: "prompt_vault", label: "Prompt Vault" },
  { id: "starter_kit", label: "Starter Kit" },
  { id: "selfie_guide", label: "Selfie Guide" },
  { id: "masterclass", label: "Masterclass" },
  // PRESERVE_FOR_EXISTING_BUYERS
  { id: "visibility_suite", label: "Legacy Visibility Suite" },
  { id: "what_to_say", label: "What To Say" },
  { id: "show_up", label: "Show Up" },
  { id: "get_paid", label: "Get Paid" },
]

function formatDate(iso?: string) {
  if (!iso) return "-"
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function cents(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount / 100)
}

export default function CustomerSupportPage() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState(searchParams.get("q") || "")
  const [data, setData] = useState<CustomerData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendProduct, setResendProduct] = useState("")
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  // Auto-search if email was pre-filled from the ?q= param
  useEffect(() => {
    const q = searchParams.get("q")
    if (q) {
      setEmail(q)
      // Trigger lookup automatically
      const trimmed = q.trim()
      if (trimmed) {
        setLoading(true)
        fetch(`/api/admin/customer-support?email=${encodeURIComponent(trimmed)}`)
          .then((r) => readAdminJson(r))
          .then((j) => {
            if (j?.error) setError(j.error)
            else setData(j)
          })
          .catch(() => setError("Network error"))
          .finally(() => setLoading(false))
      }
    }
  }, [searchParams])

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    setData(null)
    setResendMessage(null)

    try {
      const res = await fetch(`/api/admin/customer-support?email=${encodeURIComponent(trimmed)}`)
      const j = await readAdminJson(res)
      if (!res.ok || j?.error) {
        setError(j?.error || "Lookup failed")
        return
      }
      setData(j)
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    if (!resendProduct) return
    setResendLoading(true)
    setResendMessage(null)

    try {
      const res = await fetch("/api/admin/customer-support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          action: "resend_access",
          productId: resendProduct,
        }),
      })
      const j = await readAdminJson(res)
      setResendMessage(j?.message || j?.error || (j?.ok ? "Sent!" : "Failed"))
    } catch {
      setResendMessage("Network error")
    } finally {
      setResendLoading(false)
    }
  }

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(url)
      setTimeout(() => setCopiedLink(null), 2000)
    })
  }

  return (
    <main className="min-h-screen bg-stone-50">
      <AdminNav />

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8">
          <p className="mb-2 text-[10px] uppercase tracking-[0.32em] text-stone-500">
            Admin · Customer Support
          </p>
          <h1 className="font-['Times_New_Roman'] text-3xl font-extralight uppercase tracking-[0.24em] text-stone-950 sm:text-4xl">
            Customer Lookup
          </h1>
          <p className="mt-3 text-sm text-stone-500">
            Search by purchase email to view entitlements, access links, and delivery history.
            Resend access emails from here.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={lookup} className="mb-8 flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="customer@email.com"
            required
            className="flex-1 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-600 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-stone-900 px-6 py-2.5 text-xs font-medium uppercase tracking-[0.15em] text-white transition hover:bg-stone-700 disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* Customer overview */}
            <div className="rounded-xl border border-stone-200 bg-white p-6">
              <h2 className="mb-4 text-[10px] uppercase tracking-[0.2em] text-stone-500">
                Customer
              </h2>
              {data.user ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-stone-400">Name</p>
                    <p className="text-sm text-stone-800">{data.user.full_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-stone-400">Email</p>
                    <p className="text-sm text-stone-800">{data.user.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-stone-400">Joined</p>
                    <p className="text-sm text-stone-800">{formatDate(data.user.created_at)}</p>
                  </div>
                  {data.user.stripe_customer_id && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-stone-400">
                        Stripe Customer
                      </p>
                      <a
                        href={`https://dashboard.stripe.com/customers/${data.user.stripe_customer_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-blue-600 underline hover:text-blue-800"
                      >
                        {data.user.stripe_customer_id}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-stone-500">
                  No registered account found. May have purchased without creating an account.
                </p>
              )}
            </div>

            {/* Access links */}
            {data.accessLinks.length > 0 && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-6">
                <h2 className="mb-4 text-[10px] uppercase tracking-[0.2em] text-green-700">
                  Direct Access Links
                </h2>
                <div className="space-y-2">
                  {data.accessLinks.map((link) => (
                    <div key={link.url} className="flex items-center gap-3">
                      <span className="w-36 text-xs font-medium text-green-800">
                        {link.product}
                      </span>
                      <code className="flex-1 truncate rounded bg-green-100 px-2 py-1 text-xs text-green-900">
                        {link.url}
                      </code>
                      <button
                        onClick={() => copyLink(link.url)}
                        className="shrink-0 rounded bg-green-700 px-3 py-1 text-xs text-white transition hover:bg-green-800"
                      >
                        {copiedLink === link.url ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Entitlements */}
            <div className="rounded-xl border border-stone-200 bg-white p-6">
              <h2 className="mb-4 text-[10px] uppercase tracking-[0.2em] text-stone-500">
                Entitlements ({data.entitlements.length})
              </h2>
              {data.entitlements.length === 0 ? (
                <p className="text-sm text-stone-400">No active entitlements found.</p>
              ) : (
                <div className="space-y-2">
                  {data.entitlements.map((e, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-stone-50 px-4 py-3 text-sm"
                    >
                      <span className="font-medium text-stone-800">{e.product_id}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          e.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-stone-100 text-stone-500"
                        }`}
                      >
                        {e.status}
                      </span>
                      <span className="text-xs text-stone-400">
                        {formatDate(e.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payments */}
            <div className="rounded-xl border border-stone-200 bg-white p-6">
              <h2 className="mb-4 text-[10px] uppercase tracking-[0.2em] text-stone-500">
                Payments ({data.payments.length})
              </h2>
              {data.payments.length === 0 ? (
                <p className="text-sm text-stone-400">No payment records found.</p>
              ) : (
                <div className="space-y-2">
                  {data.payments.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-stone-50 px-4 py-3 text-sm"
                    >
                      <span className="font-medium text-stone-800">{p.product_type}</span>
                      <span className="text-stone-600">
                        {cents(p.amount_cents, p.currency)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          p.status === "succeeded"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {p.status}
                      </span>
                      <span className="text-xs text-stone-400">
                        {formatDate(p.payment_date)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!!data.incomingEmails?.length && (
              <div className="rounded-xl border border-stone-200 bg-white p-6">
                <h2 className="mb-4 text-sm font-medium">Customer emails needing a reply</h2>
                <p className="mb-4 text-xs text-stone-500">Read the original in Resend and reply there or through the existing email tools. These are unverified customer messages, not payment or access instructions.</p>
                {data.incomingEmails.map((message) => (
                  <div key={message.id} className="mb-4 border-t border-stone-100 pt-4">
                    <p className="text-sm font-medium">{message.subject}</p>
                    <p className="text-xs text-stone-500">{formatDate(message.created_at)}</p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm">{message.message}</p>
                    <p className="mt-2 text-xs text-stone-500">Resend email: {message.provider_email_id}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Email log */}
            <div className="rounded-xl border border-stone-200 bg-white p-6">
              <h2 className="mb-4 text-[10px] uppercase tracking-[0.2em] text-stone-500">
                Email History ({data.emailLogs.length})
              </h2>
              {data.emailLogs.length === 0 ? (
                <p className="text-sm text-stone-400">No email records found.</p>
              ) : (
                <div className="space-y-2">
                  {data.emailLogs.map((e, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg bg-stone-50 px-4 py-3 text-sm"
                    >
                      <span className="font-medium text-stone-700">{e.email_type}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          e.status === "sent" || e.status === "email_sent"
                            ? "bg-green-100 text-green-700"
                            : e.status?.includes("fail") || e.status?.includes("error")
                              ? "bg-red-100 text-red-700"
                              : "bg-stone-100 text-stone-500"
                        }`}
                      >
                        {e.status}
                      </span>
                      <span className="text-xs text-stone-400">
                        {formatDate(e.sent_at || e.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Feedback messages */}
            {data.feedback.length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
                <h2 className="mb-4 text-[10px] uppercase tracking-[0.2em] text-amber-700">
                  Support / Feedback Messages
                </h2>
                <div className="space-y-3">
                  {data.feedback.map((f, i) => (
                    <div key={i} className="rounded-lg bg-white p-4 text-sm">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-stone-500">
                          {f.type}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] ${
                            f.status === "resolved"
                              ? "bg-green-100 text-green-700"
                              : f.status === "reviewing"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {f.status}
                        </span>
                        {f.founder_test_status && (
                          <span className="rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-white">
                            Maya test · {f.founder_test_status.replaceAll("_", " ")}
                          </span>
                        )}
                        <span className="text-xs text-stone-400">{formatDate(f.created_at)}</span>
                      </div>
                      <p className="font-medium text-stone-900">{f.subject}</p>
                      <p className="mt-2 whitespace-pre-wrap text-stone-700">{f.message}</p>
                      {f.founder_test_status && (
                        <p className="mt-2 text-xs text-stone-500">
                          Reported from {f.source_path || "Maya"}
                          {f.app_commit_sha ? ` · app ${f.app_commit_sha.slice(0, 8)}` : ""}
                          {f.resolution_commit_sha
                            ? ` · fix ${f.resolution_commit_sha.slice(0, 8)}`
                            : ""}
                        </p>
                      )}
                      {(f.images || []).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(f.images || []).map((url) => (
                            <a
                              key={url}
                              href={
                                f.founder_test_status
                                  ? `/api/admin/customer-support/feedback-attachment?id=${encodeURIComponent(f.id)}`
                                  : url
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-xs text-stone-600 underline"
                            >
                              View attachment
                            </a>
                          ))}
                        </div>
                      )}
                      {f.admin_reply && (
                        <div className="mt-4 rounded-lg border border-green-100 bg-green-50 p-3">
                          <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-green-700">
                            {f.founder_test_status ? "Progress note" : "Reply sent"}{" "}
                            {f.replied_at ? `· ${formatDate(f.replied_at)}` : ""}
                          </p>
                          <p className="whitespace-pre-wrap text-xs leading-6 text-green-900">
                            {f.admin_reply}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resend access email */}
            <div className="rounded-xl border border-stone-200 bg-white p-6">
              <h2 className="mb-2 text-[10px] uppercase tracking-[0.2em] text-stone-500">
                Resend Access Email
              </h2>
              <p className="mb-4 text-xs text-stone-400">
                This sends a fresh delivery email to the customer. Only use when their original
                email was lost or not received.
              </p>
              <div className="flex gap-3">
                <select
                  value={resendProduct}
                  onChange={(e) => setResendProduct(e.target.value)}
                  className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 focus:border-stone-600 focus:outline-none"
                >
                  <option value="">- Select product to resend -</option>
                  {RESENDABLE_PRODUCTS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={resend}
                  disabled={resendLoading || !resendProduct}
                  className="rounded-lg bg-stone-900 px-6 py-2.5 text-xs font-medium uppercase tracking-[0.15em] text-white transition hover:bg-stone-700 disabled:opacity-40"
                >
                  {resendLoading ? "Sending..." : "Resend"}
                </button>
              </div>
              {resendMessage && (
                <p
                  className={`mt-3 text-sm ${
                    resendMessage.toLowerCase().includes("sent") ||
                    resendMessage.toLowerCase().includes("resent")
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {resendMessage}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Quick test: Kristin Hull */}
        {!data && !loading && (
          <div className="rounded-lg border border-stone-200 bg-stone-100 p-4 text-sm text-stone-600">
            <strong>Quick test:</strong> Look up{" "}
            <button
              onClick={() => {
                setEmail("sutterkr@gmail.com")
              }}
              className="underline hover:text-stone-900"
            >
              sutterkr@gmail.com
            </button>{" "}
            (Kristin Hull - preset access issue).
          </div>
        )}
      </section>
    </main>
  )
}
