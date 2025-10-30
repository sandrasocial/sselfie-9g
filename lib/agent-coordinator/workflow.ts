export type AgentStep = "content_research" | "brand_strategy" | "visual_design" | "caption_writing" | "image_generation"

export type WorkflowProgress = {
  currentStep: AgentStep
  progress: number // 0-100
  message: string
  estimatedTimeRemaining: number // seconds
}

export type AgentWorkflowResult = {
  research: any
  brandStrategy: any
  visualDesign: any
  captions: any
  feedId: number
}

export const WORKFLOW_STEPS: Record<AgentStep, { duration: number; message: string }> = {
  content_research: {
    duration: 150, // 2.5 minutes
    message: "Researching top creators in your niche and analyzing trends...",
  },
  brand_strategy: {
    duration: 60, // 1 minute
    message: "Creating your personalized brand strategy...",
  },
  visual_design: {
    duration: 60, // 1 minute
    message: "Designing your visual feed concepts...",
  },
  caption_writing: {
    duration: 120, // 2 minutes
    message: "Writing authentic captions that sound like you...",
  },
  image_generation: {
    duration: 240, // 4 minutes
    message: "Generating your stunning images with AI...",
  },
}

export function calculateProgress(currentStep: AgentStep, stepProgress: number): WorkflowProgress {
  const steps = Object.keys(WORKFLOW_STEPS) as AgentStep[]
  const currentIndex = steps.indexOf(currentStep)

  // Calculate total duration
  const totalDuration = Object.values(WORKFLOW_STEPS).reduce((sum, step) => sum + step.duration, 0)

  // Calculate completed duration
  let completedDuration = 0
  for (let i = 0; i < currentIndex; i++) {
    completedDuration += WORKFLOW_STEPS[steps[i]].duration
  }

  // Add current step progress
  const currentStepDuration = WORKFLOW_STEPS[currentStep].duration
  completedDuration += (stepProgress / 100) * currentStepDuration

  // Calculate overall progress
  const overallProgress = Math.round((completedDuration / totalDuration) * 100)

  // Calculate remaining time
  const remainingDuration = totalDuration - completedDuration

  return {
    currentStep,
    progress: overallProgress,
    message: WORKFLOW_STEPS[currentStep].message,
    estimatedTimeRemaining: Math.round(remainingDuration),
  }
}
