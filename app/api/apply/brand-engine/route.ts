import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db/client"
import {
  calculateQualificationScore,
  deriveCheckoutExperienceDecision,
  enforceSourceAwareRouting,
  ensureBrandEngineApplicationsSchema,
  expectedOfferValueCents,
  normalizeLeadSourceChannel,
  resolveLeadSource,
} from "@/lib/brand-engine/applications"

/**
 * POST /api/apply/brand-engine
 * Handle Brand Engine application submissions
 * Assign source tags, qualification score, and initial pipeline stage
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json()

    const {
      name,
      email,
      website,
      offerType,
      revenue,
      currentSpend,
      biggestBottleneck,
      hoursPerWeek,
      businessDescription,
      whyInterested,
      readyToInvest,
      sourceChannel,
      sourceDetail,
      source,
      source_detail,
      utmSource,
      utmMedium,
      utmCampaign,
      referrer,
    } = data

    // Validate required fields
    if (
      !name ||
      !email ||
      !website ||
      !offerType ||
      !revenue ||
      !currentSpend ||
      !biggestBottleneck ||
      !hoursPerWeek ||
      !businessDescription ||
      !whyInterested ||
      !readyToInvest
    ) {
      return NextResponse.json({
        success: false,
        error: "All fields are required."
      }, { status: 400 })
    }

    const sql = getDb()
    await ensureBrandEngineApplicationsSchema(sql)

    const qualification = calculateQualificationScore({
      revenue,
      currentSpend,
      hoursPerWeek,
      readyToInvest,
      offerType,
      biggestBottleneck,
      businessDescription,
      whyInterested,
    })

    const sourceDetailLower = String(sourceDetail || source_detail || "").toLowerCase()
    const normalizedSourceInput =
      String(utmMedium || "").toLowerCase() === "manychat" || sourceDetailLower.includes("manychat")
        ? "manychat_dm"
        : sourceChannel ||
          source ||
          (String(utmSource || "").toLowerCase() === "instagram_dm" ? "instagram_dm" : "")

    const { channel, detail } = resolveLeadSource(
      normalizeLeadSourceChannel(normalizedSourceInput),
      sourceDetail || source_detail,
    )

    const checkoutExperience = deriveCheckoutExperienceDecision({
      routingPath: qualification.routingPath,
      sourceChannel: channel,
    })
    const sourceAwareRouting = enforceSourceAwareRouting({
      sourceChannel: channel,
      routingPath: qualification.routingPath,
      nextAction: qualification.nextAction,
      callRequired: qualification.callRequired,
      checkoutMode: checkoutExperience.checkoutMode,
      checkoutModeReason: checkoutExperience.reason,
    })
    const normalizedOfferType = typeof offerType === "string" ? offerType.toLowerCase() : "cohort"
    const leadTags = [
      "brand-engine",
      "application",
      `offer:${normalizedOfferType}`,
      `source:${channel}`,
      utmSource ? `utm_source:${String(utmSource).toLowerCase()}` : null,
      utmMedium ? `utm_medium:${String(utmMedium).toLowerCase()}` : null,
      utmCampaign ? `utm_campaign:${String(utmCampaign).toLowerCase()}` : null,
      sourceAwareRouting.routingPath === "fit_call" ? "qualified" : qualification.qualified ? "qualified" : "nurture",
      `priority:${qualification.priorityTier}`,
      `route:${sourceAwareRouting.routingPath}`,
      `next_action:${sourceAwareRouting.nextAction}`,
      `checkout:${sourceAwareRouting.checkoutMode}`,
    ].filter(Boolean)

    // Check if email already applied
    const existing = await sql`
      SELECT id FROM brand_engine_applications
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `

    if ((existing as any[]).length > 0) {
      return NextResponse.json({
        success: false,
        error: "You've already applied. I'll review your application within 24 hours."
      }, { status: 400 })
    }

    // Insert application
    await sql`
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
        created_at
      )
      VALUES (
        ${name},
        ${email.toLowerCase()},
        ${website},
        ${normalizedOfferType},
        ${revenue},
        ${currentSpend},
        ${biggestBottleneck},
        ${hoursPerWeek},
        ${businessDescription},
        ${whyInterested},
        ${readyToInvest},
        ${qualification.qualified},
        ${qualification.qualified ? "pending_review" : "nurture"},
        ${sourceAwareRouting.routingPath === "fit_call" ? "qualified_queue" : qualification.pipelineStage},
        ${qualification.score},
        ${qualification.notes},
        ${qualification.priorityTier},
        ${sourceAwareRouting.routingPath},
        ${sourceAwareRouting.nextAction},
        ${sourceAwareRouting.callRequired},
        ${channel},
        ${detail || [utmSource, utmMedium, utmCampaign, referrer].filter(Boolean).join(" | ") || null},
        ${JSON.stringify(leadTags)}::jsonb,
        ${expectedOfferValueCents(normalizedOfferType)},
        ${sourceAwareRouting.checkoutMode},
        ${sourceAwareRouting.checkoutModeReason},
        ${true},
        ${`draft_mode=true; referrer=${referrer || "unknown"}`},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      qualified: qualification.qualified,
      score: qualification.score,
      pipelineStage: sourceAwareRouting.routingPath === "fit_call" ? "qualified_queue" : qualification.pipelineStage,
      routingPath: sourceAwareRouting.routingPath,
      nextAction: sourceAwareRouting.nextAction,
      checkoutMode: sourceAwareRouting.checkoutMode,
      priorityTier: qualification.priorityTier,
      message: qualification.qualified
        ? sourceAwareRouting.routingPath === "direct_offer"
          ? sourceAwareRouting.checkoutMode === "embedded_checkout"
            ? "Application received! If it's a fit, I'll send your checkout link within 24 hours."
            : "Application received! If it's a fit, I'll send your payment link within 24 hours."
          : "Application received! If it's a fit, I'll send your booking link within 24 hours."
        : "Application received. We will review your details and follow up with the best next step."
    })

  } catch (error) {
    console.error("[Brand Engine Application] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Something went wrong. Please try again."
    }, { status: 500 })
  }
}
