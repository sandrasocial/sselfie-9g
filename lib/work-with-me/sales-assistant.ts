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
  const offer = compact(input.currentOffer, "the service you already deliver")

  return `Hi ${firstName(input.name)},

I read your application, and I keep coming back to the service you want the right clients to understand: ${offer}

I think the useful next step is a short fit call, so I can understand where your online presence is losing that value and be honest about whether I can help.

Would you like me to send you the booking link?

Sandra x`
}

export function buildWorkWithMeOfferDraft(input: WorkWithMeOfferInput) {
  const offer = compact(input.currentOffer, "the service you already know how to deliver")

  return `Hi ${firstName(input.name)},

Thank you for the conversation. I believe the work is to turn ${offer} into one client-ready online path, so the right people can understand your value, trust your expertise, and know how to ask for help.

If you want to do that together, the private sprint is €2,000 paid in full. It includes two weeks of preparation before we begin, where I build the first version of your positioning, offer page copy, profile copy, inquiry path, and four weeks of content. We follow that with four weekly 45-minute calls where we refine the work against your real customer.

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
