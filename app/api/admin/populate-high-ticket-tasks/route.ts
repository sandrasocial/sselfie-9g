import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

/**
 * POST /api/admin/populate-high-ticket-tasks
 * One-time script to populate High-Ticket Offer tasks
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
        error: "High-Ticket Offer project not found. Run migration first."
      }, { status: 404 })
    }

    const projectId = (projects as any)[0].id

    // Check if tasks already exist
    const existingTasks = await sql`
      SELECT COUNT(*) as count
      FROM tracker_tasks
      WHERE project_id = ${projectId}
    `

    if (parseInt(((existingTasks as any[])[0] as any).count) > 0) {
      return NextResponse.json({
        success: false,
        message: "Tasks already exist for this project",
        count: parseInt(((existingTasks as any[])[0] as any).count)
      })
    }

    // Define all tasks
    const tasks = [
      // PHASE 1: STRATEGY (TODAY) - Urgent Priority
      {
        title: "Define offer details and transformation",
        description: "Decide: VIP 1:1 coaching vs done-for-you service vs group program. Define the transformation you're selling and ideal client profile.",
        priority: "urgent",
        is_quick_win: false,
        estimated_minutes: 30,
        scheduled_for: new Date().toISOString().split('T')[0],
        order_index: 1
      },
      {
        title: "Research competitor pricing and set price point",
        description: "Analyze 3-5 competitor offers in your niche. Decide price range: $2k-$5k, $5k-$10k, or $10k+",
        priority: "urgent",
        is_quick_win: false,
        estimated_minutes: 30,
        scheduled_for: new Date().toISOString().split('T')[0],
        order_index: 2
      },
      {
        title: "Choose delivery model",
        description: "Decide: Weekly calls, intensive workshop, ongoing access + calls, or done-for-you service",
        priority: "urgent",
        is_quick_win: true,
        estimated_minutes: 15,
        scheduled_for: new Date().toISOString().split('T')[0],
        order_index: 3
      },

      // PHASE 2: BUILD LANDING PAGE - High Priority
      {
        title: "Design hero section for landing page",
        description: "Create compelling headline, subheadline, and hero image. Match homepage design system.",
        priority: "high",
        is_quick_win: false,
        estimated_minutes: 60,
        order_index: 4
      },
      {
        title: "Write landing page copy (problem/solution)",
        description: "Write sections: Problem your client faces → Solution you provide → Transformation they get",
        priority: "high",
        is_quick_win: false,
        estimated_minutes: 60,
        order_index: 5
      },
      {
        title: "Add testimonials and social proof",
        description: "Gather and format 3-5 client testimonials, case studies, or results. Add trust badges.",
        priority: "high",
        is_quick_win: false,
        estimated_minutes: 30,
        order_index: 6
      },
      {
        title: "Create CTA section with Apply Now button",
        description: "Design compelling call-to-action section that leads to application form",
        priority: "high",
        is_quick_win: false,
        estimated_minutes: 30,
        order_index: 7
      },

      // PHASE 3: APPLICATION SYSTEM - High Priority
      {
        title: "Build multi-step application form",
        description: "Create form with steps: Contact info → Current situation → Goals → Budget confirmation → Why good fit",
        priority: "high",
        is_quick_win: false,
        estimated_minutes: 60,
        order_index: 8
      },
      {
        title: "Add qualification logic to application",
        description: "Set up automatic filtering based on budget, timeline, and fit criteria",
        priority: "high",
        is_quick_win: false,
        estimated_minutes: 30,
        order_index: 9
      },
      {
        title: "Set up application email notifications",
        description: "Configure emails: Application received (to you) + Confirmation (to applicant)",
        priority: "high",
        is_quick_win: false,
        estimated_minutes: 30,
        order_index: 10
      },

      // PHASE 4: BOOKING & CHECKOUT - Medium Priority
      {
        title: "Integrate Calendly or Cal.com booking",
        description: "Embed booking calendar. Configure availability and meeting types.",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 30,
        order_index: 11
      },
      {
        title: "Build checkout flow with Stripe",
        description: "Create checkout page with payment processing. Set up payment confirmation emails.",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 60,
        order_index: 12
      },
      {
        title: "Configure payment plans (if offering)",
        description: "Set up full payment vs deposit options. Configure installment plans if needed.",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 30,
        order_index: 13
      },

      // PHASE 5: LAUNCH - Medium Priority
      {
        title: "Add high-ticket offer to /bio page",
        description: "Create beautiful card/section on bio page linking to offer landing page",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 30,
        order_index: 14
      },
      {
        title: "Test complete user flow end-to-end",
        description: "Test: Landing page → Application → Approval → Booking → Checkout → Confirmation",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 30,
        order_index: 15
      },
      {
        title: "Launch and announce offer!",
        description: "Go live! Announce to email list, social media, and existing clients.",
        priority: "low",
        is_quick_win: true,
        estimated_minutes: 15,
        order_index: 16
      }
    ]

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
      message: `✅ Created ${insertedCount} tasks for High-Ticket Offer Launch`,
      projectId,
      tasksCreated: insertedCount,
      // removed in CLEANUP-01: /admin/project-tracker
      redirect: "/admin"
    })

  } catch (error) {
    console.error("[Populate Tasks] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
