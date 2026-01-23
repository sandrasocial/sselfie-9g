import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { buildPromptFromScene } from "@/lib/feed-planner/prompt-shaper"
import { loadStyleDefinition } from "@/lib/feed-planner/database-loader"
import type { FeedPlannerScene } from "@/lib/feed-planner/scene-resolver"

export async function POST(request: Request) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json(
      { error: adminCheck.error || "Admin access required" },
      { status: adminCheck.error === "Not authenticated" ? 401 : 403 },
    )
  }

  try {
    const payload = await request.json()
    const {
      visual_aesthetic,
      feed_style,
      fashion_style,
      position,
      activity,
      outfit_description,
      location_type,
      location_description,
      camera_framing,
      objects,
      lighting_type,
      pose_description,
      narrative,
      final_prompt_override,
    } = payload

    if (!visual_aesthetic || !feed_style || !fashion_style) {
      return NextResponse.json(
        { error: "Visual aesthetic, feed style, and fashion style are required." },
        { status: 400 },
      )
    }

    const styleDefinition = await loadStyleDefinition(visual_aesthetic, feed_style)
    const parsedObjects = Array.isArray(objects) ? objects : []

    const scene: FeedPlannerScene = {
      position: Number(position) || 1,
      activity: activity || "lifestyle",
      narrative: narrative || "Lifestyle moment",
      location: {
        type: location_type || "lifestyle",
        description: location_description || "lifestyle location",
        indoor: Boolean(location_type && location_type.toLowerCase().includes("indoor")),
        public: Boolean(
          location_type &&
            (location_type.toLowerCase().includes("public") ||
              location_type.toLowerCase().includes("street") ||
              location_type.toLowerCase().includes("urban") ||
              location_type.toLowerCase().includes("outdoor")),
        ),
      },
      outfit: {
        style: outfit_description || "editorial outfit",
        description: outfit_description || "editorial outfit",
        base: "custom_base",
      },
      objects: parsedObjects.map((obj) => ({
        type: String(obj.type || "object"),
        description: String(obj.description || obj.type || "object"),
        position: obj.position,
      })),
      lighting: {
        type: lighting_type || "natural_window_light",
        quality: "even",
        description: lighting_type || "natural light",
      },
      camera: {
        device: "iphone_15_pro",
        mode: "photo",
        framing: (camera_framing || "full_body") as FeedPlannerScene["camera"]["framing"],
      },
      pose: {
        type: pose_description || "natural_pose",
        description: pose_description || "natural pose",
      },
      category: styleDefinition.category as FeedPlannerScene["category"],
      mood: styleDefinition.mood as FeedPlannerScene["mood"],
      visualAesthetic: visual_aesthetic,
      fashionStyle: String(fashion_style).toLowerCase(),
      userId: "admin-preview",
      feedId: 0,
      finalPromptOverride: final_prompt_override || null,
    }

    const prompt = buildPromptFromScene(scene, "single_scene")

    return NextResponse.json({ prompt })
  } catch (error) {
    console.error("[admin-feed-positions-preview]", error)
    return NextResponse.json({ error: "Failed to build prompt preview." }, { status: 500 })
  }
}
