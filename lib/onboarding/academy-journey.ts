export interface AcademyJourneyStateParams {
  generationCount: number
  hasContentPlan: boolean
  hoursSinceLastActive: number | null
}

export interface AcademyJourneyState {
  showAfterFirstGenerationPrompt: boolean
  showAfterThreeGenerationsPrompt: boolean
  shouldSendInactive48hEmail: boolean
}

export function getAcademyJourneyState(params: AcademyJourneyStateParams): AcademyJourneyState {
  const showAfterFirstGenerationPrompt = params.generationCount === 1
  const showAfterThreeGenerationsPrompt = params.generationCount >= 3 && !params.hasContentPlan
  const shouldSendInactive48hEmail =
    params.generationCount > 0 &&
    !params.hasContentPlan &&
    params.hoursSinceLastActive !== null &&
    params.hoursSinceLastActive >= 48

  return {
    showAfterFirstGenerationPrompt,
    showAfterThreeGenerationsPrompt,
    shouldSendInactive48hEmail,
  }
}
