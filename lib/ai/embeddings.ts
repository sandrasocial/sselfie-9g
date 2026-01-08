/**
 * Embedding Service
 * Generates embeddings for codebase files and stores them in Upstash Vector
 */

import { getVectorClient, generateEmbeddingId, VectorNamespaces } from "@/lib/upstash-vector"
import OpenAI from "openai"

export interface FileMetadata {
  type: "code" | "docs" | "api" | "component" | "config"
  category?: string
  tags?: string[]
  language?: string
}

/**
 * Index a codebase file with its content
 */
export async function indexCodebaseFile(
  filePath: string,
  content: string,
  metadata: FileMetadata
): Promise<void> {
  try {
    // Skip empty files
    if (!content || content.trim().length === 0) {
      console.log(`[Embeddings] Skipping empty file: ${filePath}`)
      return
    }

    const vectorClient = getVectorClient()

    // Truncate content to ~6000 tokens (safety margin for 8192 token limit)
    // Rough estimate: 1 token ≈ 4 characters, so 6000 tokens ≈ 24,000 characters
    const MAX_CONTENT_LENGTH = 24000
    const truncatedContent = content.length > MAX_CONTENT_LENGTH 
      ? content.substring(0, MAX_CONTENT_LENGTH) + "\n\n[Content truncated for embedding...]"
      : content

    // Generate embedding using OpenAI SDK
    let embedding: number[]
    try {
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) {
        throw new Error("OPENAI_API_KEY environment variable is not set")
      }

      const openai = new OpenAI({ 
        apiKey,
        // Use default fetch but with timeout
        timeout: 30000,
      })
      
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: truncatedContent,
      })

      if (!response.data || !response.data[0] || !response.data[0].embedding) {
        throw new Error("Invalid response format from OpenAI API")
      }
      
      embedding = response.data[0].embedding
    } catch (embedError) {
      // If embedding fails, skip this file but don't crash
      const errorMsg = embedError instanceof Error ? embedError.message : String(embedError)
      console.error(`[Embeddings] Failed to generate embedding for ${filePath}: ${errorMsg}`)
      throw embedError
    }

    // Generate unique ID for this file
    const id = generateEmbeddingId(VectorNamespaces.codebase, filePath)

    // Store in vector index with metadata
    await vectorClient.upsert({
      id,
      vector: embedding,
      metadata: {
        filePath,
        content: truncatedContent.substring(0, 2000), // First 2000 chars for preview
        type: metadata.type,
        category: metadata.category || "other",
        tags: metadata.tags || [],
        language: metadata.language,
        indexedAt: new Date().toISOString(),
        contentLength: content.length,
        truncated: content.length > MAX_CONTENT_LENGTH,
      },
    })

    console.log(`[Embeddings] Indexed: ${filePath}`)
  } catch (error) {
    console.error(`[Embeddings] Error indexing ${filePath}:`, error)
    throw error
  }
}

/**
 * Remove a file from the index
 */
export async function removeCodebaseFile(filePath: string): Promise<void> {
  try {
    const vectorClient = getVectorClient()
    const id = generateEmbeddingId(VectorNamespaces.codebase, filePath)

    await vectorClient.delete([id])
    console.log(`[Embeddings] Removed: ${filePath}`)
  } catch (error) {
    console.error(`[Embeddings] Error removing ${filePath}:`, error)
    throw error
  }
}

/**
 * Update an existing indexed file
 */
export async function updateCodebaseFile(
  filePath: string,
  content: string,
  metadata: FileMetadata
): Promise<void> {
  // Upsert will update if exists, create if not
  await indexCodebaseFile(filePath, content, metadata)
}
