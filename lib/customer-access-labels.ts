export function getProductDisplayName(productType?: string | null): string {
  switch (productType) {
    case "sselfie_studio_membership":
    case "skool_membership":
    case "brand_studio_membership":
      return "Studio"
    case "one_time_session":
      return "Session"
    case "starter_kit":
    case "starter-kit-paid":
      return "Starter Kit"
    case "prompt_vault":
    case "prompt-vault-paid":
      return "Prompt Vault"
    case "presets_single":
    case "presets_bundle":
    case "presets-single-paid":
    case "presets-bundle-paid":
      return "SSELFIE Presets"
    case "selfie_to_brand_shoot_system":
    case "selfie-to-brand-shoot-paid":
      return "Selfie to Brand Shoot"
    case "selfie_guide":
    case "selfie_guide_bundle":
    case "selfie-guide-paid":
      return "Selfie Guide"
    case "masterclass":
    case "editing_masterclass":
      return "Editing Masterclass"
    case "brand_strategy_pack":
      return "Brand Strategy Pack"
    case "paid_blueprint":
      return "Paid Blueprint"
    default:
      return "Free"
  }
}

export function getAccessLabel(productType?: string | null): string {
  const displayName = getProductDisplayName(productType)
  if (displayName === "Free") return "Free Member"
  if (displayName === "Studio") return "Studio Member"
  return `${displayName} Access`
}
