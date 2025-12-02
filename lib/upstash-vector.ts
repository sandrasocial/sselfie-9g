import { Index } from "@upstash/vector"

// Initialize Upstash Vector client for semantic search
export function getVectorClient() {
  const url = process.env.UPSTASH_SEARCH_REST_URL
  const token = process.env.UPSTASH_SEARCH_REST_TOKEN

  if (!url || !token) {
    console.error("[v0] Upstash Vector environment variables not set")
    throw new Error("UPSTASH_SEARCH_REST_URL and UPSTASH_SEARCH_REST_TOKEN must be set")
  }

  console.log("[v0] Initializing Upstash Vector client with URL:", url.substring(0, 30) + "...")

  return new Index({
    url,
    token,
  })
}

// Vector namespace keys (following CacheKeys pattern from redis.ts)
export const VectorNamespaces = {
  competitorContent: "competitor:content",
  userCampaigns: "user:campaigns",
  contentIdeas: "content:ideas",
  emailTemplates: "email:templates",
}

// Helper to generate embedding ID
export function generateEmbeddingId(namespace: string, id: string | number) {
  return `${namespace}:${id}`
}
