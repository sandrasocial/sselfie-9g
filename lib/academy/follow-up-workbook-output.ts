export type WorkbookCover = {
  title: string
  subtitle: string
  createdFor: string
}

export type ShowUpContentPlan = {
  cover: WorkbookCover
  foundation: {
    monthlyFocus: string
    audienceAction: string
    realisticCapacity: string
    bestFormats: string[]
    formatToAvoid: string
    easierSystem: string
  }
  weeklyThemes: Array<{
    week: string
    theme: string
    purpose: string
  }>
  posts: Array<{
    day: string
    week: string
    type: string
    goal: string
    hook: string
    captionStarter: string
    visual: string
    cta: string
  }>
  existingAssetIdeas: string[]
  repurposingIdeas: string[]
  sundayBatchPlan: string[]
  getPaidInput: string
  nextSteps: string[]
}

export type GetPaidSalesPlan = {
  cover: WorkbookCover
  offer: {
    name: string
    oneSentence: string
    exactResult: string
    timeline: string
    price: string
    deliverables: string[]
    howToBuy: string
  }
  buyer: {
    oneSentence: string
    struggle: string
    desiredChange: string
    urgency: string
    willingnessToPay: string
  }
  first500Path: {
    path: string
    simpleMath: string
    firstMove: string
  }
  salesPost: {
    hook: string
    story: string
    bridge: string
    offer: string
    cta: string
  }
  dmScripts: string[]
  followUps: string[]
  objectionReplies: Array<{
    objection: string
    reply: string
  }>
  firstTenBuyerPrompts: string[]
  sevenDayPlan: Array<{
    day: string
    action: string
    output: string
  }>
  safety: {
    deliveryBoundary: string
    nonGuarantee: string
  }
  visibilityPlanInput: string
  nextBestMove: string
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asText(value: unknown, fallback = "", max = 2400) {
  return typeof value === "string" ? value.trim().slice(0, max) : fallback
}

function asList(value: unknown, maxItems: number, maxLength = 900) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map(item => item.trim())
        .filter(Boolean)
        .slice(0, maxItems)
        .map(item => item.slice(0, maxLength))
    : []
}

function normalizeCover(value: unknown, defaults: WorkbookCover): WorkbookCover {
  const cover = asObject(value)
  return {
    title: asText(cover.title, defaults.title, 160),
    subtitle: asText(cover.subtitle, defaults.subtitle),
    createdFor: asText(cover.createdFor, defaults.createdFor, 120),
  }
}

export function normalizeShowUpContentPlan(
  value: unknown,
  createdFor = "Friend"
): ShowUpContentPlan {
  const source = asObject(value)
  const foundation = asObject(source.foundation)

  const weeklyThemes = Array.isArray(source.weeklyThemes)
    ? source.weeklyThemes
        .map((item, index) => {
          const theme = asObject(item)
          return {
            week: asText(theme.week, `Week ${index + 1}`, 80),
            theme: asText(theme.theme, "Weekly focus", 180),
            purpose: asText(theme.purpose),
          }
        })
        .filter(theme => theme.theme || theme.purpose)
        .slice(0, 4)
    : []

  const posts = Array.isArray(source.posts)
    ? source.posts
        .map((item, index) => {
          const post = asObject(item)
          const weekNumber = index < 8 ? 1 : index < 15 ? 2 : index < 23 ? 3 : 4
          return {
            day: `Day ${index + 1}`,
            week: `Week ${weekNumber}`,
            type: asText(post.type, "Post", 80),
            goal: asText(post.goal, "Connection", 120),
            hook: asText(post.hook),
            captionStarter: asText(post.captionStarter),
            visual: asText(post.visual),
            cta: asText(post.cta),
          }
        })
        .filter(post => post.hook && post.captionStarter && post.visual && post.cta)
        .slice(0, 30)
    : []

  return {
    cover: normalizeCover(source.cover, {
      title: "What To Post",
      subtitle: "Your personal 30-day content plan",
      createdFor,
    }),
    foundation: {
      monthlyFocus: asText(foundation.monthlyFocus),
      audienceAction: asText(foundation.audienceAction),
      realisticCapacity: asText(foundation.realisticCapacity),
      bestFormats: asList(foundation.bestFormats, 6, 160),
      formatToAvoid: asText(foundation.formatToAvoid),
      easierSystem: asText(foundation.easierSystem),
    },
    weeklyThemes,
    posts,
    existingAssetIdeas: asList(source.existingAssetIdeas, 10),
    repurposingIdeas: asList(source.repurposingIdeas, 10),
    sundayBatchPlan: asList(source.sundayBatchPlan, 10),
    getPaidInput: asText(source.getPaidInput),
    nextSteps: asList(source.nextSteps, 5),
  }
}

