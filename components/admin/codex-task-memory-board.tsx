"use client"

import { useState, useTransition } from "react"
import { Check, Eye, Pause, ShieldCheck, Wrench } from "lucide-react"

import type { CodexTaskMemoryItem, CodexTaskStatus } from "@/lib/admin/codex-task-memory"

type Props = {
  initialTasks: CodexTaskMemoryItem[]
  windowDays: number
}

const STATUS_LABELS: Record<CodexTaskStatus, string> = {
  fix_next: "Fix next",
  watching: "Watching",
  done: "Done",
  paused: "Paused",
}

const STATUS_COPY: Record<CodexTaskStatus, string> = {
  fix_next: "This should be the next technical fix.",
  watching: "Already handled enough to monitor the signal.",
  done: "Completed and should stay quiet unless data changes.",
  paused: "Not a priority right now.",
}

function statusIcon(status: CodexTaskStatus) {
  if (status === "done") return <Check className="h-3.5 w-3.5" />
  if (status === "watching") return <Eye className="h-3.5 w-3.5" />
  if (status === "paused") return <Pause className="h-3.5 w-3.5" />
  return <Wrench className="h-3.5 w-3.5" />
}

function statusClass(status: CodexTaskStatus) {
  if (status === "done") return "border-[rgba(197,198,200,.55)] bg-[color:var(--ss-seasalt)]"
  if (status === "watching") return "border-[color:var(--ss-night)] bg-white"
  if (status === "paused") return "border-[rgba(197,198,200,.45)] bg-white opacity-70"
  return "border-[color:var(--ss-night)] bg-[color:var(--ss-night)] text-[color:var(--ss-seasalt)]"
}

export function CodexTaskMemoryBoard({ initialTasks, windowDays }: Props) {
  const [tasks, setTasks] = useState(initialTasks)
  const [statusMessage, setStatusMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  function updateStatus(key: string, status: CodexTaskStatus) {
    startTransition(async () => {
      setStatusMessage("Saving task memory...")
      const response = await fetch("/api/admin/codex-task-memory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, status, days: windowDays }),
      })
      const data = (await response.json()) as {
        tasks?: CodexTaskMemoryItem[]
        error?: string
      }

      if (!response.ok || !data.tasks) {
        setStatusMessage(data.error || "Task memory save failed.")
        return
      }

      setTasks(data.tasks)
      setStatusMessage("Task memory saved.")
    })
  }

  const fixNext = tasks.filter(task => task.status === "fix_next")
  const doneCount = tasks.filter(task => task.status === "done").length

  return (
    <section className="mb-10 border border-[rgba(197,198,200,.38)] bg-white p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[color:var(--ss-gray)]">
            Codex task memory
          </p>
          <h2 className="mt-2 font-['Times_New_Roman'] text-2xl font-light uppercase tracking-[0.18em] text-[color:var(--ss-night)] sm:text-3xl">
            Done, Watching, Fix Next
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--ss-davy)]">
            Manual checkmarks keep completed technical work from repeating every morning. If live
            data still shows a leak, the same task stays visible as watching instead of becoming a
            duplicate.
          </p>
        </div>
        <div className="border border-[rgba(197,198,200,.45)] bg-[color:var(--ss-seasalt)] px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--ss-gray)]">
            Board status
          </p>
          <p className="mt-1 text-sm text-[color:var(--ss-night)]">
            {fixNext.length} fix next · {doneCount} done
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {tasks.map(task => (
          <article
            key={task.key}
            className="border border-[rgba(197,198,200,.38)] bg-[color:var(--ss-seasalt)] p-4 sm:p-5"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--ss-gray)]">
                  Owner: {task.owner}
                </p>
                <h3 className="mt-2 text-base font-medium leading-snug text-[color:var(--ss-night)]">
                  {task.title}
                </h3>
              </div>
              <span
                className={`inline-flex min-h-[36px] shrink-0 items-center gap-2 border px-3 py-2 text-[9px] font-medium uppercase tracking-[0.14em] ${statusClass(task.status)}`}
              >
                {statusIcon(task.status)}
                {STATUS_LABELS[task.status]}
              </span>
            </div>

            <p className="text-sm leading-7 text-[color:var(--ss-davy)]">{task.why}</p>
            <div className="mt-4 border-t border-[rgba(197,198,200,.38)] pt-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--ss-gray)]">
                Current signal
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--ss-night)]">{task.signal}</p>
              {task.liveIssue && (
                <p className="mt-2 text-xs leading-6 text-[color:var(--ss-davy)]">
                  Still worth watching because today&apos;s data is showing pressure here.
                </p>
              )}
            </div>

            <div className="mt-4 border-t border-[rgba(197,198,200,.38)] pt-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--ss-gray)]">
                Next step
              </p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--ss-davy)]">{task.nextStep}</p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {(["done", "watching", "fix_next", "paused"] as CodexTaskStatus[]).map(status => (
                <button
                  key={`${task.key}-${status}`}
                  type="button"
                  disabled={isPending || task.status === status}
                  onClick={() => updateStatus(task.key, status)}
                  title={STATUS_COPY[status]}
                  className="min-h-[38px] border border-[rgba(197,198,200,.65)] bg-white px-3 py-2 text-[9px] font-medium uppercase tracking-[0.14em] text-[color:var(--ss-night)] hover:border-[color:var(--ss-night)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[rgba(197,198,200,.35)] pt-4 text-xs leading-6 text-[color:var(--ss-gray)]">
        <ShieldCheck className="h-4 w-4" />
        <span>Admin-only. Stored as a tiny Morning Board memory record, not a new task system.</span>
        {statusMessage && <span>{statusMessage}</span>}
      </div>
    </section>
  )
}
