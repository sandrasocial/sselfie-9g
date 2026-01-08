/**
 * Referral Email Trigger Helper
 * 
 * Sends referral invite email after user's 3rd successful generation
 * Non-blocking - doesn't fail if email send fails
 */

import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send-email"
import { generateReferralInviteEmail } from "@/lib/email/templates/referral-invite"

const sql = neon(process.env.DATABASE_URL!)

export async function triggerReferralEmailIfNeeded(userId: string): Promise<void> {
  try {
    // Count user's total generations
    const generationCount = await sql`
      SELECT COUNT(*) as count
      FROM generated_images
      WHERE user_id = ${userId}
    `

    const totalGenerations = Number(generationCount[0]?.count || 0)

    // Only trigger on 3rd generation
    if (totalGenerations !== 3) {
      return
    }

    // Check if referral email already sent for this milestone
    const emailSent = await sql`
      SELECT id FROM email_logs
      WHERE user_email IN (SELECT email FROM users WHERE id = ${userId})
      AND email_type = 'referral-invite-trigger'
      LIMIT 1
    `

    if (emailSent.length > 0) {
      console.log(`[v0] Referral invite email already sent for user ${userId}`)
      return
    }

    // Get user info
    const userInfo = await sql`
      SELECT email, display_name, referral_code
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `

    if (userInfo.length === 0 || !userInfo[0].email) {
      console.log(`[v0] User ${userId} not found or no email`)
      return
    }

    const user = userInfo[0]
    let referralLink = user.referral_code
      ? `${process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"}/?ref=${user.referral_code}`
      : null

    if (!referralLink) {
      // Generate referral code if user doesn't have one
      try {
        // Generate code directly in database
        const emailPrefix = user.email?.split("@")[0].toUpperCase().slice(0, 3) || "SSE"
        let referralCode: string
        let isUnique = false
        let attempts = 0
        const maxAttempts = 10

        while (!isUnique && attempts < maxAttempts) {
          const randomNum = Math.floor(100000 + Math.random() * 900000)
          referralCode = `${emailPrefix}${randomNum}`

          const existing = await sql`
            SELECT id FROM referrals WHERE referral_code = ${referralCode} LIMIT 1
          `

          if (existing.length === 0) {
            isUnique = true
          } else {
            attempts++
          }
        }

        if (!isUnique) {
          const { randomUUID } = await import("crypto")
          const uuid = randomUUID().replace(/-/g, "").toUpperCase().slice(0, 12)
          referralCode = `REF${uuid}`
        }

        // Save referral code
        await sql`
          UPDATE users 
          SET referral_code = ${referralCode}
          WHERE id = ${userId}
        `

        referralLink = `${process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"}/?ref=${referralCode}`
      } catch (error) {
        console.log(`[v0] Could not generate referral code for user ${userId}`)
        return
      }
    }

    // Send referral invite email
    await sendReferralInviteEmail(user.email, user.display_name, referralLink)
  } catch (error: any) {
    console.error(`[v0] Error triggering referral email (non-critical):`, error.message)
    // Don't throw - this is non-critical
  }
}

async function sendReferralInviteEmail(
  userEmail: string,
  userName: string | null,
  referralLink: string,
): Promise<void> {
  try {
    const emailContent = generateReferralInviteEmail({
      recipientName: userName?.split(" ")[0] || undefined,
      referrerName: userName || undefined,
      referralLink,
    })

    const emailResult = await sendEmail({
      to: userEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      from: "Maya from SSELFIE <hello@sselfie.ai>",
      emailType: "referral-invite-trigger",
    })

    if (emailResult.success) {
      console.log(`[v0] ✅ Referral invite email sent to ${userEmail} after 3rd generation`)
    } else {
      console.error(`[v0] ⚠️ Failed to send referral invite email: ${emailResult.error}`)
    }
  } catch (error: any) {
    console.error(`[v0] ⚠️ Error sending referral invite email:`, error.message)
  }
}