export function parseShowUpContentPlan(text: string, createdFor?: string) {
  const jsonText = text.match(/\{[\s\S]*\}/)?.[0]
  if (!jsonText) throw new Error("No JSON found in Show Up response")
  return normalizeShowUpContentPlan(JSON.parse(jsonText), createdFor)
}

export function isCompleteShowUpContentPlan(plan: ShowUpContentPlan) {
  return Boolean(
    plan.foundation.monthlyFocus &&
    plan.foundation.realisticCapacity &&
    plan.weeklyThemes.length === 4 &&
    plan.posts.length === 30 &&
    plan.sundayBatchPlan.length >= 4 &&
    plan.getPaidInput
  )
}

export function normalizeGetPaidSalesPlan(value: unknown, createdFor = "Friend"): GetPaidSalesPlan {
  const source = asObject(value)
  const offer = asObject(source.offer)
  const buyer = asObject(source.buyer)
  const first500Path = asObject(source.first500Path)
  const salesPost = asObject(source.salesPost)
  const safety = asObject(source.safety)

  const objectionReplies = Array.isArray(source.objectionReplies)
    ? source.objectionReplies
        .map(item => {
          const reply = asObject(item)
          return {
            objection: asText(reply.objection),
            reply: asText(reply.reply),
          }
        })
        .filter(item => item.objection && item.reply)
        .slice(0, 5)
    : []

  const sevenDayPlan = Array.isArray(source.sevenDayPlan)
    ? source.sevenDayPlan
        .map((item, index) => {
          const day = asObject(item)
          return {
            day: asText(day.day, `Day ${index + 1}`, 40),
            action: asText(day.action),
            output: asText(day.output),
          }
        })
        .filter(item => item.action && item.output)
        .slice(0, 7)
    : []

  return {
    cover: normalizeCover(source.cover, {
      title: "Get Paid",
      subtitle: "Your personal offer and first-sales plan",
      createdFor,
    }),
    offer: {
      name: asText(offer.name, "Your Starter Offer", 180),
      oneSentence: asText(offer.oneSentence),
      exactResult: asText(offer.exactResult),
      timeline: asText(offer.timeline),
      price: asText(offer.price, "Price to confirm", 120),
      deliverables: asList(offer.deliverables, 10),
      howToBuy: asText(offer.howToBuy),
    },
    buyer: {
      oneSentence: asText(buyer.oneSentence),
      struggle: asText(buyer.struggle),
      desiredChange: asText(buyer.desiredChange),
      urgency: asText(buyer.urgency),
      willingnessToPay: asText(buyer.willingnessToPay),
    },
    first500Path: {
      path: asText(first500Path.path),
      simpleMath: asText(first500Path.simpleMath),
      firstMove: asText(first500Path.firstMove),
    },
    salesPost: {
      hook: asText(salesPost.hook),
      story: asText(salesPost.story),
      bridge: asText(salesPost.bridge),
      offer: asText(salesPost.offer),
      cta: asText(salesPost.cta),
    },
    dmScripts: asList(source.dmScripts, 3),
    followUps: asList(source.followUps, 3),
    objectionReplies,
    firstTenBuyerPrompts: asList(source.firstTenBuyerPrompts, 10),
    sevenDayPlan,
    safety: {
      deliveryBoundary: asText(safety.deliveryBoundary),
      nonGuarantee: asText(safety.nonGuarantee),
    },
    visibilityPlanInput: asText(source.visibilityPlanInput),
    nextBestMove: asText(source.nextBestMove),
  }
}

export function parseGetPaidSalesPlan(text: string, createdFor?: string) {
  const jsonText = text.match(/\{[\s\S]*\}/)?.[0]
  if (!jsonText) throw new Error("No JSON found in Get Paid response")
  return normalizeGetPaidSalesPlan(JSON.parse(jsonText), createdFor)
}

export function isCompleteGetPaidSalesPlan(plan: GetPaidSalesPlan) {
  return Boolean(
    plan.offer.oneSentence &&
    plan.offer.exactResult &&
    plan.buyer.oneSentence &&
    plan.first500Path.path &&
    plan.salesPost.hook &&
    plan.salesPost.offer &&
    plan.salesPost.cta &&
    plan.dmScripts.length === 3 &&
    plan.followUps.length === 3 &&
    plan.objectionReplies.length === 5 &&
    plan.firstTenBuyerPrompts.length === 10 &&
    plan.sevenDayPlan.length === 7 &&
    plan.safety.deliveryBoundary &&
    plan.safety.nonGuarantee &&
    plan.nextBestMove
  )
}
