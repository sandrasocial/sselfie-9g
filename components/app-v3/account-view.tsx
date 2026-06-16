"use client"

// SSELFIE Studio 3.0 — native Account (MAYA-REBUILD-15, QA P0-3).
// Members manage everything here without leaving /app: membership, credits, billing (Stripe
// portal), Maya's brand memory (opens the dedicated Memory screen directly, QA P1-6), saved
// selfies, support, and logout. Trained Flux models now enter through Maya's app-v3 flow,
// never the old Studio interface.

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { MemoryModal } from "./memory-modal"

interface AccountData {
  plan: string | null
  status: string | null
  renewsAt: string | null
  credits: number | null
  email: string | null
}

const SUPPORT_EMAIL = "support@sselfie.ai"

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch {
    return ""
  }
}

const card = "rounded-[8px] border border-[#C5C6C8]/60 bg-white p-4 sm:p-5"
const cardTitle = "text-[10px] uppercase tracking-[0.22em] text-[#818283]"
const primaryBtn =
  "inline-flex min-h-11 items-center justify-center rounded-[4px] bg-[#0D0E10] px-4 py-2.5 text-center text-[11px] uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#282728] disabled:opacity-50"
const quietBtn =
  "inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.16em] text-[#4F5052] underline underline-offset-2 hover:text-[#0D0E10]"

