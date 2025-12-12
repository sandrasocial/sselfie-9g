/**
 * A/B Testing System for Email Campaigns
 * 
 * Automatically splits audiences, tracks results, and declares winners
 */

import { neon } from "@neondatabase/serverless"
import { sendEmail } from "./send-email"

const sql = neon(process.env.DATABASE_URL!)

export interface ABTestConfig {
  testName: string
  testType: "subject_line" | "cta" | "content" | "send_time"
  variantA: {
    campaignId: number
    subjectLine?: string
    ctaText?: string
  }
  variantB: {
    campaignId: number
    subjectLine?: string
    ctaText?: string
  }
  splitRatio?: number // 0.5 = 50/50
  minSampleSize?: number
  confidenceLevel?: number
}

/**
 * Create an A/B test
 */
export async function createABTest(config: ABTestConfig) {
  const {
    testName,
    testType,
    variantA,
    variantB,
    splitRatio = 0.5,
    minSampleSize = 100,
    confidenceLevel = 0.95,
  } = config

  // Create parent campaign record (for reference)
  const parentCampaign = await sql`
    INSERT INTO admin_email_campaigns (
      campaign_name,
      campaign_type,
      subject_line,
      status
    )
    VALUES (
      ${testName} || ' (A/B Test)',
      'ab_test',
      'A/B Test: ' || ${testName},
      'draft'
    )
    RETURNING id
  `

  const parentCampaignId = parentCampaign[0].id

  // Create A/B test record
  const abTest = await sql`
    INSERT INTO email_ab_tests (
      test_name,
      parent_campaign_id,
      test_type,
      variant_a_campaign_id,
      variant_b_campaign_id,
      split_ratio,
      min_sample_size,
      confidence_level,
      status,
      start_date
    )
    VALUES (
      ${testName},
      ${parentCampaignId},
      ${testType},
      ${variantA.campaignId},
      ${variantB.campaignId},
      ${splitRatio},
      ${minSampleSize},
      ${confidenceLevel},
      'running',
      NOW()
    )
    RETURNING *
  `

  return abTest[0]
}

/**
 * Run A/B test - automatically splits audience and sends
 */
export async function runABTest(testId: number, recipients: string[]) {
  const test = await sql`
    SELECT * FROM email_ab_tests WHERE id = ${testId} AND status = 'running'
  `

  if (!test || test.length === 0) {
    throw new Error("A/B test not found or not running")
  }

  const abTest = test[0]
  const splitPoint = Math.floor(recipients.length * abTest.split_ratio)

  // Split recipients
  const variantARecipients = recipients.slice(0, splitPoint)
  const variantBRecipients = recipients.slice(splitPoint)

  // Get campaign details
  const [campaignA, campaignB] = await Promise.all([
    sql`SELECT * FROM admin_email_campaigns WHERE id = ${abTest.variant_a_campaign_id}`,
    sql`SELECT * FROM admin_email_campaigns WHERE id = ${abTest.variant_b_campaign_id}`,
  ])

  const results = {
    variantA: { sent: 0, failed: 0 },
    variantB: { sent: 0, failed: 0 },
  }

  // Send Variant A
  for (const email of variantARecipients) {
    try {
      const result = await sendEmail({
        to: email,
        subject: campaignA[0].subject_line,
        html: campaignA[0].body_html,
        text: campaignA[0].body_text,
        emailType: `ab_test_${testId}_variant_a`,
        campaignId: campaignA[0].id,
      })

      if (result.success) {
        await sql`
          INSERT INTO email_ab_test_results (
            test_id,
            variant,
            recipient_email,
            sent_at
          )
          VALUES (
            ${testId},
            'A',
            ${email},
            NOW()
          )
          ON CONFLICT (test_id, recipient_email) DO NOTHING
        `
        results.variantA.sent++
      } else {
        results.variantA.failed++
      }
    } catch (error) {
      console.error(`[AB Test] Failed to send Variant A to ${email}:`, error)
      results.variantA.failed++
    }
  }

  // Send Variant B
  for (const email of variantBRecipients) {
    try {
      const result = await sendEmail({
        to: email,
        subject: campaignB[0].subject_line,
        html: campaignB[0].body_html,
        text: campaignB[0].body_text,
        emailType: `ab_test_${testId}_variant_b`,
        campaignId: campaignB[0].id,
      })

      if (result.success) {
        await sql`
          INSERT INTO email_ab_test_results (
            test_id,
            variant,
            recipient_email,
            sent_at
          )
          VALUES (
            ${testId},
            'B',
            ${email},
            NOW()
          )
          ON CONFLICT (test_id, recipient_email) DO NOTHING
        `
        results.variantB.sent++
      } else {
        results.variantB.failed++
      }
    } catch (error) {
      console.error(`[AB Test] Failed to send Variant B to ${email}:`, error)
      results.variantB.failed++
    }
  }

  return results
}

