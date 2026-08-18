type WorkWithMeSalesInput = {
  name: string
  currentChallenge?: string | null
  desiredOutcome?: string | null
  currentOffer?: string | null
  aiAttempts?: string | null
  investmentReadiness?: string | null
}

type WorkWithMeOfferInput = WorkWithMeSalesInput & {
  checkoutUrl: string
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "there"
}

function compact(value: string | null | undefined, fallback: string, maxLength = 180) {
  const normalized = String(value || "")
    .replace(/\s+/g, " ")
    .trim()
  if (!normalized) return fallback
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`
}

export function buildWorkWithMeContactDraft(input: WorkWithMeSalesInput) {
  const offer = compact(input.currentOffer, "the service you already deliver")

  return `Hi ${firstName(input.name)},

I read your application, and I keep coming back to the marketing work that is still falling back on you around ${offer}.

I think the useful next step is a short fit call. I want to understand what you need every week, what you have already tried with AI, and be honest about whether I can build the right team around your business.

Would you like me to send you the booking link?

Sandra x`
}

export function buildWorkWithMeOfferDraft(input: WorkWithMeOfferInput) {
  const offer = compact(input.currentOffer, "the service you already know how to deliver")

  return `Hi ${firstName(input.name)},

Thank you for the conversation. I believe I can help you build a personal AI content team around ${offer}, so your weekly marketing no longer has to start from you and a blank page.

If you want to do that together, Your AI Content Team is €2,000 paid in full. Over six weeks, I build your Business Brain, research assistant, content director, writer and repurposer, weekly workflow, and first 30 days of marketing. We use four private 45-minute calls to train it around your real voice and make sure you can keep using it.

Your team will research, plan, write, and repurpose. You stay in control of every final decision and everything that gets published.

Here is your private payment link: ${input.checkoutUrl}

Take a look, and reply if there is anything you want to ask before you decide.

Sandra x`
}

export function buildWorkWithMeSalesBrief(input: WorkWithMeSalesInput) {
  return [
    `Offer now: ${compact(input.currentOffer, "Not provided")}`,
    `Marketing burden: ${compact(input.currentChallenge, "Not provided")}`,
    `Weekly help wanted: ${compact(input.desiredOutcome, "Not provided")}`,
    `AI attempts: ${compact(input.aiAttempts, "Not provided")}`,
    `Investment readiness: ${compact(input.investmentReadiness, "unknown", 60)}`,
  ].join("\n")
}
