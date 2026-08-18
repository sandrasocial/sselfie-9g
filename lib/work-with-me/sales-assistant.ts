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

type WorkWithMePrivateInvitationInput = {
  name: string
  currentOffer?: string | null
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

I read your application, and I keep coming back to how much of the work around ${offer} still depends on you.

I think the useful next step is a short fit call. I want to understand what keeps coming back to you, what you have already tried with AI, and be honest about whether I can build the right personal team around your business.

Would you like me to send you the booking link?

Sandra x`
}

export function buildWorkWithMeOfferDraft(input: WorkWithMeOfferInput) {
  const offer = compact(input.currentOffer, "the service you already know how to deliver")

  return `Hi ${firstName(input.name)},

Thank you for the conversation. I believe I can help you build a personal AI team around ${offer}, so the research, planning, content, and repeatable work do not all have to start from you.

If you want to do that together, Your Personal AI Team is €2,000 paid in full. Over six weeks, I build your Business Brain, three personal AI roles, three repeatable workflows, and a 30-day working plan. We use four private 45-minute calls to train the team on your real business and make sure you can keep using it.

Your team helps prepare the work we choose together. You stay in control of every final decision and every client relationship.

Here is your private payment link: ${input.checkoutUrl}

Take a look, and reply if there is anything you want to ask before you decide.

Sandra x`
}

export function buildWorkWithMeSalesBrief(input: WorkWithMeSalesInput) {
  return [
    `Offer now: ${compact(input.currentOffer, "Not provided")}`,
    `Founder bottleneck: ${compact(input.currentChallenge, "Not provided")}`,
    `Work to hand over: ${compact(input.desiredOutcome, "Not provided")}`,
    `AI attempts: ${compact(input.aiAttempts, "Not provided")}`,
    `Investment readiness: ${compact(input.investmentReadiness, "unknown", 60)}`,
  ].join("\n")
}

export function buildWorkWithMePrivateInvitationDraft(input: WorkWithMePrivateInvitationInput) {
  const offer = compact(input.currentOffer, "the business you have already built")

  return `Hi ${firstName(input.name)},

I have been building something new, and I thought of you because you already have ${offer}.

I am starting privately with two women whose business is real, but too much of the work still depends on them.

Over six weeks, I build a personal AI team around your business, your voice, and the way you work. We choose three areas where reliable AI support can take research, planning, content, writing, or repeatable preparation off your plate.

We use it on real work together, and I leave you with a Business Brain, three trained roles, three workflows, and a 30-day working plan.

Would you like me to send you the details?

Sandra x`
}

export function buildWorkWithMeFitCallGuide(input: WorkWithMeSalesInput) {
  return `Fit call for ${firstName(input.name)}

1. What only moves when you do it yourself?
2. Which recurring work takes too much of your time or headspace?
3. If you had reliable help every week, what would you hand over first?
4. What have you already tried with AI, and why did you stop using it?
5. Why does this need to change now?
6. What would useful support look like in your real business?
7. Is anyone else involved in the final decision?
8. If the fit is right, are you comfortable investing €2,000 in the six-week implementation now?

Recommend only if she has a real offer and clients, too much recurring work depends on her, the system fits her business, she can make the decision, and the investment is realistic.`
}
