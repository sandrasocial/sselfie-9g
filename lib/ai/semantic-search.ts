/**
 * Semantic Search
 * Search codebase using semantic similarity
 */

import { embed } from "ai"
import { openai } from "@ai-sdk/openai"
import { getVectorClient, VectorNamespaces } from "@/lib/upstash-vector"

export interface SearchResult {
  filePath: string
  content: string
  score: number
  metadata: {
    type?: string
    category?: string
    tags?: string[]
    language?: string
    indexedAt?: string
  }
}

export interface SearchOptions {
  limit?: number
  type?: "code" | "docs" | "api" | "component" | "config"
  category?: string
  minScore?: number
}

/**
 * Search codebase semantically
 */
export async function searchCodebase(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  try {
    const vectorClient = getVectorClient()

    // Generate query embedding
    const { embedding } = await embed({
      model: openai.embedding("text-embedding-3-small"),
      value: query,
    })

    // Build filter if type specified
    const filter = options.type ? { type: options.type } : undefined

    // Search vector index
    const results = await vectorClient.query({
      vector: embedding,
      topK: options.limit || 10,
      includeMetadata: true,
      filter,
    })

    // Transform results and filter by minScore if specified
    const searchResults: SearchResult[] = results
      .filter((result) => {
        // Filter by minScore if specified
        if (options.minScore !== undefined && result.score < options.minScore) {
          return false
        }

        // Filter by category if specified
        if (options.category && result.metadata?.category !== options.category) {
          return false
        }

        return true
      })
      .map((result) => ({
        filePath: result.metadata?.filePath as string,
        content: result.metadata?.content as string,
        score: result.score,
        metadata: {
          type: result.metadata?.type as string | undefined,
          category: result.metadata?.category as string | undefined,
          tags: result.metadata?.tags as string[] | undefined,
          language: result.metadata?.language as string | undefined,
          indexedAt: result.metadata?.indexedAt as string | undefined,
        },
      }))

    return searchResults
  } catch (error) {
    console.error("[SemanticSearch] Error searching codebase:", error)
    throw error
  }
}

/**
 * Get similar files to a given file path
 */
export async function findSimilarFiles(
  filePath: string,
  limit: number = 5
): Promise<SearchResult[]> {
  try {
    const vectorClient = getVectorClient()
    const id = `${VectorNamespaces.codebase}:${filePath}`

    // Get the file's vector
    const fileData = await vectorClient.fetch([id])
    if (!fileData || fileData.length === 0) {
      return []
    }

    const fileVector = fileData[0]?.vector
    if (!fileVector) {
      return []
    }

    // Find similar files
    const results = await vectorClient.query({
      vector: fileVector,
      topK: limit + 1, // +1 to exclude the file itself
      includeMetadata: true,
    })

    // Filter out the file itself and transform
    return results
      .filter((result) => result.metadata?.filePath !== filePath)
      .slice(0, limit)
      .map((result) => ({
        filePath: result.metadata?.filePath as string,
        content: result.metadata?.content as string,
        score: result.score,
        metadata: {
          type: result.metadata?.type as string | undefined,
          category: result.metadata?.category as string | undefined,
          tags: result.metadata?.tags as string[] | undefined,
          language: result.metadata?.language as string | undefined,
          indexedAt: result.metadata?.indexedAt as string | undefined,
        },
      }))
  } catch (error) {
    console.error("[SemanticSearch] Error finding similar files:", error)
    return []
  }
}
