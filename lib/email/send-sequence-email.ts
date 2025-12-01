/**
 * Resend Template Adapter for Email Sequence
 * Sends emails using Resend Template API for steps 1-8
 */

import { Resend } from "resend"
import { logEmailSend } from "@/lib/data/email-sequence"

// Template ID mapping for sequence steps
const TEMPLATE_MAP: Record<number, string> = {
  1: process.env.RESEND_TEMPLATE_WELCOME || "tem_welcome",
  2: process.env.RESEND_TEMPLATE_STORY || "tem_story",
  3: process.env.RESEND_TEMPLATE_VALUE || "tem_value",
  4: process.env.RESEND_TEMPLATE_MYTHS || "tem_myths",
  5: process.env.RESEND_TEMPLATE_PROOF || "tem_proof",
  6: process.env.RESEND_TEMPLATE_PAIN || "tem_pain",
  7: process.env.RESEND_TEMPLATE_IDENTITY || "tem_identity",
  8: process.env.RESEND_TEMPLATE_OFFER || "tem_offer",
}

// Lazy Resend client
let resendClient: Resend | null = null

function getResendClient(): Resend {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured")
    }
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

export interface SendSequenceEmailOptions {
  email: string
  userId: string | null
  step: number
  templateId?: string
}

export interface SendSequenceEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send a sequence email using Resend Template API
 */
export async function sendSequenceEmail(
  options: SendSequenceEmailOptions,
): Promise<SendSequenceEmailResult> {
  const { email, userId, step, templateId } = options

  // Validate step
  if (step < 1 || step > 8) {
    const error = `Invalid step: ${step}. Must be between 1 and 8.`
    console.error("[SequenceEmail]", error)
    await logEmailSend(userId, email, step, undefined, error)
    return { success: false, error }
  }

  // Get template ID
  const finalTemplateId = templateId || TEMPLATE_MAP[step]

  if (!finalTemplateId) {
    const error = `Template ID not found for step ${step}`
    console.error("[SequenceEmail]", error)
    await logEmailSend(userId, email, step, undefined, error)
    return { success: false, error }
  }

  try {
    const resend = getResendClient()

    console.log(`[SequenceEmail] Sending step ${step} to ${email} using template ${finalTemplateId}`)

    // Send email using Resend Template API
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Maya @ SSELFIE <maya@sselfie.ai>",
      to: email,
      template_id: finalTemplateId,
      tags: [
        { name: "sequence", value: `step-${step}` },
        { name: "automated", value: "true" },
      ],
    })

    if (error) {
      const errorMsg = error.message || "Failed to send email"
      console.error(`[SequenceEmail] Resend error for step ${step}:`, errorMsg)
      await logEmailSend(userId, email, step, undefined, errorMsg)
      return { success: false, error: errorMsg }
    }

    const messageId = data?.id

    if (!messageId) {
      const errorMsg = "No message ID returned from Resend"
      console.error(`[SequenceEmail]`, errorMsg)
      await logEmailSend(userId, email, step, undefined, errorMsg)
      return { success: false, error: errorMsg }
    }

    // Log successful send
    await logEmailSend(userId, email, step, messageId)

    console.log(`[SequenceEmail] Successfully sent step ${step} to ${email}, message ID: ${messageId}`)

    return { success: true, messageId }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error"
    console.error(`[SequenceEmail] Unexpected error sending step ${step}:`, errorMsg)
    await logEmailSend(userId, email, step, undefined, errorMsg)
    return { success: false, error: errorMsg }
  }
}

