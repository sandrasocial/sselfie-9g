import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getCurrentFreePrompt } from "@/lib/ai-prompts/prompt-lookup"

export const dynamic = "force-dynamic"

type LatestPromptPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export async function generateMetadata(): Promise<Metadata> {
  const prompt = await getCurrentFreePrompt()

  if (!prompt) {
    return {
      title: "Latest free prompt · SSELFIE",
      description: "The current SSELFIE free prompt.",
    }
  }

  return {
    title: `Latest free prompt: ${prompt.card.title} · SSELFIE`,
    description: prompt.card.whenToUse,
  }
}

function appendParams(path: string, params: Record<string, string | string[] | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach(item => search.append(key, item))
    } else if (value) {
      search.set(key, value)
    }
  }
  if (!search.has("source")) search.set("source", "prompt_latest")
  if (!search.has("utm_source")) search.set("utm_source", "instagram")
  if (!search.has("utm_medium")) search.set("utm_medium", "manychat")
  if (!search.has("utm_campaign")) search.set("utm_campaign", "current_free_prompt")
  if (!search.has("utm_content")) search.set("utm_content", "prompt_latest")
  if (!search.has("checkout_source")) search.set("checkout_source", "manychat_prompt_reply")
  if (!search.has("cta_keyword")) search.set("cta_keyword", "PROMPT")
  if (!search.has("buyer_stage")) search.set("buyer_stage", "lead")
  return `${path}?${search.toString()}`
}

export default async function LatestPromptPage({ searchParams }: LatestPromptPageProps) {
  const prompt = await getCurrentFreePrompt()
  if (!prompt) {
    redirect(
      "/prompt-vault?source=prompt_latest_missing&utm_source=instagram&utm_medium=manychat&utm_campaign=current_free_prompt_fallback",
    )
  }

  redirect(appendParams(`/p/${encodeURIComponent(prompt.number)}`, (await searchParams) || {}))
}
