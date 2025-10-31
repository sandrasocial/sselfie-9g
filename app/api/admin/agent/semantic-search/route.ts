import { type NextRequest, NextResponse } from "next/server"
import { getVectorClient, VectorNamespaces, generateEmbeddingId } from "@/lib/upstash-vector"
import { createServerClient } from "@/lib/supabase/server"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function POST(request: NextRequest) {
  try {
    // Admin auth check
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser || authUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { query, namespace, limit = 10 } = await request.json()

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    const vectorClient = getVectorClient()

    // Perform semantic search
    const results = await vectorClient.query({
      data: query,
      topK: limit,
      includeMetadata: true,
      namespace: namespace || VectorNamespaces.competitorContent,
    })

    return NextResponse.json({ results })
  } catch (error) {
    console.error("[v0] Semantic search error:", error)
    return NextResponse.json({ error: "Failed to perform semantic search" }, { status: 500 })
  }
}

// Index competitor content for semantic search
export async function PUT(request: NextRequest) {
  try {
    // Admin auth check
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser || authUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { contentId, text, metadata, namespace } = await request.json()

    if (!contentId || !text) {
      return NextResponse.json({ error: "contentId and text are required" }, { status: 400 })
    }

    const vectorClient = getVectorClient()
    const vectorId = generateEmbeddingId(namespace || VectorNamespaces.competitorContent, contentId)

    // Upsert to vector database
    await vectorClient.upsert({
      id: vectorId,
      data: text,
      metadata: {
        ...metadata,
        contentId,
        indexedAt: new Date().toISOString(),
      },
      namespace: namespace || VectorNamespaces.competitorContent,
    })

    // Update database to mark as indexed
    if (namespace === VectorNamespaces.competitorContent) {
      await supabase
        .from("competitor_content_analysis")
        .update({
          vector_indexed: true,
          vector_id: vectorId,
        })
        .eq("id", contentId)
    } else if (namespace === VectorNamespaces.userCampaigns) {
      await supabase
        .from("maya_chat_messages")
        .update({
          vector_indexed: true,
          vector_id: vectorId,
          is_campaign: true,
        })
        .eq("id", contentId)
    }

    return NextResponse.json({ success: true, vectorId })
  } catch (error) {
    console.error("[v0] Vector indexing error:", error)
    return NextResponse.json({ error: "Failed to index content" }, { status: 500 })
  }
}
