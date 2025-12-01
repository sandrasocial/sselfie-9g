let aiEnvValidated = false

export function assertAIEnv() {
  if (aiEnvValidated) return

  if (process.env.NODE_ENV === "production") {
    if (!process.env.AI_GATEWAY_API_KEY) {
      throw new Error("AI_GATEWAY_API_KEY must be configured in production environments.")
    }
    if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENAI_API_KEY) {
      throw new Error("Either ANTHROPIC_API_KEY or OPENAI_API_KEY must be configured.")
    }
  }

  aiEnvValidated = true
}
