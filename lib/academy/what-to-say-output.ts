export type WhatToSayMessageKit = {
  cover: {
    title: string
    subtitle: string
    createdFor: string
  }
  coreMessage: {
    oneLineMessage: string
    iHelpStatement: string
    instagramBio: string
  }
  foundation: {
    audience: string
    audienceSelfTalk: string
    transformation: string
    authority: string
    story: string
    expertise: string
    values: string
    vision: string
    voice: string
  }
  contentBuckets: Array<{
    name: string
    purpose: string
    postIdeas: string[]
  }>
  brandWords: string[]
  hooks: string[]
  captions: Array<{
    label: string
    hook: string
    body: string
    cta: string
  }>
  softCta: string
  offerBridge: string
  nextSteps: string[]
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asText(value: unknown, fallback = "", max = 2400) {
  return typeof value === "string" ? value.trim().slice(0, max) : fallback
}

function asList(value: unknown, maxItems: number, maxLength = 700) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map(item => item.trim())
        .filter(Boolean)
        .slice(0, maxItems)
        .map(item => item.slice(0, maxLength))
    : []
}

export function normalizeWhatToSayMessageKit(
  value: unknown,
  createdFor = "Friend"
): WhatToSayMessageKit {
  const source = asObject(value)
  const cover = asObject(source.cover)
  const coreMessage = asObject(source.coreMessage)
  const foundation = asObject(source.foundation)

  const contentBuckets = Array.isArray(source.contentBuckets)
    ? source.contentBuckets
        .map(item => {
          const bucket = asObject(item)
          return {
            name: asText(bucket.name, "Content Bucket", 120),
            purpose: asText(bucket.purpose),
            postIdeas: asList(bucket.postIdeas, 5),
          }
        })
        .filter(bucket => bucket.purpose || bucket.postIdeas.length)
        .slice(0, 4)
    : []

  const captions = Array.isArray(source.captions)
    ? source.captions
        .map((item, index) => {
          const caption = asObject(item)
          return {
            label: asText(caption.label, `Caption ${index + 1}`, 120),
            hook: asText(caption.hook),
            body: asText(caption.body),
            cta: asText(caption.cta),
          }
        })
        .filter(caption => caption.hook || caption.body || caption.cta)
        .slice(0, 3)
    : []

  return {
    cover: {
      title: asText(cover.title, "What To Say"),
      subtitle: asText(cover.subtitle, "Your personal message kit"),
      createdFor: asText(cover.createdFor, createdFor, 120),
    },
    coreMessage: {
      oneLineMessage: asText(coreMessage.oneLineMessage),
      iHelpStatement: asText(coreMessage.iHelpStatement),
      instagramBio: asText(coreMessage.instagramBio),
    },
    foundation: {
      audience: asText(foundation.audience),
      audienceSelfTalk: asText(foundation.audienceSelfTalk),
      transformation: asText(foundation.transformation),
      authority: asText(foundation.authority),
      story: asText(foundation.story),
      expertise: asText(foundation.expertise),
      values: asText(foundation.values),
      vision: asText(foundation.vision),
      voice: asText(foundation.voice),
    },
    contentBuckets,
    brandWords: asList(source.brandWords, 12, 120),
    hooks: asList(source.hooks, 10),
    captions,
    softCta: asText(source.softCta),
    offerBridge: asText(source.offerBridge),
    nextSteps: asList(source.nextSteps, 5),
  }
}

export function parseWhatToSayMessageKit(text: string, createdFor?: string) {
  const jsonText = text.match(/\{[\s\S]*\}/)?.[0]
  if (!jsonText) throw new Error("No JSON found in What To Say response")
  return normalizeWhatToSayMessageKit(JSON.parse(jsonText), createdFor)
}

export function isCompleteWhatToSayMessageKit(kit: WhatToSayMessageKit) {
  return Boolean(
    kit.coreMessage.oneLineMessage &&
      kit.coreMessage.iHelpStatement &&
      kit.foundation.audience &&
      kit.foundation.story &&
      kit.contentBuckets.length >= 3 &&
      kit.hooks.length >= 8 &&
      kit.captions.length >= 3 &&
      kit.softCta &&
      kit.offerBridge
  )
}
