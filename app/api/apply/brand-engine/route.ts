import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import {
  calculateQualificationScore,
  ensureBrandEngineApplicationsSchema,
  expectedOfferValueCents,
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

    const { channel, detail } = resolveLeadSource(sourceChannel, sourceDetail)
    const normalizedOfferType = typeof offerType === "string" ? offerType.toLowerCase() : "cohort"
    const leadTags = [
      "brand-engine",
      "application",
      `offer:${normalizedOfferType}`,
      `source:${channel}`,
      utmSource ? `utm_source:${String(utmSource).toLowerCase()}` : null,
      utmMedium ? `utm_medium:${String(utmMedium).toLowerCase()}` : null,
      utmCampaign ? `utm_campaign:${String(utmCampaign).toLowerCase()}` : null,
      qualification.qualified ? "qualified" : "nurture",
      `priority:${qualification.priorityTier}`,
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
        source_channel,
        source_detail,
        lead_tags,
        expected_value_cents,
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
        ${qualification.pipelineStage},
        ${qualification.score},
        ${qualification.notes},
        ${qualification.priorityTier},
        ${channel},
        ${detail || [utmSource, utmMedium, utmCampaign, referrer].filter(Boolean).join(" | ") || null},
        ${JSON.stringify(leadTags)}::jsonb,
        ${expectedOfferValueCents(normalizedOfferType)},
        ${true},
        ${`draft_mode=true; referrer=${referrer || "unknown"}`},
        NOW()
      )
    `

    return NextResponse.json({
      success: true,
      qualified: qualification.qualified,
      score: qualification.score,
      pipelineStage: qualification.pipelineStage,
      priorityTier: qualification.priorityTier,
      message: qualification.qualified
        ? "Application received! I'll review it within 24 hours."
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
