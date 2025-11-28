/**
 * User Journey Workflow
 * Evaluates each user's activity, engagement, and progress
 * Delivers personalized messages, nudges, tasks, or recommendations
 */

import { neon } from "@neondatabase/serverless"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { sendEmailNow, logEmailEvent } from "../marketing/marketingAutomationAgent"

const sql = neon(process.env.DATABASE_URL!)

export interface WorkflowInput {
  userId?: string // Optional: if provided, only process this user
  batchSize?: number // How many users to process in one run (default: 50)
}

export interface WorkflowOutput {
  status: "success" | "error"
  processedUsers: number
  messagesCreated: number
  emailsSent: number
  errors: string[]
}

interface UserActivityData {
  userId: string
  email: string
  displayName: string
  lastLoginAt: Date | null
  lastMayaMessageAt: Date | null
  imagesGenerated: number
  videosGenerated: number
  contentDrafts: number
  subscriptionStatus: string
  emailEngagementLast14Days: number
  daysSinceSignup: number
  daysSinceLastLogin: number | null
  daysSinceLastMaya: number | null
}

interface UserState {
  state: "new_user" | "engaged_user" | "falling_behind" | "inactive" | "at_risk_of_churn"
  reason: string
}

interface PersonalizedMessage {
  encouragement: string
  recommendedTool: string
  mayaPrompt: string
  taskForToday: string
  shouldSendEmail: boolean
}

/**
 * Main workflow function
 */
