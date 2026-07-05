import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import OpenAI from "openai"

import { getAcademyProductCatalog } from "@/lib/academy-entitlements"
import { isAdminEmail } from "@/lib/admin-feature-flags"
import { sql } from "@/lib/db/client"
import { createServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const maxDuration = 120

const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"

async function requireAdmin(): Promise<boolean> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return isAdminEmail(user?.email)
}

async function ensureProductOverrideSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS academy_product_overrides (
      product_id TEXT PRIMARY KEY,
      name TEXT,
      tagline TEXT,
      description TEXT,
      price_cents INTEGER,
      active BOOLEAN DEFAULT TRUE,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `
  await sql`
    ALTER TABLE academy_product_overrides
    ADD COLUMN IF NOT EXISTS thumbnail_url TEXT
  `
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeThumbnailUrl(value: unknown): string | null {
  const url = normalizeText(value)
  if (!url) return null
  if (url.startsWith("/") || url.startsWith("https://") || url.startsWith("http://")) return url
  return null
}

function normalizePriceCents(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && numberValue >= 0 ? Math.round(numberValue) : null
}

async function findProduct(productId: string) {
  const catalog = await getAcademyProductCatalog()
  return catalog.find(product => product.id === productId) ?? null
}

function buildMockupPrompt(product: Awaited<ReturnType<typeof findProduct>>) {
  if (!product) return ""
  return [
    "Create a premium editorial product cover mockup for SSELFIE Studio.",
    `Product: ${product.name}.`,
    product.tagline ? `Promise: ${product.tagline}.` : "",
    "Style: warm minimalist Scandinavian editorial, soft daylight, black and stone neutrals, realistic course/product materials on a desk or phone screen.",
    "Do not include readable text, logos, fake UI, distorted words, or people. Make it feel like a polished member library thumbnail.",
  ]
    .filter(Boolean)
    .join(" ")
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await ensureProductOverrideSchema()
  const products = await getAcademyProductCatalog()
  return NextResponse.json({ products })
}

export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await ensureProductOverrideSchema()

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const productId = normalizeText(body?.productId)
  if (!productId) return NextResponse.json({ error: "Product id is required" }, { status: 400 })

  const product = await findProduct(productId)
  if (!product) return NextResponse.json({ error: "Unknown product" }, { status: 404 })

  const active = typeof body?.active === "boolean" ? body.active : product.active

  const [override] = await sql`
    INSERT INTO academy_product_overrides (
      product_id,
      name,
      tagline,
      description,
      price_cents,
      thumbnail_url,
      active,
      updated_at
    )
    VALUES (
      ${productId},
      ${normalizeText(body?.name)},
      ${normalizeText(body?.tagline)},
      ${normalizeText(body?.description)},
      ${normalizePriceCents(body?.priceCents)},
      ${normalizeThumbnailUrl(body?.thumbnailUrl)},
      ${active},
      NOW()
    )
    ON CONFLICT (product_id) DO UPDATE SET
      name = EXCLUDED.name,
      tagline = EXCLUDED.tagline,
      description = EXCLUDED.description,
      price_cents = EXCLUDED.price_cents,
      thumbnail_url = EXCLUDED.thumbnail_url,
      active = EXCLUDED.active,
      updated_at = NOW()
    RETURNING *
  `

  return NextResponse.json({ productId, override })
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await ensureProductOverrideSchema()

  const body = (await request.json().catch(() => null)) as { action?: string; productId?: string } | null
  if (body?.action !== "generate-mockup") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  }

  const productId = normalizeText(body.productId)
  if (!productId) return NextResponse.json({ error: "Product id is required" }, { status: 400 })

  const product = await findProduct(productId)
  if (!product) return NextResponse.json({ error: "Unknown product" }, { status: 404 })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "Image generation is not configured" }, { status: 500 })
  }

  const openai = new OpenAI({ apiKey })
  const response = await openai.images.generate({
    model: OPENAI_IMAGE_MODEL,
    prompt: buildMockupPrompt(product),
    n: 1,
    size: "1024x1536",
    quality: "high",
    output_format: "png",
    moderation: "low",
  } as any)

  const b64 = response.data?.[0]?.b64_json
  if (!b64) throw new Error("No image data returned from OpenAI")

  const blob = await put(
    `academy/product-mockups/${productId}-${Date.now()}.png`,
    Buffer.from(b64, "base64"),
    { access: "public", contentType: "image/png" }
  )

  await sql`
    INSERT INTO academy_product_overrides (product_id, thumbnail_url, active, updated_at)
    VALUES (${productId}, ${blob.url}, ${product.active}, NOW())
    ON CONFLICT (product_id) DO UPDATE SET
      thumbnail_url = EXCLUDED.thumbnail_url,
      updated_at = NOW()
  `

  return NextResponse.json({ productId, thumbnailUrl: blob.url })
}
