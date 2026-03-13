import { NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { getAcademyProducts } from "@/lib/academy-products"

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
    { status: error === "Not authenticated" ? 401 : 403 }
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
  const products = await getAcademyProducts()
  const validProductIds = new Set(products.map(product => product.id))

  if (!product_id || !validProductIds.has(product_id)) {
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

  const updatedProducts = await getAcademyProducts()
  const updatedProduct = updatedProducts.find(product => product.id === product_id)

  return NextResponse.json({ product: updatedProduct ?? null })
}

export async function POST(request: Request) {
  return upsertProductOverride(request)
}

export async function PATCH(request: Request) {
  return upsertProductOverride(request)
}
