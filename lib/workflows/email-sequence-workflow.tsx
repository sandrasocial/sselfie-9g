"use workflow"

import { sendEmail } from "@/lib/email/send-email"
import { sql } from "@/lib/db-singleton"

/**
 * Email Sequence Workflow
 * Automatically sends a sequence of emails with delays between them
 */
export async function emailSequenceWorkflow(userId: string, sequenceName: string) {
  console.log(`[v0] Starting email sequence workflow: ${sequenceName} for user ${userId}`)

  // Get all emails in the sequence from the database
  const sequenceEmails = await sql`
    SELECT 
      id,
      campaign_name,
      subject,
      html_content,
      sequence_position,
      sequence_total,
      send_delay_days
    FROM admin_email_campaigns
    WHERE campaign_name = ${sequenceName}
    AND sequence_position IS NOT NULL
    ORDER BY sequence_position ASC
  `

  if (sequenceEmails.length === 0) {
    throw new Error(`No email sequence found with name: ${sequenceName}`)
  }

  console.log(`[v0] Found ${sequenceEmails.length} emails in sequence`)

  // Get user email
  const userResult = await sql`
    SELECT email, first_name, last_name 
    FROM users 
    WHERE id = ${userId}
  `

  if (userResult.length === 0) {
    throw new Error(`User not found: ${userId}`)
  }

  const user = userResult[0]
  const userEmail = user.email
  const userName = user.first_name || "there"

  // Send each email in the sequence
  for (const email of sequenceEmails) {
    console.log(`[v0] Sending email ${email.sequence_position}/${email.sequence_total}: ${email.subject}`)

    // Personalize content
    const personalizedContent = email.html_content
      .replace(/\{\{name\}\}/g, userName)
      .replace(/\{\{email\}\}/g, userEmail)

    // Send the email
    await sendEmail({
      to: userEmail,
      subject: email.subject,
      html: personalizedContent,
    })

    console.log(`[v0] Email sent successfully`)

    // Wait before sending the next email (unless it's the last one)
    if (email.sequence_position < email.sequence_total) {
      const delayDays = email.send_delay_days || 1
      console.log(`[v0] Waiting ${delayDays} day(s) before next email...`)

      // Convert days to milliseconds for sleep
      await sleep(delayDays * 24 * 60 * 60 * 1000)
    }
  }

  console.log(`[v0] Email sequence completed: ${sequenceName}`)

  return {
    success: true,
    sequenceName,
    emailsSent: sequenceEmails.length,
  }
}

/**
 * User Onboarding Workflow
 * Automated onboarding sequence for new users
 */
export async function userOnboardingWorkflow(userId: string, userEmail: string) {
  console.log(`[v0] Starting onboarding workflow for user ${userId}`)

  // Get user details
  const userResult = await sql`
    SELECT first_name, created_at 
    FROM users 
    WHERE id = ${userId}
  `

  const user = userResult[0]
  const userName = user?.first_name || "there"

  // Email 1: Welcome (sent immediately)
  await sendEmail({
    to: userEmail,
    subject: "Welcome to SSELFIE Studio! 🎨",
    html: `
      <h1>Hi ${userName}!</h1>
      <p>Welcome to SSELFIE Studio! We're excited to help you create amazing AI photos.</p>
      <p>Here's what you can do:</p>
      <ul>
        <li>Upload 10-20 photos of yourself</li>
        <li>Train your personal AI model</li>
        <li>Generate unlimited AI photos</li>
      </ul>
      <p>Let's get started!</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/studio">Start Training</a>
    `,
  })

  // Wait 1 day
  await sleep(24 * 60 * 60 * 1000)

  // Check if user has started training
  const trainingCheck = await sql`
    SELECT COUNT(*) as count
    FROM training_sessions
    WHERE user_id = ${userId}
  `

  const hasTrained = trainingCheck[0].count > 0

  if (!hasTrained) {
    // Email 2: Training reminder
    await sendEmail({
      to: userEmail,
      subject: "Ready to create your AI photos? 📸",
      html: `
        <h1>Hey ${userName},</h1>
        <p>We noticed you haven't started training your AI model yet.</p>
        <p>It only takes 5 minutes to upload your photos and start!</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/studio">Upload Photos Now</a>
      `,
    })
  }

  // Wait 2 more days
  await sleep(2 * 24 * 60 * 60 * 1000)

  // Email 3: Tips and features
  await sendEmail({
    to: userEmail,
    subject: "Pro tips for amazing AI photos ✨",
    html: `
      <h1>Hi ${userName},</h1>
      <p>Here are some pro tips to get the best results:</p>
      <ul>
        <li>Use well-lit photos with clear faces</li>
        <li>Include variety: different angles, expressions, backgrounds</li>
        <li>Avoid group photos or photos with sunglasses</li>
      </ul>
      <p>Check out our gallery for inspiration!</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/gallery">Browse Gallery</a>
    `,
  })

  // Wait 4 more days
  await sleep(4 * 24 * 60 * 60 * 1000)

  // Email 4: Feedback request
  await sendEmail({
    to: userEmail,
    subject: "How's your SSELFIE experience? 💭",
    html: `
      <h1>Hey ${userName},</h1>
      <p>We'd love to hear your feedback!</p>
      <p>What do you think of SSELFIE Studio? Any suggestions?</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/feedback">Share Feedback</a>
    `,
  })

  console.log(`[v0] Onboarding workflow completed for user ${userId}`)

  return {
    success: true,
    userId,
    emailsSent: 4,
  }
}

// Helper function to sleep (Vercel Workflows provides this)
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
