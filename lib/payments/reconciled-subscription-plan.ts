type ReconciledPlanInput = {
  metadata: Record<string, unknown> | null | undefined
  productType: string
}

/**
 * Plan identifies the commercial agreement; product_type identifies the product family.
 * Existing rows are never passed through this helper because reconciliation must preserve
 * their stable plan. This is only the safe plan value for a newly recovered Stripe row.
 */
export function resolveReconciledSubscriptionPlan(input: ReconciledPlanInput): string {
  const metadataPlan = input.metadata?.plan
  if (typeof metadataPlan === "string" && metadataPlan.trim()) {
    return metadataPlan.trim()
  }

  const metadataProductId = input.metadata?.product_id
  const metadataProductType = input.metadata?.product_type
  if (
    metadataProductId === "sselfie_studio_membership_annual" ||
    metadataProductType === "sselfie_studio_membership_annual"
  ) {
    return "annual"
  }

  return input.productType
}
