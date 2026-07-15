import Link from "next/link"
import { AdminNav } from "@/components/admin/admin-nav"

const TOOLS = [
  {
    title: "Campaign orders",
    description: "Review Maya's campaign work, approve delivery, or request a clean regeneration.",
    href: "/admin/campaigns",
  },
  {
    title: "Academy",
    description: "Courses, lessons, products, and monthly drops.",
    href: "/admin/academy",
  },
  {
    title: "Credits",
    description: "Review a customer and add credits when needed.",
    href: "/admin/credits",
  },
  {
    title: "Testimonials",
    description: "Review and manage customer proof.",
    href: "/admin/testimonials",
  },
  {
    title: "Payment review",
    description: "Resolve Stripe webhook and fulfillment exceptions.",
    href: "/admin/webhook-review",
  },
  {
    title: "Prompt Vault monitor",
    description: "Check the Prompt Vault funnel and customer activity.",
    href: "/admin/prompt-vault",
  },
  {
    title: "Activation funnel",
    description: "See the seven steps from first app open to a second week of creation.",
    href: "/admin/activation-funnel",
  },
  {
    title: "Work With Me",
    description: "Review qualified applications and move each person through the sales pipeline.",
    href: "/admin/work-with-me",
  },
] as const

export default function AdminToolsPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="font-serif text-3xl font-light tracking-tight text-stone-950">Tools</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-600">
          The admin tools you only need sometimes, kept in one place.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {TOOLS.map(tool => (
            <Link
              key={tool.href}
              href={tool.href}
              className="rounded-2xl border border-stone-200 bg-white p-5 transition hover:border-stone-950"
            >
              <h2 className="font-serif text-xl font-light text-stone-950">{tool.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{tool.description}</p>
              <p className="mt-4 text-xs uppercase tracking-wide text-stone-500">Open →</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
