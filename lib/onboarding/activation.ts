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
  hasTrainedModel: boolean
  hasGeneratedAny: boolean
  requiresModelTraining?: boolean
}

export type ActivationNextAction = "upload_selfie" | "train_model" | "generate_first_image" | "none"

export function getActivationChecklist(input: ActivationChecklistInput): {
  steps: Array<{ key: string; label: string; done: boolean }>
  nextAction: ActivationNextAction
} {
  const requiresModelTraining = input.requiresModelTraining ?? true
  const steps: Array<{ key: string; label: string; done: boolean }> = [
    { key: "selfie", label: "Upload first selfie", done: Boolean(input.hasSelfies) },
  ]

  if (requiresModelTraining) {
    steps.push({ key: "model", label: "Train model", done: Boolean(input.hasTrainedModel) })
  }

  steps.push({ key: "generate", label: "Generate first image", done: Boolean(input.hasGeneratedAny) })

  if (!steps[0].done) return { steps, nextAction: "upload_selfie" }
  if (requiresModelTraining && !Boolean(input.hasTrainedModel)) return { steps, nextAction: "train_model" }
  if (!Boolean(input.hasGeneratedAny)) return { steps, nextAction: "generate_first_image" }
  return { steps, nextAction: "none" }
}

export function getActivationContinueHref(nextAction: ActivationNextAction): string | null {
  if (nextAction === "train_model") return "/studio?tab=maya"
  if (nextAction === "generate_first_image") return "/studio?tab=maya"
  return null
}
