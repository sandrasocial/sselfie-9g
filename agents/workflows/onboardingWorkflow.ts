/**
 * Onboarding Workflow
 *
 * Purpose: Automates the new user onboarding sequence
 * - Welcome email
 * - First training session reminder
 * - Feature discovery sequence
 * - Activation tracking
 *
 * Triggered by: New user signup events
 * Used by: MarketingAutomationAgent
 */

import { generateText } from "ai"
import { sendEmailNow, scheduleEmail, logEmailEvent } from "../marketing/marketingAutomationAgent"

export interface WorkflowInput {
  userId: string
  email: string
  name?: string
  context?: any
}

export interface WorkflowOutput {
  status: "success" | "error"
  debug?: any
  emailsSent?: number
  emailsScheduled?: number
}

export async function runWorkflow(input: WorkflowInput): Promise<WorkflowOutput> {
  try {
    console.log("[OnboardingWorkflow] Starting onboarding for:", input.email)

    const { userId, email, name } = input

    const { text: emailContent } = await generateText({
      model: "openai:gpt-4o",
      prompt: `Generate a warm, welcoming onboarding email for a new SSELFIE user named ${name || "friend"}.

SSELFIE is an AI-powered personal branding platform that helps users create professional Instagram content with AI-generated selfies.

Write in Sandra's voice:
- Warm, direct, story-driven
- Empowering and emotionally grounded
- Simple everyday language
- No emojis, no overly polished marketing speak

Include:
1. Warm welcome
2. Quick explanation of what SSELFIE does
3. First step: upload your selfies to train your AI model
4. Promise of follow-up emails with tips

Format as HTML email body only (no subject line). Keep it concise (200-300 words).`,
    })

    const subject = "Welcome to SSELFIE! Let's create your AI model ✨"

    const sendResult = await sendEmailNow(email, subject, emailContent)

    if (!sendResult.success) {
      console.error("[OnboardingWorkflow] Failed to send welcome email:", sendResult.error)
      return {
        status: "error",
        debug: { error: sendResult.error },
      }
    }

    // Log the email event
    await logEmailEvent({
      userId,
      emailType: "onboarding_welcome",
      action: "sent",
      details: { messageId: sendResult.messageId },
    })

    console.log("[OnboardingWorkflow] Welcome email sent:", sendResult.messageId)

    // Day 1: Training reminder
    const day1Date = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const { text: day1Content } = await generateText({
      model: "openai:gpt-4o",
      prompt: `Generate a friendly reminder email for ${name || "friend"} to upload their selfies and train their SSELFIE AI model.

Keep Sandra's voice: warm, direct, encouraging. Remind them it only takes 10 selfies to get started.

Format as HTML email body only. Keep it brief (150-200 words).`,
    })

    await scheduleEmail(userId, email, "Ready to train your AI model? 📸", day1Content, day1Date)

    // Day 3: Feature discovery
    const day3Date = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    const { text: day3Content } = await generateText({
      model: "openai:gpt-4o",
      prompt: `Generate an email for ${name || "friend"} showcasing SSELFIE's key features:
- AI-generated selfies in any setting
- Instagram feed planning
- Caption writing with Maya AI
- Professional branding tools

Keep Sandra's voice: warm, story-driven, empowering. Make it inspiring.

Format as HTML email body only. Keep it concise (200-250 words).`,
    })

    await scheduleEmail(userId, email, "Discover what SSELFIE can do for your brand ✨", day3Content, day3Date)

    // Day 7: Activation check
    const day7Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const { text: day7Content } = await generateText({
      model: "openai:gpt-4o",
      prompt: `Generate a check-in email for ${name || "friend"} after 7 days with SSELFIE.

Ask how they're doing, offer help, share a success story from another user. Encourage them to reach out with questions.

Keep Sandra's voice: warm, supportive, genuine. No pressure.

Format as HTML email body only. Keep it personal (150-200 words).`,
    })

    await scheduleEmail(userId, email, "How's your SSELFIE journey going? 💬", day7Content, day7Date)

    console.log("[OnboardingWorkflow] Onboarding workflow complete:", {
      welcomeEmailSent: true,
      emailsScheduled: 3,
    })

    return {
      status: "success",
      emailsSent: 1,
      emailsScheduled: 3,
      debug: {
        userId,
        email,
        welcomeMessageId: sendResult.messageId,
        scheduledDates: {
          day1: day1Date.toISOString(),
          day3: day3Date.toISOString(),
          day7: day7Date.toISOString(),
        },
      },
    }
  } catch (error) {
    console.error("[OnboardingWorkflow] Error:", error)
    return {
      status: "error",
      debug: {
        error: error instanceof Error ? error.message : "Unknown error",
        input,
      },
    }
  }
}
