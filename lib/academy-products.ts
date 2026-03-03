import { sql } from "@/lib/db/client"
import { ACADEMY_PRODUCTS, type AcademyProductId } from "./products"

export type AcademyProductDisplay = {
  id: AcademyProductId
  name: string
  tagline: string
  description: string
  price: number
  stripePriceId: string
  manychatKeyword: string
  tag: string
  upsellTo: string | null
  active: boolean
}

type ProductOverrideRow = {
  product_id: string
  name: string | null
  tagline: string | null
  description: string | null
  price_cents: number | null
  active: boolean | null
}

export async function getAcademyProducts(): Promise<AcademyProductDisplay[]> {

  const overrides = (await sql`
    SELECT product_id, name, tagline, description, price_cents, active
    FROM academy_product_overrides
  `.catch(() => [])) as ProductOverrideRow[]

  const overrideMap = new Map(overrides.map((row) => [row.product_id, row]))

  return (Object.values(ACADEMY_PRODUCTS) as Array<(typeof ACADEMY_PRODUCTS)[AcademyProductId]>).map((product) => {
    const override = overrideMap.get(product.id)

    return {
      id: product.id,
      name: override?.name ?? product.name,
      tagline: override?.tagline ?? product.tagline,
      description: override?.description ?? product.description,
      price: override?.price_cents ?? product.price,
      stripePriceId: product.stripePriceId,
      manychatKeyword: product.manychatKeyword,
      tag: product.tag,
      upsellTo: product.upsellTo ?? null,
      active: override?.active ?? true,
    }
  })
}