/**
 * Update A/B test results from email_logs (called by webhook)
 */
export async function updateABTestResults(testId: number, email: string, event: "opened" | "clicked" | "converted") {
  const result = await sql`
    SELECT * FROM email_ab_test_results
    WHERE test_id = ${testId} AND recipient_email = ${email}
  `

  if (!result || result.length === 0) return

  const updateField = event === "opened" ? "opened" : event === "clicked" ? "clicked" : "converted"
  const timestampField = `${updateField}_at`

  await sql`
    UPDATE email_ab_test_results
    SET 
      ${sql(updateField)} = TRUE,
      ${sql(timestampField)} = NOW()
    WHERE test_id = ${testId} AND recipient_email = ${email}
  `
}

/**
 * Analyze A/B test and declare winner
 */
export async function analyzeABTest(testId: number) {
  const test = await sql`SELECT * FROM email_ab_tests WHERE id = ${testId}`
  if (!test || test.length === 0) return null

  const abTest = test[0]

  // Get results for both variants
  const results = await sql`
    SELECT 
      variant,
      COUNT(*) as total_sent,
      COUNT(CASE WHEN opened = TRUE THEN 1 END) as total_opened,
      COUNT(CASE WHEN clicked = TRUE THEN 1 END) as total_clicked,
      COUNT(CASE WHEN converted = TRUE THEN 1 END) as total_converted
    FROM email_ab_test_results
    WHERE test_id = ${testId}
    GROUP BY variant
  `

  const variantA = results.find((r: any) => r.variant === "A")
  const variantB = results.find((r: any) => r.variant === "B")

  if (!variantA || !variantB) return null

  // Check if we have minimum sample size
  const totalSent = Number(variantA.total_sent) + Number(variantB.total_sent)
  if (totalSent < abTest.min_sample_size) {
    return { status: "insufficient_data", message: `Need ${abTest.min_sample_size} recipients, have ${totalSent}` }
  }

  // Calculate conversion rates
  const conversionRateA = Number(variantA.total_converted) / Number(variantA.total_sent)
  const conversionRateB = Number(variantB.total_converted) / Number(variantB.total_sent)

  // Simple statistical test (can be enhanced with chi-square test)
  const difference = Math.abs(conversionRateA - conversionRateB)
  const threshold = 0.05 // 5% difference threshold

  let winner: "A" | "B" | null = null
  if (difference > threshold) {
    winner = conversionRateA > conversionRateB ? "A" : "B"
  }

  // Update test with winner
  if (winner) {
    await sql`
      UPDATE email_ab_tests
      SET 
        winner_variant = ${winner},
        winner_declared_at = NOW(),
        status = 'completed',
        end_date = NOW()
      WHERE id = ${testId}
    `
  }

  return {
    variantA: {
      sent: Number(variantA.total_sent),
      opened: Number(variantA.total_opened),
      clicked: Number(variantA.total_clicked),
      converted: Number(variantA.total_converted),
      conversionRate: conversionRateA,
    },
    variantB: {
      sent: Number(variantB.total_sent),
      opened: Number(variantB.total_opened),
      clicked: Number(variantB.total_clicked),
      converted: Number(variantB.total_converted),
      conversionRate: conversionRateB,
    },
    winner,
    difference,
  }
}
