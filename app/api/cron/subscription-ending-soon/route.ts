import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { neon } from "@neondatabase/serverless"
import { sendEmail } from "@/lib/email/send-email"
import { createCronLogger } from "@/lib/cron-logger"
import { generateSubscriptionEndingSoonEmail } from "@/lib/email/templates/subscription-ending-soon"
import { logAdminError } from "@/lib/admin-error-log"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  const cronLogger = createCronLogger("subscription-ending-soon")
  await cronLogger.start()

  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    const isProduction = process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"

    if (isProduction && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        await cronLogger.error(new Error("Unauthorized"), { reason: "Invalid CRON_SECRET" })
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    } else if (!cronSecret && isProduction) {
      console.warn("[subscription-ending-soon] WARNING: CRON_SECRET not set in production!")
    }

    const results = {
      found: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      day7: { sent: 0, skipped: 0, failed: 0 },
      day3: { sent: 0, skipped: 0, failed: 0 },
      day1: { sent: 0, skipped: 0, failed: 0 },
    }

    const now = Math.floor(Date.now() / 1000)
    const sevenDaysFromNow = now + 7 * 24 * 60 * 60

    let hasMore = true
    let startingAfter: string | undefined
    const endingSoonSubs: Array<{
      id: string
      current_period_end: number
      customer: string | null
      status: string
    }> = []

    while (hasMore) {
      const subscriptions = await stripe.subscriptions.list({
        status: "all",
        limit: 100,
        ...(startingAfter && { starting_after: startingAfter }),
      })

      subscriptions.data.forEach((sub) => {
        if (!sub.livemode) return
        if (!sub.cancel_at_period_end) return
        if (!sub.current_period_end) return
        if (sub.current_period_end < now || sub.current_period_end > sevenDaysFromNow) return
        if (sub.status !== "active" && sub.status !== "trialing") return
        endingSoonSubs.push({
          id: sub.id,
          current_period_end: sub.current_period_end,
          customer: typeof sub.customer === "string" ? sub.customer : sub.customer?.id || null,
          status: sub.status,
        })
      })

      hasMore = subscriptions.has_more
      if (subscriptions.data.length > 0) {
        startingAfter = subscriptions.data[subscriptions.data.length - 1].id
      }
    }

    results.found = endingSoonSubs.length

    for (const sub of endingSoonSubs) {
      try {
        const [subRecord] = await sql`
          SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ${sub.id} LIMIT 1
        `
        if (!subRecord?.user_id) {
          results.skipped++
          continue
        }

        const [userRecord] = await sql`
          SELECT email, display_name FROM users WHERE id = ${subRecord.user_id} LIMIT 1
        `
        if (!userRecord?.email) {
          results.skipped++
          continue
        }

        const daysLeft = Math.ceil((sub.current_period_end - now) / (24 * 60 * 60))
        let cadence: "day7" | "day3" | "day1" | null = null
        if (daysLeft <= 1) {
          cadence = "day1"
        } else if (daysLeft <= 3) {
          cadence = "day3"
        } else if (daysLeft <= 7) {
          cadence = "day7"
        }

        if (!cadence) {
          results.skipped++
          continue
        }

        const emailType =
          cadence === "day7"
            ? "subscription-ending-soon-7"
            : cadence === "day3"
              ? "subscription-ending-soon-3"
              : "subscription-ending-soon-1"

        let recentSend
        if (cadence === "day7") {
          recentSend = await sql`
            SELECT id FROM email_logs
            WHERE user_email = ${userRecord.email}
              AND email_type = ${emailType}
              AND sent_at >= NOW() - INTERVAL '7 days'
            LIMIT 1
          `
        } else if (cadence === "day3") {
          recentSend = await sql`
            SELECT id FROM email_logs
            WHERE user_email = ${userRecord.email}
              AND email_type = ${emailType}
              AND sent_at >= NOW() - INTERVAL '3 days'
            LIMIT 1
          `
        } else {
          recentSend = await sql`
            SELECT id FROM email_logs
            WHERE user_email = ${userRecord.email}
              AND email_type = ${emailType}
              AND sent_at >= NOW() - INTERVAL '1 day'
            LIMIT 1
          `
        }
        if (recentSend.length > 0) {
          results.skipped++
          results[cadence].skipped++
          continue
        }

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai"
        const manageBillingUrl = `${siteUrl}/studio?tab=account`
        const periodEndDate = new Date(sub.current_period_end * 1000).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })

        const emailContent = generateSubscriptionEndingSoonEmail({
          firstName: userRecord.display_name?.split(" ")[0] || undefined,
          recipientEmail: userRecord.email,
          periodEndDate,
          manageBillingUrl,
        })

        const subject =
          cadence === "day7"
            ? "Your Studio access is ending soon"
            : cadence === "day3"
              ? "3 days left to keep your Studio access"
              : "Last day to keep your Studio access"

        const sendResult = await sendEmail({
          to: userRecord.email,
          subject: subject || emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          from: "Sandra from SSELFIE <hello@sselfie.ai>",
          emailType: emailType,
          tags: ["billing", "subscription-ending", cadence],
        })

        if (sendResult.success) {
          results.sent++
          results[cadence].sent++
        } else {
          results.failed++
          results[cadence].failed++
          await logAdminError({
            toolName: "subscription-ending-soon",
            error: new Error(sendResult.error || "Failed to send email"),
            context: { subscriptionId: sub.id, email: userRecord.email },
          })
        }
      } catch (error) {
        results.failed++
        const daysLeft = Math.ceil((sub.current_period_end - now) / (24 * 60 * 60))
        const cadence = daysLeft <= 1 ? "day1" : daysLeft <= 3 ? "day3" : "day7"
        results[cadence].failed++
        await logAdminError({
          toolName: "subscription-ending-soon",
          error: error instanceof Error ? error : new Error(String(error)),
          context: { subscriptionId: sub.id },
        })
      }
    }

    await cronLogger.success(results)
    return NextResponse.json({ success: true, ...results })
  } catch (error) {
    await cronLogger.error(error)
    return NextResponse.json({ error: "Failed to run subscription-ending-soon cron" }, { status: 500 })
  }
}
