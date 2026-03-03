import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db/client"

/**
 * POST /api/admin/update-high-ticket-tasks
 * Update High-Ticket Offer tasks to reflect finalized strategy
 */
export async function POST(req: NextRequest) {
  try {
    const sql = getDb()

    // Get the High-Ticket Offer project
    const projects = await sql`
      SELECT id FROM tracker_projects
      WHERE title = 'High-Ticket Offer Launch'
      LIMIT 1
    `

    if ((projects as any[]).length === 0) {
      return NextResponse.json({
        success: false,
        error: "High-Ticket Offer project not found."
      }, { status: 404 })
    }

    const projectId = (projects as any)[0].id

    // Delete existing tasks
    await sql`
      DELETE FROM tracker_tasks
      WHERE project_id = ${projectId}
    `

    // Define finalized tasks based on locked-in strategy
    const tasks = [
      // PHASE 1: PRE-LAUNCH (Week 1-2) - Urgent Priority
      {
        title: "Create application form with qualification questions",
        description: "Build Typeform: Contact info → Revenue ($100k+ filter) → Content examples → Budget confirmation → Auto-disqualify logic",
        priority: "urgent",
        is_quick_win: false,
        estimated_minutes: 60,
        scheduled_for: new Date().toISOString().split('T')[0],
        order_index: 1
      },
      {
        title: "Set up discovery call booking (Calendly)",
        description: "Configure 30-min discovery call template. Agenda: Review content voice (10) → Walk through system (10) → Q&A (5) → Discuss fit (5)",
        priority: "urgent",
        is_quick_win: true,
        estimated_minutes: 30,
        scheduled_for: new Date().toISOString().split('T')[0],
        order_index: 2
      },
      {
        title: "Draft landing page copy using positioning framework",
        description: "Write sections: Problem (content bottleneck) → Agitation (tried batching/writers) → Solution (AI Brand OS™). Use messaging from strategy doc.",
        priority: "urgent",
        is_quick_win: false,
        estimated_minutes: 90,
        order_index: 3
      },
      {
        title: "Design landing page matching SSELFIE aesthetic",
        description: "Create /offers/ai-brand-os page. Stone colors, Times New Roman, minimalist. Mobile-responsive, fast loading.",
        priority: "high",
        is_quick_win: false,
        estimated_minutes: 120,
        order_index: 4
      },
      {
        title: "Create case study framework (even before real ones)",
        description: "Build case study template structure: Before state → Transformation → After results → Testimonial format",
        priority: "high",
        is_quick_win: true,
        estimated_minutes: 30,
        order_index: 5
      },
      {
        title: "Set up Stripe payment processing",
        description: "Configure checkout: $2,997 one-time (beta) → $4,997 one-time OR $1,897 × 3 payment plan. Add confirmation emails.",
        priority: "high",
        is_quick_win: false,
        estimated_minutes: 60,
        order_index: 6
      },
      {
        title: "Create 5-part email announcement sequence",
        description: "Write educational series ending with application CTA. Topics: Content scaling problem, AI authenticity, transformation stories.",
        priority: "high",
        is_quick_win: false,
        estimated_minutes: 90,
        order_index: 7
      },

      // PHASE 2: BETA LAUNCH (Week 3-4) - High Priority
      {
        title: "Launch landing page at /offers/ai-brand-os",
        description: "Go live with landing page. Test all links, forms, and booking flow. Verify mobile responsiveness.",
        priority: "high",
        is_quick_win: true,
        estimated_minutes: 30,
        order_index: 8
      },
      {
        title: "Post beta launch announcement on social media",
        description: "Announce: \"2 Founding Member spots at $2,997 (normally $4,997)\". Limited availability messaging.",
        priority: "high",
        is_quick_win: true,
        estimated_minutes: 30,
        order_index: 9
      },
      {
        title: "Send email announcement to list",
        description: "Launch 5-email sequence to existing audience. Include scarcity: \"Maximum 3 clients per month, 2 spots remaining in February\"",
        priority: "high",
        is_quick_win: false,
        estimated_minutes: 45,
        order_index: 10
      },
      {
        title: "Direct outreach to 10 ideal clients",
        description: "Identify 10 coaches/creators earning $100k-$500k with content scaling issues. Personal outreach with application link.",
        priority: "high",
        is_quick_win: false,
        estimated_minutes: 60,
        order_index: 11
      },
      {
        title: "Host free workshop: '30 Days of Content in 2 Hours'",
        description: "Create and deliver workshop showing methodology. Pitch AI Brand OS™ at end. Collect applications.",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 180,
        order_index: 12
      },
      {
        title: "Enroll first beta client (Founding Member #1)",
        description: "Close first client at $2,997. Document EVERYTHING for case study. Set expectations for collaborative process.",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 60,
        order_index: 13
      },
      {
        title: "Enroll second beta client (Founding Member #2)",
        description: "Close second client at $2,997. Begin refining delivery process based on learnings from client #1.",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 60,
        order_index: 14
      },

      // PHASE 3: DELIVERY & CASE STUDIES (Month 2) - Medium Priority
      {
        title: "Deliver Week 1: Brand Voice Capture for Client #1",
        description: "90-min strategy session → Extract voice from 10+ content pieces → Create 15-20 page Brand Voice Blueprint → Map 3-5 content pillars",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 240,
        order_index: 15
      },
      {
        title: "Deliver Week 2-3: Custom AI Content Engine for Client #1",
        description: "Configure AI Content Twin → Set up workflow automation → Create custom prompt library (8+ content types) → Platform integrations",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 360,
        order_index: 16
      },
      {
        title: "Deliver Week 4: Implementation & Training for Client #1",
        description: "Two 60-min training sessions → Generate first 30-day content calendar together → Content review & refinement → Deliver 30 days ready content",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 240,
        order_index: 17
      },
      {
        title: "Deliver complete AI Brand OS™ for Client #2",
        description: "Repeat 4-week delivery process. Refine methodology based on Client #1 learnings. Document improvements.",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 840,
        order_index: 18
      },
      {
        title: "Collect testimonials and results metrics",
        description: "Gather quantitative results: Time saved per week, content pieces created, engagement metrics. Request video testimonials.",
        priority: "medium",
        is_quick_win: true,
        estimated_minutes: 45,
        order_index: 19
      },
      {
        title: "Create 2 detailed case studies",
        description: "Write case studies for both beta clients: Before state → Process → Results → Testimonial. Include specific metrics and screenshots.",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 120,
        order_index: 20
      },
      {
        title: "Film client video testimonials",
        description: "Record 2-3 minute video testimonials with both beta clients. Edit and add to landing page as social proof.",
        priority: "low",
        is_quick_win: false,
        estimated_minutes: 90,
        order_index: 21
      },

      // PHASE 4: SCALE (Month 3+) - Low Priority
      {
        title: "Raise price to $4,997 standard pricing",
        description: "Update landing page, Stripe pricing, and all marketing materials. Add payment plan option: $1,897 × 3 months",
        priority: "low",
        is_quick_win: true,
        estimated_minutes: 30,
        order_index: 22
      },
      {
        title: "Launch case study marketing campaign",
        description: "Share case studies across email, social media, blog posts. Use results metrics as social proof for new applications.",
        priority: "low",
        is_quick_win: false,
        estimated_minutes: 60,
        order_index: 23
      },
      {
        title: "Open 3 spots per month capacity",
        description: "Update messaging: '3 spots per month for white-glove service'. Build waitlist for overflow demand.",
        priority: "low",
        is_quick_win: true,
        estimated_minutes: 15,
        order_index: 24
      },
      {
        title: "Build waitlist system",
        description: "Create waitlist form for when 3 monthly spots are filled. Set up automated nurture emails for waitlist members.",
        priority: "low",
        is_quick_win: false,
        estimated_minutes: 45,
        order_index: 25
      },
      {
        title: "Launch premium upsells",
        description: "Create pages for: VIP Implementation Day ($2,997), Distribution Automation ($1,497), Maintenance ($297/mo). Add to sales process.",
        priority: "low",
        is_quick_win: false,
        estimated_minutes: 90,
        order_index: 26
      },
      {
        title: "Consider raising price to $6,997-$7,500",
        description: "After 5-6 successful clients with case studies, evaluate premium pricing tier. Position as THE premium solution in category.",
        priority: "low",
        is_quick_win: false,
        estimated_minutes: 30,
        order_index: 27
      }
    ]

    console.log(`Creating ${tasks.length} finalized tasks for High-Ticket Offer...`)

    // Insert all tasks
    let insertedCount = 0
    for (const task of tasks) {
      await sql`
        INSERT INTO tracker_tasks (
          project_id,
          title,
          description,
          priority,
          is_quick_win,
          estimated_minutes,
          scheduled_for,
          order_index
        )
        VALUES (
          ${projectId},
          ${task.title},
          ${task.description},
          ${task.priority},
          ${task.is_quick_win},
          ${task.estimated_minutes},
          ${task.scheduled_for || null},
          ${task.order_index}
        )
      `
      insertedCount++
    }

    return NextResponse.json({
      success: true,
      message: `✅ Updated High-Ticket Offer with ${insertedCount} finalized tasks based on locked-in strategy`,
      projectId,
      tasksCreated: insertedCount
    })

  } catch (error) {
    console.error("[Update High-Ticket Tasks] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
