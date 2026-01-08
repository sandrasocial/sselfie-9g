import { NextResponse } from "next/server"
import { searchCodebase, findSimilarFiles } from "@/lib/ai/semantic-search"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * POST /api/brand-brain/search-codebase
 * Semantic search across codebase
 */
export async function POST(request: Request) {
  try {
    // Verify admin access
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { query, type, category, limit, minScore, filePath } = body

    if (!query && !filePath) {
      return NextResponse.json(
        { error: "Query or filePath required" },
        { status: 400 }
      )
    }

    let results

    if (filePath) {
      // Find similar files to the given file
      results = await findSimilarFiles(filePath, limit || 5)
    } else {
      // Semantic search
      results = await searchCodebase(query, {
        limit: limit || 10,
        type,
        category,
        minScore,
      })
    }

    return NextResponse.json({
      success: true,
      results,
      count: results.length,
    })
  } catch (error) {
    console.error("[BrandBrain] Error searching codebase:", error)
    return NextResponse.json(
      {
        error: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/brand-brain/search-codebase
 * Health check and info
 */
export async function GET() {
  return NextResponse.json({
    service: "codebase-semantic-search",
    status: "active",
    description: "Semantic search across codebase using OpenAI embeddings and Upstash Vector",
    endpoints: {
      POST: {
        description: "Search codebase semantically",
        body: {
          query: "string (required for search)",
          filePath: "string (required for similar files)",
          type: "code | docs | api | component | config (optional)",
          category: "string (optional)",
          limit: "number (optional, default: 10)",
          minScore: "number (optional, 0-1)",
        },
      },
    },
  })
}
