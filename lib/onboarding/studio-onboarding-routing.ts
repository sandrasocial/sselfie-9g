type BlueprintFallbackRoutingInput = {
  isBlueprintUser: boolean
  isMember: boolean
  onboardingCompleted: boolean
}

type MissingOnboardingRoutingInput = {
  isMember: boolean
  blueprintWelcomeShown: boolean
  hasBaseWizardData: boolean
  hasExtensionData: boolean
}

type WelcomeFirstGenerationModalInput = {
  eligible: boolean
}

/**
 * Only members should be auto-routed to Feed Planner on Studio load.
 * Free users should stay in Maya and use the welcome-first-generation flow.
 */
export function shouldApplyBlueprintFallbackRouting({
  isBlueprintUser,
  isMember,
  onboardingCompleted,
}: BlueprintFallbackRoutingInput): boolean {
  return isBlueprintUser && isMember && !onboardingCompleted
}

/**
 * Feed Planner onboarding auto-routing is now member-only.
 * Free users can open Feed Planner onboarding intentionally from the Feed tab.
 */
export function shouldRouteMemberToFeedPlannerOnMissingOnboarding({
  isMember,
  blueprintWelcomeShown,
  hasBaseWizardData,
  hasExtensionData,
}: MissingOnboardingRoutingInput): boolean {
  const hasMissingData = !hasBaseWizardData || !hasExtensionData
  return isMember && blueprintWelcomeShown && hasMissingData
}

/**
 * Legacy "Your First Photo in 3 Steps" modal is fully disabled.
 * First-time guidance must stay inside Maya welcome screen.
 */
export function shouldOpenWelcomeFirstGenerationModal({
  eligible,
}: WelcomeFirstGenerationModalInput): boolean {
  void eligible
  return false
}
