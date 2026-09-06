"use client"

import { useState } from "react"

export function VisibilityPlanGenerator() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [answerCount, setAnswerCount] = useState<number | null>(null)

  async function generatePlan() {
    setIsGenerating(true)
    setStatus("Maya is creating your Maya Visibility Plan...")

    try {
      const response = await fetch("/api/academy/visibility-suite/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || "Maya could not create your plan right now.")
      }
      setAnswerCount(data.answerCount ?? null)
      if (data.url) {
        try {
          window.sessionStorage.setItem(
            "sselfie.maya.visibilityPlanHandoff",
            JSON.stringify({
              source: "visibility_suite",
              token: typeof data.token === "string" ? data.token : null,
              url: data.url,
              answerCount: data.answerCount ?? null,
              createdAt: new Date().toISOString(),
            })
          )
        } catch {
          // The Studio handoff is helpful but not required to view the plan.
        }
        window.location.href = data.url
        return
      }
      throw new Error("Plan URL missing.")
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Something went wrong.")
      setIsGenerating(false)
    }
  }

  return (
    <div
      className="mt-8 border p-6 md:p-8"
      style={{ borderColor: "rgba(15,13,11,0.18)", background: "#EDE9E2" }}
    >
      <p className="text-[10px] font-medium uppercase tracking-[0.34em] text-[#7A6F63]">
        Step 04 - Maya Visibility Plan
      </p>
      <h3 className="mt-4 font-serif text-[clamp(28px,5vw,48px)] uppercase leading-none text-[#0F0D0B]">
        Create your Maya Visibility Plan.
      </h3>
      <p className="mt-4 max-w-2xl text-[14px] leading-[1.75] text-[#3D3830]">
        After you complete the workbooks, Maya will turn your answers into one clean plan: your
        message, content rhythm, first offer, sales post, and next 7 days.
      </p>
      <div className="mt-5 flex max-w-2xl flex-wrap gap-2">
        {["Message", "Content rhythm", "Offer path", "Sales post", "DM scripts", "Next 7 days"].map(
          item => (
            <span
              key={item}
              className="border px-3 py-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[#3D3830]"
              style={{ borderColor: "rgba(15,13,11,0.14)", background: "#FFFFFF" }}
            >
              {item}
            </span>
          )
        )}
      </div>
      <button
        type="button"
        onClick={generatePlan}
        disabled={isGenerating}
        className="mt-7 inline-flex px-8 py-[13px] text-[10px] font-semibold uppercase tracking-[0.22em] transition-opacity hover:opacity-90 disabled:opacity-45"
        style={{ background: "#0F0D0B", color: "#F4F0E6" }}
      >
        {isGenerating ? "Creating Plan..." : "Create My Maya Visibility Plan"}
      </button>
      {status ? (
        <p className="mt-4 text-[13px] leading-6 text-[#7A6F63]">
          {status}
          {answerCount !== null ? ` (${answerCount} saved answers found.)` : ""}
        </p>
      ) : null}
    </div>
  )
}
