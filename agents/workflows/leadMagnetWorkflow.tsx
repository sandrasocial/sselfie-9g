import { leadMagnetAgent } from "../sales/leadMagnetAgent"
import { sendEmailNow } from "../marketing/marketingAutomationAgent"

export interface WorkflowInput {
  userId: string
  userEmail: string
  userName?: string
  magnetType: string
  source?: string
}

export interface WorkflowOutput {
  success: boolean
  delivered: boolean
  error?: string
}

/**
 * Lead Magnet Workflow
 *
 * Delivers lead magnets to new users and tracks engagement
 */
export async function runWorkflow(input: WorkflowInput): Promise<WorkflowOutput> {
  console.log("[LeadMagnetWorkflow] Starting workflow for user:", input.userId)

  try {
    // Generate personalized lead magnet email
    const subject = `Your ${input.magnetType} is ready!`
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Hey ${input.userName || "there"}! 👋</h1>
        
        <p>Your ${input.magnetType} is ready to download.</p>
        
        <p>This guide is going to help you create scroll-stopping content that attracts your dream clients. I've packed it with real examples, templates, and actionable steps you can start using today.</p>
        
        <p style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/download/${input.magnetType}" 
             style="background: #000; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Download Your ${input.magnetType}
          </a>
        </p>
        
        <p>Questions? Just hit reply—I read every email.</p>
        
        <p>Cheers,<br>Sandra</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <p style="font-size: 12px; color: #999;">
          P.S. If you're ready to take your content to the next level, 
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/signup">check out SSELFIE</a>—it's like having a creative director in your pocket.
        </p>
      </div>
    `

    // Send lead magnet email
    const emailResult = await sendEmailNow(input.userEmail, subject, html)

    if (!emailResult.success) {
      return {
        success: false,
        delivered: false,
        error: emailResult.error,
      }
    }

    // Track delivery
    await leadMagnetAgent.deliverLeadMagnet({
      userId: input.userId,
      magnetType: input.magnetType,
      userEmail: input.userEmail,
    })

    console.log("[LeadMagnetWorkflow] Workflow completed successfully")
    return {
      success: true,
      delivered: true,
    }
  } catch (error) {
    console.error("[LeadMagnetWorkflow] Error:", error)
    return {
      success: false,
      delivered: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
