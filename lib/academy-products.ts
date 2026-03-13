import { getAcademyProductCatalog } from "./academy-entitlements"

export type AcademyProductDisplay = Awaited<ReturnType<typeof getAcademyProductCatalog>>[number]

export async function getAcademyProducts(): Promise<AcademyProductDisplay[]> {
  return getAcademyProductCatalog()
}
