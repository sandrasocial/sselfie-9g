import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { ACADEMY_PRODUCTS, type AcademyProductId } from "@/lib/products"
import { getAcademyProducts } from "@/lib/academy-products"

const sql = neon(process.env.DATABASE_URL!)

const VALID_PRODUCT_IDS = new Set(Object.keys(ACADEMY_PRODUCTS))

type UpdatePayload = {
  product_id?: string
  name?: string
  tagline?: string
  description?: string
  price_cents?: number
  active?: boolean
}

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 })
}

function unauthorized(error?: string) {
  return NextResponse.json(
    { error: error || "Admin access required" },
    { status: error === "Not authenticated" ? 401 : 403 },
  )
}

export async function GET() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return unauthorized(adminCheck.error)
  }

  const products = await getAcademyProducts()
  return NextResponse.json({ products })
}

async function upsertProductOverride(request: Request) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return unauthorized(adminCheck.error)
  }

  const body = (await request.json().catch(() => ({}))) as UpdatePayload
  const { product_id, name, tagline, description, price_cents, active } = body

  if (!product_id || !VALID_PRODUCT_IDS.has(product_id)) {
    return badRequest("Valid product_id is required")
  }

  if (price_cents !== undefined) {
    if (!Number.isInteger(price_cents) || price_cents < 0) {
      return badRequest("price_cents must be a non-negative integer")
    }
  }

  await sql`
    INSERT INTO academy_product_overrides (product_id, name, tagline, description, price_cents, active, updated_at)
    VALUES (
      ${product_id},
      ${name ?? null},
      ${tagline ?? null},
      ${description ?? null},
      ${price_cents ?? null},
      ${active ?? true},
      NOW()
    )
    ON CONFLICT (product_id)
    DO UPDATE SET
      name = EXCLUDED.name,
      tagline = EXCLUDED.tagline,
      description = EXCLUDED.description,
      price_cents = EXCLUDED.price_cents,
      active = EXCLUDED.active,
      updated_at = NOW()
  `

  const products = await getAcademyProducts()
  const updatedProduct = products.find((product) => product.id === (product_id as AcademyProductId))

  return NextResponse.json({ product: updatedProduct ?? null })
}

export async function POST(request: Request) {
  return upsertProductOverride(request)
}

export async function PATCH(request: Request) {
  return upsertProductOverride(request)
}
