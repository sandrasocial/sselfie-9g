export type StudioSearchParams = {
  source?: string
  product?: string
  first_time_product_user?: string
}

export type ParsedStudioAcademyContext = {
  academyPurchaseSource?: "academy_purchase"
  academyPurchaseProduct?: string
  firstTimeProductUser: boolean
}

function parseBooleanFlag(value: string | undefined): boolean {
  if (!value) return false
  const normalized = value.trim().toLowerCase()
  return normalized === "true" || normalized === "1" || normalized === "yes"
}

export function parseStudioAcademyContext(
  params: StudioSearchParams,
): ParsedStudioAcademyContext {
  const academyPurchaseSource = params.source === "academy_purchase" ? "academy_purchase" : undefined
  const academyPurchaseProduct =
    academyPurchaseSource && typeof params.product === "string" && params.product.trim().length > 0
      ? params.product.trim()
      : undefined

  const firstTimeProductUser =
    academyPurchaseSource && academyPurchaseProduct
      ? parseBooleanFlag(params.first_time_product_user)
      : false

  return {
    academyPurchaseSource,
    academyPurchaseProduct,
    firstTimeProductUser,
  }
}