export async function runWorkflow(input: WorkflowInput): Promise<WorkflowOutput> {
  console.log("[UserJourneyWorkflow] Starting user journey workflow", input)

  const result: WorkflowOutput = {
    status: "success",
    processedUsers: 0,
    messagesCreated: 0,
    emailsSent: 0,
    errors: [],
  }

  try {
    // Step 1: Fetch users to process
    const users = await fetchUsersToProcess(input.userId, input.batchSize || 50)
    console.log(`[UserJourneyWorkflow] Found ${users.length} users to process`)

    // Step 2: Process each user
    for (const userData of users) {
      try {
        // Categorize user into state
        const userState = categorizeUserState(userData)
        console.log(`[UserJourneyWorkflow] User ${userData.userId} categorized as: ${userState.state}`)

        // Generate personalized message
        const message = await generatePersonalizedMessage(userData, userState)

        // Save message to database
        await saveJourneyMessage(userData.userId, userState.state, message)
        result.messagesCreated++

        // Send email if required
        if (message.shouldSendEmail && userData.email) {
          const emailSent = await sendJourneyEmail(userData, message, userState.state)
          if (emailSent) {
            result.emailsSent++
          }
        }

        result.processedUsers++
      } catch (error) {
        const errorMsg = `User ${userData.userId}: ${error instanceof Error ? error.message : "Unknown error"}`
        result.errors.push(errorMsg)
        console.error(`[UserJourneyWorkflow] Error processing user ${userData.userId}:`, error)
      }

      // Rate limiting: wait 200ms between users
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    console.log(`[UserJourneyWorkflow] Workflow complete:`, result)
    return result
  } catch (error) {
    console.error("[UserJourneyWorkflow] Fatal error:", error)
    result.status = "error"
    result.errors.push(error instanceof Error ? error.message : "Unknown error")
    return result
  }
}

/**
 * Fetch active users with their activity data
 */
async function fetchUsersToProcess(singleUserId?: string, batchSize = 50): Promise<UserActivityData[]> {
  let query

  if (singleUserId) {
    // Process single user
    query = sql`
      SELECT 
        u.id as user_id,
        u.email,
        u.display_name,
        u.last_login_at,
        u.created_at,
        u.plan as subscription_status,
        (SELECT MAX(created_at) FROM maya_chat_messages WHERE chat_id IN (SELECT id FROM maya_chats WHERE user_id = u.id)) as last_maya_message_at,
        (SELECT COUNT(*) FROM generated_images WHERE user_id = u.id) as images_generated,
        (SELECT COUNT(*) FROM generated_videos WHERE user_id = u.id) as videos_generated,
        (SELECT COUNT(*) FROM content_drafts WHERE id IN (SELECT id FROM content_drafts LIMIT 1000)) as content_drafts,
        (SELECT COUNT(*) FROM marketing_email_log WHERE user_id = u.id AND opened_at IS NOT NULL AND sent_at >= NOW() - INTERVAL '14 days') as email_engagement_last_14_days
      FROM users u
      WHERE u.id = ${singleUserId}
      LIMIT 1
    `
  } else {
    // Process active users (logged in at least once)
    query = sql`
      SELECT 
        u.id as user_id,
        u.email,
        u.display_name,
        u.last_login_at,
        u.created_at,
        u.plan as subscription_status,
        (SELECT MAX(created_at) FROM maya_chat_messages WHERE chat_id IN (SELECT id FROM maya_chats WHERE user_id = u.id)) as last_maya_message_at,
        (SELECT COUNT(*) FROM generated_images WHERE user_id = u.id) as images_generated,
        (SELECT COUNT(*) FROM generated_videos WHERE user_id = u.id) as videos_generated,
        (SELECT COUNT(*) FROM content_drafts WHERE id IN (SELECT id FROM content_drafts LIMIT 1000)) as content_drafts,
        (SELECT COUNT(*) FROM marketing_email_log WHERE user_id = u.id AND opened_at IS NOT NULL AND sent_at >= NOW() - INTERVAL '14 days') as email_engagement_last_14_days
      FROM users u
      WHERE u.last_login_at IS NOT NULL
        AND u.email IS NOT NULL
        AND u.email != ''
      ORDER BY u.last_login_at DESC
      LIMIT ${batchSize}
    `
  }

  const rows = await query
  const now = new Date()

  return rows.map((row: any) => {
    const createdAt = new Date(row.created_at)
    const daysSinceSignup = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

    const lastLoginAt = row.last_login_at ? new Date(row.last_login_at) : null
    const daysSinceLastLogin = lastLoginAt
      ? Math.floor((now.getTime() - lastLoginAt.getTime()) / (1000 * 60 * 60 * 24))
      : null

    const lastMayaMessageAt = row.last_maya_message_at ? new Date(row.last_maya_message_at) : null
    const daysSinceLastMaya = lastMayaMessageAt
      ? Math.floor((now.getTime() - lastMayaMessageAt.getTime()) / (1000 * 60 * 60 * 24))
      : null

    return {
      userId: row.user_id,
      email: row.email,
      displayName: row.display_name || "there",
      lastLoginAt,
      lastMayaMessageAt,
      imagesGenerated: Number(row.images_generated) || 0,
      videosGenerated: Number(row.videos_generated) || 0,
      contentDrafts: Number(row.content_drafts) || 0,
      subscriptionStatus: row.subscription_status || "free",
      emailEngagementLast14Days: Number(row.email_engagement_last_14_days) || 0,
      daysSinceSignup,
      daysSinceLastLogin,
      daysSinceLastMaya,
    }
  })
}

/**
 * Categorize user into one of 5 states
 */
function categorizeUserState(userData: UserActivityData): UserState {
  const { daysSinceSignup, daysSinceLastLogin, daysSinceLastMaya, imagesGenerated, emailEngagementLast14Days } =
    userData

  // New user: signed up within last 3 days
  if (daysSinceSignup <= 3) {
    return {
      state: "new_user",
      reason: `Signed up ${daysSinceSignup} days ago`,
    }
  }

  // At risk of churn: no login in 14+ days, low engagement
  if (daysSinceLastLogin !== null && daysSinceLastLogin >= 14 && emailEngagementLast14Days === 0) {
    return {
      state: "at_risk_of_churn",
      reason: `No login in ${daysSinceLastLogin} days, no email engagement`,
    }
  }

  // Inactive: no login in 7+ days
  if (daysSinceLastLogin !== null && daysSinceLastLogin >= 7) {
    return {
      state: "inactive",
      reason: `No login in ${daysSinceLastLogin} days`,
    }
  }

  // Falling behind: logged in recently but no Maya activity in 5+ days
  if (daysSinceLastMaya !== null && daysSinceLastMaya >= 5 && imagesGenerated < 10) {
    return {
      state: "falling_behind",
      reason: `No Maya activity in ${daysSinceLastMaya} days, only ${imagesGenerated} images generated`,
    }
  }

  // Engaged user: active and creating content
  return {
    state: "engaged_user",
    reason: `Active user with ${imagesGenerated} images, last activity ${daysSinceLastLogin || 0} days ago`,
  }
}

/**
 * Generate personalized message using AI
 */
async function generatePersonalizedMessage(
  userData: UserActivityData,
  userState: UserState,
): Promise<PersonalizedMessage> {
  const prompt = `You are Sandra's personal AI assistant helping craft personalized user journey messages for SSELFIE users.

User Info:
- Name: ${userData.displayName}
- State: ${userState.state}
- Reason: ${userState.reason}
- Images generated: ${userData.imagesGenerated}
- Videos generated: ${userData.videosGenerated}
- Subscription: ${userData.subscriptionStatus}
- Days since signup: ${userData.daysSinceSignup}
- Days since last Maya chat: ${userData.daysSinceLastMaya || "Never used Maya"}

Generate a personalized message with:
1. Encouragement: A warm, supportive message (2-3 sentences)
2. Recommended tool: What tool or feature they should try next (1 sentence)
3. Maya prompt: A specific prompt they can copy-paste into Maya (creative, actionable)
4. Task for today: One small, achievable action (1 sentence)

Tone: Warm, direct, story-driven. Everyday language. No marketing speak. No emojis.

Return ONLY a JSON object with these exact keys:
{
  "encouragement": "...",
  "recommendedTool": "...",
  "mayaPrompt": "...",
  "taskForToday": "..."
}`

  try {
    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt,
    })

    // Parse JSON response
    const parsed = JSON.parse(text.trim())

    return {
      encouragement: parsed.encouragement,
      recommendedTool: parsed.recommendedTool,
      mayaPrompt: parsed.mayaPrompt,
      taskForToday: parsed.taskForToday,
      shouldSendEmail: userState.state === "at_risk_of_churn" || userState.state === "falling_behind",
    }
  } catch (error) {
    console.error("[UserJourneyWorkflow] Error generating message:", error)

    // Fallback message
    return {
      encouragement: `Hey ${userData.displayName}, we've noticed it's been a while since you've been in SSELFIE. Your personal brand is waiting for you.`,
      recommendedTool: "Try chatting with Maya to generate fresh content ideas for your brand.",
      mayaPrompt:
        "Maya, help me create 3 Instagram post ideas that showcase my expertise and attract my ideal clients.",
      taskForToday: "Take 5 minutes today to chat with Maya about your content goals.",
      shouldSendEmail: userState.state === "at_risk_of_churn" || userState.state === "falling_behind",
    }
  }
}

