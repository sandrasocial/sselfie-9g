export type VisibilityPlanProductId = "what_to_say" | "show_up" | "get_paid"

export type VisibilityPlanWorkbookAnswer = {
  productId: VisibilityPlanProductId
  label: string
  value: string
}

export type VisibilityPlanJson = {
  cover?: {
    title?: string
    subtitle?: string
    createdFor?: string
  }
  message?: {
    positioning?: string
    audience?: string
    brandPhrases?: string[]
    pillars?: Array<{
      name?: string
      description?: string
      postIdeas?: string[]
    }>
  }
  content?: {
    weeklyThemes?: string[]
    firstFivePosts?: Array<{
      day?: string
      type?: string
      hook?: string
      caption?: string
      cta?: string
    }>
    batchingChecklist?: string[]
  }
  sales?: {
    offerStatement?: string
    buyerProfile?: string
    first500Plan?: string[]
    salesPost?: {
      hook?: string
      body?: string
      cta?: string
    }
    dmScripts?: string[]
    followUps?: string[]
  }
  nextSevenDays?: Array<{
    day?: string
    action?: string
    output?: string
  }>
}

const PRODUCT_LABELS: Record<VisibilityPlanProductId, string> = {
  what_to_say: "What To Say",
  show_up: "Show Up",
  get_paid: "Get Paid",
}

export function getVisibilityPlanProductLabel(productId: string) {
  return PRODUCT_LABELS[productId as VisibilityPlanProductId] || productId
}

export function normalizeVisibilityPlan(value: unknown): VisibilityPlanJson {
  if (!value || typeof value !== "object") return {}

  const source = value as Record<string, unknown>
  const asObject = (item: unknown) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? (item as Record<string, unknown>)
      : {}
  const asText = (item: unknown, fallback = "") =>
    typeof item === "string" ? item.trim().slice(0, 1600) : fallback
  const asList = (item: unknown, max = 12) =>
    Array.isArray(item)
      ? item
          .filter((entry): entry is string => typeof entry === "string")
          .map(entry => entry.trim())
          .filter(Boolean)
          .slice(0, max)
          .map(entry => entry.slice(0, 600))
      : []

  const cover = asObject(source.cover)
  const message = asObject(source.message)
  const content = asObject(source.content)
  const sales = asObject(source.sales)
  const salesPost = asObject(sales.salesPost)

  const pillars = Array.isArray(message.pillars)
    ? message.pillars
        .map(item => {
          const pillar = asObject(item)
          return {
            name: asText(pillar.name, "Content Pillar"),
            description: asText(pillar.description),
            postIdeas: asList(pillar.postIdeas, 4),
          }
        })
        .filter(item => item.name || item.description || item.postIdeas.length)
        .slice(0, 5)
    : []

  const firstFivePosts = Array.isArray(content.firstFivePosts)
    ? content.firstFivePosts
        .map(item => {
          const post = asObject(item)
          return {
            day: asText(post.day),
            type: asText(post.type),
            hook: asText(post.hook),
            caption: asText(post.caption),
            cta: asText(post.cta),
          }
        })
        .filter(item => item.hook || item.caption || item.cta)
        .slice(0, 5)
    : []

  const nextSevenDays = Array.isArray(source.nextSevenDays)
    ? source.nextSevenDays
        .map(item => {
          const day = asObject(item)
          return {
            day: asText(day.day),
            action: asText(day.action),
            output: asText(day.output),
          }
        })
        .filter(item => item.action || item.output)
        .slice(0, 7)
    : []

  return {
    cover: {
      title: asText(cover.title, "Visibility To Paid Plan"),
      subtitle: asText(cover.subtitle),
      createdFor: asText(cover.createdFor),
    },
    message: {
      positioning: asText(message.positioning),
      audience: asText(message.audience),
      brandPhrases: asList(message.brandPhrases, 10),
      pillars,
    },
    content: {
      weeklyThemes: asList(content.weeklyThemes, 4),
      firstFivePosts,
      batchingChecklist: asList(content.batchingChecklist, 8),
    },
    sales: {
      offerStatement: asText(sales.offerStatement),
      buyerProfile: asText(sales.buyerProfile),
      first500Plan: asList(sales.first500Plan, 8),
      salesPost: {
        hook: asText(salesPost.hook),
        body: asText(salesPost.body),
        cta: asText(salesPost.cta),
      },
      dmScripts: asList(sales.dmScripts, 5),
      followUps: asList(sales.followUps, 5),
    },
    nextSevenDays,
  }
}

export function parseVisibilityPlanJson(text: string) {
  const jsonText = text.match(/\{[\s\S]*\}/)?.[0]
  if (!jsonText) throw new Error("No JSON found in visibility plan response")
  return normalizeVisibilityPlan(JSON.parse(jsonText))
}
