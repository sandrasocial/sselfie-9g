"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"

import {
  founderFeedbackReportTypeLabel,
  founderFeedbackStatusLabel,
  summarizeFounderFeedbackMessages,
  type FounderFeedbackContext,
  type FounderFeedbackReportType,
} from "@/lib/app-v3/maya/founder-feedback"

type SpeechRecognitionResultEvent = {
  results: ArrayLike<{
    isFinal: boolean
    0?: { transcript?: string }
  }>
}

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null
  onend: (() => void) | null
  onerror: (() => void) | null
}

type FounderReport = {
  id: string
  reportType: FounderFeedbackReportType
  message: string
  status: string
  statusLabel?: string
  createdAt: string
  note?: string | null
}

const REPORT_TYPES: FounderFeedbackReportType[] = ["blocked", "confusing", "quality", "idea"]

const ENDPOINT = "/api/app-v3/maya/founder-feedback"

function formatReportDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Recently"
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function MayaFounderTestMode({
  context,
  messages,
}: {
  context: FounderFeedbackContext & { messages?: unknown[] }
  messages?: unknown[]
}) {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<"capture" | "reports">("capture")
  const [reportType, setReportType] = useState<FounderFeedbackReportType>("quality")
  const [message, setMessage] = useState("")
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [reports, setReports] = useState<FounderReport[]>([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsError, setReportsError] = useState<string | null>(null)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const transcriptBaseRef = useRef("")

  useEffect(() => {
    setMounted(true)
    const speechWindow = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike
      webkitSpeechRecognition?: new () => SpeechRecognitionLike
    }
    setSpeechSupported(
      Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition)
    )
    return () => recognitionRef.current?.stop()
  }, [])

  useEffect(() => {
    if (!open || view !== "capture") return
    const frame = window.requestAnimationFrame(() => textareaRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [open, view])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) setOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, saving])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4500)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!open || view !== "reports") return
    let cancelled = false
    setReportsLoading(true)
    setReportsError(null)
    void fetch(ENDPOINT, { cache: "no-store" })
      .then(async response => {
        const data = (await response.json().catch(() => null)) as {
          reports?: FounderReport[]
          error?: string
        } | null
        if (!response.ok) throw new Error(data?.error || "Reports are unavailable right now")
        if (!cancelled) setReports(Array.isArray(data?.reports) ? data.reports : [])
      })
      .catch(fetchError => {
        if (!cancelled) {
          setReportsError(
            fetchError instanceof Error ? fetchError.message : "Reports are unavailable right now"
          )
        }
      })
      .finally(() => {
        if (!cancelled) setReportsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, view])

  const openCapture = () => {
    setView("capture")
    setError(null)
    setOpen(true)
  }

  const startSpeaking = () => {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike
      webkitSpeechRecognition?: new () => SpeechRecognitionLike
    }
    const Constructor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition
    if (!Constructor) return

    recognitionRef.current?.stop()
    const recognition = new Constructor()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = navigator.language || "en-GB"
    transcriptBaseRef.current = message.trim()
    recognition.onresult = event => {
      const transcript = Array.from(event.results)
        .map(result => result[0]?.transcript || "")
        .join(" ")
        .trim()
      setMessage([transcriptBaseRef.current, transcript].filter(Boolean).join(" "))
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => {
      setListening(false)
      setError("Voice typing stopped. Your written note is still here.")
    }
    recognitionRef.current = recognition
    setError(null)
    setListening(true)
    recognition.start()
  }

  const saveReport = async () => {
    const note = message.trim()
    if (!note) {
      setError("Write or speak one sentence about what felt wrong.")
      textareaRef.current?.focus()
      return
    }

    setSaving(true)
    setError(null)
    const clientReportId = globalThis.crypto?.randomUUID?.() || `maya-report-${Date.now()}`
    const payload = {
      clientReportId,
      reportType,
      message: note,
      context: {
        ...context,
        messages: undefined,
        currentPath: `${window.location.pathname}${window.location.search}`,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        recentMessages: summarizeFounderFeedbackMessages(messages ?? context.messages),
        capturedAt: new Date().toISOString(),
        userAgent: navigator.userAgent,
      },
    }
    const form = new FormData()
    form.set("payload", JSON.stringify(payload))
    if (screenshot) form.set("screenshot", screenshot)

    try {
      const response = await fetch(ENDPOINT, { method: "POST", body: form })
      const data = (await response.json().catch(() => null)) as {
        report?: FounderReport
        error?: string
      } | null
      if (!response.ok || !data?.report) {
        throw new Error(data?.error || "The report did not save. Try again.")
      }
      setReports(current => [data.report as FounderReport, ...current])
      setMessage("")
      setScreenshot(null)
      setReportType("quality")
      setOpen(false)
      setToast("Saved. Keep testing Maya.")
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "The report did not save. Try again."
      )
    } finally {
      setSaving(false)
    }
  }

  const updateReport = async (report: FounderReport, action: "verify" | "reopen") => {
    setReportsError(null)
    try {
      const response = await fetch(ENDPOINT, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: report.id, action }),
      })
      const data = (await response.json().catch(() => null)) as {
        report?: FounderReport
        error?: string
      } | null
      if (!response.ok || !data?.report) {
        throw new Error(data?.error || "The report could not be updated")
      }
      setReports(current =>
        current.map(item => (item.id === report.id ? (data.report as FounderReport) : item))
      )
    } catch (updateError) {
      setReportsError(
        updateError instanceof Error ? updateError.message : "The report could not be updated"
      )
    }
  }

  const dialog = open ? (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close report"
        className="absolute inset-0 bg-[#0D0E10]/35 backdrop-blur-[2px]"
        onClick={() => !saving && setOpen(false)}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="maya-founder-report-title"
        className="suite-dialog relative z-10 flex max-h-[88dvh] w-full max-w-xl flex-col overflow-hidden"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#C5C6C8]/45 bg-white px-5 py-4 sm:px-6">
          <div>
            <p className="text-[9px] uppercase tracking-[0.24em] text-[#818283]">Maya test mode</p>
            <h2
              id="maya-founder-report-title"
              className="mt-1 font-serif text-[25px] font-light leading-tight text-[#0D0E10]"
            >
              Report what felt wrong
            </h2>
            <p className="mt-1 text-[12px] leading-relaxed text-[#4F5052]">
              Say it normally. The useful technical details are attached for you.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !saving && setOpen(false)}
            className="inline-flex min-h-11 shrink-0 items-center text-[10px] uppercase tracking-[0.16em] text-[#4F5052] hover:text-[#0D0E10]"
          >
            Close
          </button>
        </header>

        <div className="flex shrink-0 border-b border-[#C5C6C8]/45 bg-white px-5 sm:px-6">
          {(["capture", "reports"] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setView(tab)}
              aria-current={view === tab ? "page" : undefined}
              className={`min-h-11 border-b px-1 text-[10px] uppercase tracking-[0.16em] transition-colors ${
                tab === "reports" ? "ml-6" : ""
              } ${
                view === tab
                  ? "border-[#0D0E10] text-[#0D0E10]"
                  : "border-transparent text-[#818283] hover:text-[#282728]"
              }`}
            >
              {tab === "capture" ? "New report" : "Reports"}
            </button>
          ))}
        </div>

        {view === "capture" ? (
          <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
            <fieldset>
              <legend className="text-[10px] uppercase tracking-[0.16em] text-[#6D6E70]">
                What kind of problem?
              </legend>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {REPORT_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    aria-pressed={reportType === type}
                    onClick={() => setReportType(type)}
                    className={`min-h-11 rounded-[7px] border px-2.5 py-2 text-[11px] leading-tight transition-colors ${
                      reportType === type
                        ? "border-[#0D0E10] bg-[#0D0E10] text-white"
                        : "border-[#C5C6C8]/70 bg-white text-[#4F5052] hover:border-[#818283] hover:text-[#0D0E10]"
                    }`}
                  >
                    {founderFeedbackReportTypeLabel(type)}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="mt-5 block text-[10px] uppercase tracking-[0.16em] text-[#6D6E70]">
              What happened?
              <textarea
                ref={textareaRef}
                aria-label="What happened?"
                value={message}
                onChange={event => setMessage(event.target.value.slice(0, 5000))}
                placeholder="Example: Maya gave me a good answer, but it still sounded generic and did not use what she knows about me."
                rows={5}
                className="mt-2 min-h-32 w-full resize-y rounded-[10px] border border-[#C5C6C8]/70 bg-white px-4 py-3 text-[15px] normal-case leading-relaxed tracking-normal text-[#282728] outline-none transition-[border-color,box-shadow] focus:border-[#0D0E10] focus:shadow-[0_0_0_3px_rgba(13,14,16,0.06)]"
              />
            </label>

            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
              {speechSupported ? (
                <button
                  type="button"
                  onClick={listening ? () => recognitionRef.current?.stop() : startSpeaking}
                  className="inline-flex min-h-11 items-center text-[10px] uppercase tracking-[0.15em] text-[#4F5052] underline decoration-[#C5C6C8] underline-offset-4 hover:text-[#0D0E10]"
                >
                  {listening ? "Stop listening" : "Speak instead"}
                </button>
              ) : null}
              <label className="inline-flex min-h-11 cursor-pointer items-center text-[10px] uppercase tracking-[0.15em] text-[#4F5052] underline decoration-[#C5C6C8] underline-offset-4 hover:text-[#0D0E10]">
                {screenshot ? "Change screenshot" : "Add screenshot"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={event => setScreenshot(event.target.files?.[0] || null)}
                />
              </label>
              {screenshot ? (
                <span className="max-w-full truncate text-[11px] text-[#6D6E70]">
                  {screenshot.name}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-[#818283]">
              Only attach the Maya screen. Avoid customer or payment details.
            </p>

            {error ? (
              <p role="alert" className="mt-3 text-[12px] leading-relaxed text-[#4F5052]">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex items-center justify-between gap-4 border-t border-[#C5C6C8]/45 pt-4">
              <p className="max-w-[15rem] text-[11px] leading-relaxed text-[#818283]">
                Your current Maya task and recent relevant turns are included automatically.
              </p>
              <button
                type="button"
                onClick={() => void saveReport()}
                disabled={saving || message.trim().length === 0}
                className="min-h-12 shrink-0 rounded-[7px] bg-[#0D0E10] px-5 text-[10px] uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-90 disabled:opacity-35"
              >
                {saving ? "Saving" : "Save and keep testing"}
              </button>
            </div>
          </div>
        ) : (
          <div className="min-h-[18rem] overflow-y-auto px-5 py-5 sm:px-6">
            {reportsLoading ? (
              <p className="text-[13px] text-[#4F5052]">Loading your reports…</p>
            ) : reportsError ? (
              <p role="alert" className="text-[13px] text-[#4F5052]">
                {reportsError}
              </p>
            ) : reports.length === 0 ? (
              <div className="py-10 text-center">
                <p className="font-serif text-[23px] font-light text-[#0D0E10]">
                  Nothing reported yet.
                </p>
                <p className="mt-2 text-[13px] text-[#4F5052]">
                  Keep testing. When something feels wrong, save one sentence here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map(report => {
                  const statusLabel =
                    report.statusLabel || founderFeedbackStatusLabel(report.status)
                  return (
                    <article
                      key={report.id}
                      className="rounded-[10px] border border-[#C5C6C8]/60 bg-white p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[9px] uppercase tracking-[0.16em] text-[#818283]">
                          {founderFeedbackReportTypeLabel(report.reportType)} ·{" "}
                          {formatReportDate(report.createdAt)}
                        </p>
                        <span className="shrink-0 rounded-full border border-[#C5C6C8]/65 px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] text-[#4F5052]">
                          {statusLabel}
                        </span>
                      </div>
                      <p className="mt-3 text-[14px] leading-relaxed text-[#282728]">
                        {report.message}
                      </p>
                      {report.note ? (
                        <p className="mt-3 border-t border-[#C5C6C8]/45 pt-3 text-[12px] leading-relaxed text-[#4F5052]">
                          {report.note}
                        </p>
                      ) : null}
                      {report.status === "deployed" ? (
                        <div className="mt-3 flex flex-wrap gap-4 border-t border-[#C5C6C8]/45 pt-3">
                          <button
                            type="button"
                            onClick={() => void updateReport(report, "verify")}
                            className="min-h-11 text-[10px] uppercase tracking-[0.14em] text-[#0D0E10] underline underline-offset-4"
                          >
                            This is fixed
                          </button>
                          <button
                            type="button"
                            onClick={() => void updateReport(report, "reopen")}
                            className="min-h-11 text-[10px] uppercase tracking-[0.14em] text-[#4F5052] underline underline-offset-4"
                          >
                            Still wrong
                          </button>
                        </div>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  ) : null

  return (
    <>
      <button
        type="button"
        onClick={openCapture}
        className="inline-flex min-h-11 items-center py-1 text-[11px] uppercase tracking-[0.14em] text-[#4F5052] underline decoration-[#C5C6C8] underline-offset-4 hover:text-[#0D0E10]"
      >
        Report
      </button>
      {mounted && dialog ? createPortal(dialog, document.body) : null}
      {toast ? (
        <div
          role="status"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 z-[110] -translate-x-1/2 rounded-full bg-[#0D0E10] px-4 py-2.5 text-center text-[11px] text-white shadow-lg"
        >
          {toast}
        </div>
      ) : null}
    </>
  )
}
