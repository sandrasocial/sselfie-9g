import { NextRequest, NextResponse } from "next/server"

import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { addOrUpdateResendContact, updateContactTags } from "@/lib/resend/manage-contact"
import {
  ensureBrandEngineApplicationsSchema,
  scoreWorkWithMeLead,
} from "@/lib/brand-engine/applications"

type InquiryPayload = {
  name?: string
  email?: string
  instagramHandle?: string
  currentChallenge?: string
  desiredOutcome?: string
  currentOffer?: string
  aiAttempts?: string
  helpFocus?: string
  investmentReadiness?: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function formatHandle(handle: string) {
  const trimmed = handle.trim()
  if (!trimmed) return ""
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as InquiryPayload
    const name = body.name?.trim() || ""
    const email = body.email?.trim().toLowerCase() || ""
    const instagramHandle = formatHandle(body.instagramHandle || "")
    const currentChallenge = body.currentChallenge?.trim() || ""
    const desiredOutcome = body.desiredOutcome?.trim() || ""
    const currentOffer = body.currentOffer?.trim() || ""
    const aiAttempts = body.aiAttempts?.trim() || ""
    const helpFocus = body.helpFocus?.trim() || ""
    const investmentReadiness = body.investmentReadiness?.trim() || ""

    if (
      !name ||
      !email ||
      !currentChallenge ||
      !desiredOutcome ||
      !currentOffer ||
      !aiAttempts ||
      !investmentReadiness
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!email.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 })
    }

    const safeName = escapeHtml(name)
    const safeEmail = escapeHtml(email)
    const safeHandle = escapeHtml(instagramHandle)
    const safeChallenge = escapeHtml(currentChallenge).replaceAll("\n", "<br />")
    const safeOutcome = escapeHtml(desiredOutcome).replaceAll("\n", "<br />")
    const safeCurrentOffer = escapeHtml(currentOffer).replaceAll("\n", "<br />")
    const safeAiAttempts = escapeHtml(aiAttempts).replaceAll("\n", "<br />")
    const safeHelpFocus = escapeHtml(helpFocus)
    const safeInvestmentReadiness = escapeHtml(investmentReadiness)
    const adminEmail =
      process.env.WORK_WITH_ME_INQUIRY_EMAIL || process.env.ADMIN_EMAIL || "hello@sselfie.ai"
    const leadScore = scoreWorkWithMeLead({
      currentChallenge,
      desiredOutcome,
      currentOffer,
      aiAttempts,
      helpFocus,
      investmentReadiness,
      instagramHandle,
    })
    const leadTags = [
      "work-with-me",
      "application",
      "source:work_with_me",
      leadScore.qualified ? "qualified" : "needs_follow_up",
      leadScore.hasExistingBusiness ? "has_existing_business" : null,
      leadScore.workDependsOnFounder ? "work_depends_on_founder" : null,
      leadScore.hasTriedAi ? "tried_ai" : null,
      leadScore.clearRecurringWork ? "clear_recurring_work" : null,
      `investment:${leadScore.ready}`,
      `next_action:${leadScore.nextAction}`,
    ].filter(Boolean)

    await ensureBrandEngineApplicationsSchema(sql)
    const inserted = await sql`
      INSERT INTO brand_engine_applications (
        name,
        email,
        website,
        offer_type,
        revenue,
        current_spend,
        biggest_bottleneck,
        hours_per_week,
        business_description,
        why_interested,
        ready_to_invest,
        qualified,
        status,
        pipeline_stage,
        qualification_score,
        qualification_notes,
        priority_tier,
        routing_path,
        next_action,
        call_required,
        source_channel,
        source_detail,
        lead_tags,
        expected_value_cents,
        checkout_mode,
        checkout_mode_reason,
        draft_mode,
        notes,
        created_at,
        updated_at
      )
      VALUES (
        ${name},
        ${email},
        ${instagramHandle || null},
        ${"work_with_me"},
        ${"unknown"},
        ${"unknown"},
        ${currentChallenge},
        ${"unknown"},
        ${currentOffer || "Not provided"},
        ${desiredOutcome},
        ${leadScore.ready},
        ${leadScore.qualified},
        ${leadScore.status},
        ${leadScore.pipelineStage},
        ${leadScore.score},
        ${leadScore.notes},
        ${leadScore.priorityTier},
        ${"fit_call"},
        ${leadScore.nextAction},
        ${true},
        ${"work_with_me"},
        ${
          [
            instagramHandle ? `instagram:${instagramHandle}` : null,
            helpFocus ? `help_focus:${helpFocus}` : null,
            aiAttempts ? `ai_attempts:${aiAttempts}` : null,
          ]
            .filter(Boolean)
            .join(" | ") || null
        },
        ${JSON.stringify(leadTags)}::jsonb,
        ${200000},
        ${"none"},
        ${"private_personal_ai_team_requires_human_fit_call"},
        ${true},
        ${`Work With Me application. ${leadScore.notes}`},
        NOW(),
        NOW()
      )
      RETURNING id
    `
    const insertedRows = inserted as Array<{ id?: number }>
    const applicationId = Number(insertedRows[0]?.id || 0)

    await addOrUpdateResendContact(email, name, {
      source: "work-with-me-inquiry",
      status: "lead",
      inquiry_type: "work_with_me_personal_ai_team",
      help_focus: helpFocus,
      investment_readiness: investmentReadiness,
      lead_score: String(leadScore.score),
      lead_status: leadScore.status,
    }).catch(error => {
      console.error("[v0] Failed to sync inquiry contact to Resend:", error)
    })

    await updateContactTags(email, {
      inquiry_type: "work_with_me_personal_ai_team",
      inquiry_status: "new",
      journey: "high_intent",
      help_focus: helpFocus,
      investment_readiness: investmentReadiness,
      lead_score: String(leadScore.score),
      next_action: leadScore.nextAction,
    }).catch(error => {
      console.error("[v0] Failed to update inquiry tags:", error)
    })

    const adminEmailResult = await sendEmail({
      to: adminEmail,
      subject: `New Work With Me application from ${name}`,
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #1c1917;">
          <h1 style="margin: 0 0 20px; font-size: 28px; font-weight: 600;">New Work With Me application</h1>
          <p style="margin: 0 0 12px;"><strong>Name:</strong> ${safeName}</p>
          <p style="margin: 0 0 12px;"><strong>Email:</strong> ${safeEmail}</p>
          <p style="margin: 0 0 24px;"><strong>Instagram:</strong> ${safeHandle || "Not provided"}</p>
          <div style="margin: 0 0 20px;">
            <p style="margin: 0 0 8px; font-weight: 600;">What work in her business keeps coming back to her?</p>
            <p style="margin: 0; line-height: 1.7;">${safeChallenge}</p>
          </div>
          <div>
            <p style="margin: 0 0 8px; font-weight: 600;">What would she hand over first if she had reliable help?</p>
            <p style="margin: 0; line-height: 1.7;">${safeOutcome}</p>
          </div>
          <div style="margin: 20px 0 0;">
            <p style="margin: 0 0 8px; font-weight: 600;">What has she tried with AI?</p>
            <p style="margin: 0; line-height: 1.7;">${safeAiAttempts}</p>
          </div>
          <div style="margin: 20px 0 0;">
            <p style="margin: 0 0 8px; font-weight: 600;">What service are they already selling, and what result does it create?</p>
            <p style="margin: 0; line-height: 1.7;">${safeCurrentOffer}</p>
          </div>
          <div style="margin: 20px 0 0;">
            <p style="margin: 0 0 8px; font-weight: 600;">Team focus</p>
            <p style="margin: 0; line-height: 1.7;">${safeHelpFocus || "Not provided"}</p>
          </div>
          <div style="margin: 20px 0 0;">
            <p style="margin: 0 0 8px; font-weight: 600;">Ready to invest €2,000 paid in full if it is a fit?</p>
            <p style="margin: 0; line-height: 1.7;">${safeInvestmentReadiness || "Not provided"}</p>
          </div>
          <div style="margin: 20px 0 0; padding: 16px; background: #f5f5f4; border: 1px solid #e7e5e4;">
            <p style="margin: 0 0 8px; font-weight: 600;">Pipeline</p>
            <p style="margin: 0; line-height: 1.7;">Application ID: ${applicationId || "not saved"}</p>
            <p style="margin: 0; line-height: 1.7;">Score: ${leadScore.score}/100</p>
            <p style="margin: 0; line-height: 1.7;">Status: ${leadScore.status}</p>
            <p style="margin: 0; line-height: 1.7;">Next action: ${leadScore.nextAction}</p>
            <p style="margin: 8px 0 0; line-height: 1.7;">${escapeHtml(leadScore.notes)}</p>
          </div>
        </div>
      `,
      text: [
        "New Work With Me application",
        `Name: ${name}`,
        `Email: ${email}`,
        `Instagram: ${instagramHandle || "Not provided"}`,
        "",
        "What work in her business keeps coming back to her?",
        currentChallenge,
        "",
        "What would she hand over first if she had reliable help?",
        desiredOutcome,
        "",
        "What service are they already selling, and what result does it create?",
        currentOffer,
        "",
        "What has she tried with AI?",
        aiAttempts,
        "",
        "Team focus",
        helpFocus || "Not provided",
        "",
        "Ready to invest €2,000 paid in full if it is a fit?",
        investmentReadiness || "Not provided",
        "",
        "Pipeline",
        `Application ID: ${applicationId || "not saved"}`,
        `Score: ${leadScore.score}/100`,
        `Status: ${leadScore.status}`,
        `Next action: ${leadScore.nextAction}`,
        leadScore.notes,
      ].join("\n"),
      emailType: "work_with_me_inquiry_admin",
      tags: ["work-with-me", "personal-ai-team", "application"],
    })

    if (!adminEmailResult.success) {
      console.error(
        "[Work With Me] Application saved but admin notification failed:",
        adminEmailResult.error
      )
    }

    await sendEmail({
      to: email,
      subject: "I have your Work With Me application",
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #1c1917;">
          <p>Hi ${safeName},</p>
          <p>I have your application. Thank you for trusting me with it.</p>
          <p>I will look at your business, the work that keeps coming back to you, and whether I can genuinely help build the right personal AI team around it.</p>
          <p>If it looks like the right fit, I will reply with the next step. That usually means a short fit call first. No payment has been taken.</p>
          <p>Sandra x</p>
        </div>
      `,
      text: [
        `Hi ${name},`,
        "",
        "I have your application. Thank you for trusting me with it.",
        "I will look at your business, the work that keeps coming back to you, and whether I can genuinely help build the right personal AI team around it.",
        "If it looks like the right fit, I will reply with the next step. That usually means a short fit call first. No payment has been taken.",
        "",
        "Sandra x",
      ].join("\n"),
      emailType: "work_with_me_inquiry_confirmation",
      tags: ["work-with-me", "personal-ai-team", "application-confirmation"],
    }).catch(error => {
      console.error("[v0] Failed to send inquiry confirmation email:", error)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error submitting inquiry:", error)
    return NextResponse.json({ error: "Failed to submit inquiry" }, { status: 500 })
  }
}
