"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { PublicFooter, PublicNav } from "@/components/sselfie/public-marketing"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "500", "600"] })

const QUESTIONS = [
  {
    id: "blocker",
    title: "What is blocking sales most right now?",
    options: [
      { label: "People do not understand what I do", value: "message" },
      { label: "I do not know what to post", value: "consistency" },
      { label: "I get attention, not buyers", value: "sales" },
      { label: "I need the whole path", value: "suite" },
    ],
  },
  {
    id: "posting",
    title: "Are you already posting weekly?",
    options: [
      { label: "Yes", value: "yes" },
      { label: "Not consistently", value: "no" },
    ],
  },
  {
    id: "offer",
    title: "Do you have a clear offer today?",
    options: [
      { label: "Yes", value: "yes" },
      { label: "Not yet", value: "no" },
    ],
  },
  {
    id: "attention",
    title: "Are people watching but not buying?",
    options: [
      { label: "Yes", value: "yes" },
      { label: "Not enough people are seeing it yet", value: "no" },
    ],
  },
  {
    id: "goal",
    title: "What do you want fastest?",
    options: [
      { label: "Clearer message", value: "clarity" },
      { label: "A content plan", value: "plan" },
      { label: "My first €500 path", value: "first-500" },
      { label: "A simple full system", value: "system" },
    ],
  },
  {
    id: "support",
    title: "How do you want help?",
    options: [
      { label: "Self-paced", value: "self-paced" },
      { label: "With Maya and Studio", value: "ai-help" },
      { label: "Private help with Sandra", value: "private-help" },
    ],
  },
] as const

type Answers = Record<string, string>

function getResult(answers: Answers) {
  if (answers.support === "private-help") return "private"
  if (answers.support === "ai-help") return "studio"
  if (answers.blocker === "suite" || answers.goal === "system") return "suite"
  if (answers.blocker === "sales" || answers.attention === "yes" || answers.goal === "first-500") return "sales"
  if (answers.blocker === "consistency" || answers.posting === "no" || answers.goal === "plan") return "consistency"
  return "message"
}

export function PostToPaidQuiz() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const question = QUESTIONS[step]
  const progress = useMemo(() => Math.round(((step + 1) / QUESTIONS.length) * 100), [step])

  useEffect(() => {
    trackAnalyticsEvent({ event: "quiz_started", properties: { quiz_slug: "post-to-paid" } })
  }, [])

  function choose(value: string) {
    const nextAnswers = { ...answers, [question.id]: value }
    setAnswers(nextAnswers)

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1)
      return
    }

    const result = getResult(nextAnswers)
    trackAnalyticsEvent({
      event: "quiz_completed",
      properties: { quiz_slug: "post-to-paid", quiz_result: result },
    })
    router.push(`/quiz/post-to-paid/results?result=${result}`)
  }

  return (
    <>
      <PublicNav loginHref="/auth/login" />
      <main className={`${inter.className} min-h-screen pt-[58px]`} style={{ background: "#0F0D0B", color: "#F4F0E6" }}>
        <section className="mx-auto flex min-h-[calc(100vh-58px)] max-w-4xl flex-col justify-center px-6 py-14 md:px-12">
          <p className="text-[10px] uppercase tracking-[0.45em]" style={{ color: "#A79B8B", fontWeight: 600 }}>
            Start Here
          </p>
          <h1 className={`${cormorant.className} mt-5 uppercase`} style={{ fontSize: "clamp(38px, 7vw, 76px)", fontWeight: 300, lineHeight: 1 }}>
            Find your first paid next step.
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-[1.75]" style={{ color: "rgba(244,240,230,0.76)" }}>
            Six quick questions. One recommended path.
          </p>

          <div className="mt-10 border p-6 md:p-8" style={{ borderColor: "rgba(244,240,230,0.18)" }}>
            <div className="h-1 w-full" style={{ background: "rgba(244,240,230,0.12)" }}>
              <div className="h-1" style={{ width: `${progress}%`, background: "#F4F0E6" }} />
            </div>
            <p className="mt-6 text-[10px] uppercase tracking-[0.35em]" style={{ color: "#A79B8B" }}>
              Question {step + 1} of {QUESTIONS.length}
            </p>
            <h2 className={`${cormorant.className} mt-4`} style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 300 }}>
              {question.title}
            </h2>
            <div className="mt-7 grid gap-3">
              {question.options.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => choose(option.value)}
                  className="w-full border px-5 py-4 text-left text-[14px] transition-opacity hover:opacity-75"
                  style={{ borderColor: "rgba(244,240,230,0.18)", color: "#F4F0E6" }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-between">
              <button
                type="button"
                disabled={step === 0}
                onClick={() => setStep(Math.max(0, step - 1))}
                className="text-[10px] uppercase tracking-[0.28em] disabled:opacity-30"
              >
                Back
              </button>
              <Link href="/visibility-suite" className="text-[10px] uppercase tracking-[0.28em]" style={{ color: "#A79B8B" }}>
                Skip to Suite
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}
