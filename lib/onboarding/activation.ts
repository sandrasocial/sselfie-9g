export type FreeUserWizardDecisionInput = {
  onboardingCompleted: boolean
  hasSelfies: boolean
}

export type FreeUserWizardDecision = {
  showWizard: boolean
  initialStep?: number
  mode: "selfie_first" | "none"
}

export function getFreeUserWizardDecision(input: FreeUserWizardDecisionInput): FreeUserWizardDecision {
  if (input.onboardingCompleted) {
    return { showWizard: false, mode: "none" }
  }

  if (!input.hasSelfies) {
    return {
      showWizard: true,
      initialStep: 5,
      mode: "selfie_first",
    }
  }

  return { showWizard: false, mode: "none" }
}

export type ActivationChecklistInput = {
  hasSelfies: boolean
  /** Legacy compatibility only. Current activation never requires a trained model. */
  hasTrainedModel?: boolean
  hasGeneratedAny: boolean
  /** Legacy compatibility only. Model training is no longer an activation step. */
  requiresModelTraining?: boolean
}

export type ActivationNextAction = "upload_selfie" | "generate_first_image" | "none"

export function getActivationChecklist(input: ActivationChecklistInput): {
  steps: Array<{ key: string; label: string; done: boolean }>
  nextAction: ActivationNextAction
} {
  const steps: Array<{ key: string; label: string; done: boolean }> = [
    { key: "selfie", label: "Upload first selfie", done: Boolean(input.hasSelfies) },
    { key: "generate", label: "Generate first image", done: Boolean(input.hasGeneratedAny) },
  ]

  if (!steps[0].done) return { steps, nextAction: "upload_selfie" }
  if (!Boolean(input.hasGeneratedAny)) return { steps, nextAction: "generate_first_image" }
  return { steps, nextAction: "none" }
}

export function getActivationContinueHref(nextAction: ActivationNextAction): string | null {
  if (nextAction === "generate_first_image") return "/app?view=create"
  return null
}
