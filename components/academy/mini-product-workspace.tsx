"use client"

import { useMemo, useState } from "react"
import { Check, Copy, Lock, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import type { VisibilityMiniProductConfig } from "@/lib/visibility-products"

type MiniProductWorkspaceProps = {
  product: VisibilityMiniProductConfig
}

type OutputBlock = {
  title: string
  items: string[]
}

function splitInput(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildOutput(product: VisibilityMiniProductConfig, input: string, detail: string): OutputBlock[] {
  const topic = input.trim() || "your current offer"
  const context = detail.trim() || "your next post"
  const fragments = splitInput(`${input},${detail}`)
  const anchor = fragments[0] || topic

  switch (product.workspaceKind) {
    case "message":
      return [
        {
          title: "Clear offer line",
          items: [`I help ${topic} get ${context} without making visibility feel bigger than life.`],
        },
        {
          title: "Hooks to test",
          items: [
            `If ${anchor} feels hard to explain, start here.`,
            `The reason your content is not selling may be simpler than you think.`,
            `Before you post more, make this one sentence clearer.`,
          ],
        },
        {
          title: "Next action",
          items: ["Use the clearest hook today, then link it to one CTA keyword."],
        },
      ]
    case "weekly-plan":
      return [
        {
          title: "7-day rhythm",
          items: [
            `Day 1: name the problem around ${topic}.`,
            "Day 2: show one behind-the-scenes reason it matters.",
            "Day 3: teach one simple shift.",
            "Day 4: share proof, process, or a personal example.",
            "Day 5: make the offer clear.",
            "Day 6: answer one objection.",
            "Day 7: repeat the next step with a softer CTA.",
          ],
        },
      ]
    case "sales-path":
      return [
        {
          title: "Buyer path",
          items: [
            `Post topic: ${topic}.`,
            `CTA keyword: ${product.ctaKeyword}.`,
            `Landing page: /${product.slug}.`,
            "Checkout: one product, one promise, one next step.",
          ],
        },
        {
          title: "Sales post starter",
          items: [`If ${context} is the thing you keep avoiding, this is the simple path I would start with.`],
        },
      ]
    case "concept-cards":
      return [
        {
          title: "10 concept cards",
          items: Array.from({ length: 10 }, (_, index) => {
            const angles = ["problem", "belief", "mistake", "proof", "story", "how-to", "objection", "behind the scenes", "quick win", "offer"]
            return `${index + 1}. ${angles[index]} angle for ${topic}`
          }),
        },
      ]
    case "captions":
      return [
        {
          title: "Caption bank",
          items: Array.from({ length: 5 }, (_, index) => {
            const starts = [
              "I used to make this harder than it needed to be:",
              "If you are trying to be visible but nothing feels clear, start here:",
              "The post is not the whole job. The next step matters too:",
              "A simple reminder if you are building this in real life:",
              "Here is the cleaner way to talk about it:",
            ]
            return `${starts[index]} ${topic}. End with ${product.ctaKeyword}.`
          }),
        },
      ]
    case "feed-reset":
      return [
        {
          title: "9-grid reset",
          items: [
            `1. Problem post: ${topic}`,
            "2. Your point of view",
            "3. Personal proof or story",
            "4. Simple teaching post",
            "5. Behind the scenes",
            "6. Objection answer",
            "7. Offer clarity post",
            "8. Client/process proof",
            `9. CTA post: comment ${product.ctaKeyword}`,
          ],
        },
      ]
    case "photo-refresh":
      return [
        {
          title: "5 photo prompts",
          items: Array.from({ length: 5 }, (_, index) => {
            const scenes = ["window portrait", "desk setup", "phone-in-hand story", "editorial close-up", "working moment"]
            return `${index + 1}. ${scenes[index]} for ${topic}, with ${context}, natural light, calm editorial composition.`
          }),
        },
        {
          title: "Create first",
          items: ["Start with the prompt that matches your next caption. The image should support the message, not replace it."],
        },
      ]
  }
}

export function MiniProductWorkspace({ product }: MiniProductWorkspaceProps) {
  const [input, setInput] = useState("")
  const [detail, setDetail] = useState("")
  const [selected, setSelected] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const output = useMemo(() => buildOutput(product, input, detail), [detail, input, product])
  const progress = selected ? 100 : input.trim() && detail.trim() ? 66 : input.trim() || detail.trim() ? 33 : 0
  const outputText = output.map((block) => `${block.title}\n${block.items.join("\n")}`).join("\n\n")

  async function copyOutput() {
    await navigator.clipboard.writeText(outputText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(320px,0.42fr)]">
      <section className="border bg-background p-6 md:p-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              {product.eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-normal md:text-4xl">{product.firstAction}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              This is your focused product workspace. Maya is narrowed to this one job so you do not have to sort through the full Studio.
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
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Example: my brand strategy offer"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium">Context Maya should use</span>
            <Textarea
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              placeholder="Add the audience, tone, CTA, current feed problem, or visual direction."
              rows={5}
            />
          </label>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button type="button" onClick={() => setSelected(output[0]?.items[0] || "done")}>
            <Sparkles data-icon="inline-start" />
            Generate focused output
          </Button>
          <Button type="button" variant="outline" onClick={copyOutput}>
            <Copy data-icon="inline-start" />
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </section>

      <aside className="border bg-muted/25 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Next upgrade preview
        </p>
        <h2 className="mt-3 text-xl font-semibold">{product.nextStep.title}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{product.nextStep.body}</p>
        <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Lock />
          Preview only until you choose the next product.
        </div>
      </aside>

      <section className="border bg-background p-6 md:p-8 lg:col-span-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Maya output
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Your first win</h2>
          </div>
          {selected ? (
            <div className="flex items-center gap-2 text-sm font-medium">
              <Check />
              First action complete
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {output.map((block) => (
            <article key={block.title} className="rounded-md border p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em]">{block.title}</h3>
              <div className="mt-4 grid gap-3">
                {block.items.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setSelected(item)}
                    className="rounded-md border bg-background p-3 text-left text-sm leading-6 transition-colors hover:bg-muted"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
