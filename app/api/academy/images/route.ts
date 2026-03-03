import { type NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db/client"

const SANDRA_USER_IDS = [
  "58b63fd8-ab3f-4fe6-a85d-8a5a6acd4b31",
  "0ba28d69-fcd4-4ab2-8671-88fde77e4f94",
  "75e17c7d-f549-4773-a5d4-0458b7c7353b",
] as const

const SLOT_CATEGORY_MAP = {
  hero: ["Close-Up Portrait", "Close-Up"],
  portrait: ["Close-Up Portrait", "Close-Up"],
  lifestyle: ["Half Body Lifestyle", "Lifestyle"],
  working: ["Environmental Portrait", "Environmental", "Half Body Lifestyle"],
  fullbody: ["Half Body", "Half Body Lifestyle", "Environmental Portrait"],
  flatlay: ["Flatlay"],
  brand: ["brand-scene", "photoshoot"],
  any: [],
} as const

type Slot = keyof typeof SLOT_CATEGORY_MAP

function isLocalhostRequest(request: NextRequest): boolean {
  const hostname = request.nextUrl.hostname.toLowerCase()
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return true
  }

  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").toLowerCase()
  return host.startsWith("localhost:") || host.startsWith("127.0.0.1:") || host.startsWith("[::1]:")
}

function parseSlot(value: string | null): Slot | null {
  if (!value) return null
  return value in SLOT_CATEGORY_MAP ? (value as Slot) : null
}

function parseLimit(value: string | null): number {
  const parsed = Number.parseInt(value || "5", 10)
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return 5
  return Math.min(Math.max(parsed, 1), 20)
}

function parseExcludeIds(value: string | null): string[] {
  if (!value) return []
  return value
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
}

export async function GET(request: NextRequest) {
  try {
    const isInternalHeader = request.headers.get("x-internal") === "academy-builder"
    if (!isInternalHeader && !isLocalhostRequest(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const slot = parseSlot(request.nextUrl.searchParams.get("slot"))
    if (!slot) {
      return NextResponse.json(
        { error: "Invalid slot. Expected one of: hero, portrait, lifestyle, working, fullbody, flatlay, brand, any" },
        { status: 400 },
      )
    }

    const limit = parseLimit(request.nextUrl.searchParams.get("limit"))
    const excludeIds = parseExcludeIds(request.nextUrl.searchParams.get("exclude"))
    const categories = SLOT_CATEGORY_MAP[slot]
    const db = getDb()

    const images = await db`
      WITH all_images AS (
        SELECT
          ('gi_' || id::text) AS source_id,
          selected_url AS url,
          category,
          subcategory,
          'generated_images' AS source
        FROM generated_images
        WHERE user_id = ANY(${SANDRA_USER_IDS}::text[])
          AND selected_url IS NOT NULL
          AND NULLIF(TRIM(selected_url), '') IS NOT NULL
          AND (${slot} = 'any' OR category = ANY(${categories}::text[]))

        UNION ALL

        SELECT
          ('ai_' || id::text) AS source_id,
          image_url AS url,
          category,
          style AS subcategory,
          'ai_images' AS source
        FROM ai_images
        WHERE user_id = ANY(${SANDRA_USER_IDS}::text[])
          AND image_url IS NOT NULL
          AND NULLIF(TRIM(image_url), '') IS NOT NULL
          AND (${slot} = 'any' OR category = ANY(${categories}::text[]))
      ),
      filtered AS (
        SELECT *
        FROM all_images
        WHERE CARDINALITY(${excludeIds}::text[]) = 0
          OR source_id != ALL(${excludeIds}::text[])
      ),
      deduped AS (
        SELECT
          source_id,
          url,
          category,
          subcategory,
          source,
          ROW_NUMBER() OVER (PARTITION BY url ORDER BY RANDOM()) AS row_num
        FROM filtered
      )
      SELECT
        source_id AS id,
        url,
        category,
        subcategory,
        source
      FROM deduped
      WHERE row_num = 1
      ORDER BY RANDOM()
      LIMIT ${limit}
    ` as Array<{
      id: string
      url: string
      category: string | null
      subcategory: string | null
      source: "generated_images" | "ai_images"
    }>

    return NextResponse.json({
      slot,
      images,
    })
  } catch (error) {
    console.error("[ACADEMY_IMAGES] Failed to fetch image library:", error)
    return NextResponse.json({ error: "Failed to fetch academy images" }, { status: 500 })
  }
}
