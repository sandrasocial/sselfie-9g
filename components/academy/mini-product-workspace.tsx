"use client"

import { useRef, useState } from "react"
import { Check, Copy, Loader2, Lock, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import type { VisibilityMiniProductConfig } from "@/lib/visibility-products"

type MiniProductWorkspaceProps = {
  product: VisibilityMiniProductConfig
}

type Phase = "idle" | "loading" | "streaming" | "done"

export function MiniProductWorkspace({ product }: MiniProductWorkspaceProps) {
  const [topic, setTopic] = useState("")
  const [context, setContext] = useState("")
  const [output, setOutput] = useState("")
  const [phase, setPhase] = useState<Phase>("idle")
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const progress =
    phase === "done" ? 100 :
    phase === "streaming" ? 66 :
    phase === "loading" ? 33 :
    topic.trim() && context.trim() ? 20 :
    topic.trim() ? 10 : 0

  async function generate() {
    if (!topic.trim()) return
    if (abortRef.current) abortRef.current.abort()

    const controller = new AbortController()
    abortRef.current = controller

    setPhase("loading")
    setOutput("")
    setError(null)

    try {
      const response = await fetch("/api/academy/mini-product/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, topic: topic.trim(), context: context.trim() }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? "Generation failed")
      }

      if (!response.body) throw new Error("No response body")

      setPhase("streaming")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setOutput((prev) => prev + decoder.decode(value, { stream: true }))
      }

      setPhase("done")
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
      setPhase("idle")
    }
  }

  async function copyOutput() {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const isRunning = phase === "loading" || phase === "streaming"

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(320px,0.42fr)]">
      {/* INPUT PANEL */}
      <section className="border bg-background p-6 md:p-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {product.eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal md:text-4xl">{product.firstAction}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              This focused mini-product workspace narrows Maya to one job. Give her your topic and any context, and she will generate your full deliverable.
            </p>
          </div>
          <div className="hidden rounded-md border px-3 py-2 text-xs font-medium text-muted-foreground md:block">
            {progress}% complete
          </div>
        </div>

        <div className="mt-6">
          <Progress value={progress} />
        </div>

        <div className="mt-8 grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium">Main topic or offer</span>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Example: my brand strategy offer"
              disabled={isRunning}
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium">Context Maya should use</span>
            <Textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Add your audience, tone, CTA, current feed problem, or visual direction."
              rows={4}
              disabled={isRunning}
            />
          </label>
        </div>

        {error && (
          <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Button type="button" onClick={generate} disabled={isRunning || !topic.trim()}>
            {isRunning ? (
              <><Loader2 data-icon="inline-start" className="animate-spin" />Generating…</>
            ) : (
              <><Sparkles data-icon="inline-start" />Generate with Maya</>
            )}
          </Button>
          {output && (
            <Button type="button" variant="outline" onClick={copyOutput} disabled={isRunning}>
              <Copy data-icon="inline-start" />
              {copied ? "Copied" : "Copy all"}
            </Button>
          )}
        </div>
      </section>

      {/* NEXT STEP SIDEBAR */}
      <aside className="border bg-muted/25 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Next upgrade preview
        </p>
        <h2 className="mt-3 text-xl font-semibold">{product.nextStep.title}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{product.nextStep.body}</p>
        <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          Preview only until you choose the next product.
        </div>
      </aside>

      {/* OUTPUT PANEL */}
      <section className="border bg-background p-6 md:p-8 lg:col-span-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Maya output
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              {phase === "idle" && "Your deliverable appears here"}
              {phase === "loading" && "Maya is thinking…"}
              {phase === "streaming" && "Generating…"}
              {phase === "done" && "Done. Copy and use it."}
            </h2>
          </div>
          {phase === "done" && (
            <div className="flex items-center gap-2 text-sm font-medium text-green-600">
              <Check className="h-4 w-4" />
              Complete
            </div>
          )}
        </div>

        {phase === "idle" && !output && (
          <div className="mt-6 rounded-md border border-dashed p-10 text-center text-sm text-muted-foreground">
            Fill in your topic above and click Generate with Maya.
          </div>
        )}

        {(phase === "streaming" || phase === "done" || (phase === "idle" && output)) && (
          <div className="mt-6">
            <div className="relative">
              <pre className="min-h-[300px] max-h-[680px] overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/20 p-5 text-sm leading-7 font-sans">
                {output}
                {phase === "streaming" && (
                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-foreground align-middle" />
                )}
              </pre>
              {phase === "done" && output && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={copyOutput}
                  className="absolute right-3 top-3"
                >
                  <Copy className="mr-1.5 h-3 w-3" />
                  {copied ? "Copied" : "Copy"}
                </Button>
              )}
            </div>
          </div>
        )}

        {phase === "loading" && (
          <div className="mt-6 flex min-h-[200px] items-center justify-center gap-3 rounded-md border border-dashed text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Maya is reading your brand profile and preparing the output…
          </div>
        )}
      </section>
    </div>
  )
}
