export type GrowthPriority = {
  label: string
  status: "good" | "watch" | "urgent"
  message: string
}

export type GrowthIntelligenceInput = {
  vaultVisits: number
  freeToVaultClicks: number
  checkoutStarts: number
  purchases: number
  promptCopies: number
  buyers: number
}

export function percent(numerator: number, denominator: number): number {
  if (!denominator) return 0
  return Math.round((numerator / denominator) * 100)
}

export function formatPercent(numerator: number, denominator: number): string {
  return `${percent(numerator, denominator)}%`
}

export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`
}

export function evaluateGrowthPriorities(input: GrowthIntelligenceInput): GrowthPriority[] {
  const checkoutConversion = percent(input.purchases, input.checkoutStarts)
  const visitToCheckout = percent(input.checkoutStarts, input.vaultVisits)
  const previewToVault = percent(input.freeToVaultClicks, input.vaultVisits)
  const copiesPerBuyer = input.buyers ? input.promptCopies / input.buyers : 0

  const priorities: GrowthPriority[] = []

  if (input.vaultVisits < 100 && input.checkoutStarts < 10) {
    priorities.push({
      label: "Traffic flow",
      status: "urgent",
      message: "Warm traffic is still too thin. Push reels, stories, and ManyChat links into the Vault before judging the offer.",
    })
  } else if (visitToCheckout < 5) {
    priorities.push({
      label: "Vault bridge",
      status: "urgent",
      message: "People are reaching the Vault but not starting checkout. Tighten the free-preview CTA and make the full-shoot upgrade feel immediate.",
    })
  } else {
    priorities.push({
      label: "Vault bridge",
      status: "good",
      message: "Traffic is reaching checkout. Keep attribution clean and send more warm visitors to the same path.",
    })
  }

  if (input.checkoutStarts >= 5 && checkoutConversion < 8) {
    priorities.push({
      label: "Checkout conversion",
      status: "watch",
      message: "Checkout intent exists, but completion is soft. Watch recovery emails, payment failures, and price-friction language.",
    })
  } else if (input.checkoutStarts >= 5) {
    priorities.push({
      label: "Checkout conversion",
      status: "good",
      message: "Checkout conversion is healthy enough to focus on more qualified traffic instead of rebuilding the product.",
    })
  }

  if (input.buyers > 0 && copiesPerBuyer < 1) {
    priorities.push({
      label: "Product activation",
      status: "watch",
      message: "Buyers are not copying enough prompts yet. Improve first-result guidance and make the strongest shot the obvious first action.",
    })
  } else if (input.buyers > 0) {
    priorities.push({
      label: "Product activation",
      status: "good",
      message: "Buyers are using the product. Use copy frequency to choose the next reel and next aesthetic drop.",
    })
  }

  if (previewToVault > 0 && previewToVault < 10) {
    priorities.push({
      label: "Free preview CTA",
      status: "watch",
      message: "The free preview is not sending enough people deeper. Test a stronger per-shoot Vault CTA after the first prompt copy.",
    })
  }

  return priorities.slice(0, 5)
}
