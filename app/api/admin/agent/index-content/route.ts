import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getVectorClient, VectorNamespaces, generateEmbeddingId } from "@/lib/upstash-vector"

const ADMIN_EMAIL = "ssa@ssasocial.com"

// Batch index competitor content and past campaigns
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

    const { type } = await request.json() // 'competitors' or 'campaigns'

    const vectorClient = getVectorClient()
    let indexed = 0

    if (type === "competitors" || !type) {
      // Index competitor content
      const { data: competitorContent } = await supabase
        .from("competitor_content_analysis")
        .select("*")
        .eq("vector_indexed", false)
        .limit(100)

      if (competitorContent && competitorContent.length > 0) {
        for (const content of competitorContent) {
          const vectorId = generateEmbeddingId(VectorNamespaces.competitorContent, content.id)

          const textToIndex = `${content.content_type}: ${content.content_text || ""} 
            Themes: ${content.content_themes?.join(", ") || ""}
            Tone: ${content.tone_analysis || ""}
            Hashtags: ${content.hashtags?.join(", ") || ""}`

          await vectorClient.upsert({
            id: vectorId,
            data: textToIndex,
            metadata: {
              contentId: content.id,
              competitorId: content.competitor_id,
              contentType: content.content_type,
              engagementRate: content.engagement_rate,
              analyzedAt: content.analyzed_at,
            },
            namespace: VectorNamespaces.competitorContent,
          })

          await supabase
            .from("competitor_content_analysis")
            .update({ vector_indexed: true, vector_id: vectorId })
            .eq("id", content.id)

          indexed++
        }
      }
    }

    if (type === "campaigns" || !type) {
      // Index past campaigns from Maya chats
      const { data: campaigns } = await supabase
        .from("maya_chat_messages")
        .select("*")
        .eq("vector_indexed", false)
        .eq("role", "assistant")
        .ilike("content", "%content calendar%")
        .limit(100)

      if (campaigns && campaigns.length > 0) {
        for (const campaign of campaigns) {
          const vectorId = generateEmbeddingId(VectorNamespaces.userCampaigns, campaign.id)

          await vectorClient.upsert({
            id: vectorId,
            data: campaign.content,
            metadata: {
              messageId: campaign.id,
              chatId: campaign.chat_id,
              createdAt: campaign.created_at,
            },
            namespace: VectorNamespaces.userCampaigns,
          })

          await supabase
            .from("maya_chat_messages")
            .update({
              vector_indexed: true,
              vector_id: vectorId,
              is_campaign: true,
            })
            .eq("id", campaign.id)

          indexed++
        }
      }
    }

    return NextResponse.json({
      success: true,
      indexed,
      message: `Indexed ${indexed} items`,
    })
  } catch (error) {
    console.error("[v0] Batch indexing error:", error)
    return NextResponse.json({ error: "Failed to index content" }, { status: 500 })
  }
}
