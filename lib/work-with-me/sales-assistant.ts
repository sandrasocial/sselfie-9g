type WorkWithMeSalesInput = {
  name: string
  currentChallenge?: string | null
  desiredOutcome?: string | null
  currentOffer?: string | null
  investmentReadiness?: string | null
}

type WorkWithMeOfferInput = WorkWithMeSalesInput & {
  checkoutUrl: string
}

function firstName(value: string) {
  return value.trim().split(/\s+/)[0] || "there"
}

function compact(value: string | null | undefined, fallback: string, maxLength = 180) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim()
  if (!normalized) return fallback
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`
}

export function buildWorkWithMeContactDraft(input: WorkWithMeSalesInput) {
  const offer = compact(input.currentOffer, "the skill or service you want to sell")

  return `Hi ${firstName(input.name)},

I read your application, and I keep coming back to the offer you want to make clear: ${offer}

I think the useful next step is a short fit call, so I can understand what is making it hard to sell and be honest about whether I can help.

Would you like me to send you the booking link?

Sandra x`
}

export function buildWorkWithMeOfferDraft(input: WorkWithMeOfferInput) {
  const offer = compact(input.currentOffer, "what you already know how to help people with")

  return `Hi ${firstName(input.name)},

Thank you for the conversation. I believe the work is to turn ${offer} into one clear offer, then build one message and four weeks of visibility around it.

If you want to do that together, the private sprint is €2,000 paid in full. It includes two weeks of preparation before we begin, followed by four weekly 45-minute calls where we refine the work against your real customer.

Here is your private payment link: ${input.checkoutUrl}

Take a look, and reply if there is anything you want to ask before you decide.

Sandra x`
}

export function buildWorkWithMeSalesBrief(input: WorkWithMeSalesInput) {
  return [
    `Offer now: ${compact(input.currentOffer, "Not provided")}`,
    `What feels stuck: ${compact(input.currentChallenge, "Not provided")}`,
    `What she wants next: ${compact(input.desiredOutcome, "Not provided")}`,
    `Investment readiness: ${compact(input.investmentReadiness, "unknown", 60)}`,
  ].join("\n")
}