export function AccountView({
  firstName,
  onOpenLibrary,
  onUseTrainedModel,
  trialDaysLeft,
  hasTrainedModel = false,
}: {
  firstName?: string | null
  onOpenLibrary?: () => void
  onUseTrainedModel?: () => void
  /** Set while on a SUITE trial (BRIDGE-01 Phase D) — shows the trial badge. */
  trialDaysLeft?: number | null
  /** True when the member has a completed, non-test trained model. Gates the legacy entry. */
  hasTrainedModel?: boolean
}) {
  const [data, setData] = useState<AccountData | null>(null)
  const [selfies, setSelfies] = useState<string[] | null>(null)
  const [memoryOpen, setMemoryOpen] = useState(false)
  const [billingBusy, setBillingBusy] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/app-v3/account")
      .then(r => r.json())
      .then(d => setData(d && typeof d === "object" ? d : null))
      .catch(() => setData(null))
    fetch("/api/app-v3/reference-library")
      .then(r => r.json())
      .then(d => setSelfies(Array.isArray(d?.images) ? d.images : []))
      .catch(() => setSelfies([]))
  }, [])

  async function openBilling() {
    if (billingBusy) return
    setBillingBusy(true)
    setBillingError(null)
    try {
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath: "/app" }),
      })
      const d = (await res.json().catch(() => null)) as { url?: string; message?: string } | null
      if (res.ok && d?.url) {
        window.location.href = d.url
        return
      }
      setBillingError(d?.message || "Couldn't open billing. Try again, or email support.")
    } catch {
      setBillingError("Couldn't open billing. Try again, or email support.")
    }
    setBillingBusy(false)
  }

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      const res = await fetch("/api/auth/logout", { method: "POST", credentials: "include" })
      if (res.ok) {
        window.location.href = "/auth/login"
        return
      }
    } catch {
      /* fall through to reset */
    }
    setLoggingOut(false)
  }

  async function handleAddSelfie(file: File) {
    setUploading(true)
    setUploadError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/app-v3/upload-selfie", { method: "POST", body: form })
      const d = (await res.json().catch(() => null)) as { url?: string; error?: string } | null
      if (!res.ok || !d?.url) throw new Error(d?.error || "Upload failed")
      setSelfies(prev => [d.url as string, ...(prev ?? [])])
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-5 sm:py-8">
      <p className="text-[10px] uppercase tracking-[0.3em] text-[#818283]">Account</p>
      <h1 className="mt-2 font-serif text-[30px] font-light leading-tight text-[#0D0E10]">
        {firstName ? `Hi ${firstName}` : "Your account"}
      </h1>
      {data?.email && <p className="mt-1 text-[13px] text-[#818283]">{data.email}</p>}

      <div className="mt-6 space-y-3">
        {/* Membership */}
        <div className={card}>
          <p className={cardTitle}>Membership</p>
          {typeof trialDaysLeft === "number" ? (
            <>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-serif text-[22px] font-light text-[#0D0E10]">SUITE trial</p>
                <span className="text-[11px] uppercase tracking-[0.16em] text-[#4F5052]">
                  {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"} left
                </span>
              </div>
              <p className="mt-1 text-[13px] text-[#818283]">
                When it ends, your photos stay yours. Members keep Maya and everything included.
              </p>
              <div className="mt-4">
                <a
                  href="/checkout/membership?interval=month&source=trial_account"
                  className={primaryBtn}
                >
                  Keep your Studio
                </a>
              </div>
            </>
          ) : (
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="font-serif text-[22px] font-light text-[#0D0E10]">
                {data?.plan ?? "SSELFIE SUITE"}
              </p>
              {data?.status === "active" && (
                <span className="text-[11px] uppercase tracking-[0.16em] text-[#4F5052]">
                  Active
                </span>
              )}
            </div>
          )}
          {typeof trialDaysLeft !== "number" && (
            <>
              {data?.renewsAt && (
                <p className="mt-1 text-[13px] text-[#818283]">
                  Renews {formatDate(data.renewsAt)}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={openBilling}
                  disabled={billingBusy}
                  className={primaryBtn}
                >
                  {billingBusy ? "Opening…" : "Manage billing"}
                </button>
                <span className="text-[12px] text-[#818283]">Payment method, invoices, plan.</span>
              </div>
              {billingError && <p className="mt-2 text-[12px] text-[#282728]">{billingError}</p>}
            </>
          )}
        </div>

        {/* Credits */}
        <div className={card}>
          <p className={cardTitle}>Credits</p>
          <p className="mt-2 font-serif text-[22px] font-light text-[#0D0E10]">
            {typeof data?.credits === "number" ? `${data.credits} credits` : "—"}
          </p>
          <p className="mt-1 text-[13px] text-[#818283]">
            Each image is one credit. Your plan refills monthly.
          </p>
          <div className="mt-4">
            <a href="/checkout/credits" className={primaryBtn}>
              Top up credits
            </a>
          </div>
        </div>

        {/* Your SSELFIE — pointer into the Library tab (BRIDGE-01 Phase C) */}
        {onOpenLibrary && (
          <div className={card}>
            <p className={cardTitle}>Your SSELFIE</p>
            <p className="mt-2 text-[14px] leading-relaxed text-[#4F5052]">
              Every product you own, your courses, and the weekly drops live in your Library.
            </p>
            <div className="mt-4">
              <button type="button" onClick={onOpenLibrary} className={primaryBtn}>
                Open Library
              </button>
            </div>
          </div>
        )}

        {/* Brand & memory — straight to the Memory screen, never a chat (QA P1-6). */}
        <div className={card}>
          <p className={cardTitle}>Brand &amp; memory</p>
          <p className="mt-2 text-[14px] leading-relaxed text-[#4F5052]">
            What Maya remembers about you and your brand, and the name you gave her.
          </p>
          <div className="mt-4">
            <button type="button" onClick={() => setMemoryOpen(true)} className={primaryBtn}>
              Open memory
            </button>
          </div>
        </div>

        {/* Saved selfies (identity references) */}
        <div className={card}>
          <p className={cardTitle}>Your selfies</p>
          <p className="mt-2 text-[14px] leading-relaxed text-[#4F5052]">
            The selfies Maya can use to keep your face in every shoot. Your newest one is used
            automatically.
          </p>
          {selfies && selfies.length > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
              {selfies.slice(0, 12).map(url => (
                <div
                  key={url}
                  className="relative aspect-square overflow-hidden rounded-[4px] border border-[#C5C6C8]/60"
                >
                  <Image src={url} alt="Saved selfie" fill className="object-cover" sizes="96px" />
                </div>
              ))}
            </div>
          )}
          {selfies && selfies.length === 0 && (
            <p className="mt-3 text-[13px] text-[#818283]">No saved selfies yet.</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className={primaryBtn}
            >
              {uploading ? "Uploading…" : "Add a selfie"}
            </button>
          </div>
          {uploadError && <p className="mt-2 text-[12px] text-[#282728]">{uploadError}</p>}
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) void handleAddSelfie(f)
            }}
          />
        </div>

        {/* Trained model — quiet, discoverable entry into Maya's new app flow. Only
            for members with a completed, non-test trained model (gated server-side). */}
        {hasTrainedModel && onUseTrainedModel && (
          <div className={card}>
            <p className={cardTitle}>Your trained model</p>
            <p className="mt-2 font-serif text-[22px] font-light text-[#0D0E10]">
              Use my trained model
            </p>
            <p className="mt-1 text-[14px] leading-relaxed text-[#4F5052]">
              Create with your saved model inside Maya, without opening the old Studio.
            </p>
            <div className="mt-4">
              <button type="button" onClick={onUseTrainedModel} className={primaryBtn}>
                Use my trained model
              </button>
            </div>
          </div>
        )}

        {/* Support */}
        <div className={card}>
          <p className={cardTitle}>Support</p>
          <p className="mt-2 text-[14px] leading-relaxed text-[#4F5052]">
            Stuck on something, or found a bug? Email us and a real person answers.
          </p>
          <div className="mt-4">
            <a href={`mailto:${SUPPORT_EMAIL}`} className={primaryBtn}>
              Email support
            </a>
          </div>
        </div>

        {/* Logout (legacy Studio entry now lives in the gated "Your trained model" card above). */}
        <div className="flex flex-col gap-1 px-1 pt-2 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-end min-[420px]:gap-3">
          <button type="button" onClick={handleLogout} disabled={loggingOut} className={quietBtn}>
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      </div>

      <MemoryModal open={memoryOpen} onClose={() => setMemoryOpen(false)} onSaved={() => {}} />
    </div>
  )
}
