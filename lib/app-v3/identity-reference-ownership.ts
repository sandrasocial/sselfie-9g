import { sql } from "@/lib/db/client"

export async function findUnownedIdentityReferences(input: {
  neonUserId: string
  referenceUrls: string[]
  admin: boolean
}): Promise<string[]> {
  if (input.admin) return []

  const storedReferences = Array.from(
    new Set(input.referenceUrls.filter((url) => !url.startsWith("data:"))),
  )
  if (storedReferences.length === 0) return []

  const ownedRows = await sql`
    SELECT image_url FROM user_avatar_images
    WHERE user_id = ${input.neonUserId}
      AND image_url = ANY(${storedReferences})
  `
  const ownedUrls = new Set(ownedRows.map((row: { image_url?: unknown }) => String(row.image_url)))
  return storedReferences.filter((url) => !ownedUrls.has(url))
}
