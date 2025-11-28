import { salesDashboardAgent } from "../admin/salesDashboardAgent"
import { sendEmailNow } from "../marketing/marketingAutomationAgent"

export interface WorkflowInput {
  adminEmail?: string
  sendEmail?: boolean
}

export interface WorkflowOutput {
  success: boolean
  insights?: any
  emailSent?: boolean
}

/**
 * Sales Dashboard Workflow
 *
 * Generates weekly sales insights and optionally emails them to admin
 */
export async function runWorkflow(input: WorkflowInput): Promise<WorkflowOutput> {
  console.log("[SalesDashboardWorkflow] Starting workflow")

  try {
    // Generate weekly insights
    const result = await salesDashboardAgent.generateWeeklySalesInsights()

    if (!result.success) {
      return {
        success: false,
      }
    }

    const insights = result.insights!

    // Optionally send email to admin
    let emailSent = false
    if (input.sendEmail && input.adminEmail) {
      const subject = `SSELFIE Weekly Sales Report - ${insights.period.start} to ${insights.period.end}`
      const html = `
        <div style="font-family: monospace; max-width: 800px; margin: 0 auto;">
          <h1>📊 SSELFIE Weekly Sales Report</h1>
          <p><strong>Period:</strong> ${insights.period.start} to ${insights.period.end}</p>
          
          <h2>Key Metrics</h2>
          <ul>
            <li><strong>Total Users:</strong> ${insights.metrics.totalUsers}</li>
            <li><strong>Active Subscriptions:</strong> ${insights.metrics.activeSubscriptions}</li>
            <li><strong>New Signups:</strong> ${insights.metrics.newSignups}</li>
            <li><strong>Credit Purchases:</strong> ${insights.metrics.creditPurchases} (${insights.metrics.totalCreditsBought} credits)</li>
            <li><strong>Maya Chats Created:</strong> ${insights.metrics.mayaChatsCreated}</li>
            <li><strong>Images Generated:</strong> ${insights.metrics.imagesGenerated}</li>
          </ul>
          
          <p><em>Generated at: ${insights.generatedAt}</em></p>
        </div>
      `

      const emailResult = await sendEmailNow(input.adminEmail, subject, html)
      emailSent = emailResult.success
    }

    console.log("[SalesDashboardWorkflow] Workflow completed successfully")
    return {
      success: true,
      insights,
      emailSent,
    }
  } catch (error) {
    console.error("[SalesDashboardWorkflow] Error:", error)
    return {
      success: false,
    }
  }
}