/**
 * Save journey message to database
 */
async function saveJourneyMessage(userId: string, state: string, message: PersonalizedMessage): Promise<void> {
  const contentJson = {
    encouragement: message.encouragement,
    recommendedTool: message.recommendedTool,
    mayaPrompt: message.mayaPrompt,
    taskForToday: message.taskForToday,
    emailSent: message.shouldSendEmail,
  }

  await sql`
    INSERT INTO user_journey_messages (user_id, state, content_json, delivered_via)
    VALUES (${userId}, ${state}, ${JSON.stringify(contentJson)}, ${message.shouldSendEmail ? "email" : null})
  `

  console.log(`[UserJourneyWorkflow] Saved journey message for user ${userId}`)
}

/**
 * Send journey email to user
 */
async function sendJourneyEmail(
  userData: UserActivityData,
  message: PersonalizedMessage,
  state: string,
): Promise<boolean> {
  const subject = getEmailSubject(state, userData.displayName)
  const html = generateEmailHtml(userData.displayName, message, state)

  try {
    const result = await sendEmailNow(userData.email, subject, html)

    if (result.success) {
      await logEmailEvent({
        userId: userData.userId,
        emailType: `user_journey_${state}`,
        action: "sent",
        details: { state, message },
      })
      console.log(`[UserJourneyWorkflow] Email sent to ${userData.email}`)
      return true
    } else {
      console.error(`[UserJourneyWorkflow] Failed to send email to ${userData.email}:`, result.error)
      return false
    }
  } catch (error) {
    console.error(`[UserJourneyWorkflow] Error sending email to ${userData.email}:`, error)
    return false
  }
}

/**
 * Get email subject based on user state
 */
function getEmailSubject(state: string, displayName: string): string {
  switch (state) {
    case "at_risk_of_churn":
      return `${displayName}, your personal brand misses you`
    case "falling_behind":
      return `${displayName}, let's keep the momentum going`
    case "inactive":
      return `${displayName}, ready to create something amazing?`
    default:
      return `${displayName}, here's your next step`
  }
}

/**
 * Generate email HTML
 */
function generateEmailHtml(displayName: string, message: PersonalizedMessage, state: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Personal Brand Journey</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background-color: #f9fafb; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #111; font-size: 24px; margin-bottom: 10px;">Hey ${displayName},</h1>
    <p style="font-size: 16px; color: #555; margin-bottom: 20px;">${message.encouragement}</p>
  </div>

  <div style="background-color: #fff; padding: 25px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 20px;">
    <h2 style="color: #111; font-size: 18px; margin-bottom: 15px;">💡 Recommended Next Step</h2>
    <p style="font-size: 15px; color: #555; margin-bottom: 20px;">${message.recommendedTool}</p>
    
    <h3 style="color: #111; font-size: 16px; margin-bottom: 10px;">Try This Prompt with Maya:</h3>
    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; border-left: 4px solid #6366f1; margin-bottom: 20px;">
      <p style="font-size: 14px; color: #374151; margin: 0; font-family: 'Courier New', monospace;">${message.mayaPrompt}</p>
    </div>
    
    <h3 style="color: #111; font-size: 16px; margin-bottom: 10px;">✨ Your Task for Today:</h3>
    <p style="font-size: 15px; color: #555; margin-bottom: 20px;">${message.taskForToday}</p>
  </div>

  <div style="text-align: center; margin-top: 30px;">
    <a href="${process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.com"}/studio" 
       style="display: inline-block; background-color: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
      Open SSELFIE Studio
    </a>
  </div>

  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="font-size: 13px; color: #9ca3af; margin: 0;">
      You're receiving this because you're part of the SSELFIE community.<br>
      Questions? Just reply to this email.
    </p>
  </div>

</body>
</html>
  `
}
