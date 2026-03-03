import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db/client"

/**
 * POST /api/admin/refresh-high-ticket-tasks
 * Completely refresh High-Ticket Offer tasks with FINAL locked-in strategy
 * Infrastructure-based model with setup + recurring
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

    // Delete ALL existing tasks
    await sql`
      DELETE FROM tracker_tasks
      WHERE project_id = ${projectId}
    `

    const today = new Date().toISOString().split('T')[0]

    // Define FINAL tasks based on locked-in infrastructure strategy
    const tasks = [
      // === PHASE 1: WAITLIST LAUNCH (THIS WEEK) === //
      {
        title: "Create waitlist landing page at /waitlist/ai-brand-os",
        description: "Build landing page: Headline 'I'll Build You an AI Marketing System That Runs 24/7' → Deliverables → Pricing transparency → Email capture form → Scarcity messaging",
        priority: "urgent",
        is_quick_win: false,
        estimated_minutes: 120,
        scheduled_for: today,
        order_index: 1
      },
      {
        title: "Set up waitlist database table and API endpoints",
        description: "Create waitlist_signups table (email, name, created_at) → Build POST /api/waitlist/join endpoint → Email validation → Thank you response",
        priority: "urgent",
        is_quick_win: false,
        estimated_minutes: 60,
        scheduled_for: today,
        order_index: 2
      },
      {
        title: "Draft social media announcement post",
        description: "Instagram + LinkedIn: 'I'm launching something new. AI Brand OS™ - your complete AI marketing infrastructure. Setup $7,500, Management $697/mo. Waitlist opens today. First 2 Founding Members: $4,997 setup + $497/mo locked.'",
        priority: "urgent",
        is_quick_win: true,
        estimated_minutes: 30,
        scheduled_for: today,
        order_index: 3
      },
      {
        title: "Write email to SSELFIE Studio users announcing waitlist",
        description: "Subject: 'I'm testing something (waitlist opens today)' → Story about building SSELFIE, hearing 'do it for me', launching AI Brand OS™ → Clear pricing → Waitlist CTA",
        priority: "urgent",
        is_quick_win: false,
        estimated_minutes: 45,
        scheduled_for: today,
        order_index: 4
      },
      {
        title: "Launch waitlist publicly (social + email)",
        description: "Post to Instagram & LinkedIn → Send email to SSELFIE users → Monitor signups → Goal: 20-30 signups in 2 weeks",
        priority: "urgent",
        is_quick_win: true,
        estimated_minutes: 30,
        scheduled_for: today,
        order_index: 5
      },

      // === PHASE 2: APPLICATION SETUP (Week 2) === //
      {
        title: "Create Typeform application with qualification questions",
        description: "8 questions: Contact info → Revenue ($100k+ filter) → Current spend on content → Biggest bottleneck → Hours/week on content → Business/offers → Why interested → Ready to invest → Auto-disqualify logic",
        priority: "high",
        is_quick_win: false,
        estimated_minutes: 60,
        order_index: 6
      },
      {
        title: "Write discovery call script (30-min structure)",
        description: "Intro (5min) → Understand current state (10min) → Present solution (10min) → Close (5min) → Document objection responses → Create call checklist",
        priority: "high",
        is_quick_win: false,
        estimated_minutes: 45,
        order_index: 7
      },
      {
        title: "Create proposal + contract templates",
        description: "Proposal doc with deliverables, timeline, pricing → Service agreement template → Payment schedule (50% deposit, 25% Week 2, 25% final) → Legal terms reviewed",
        priority: "high",
        is_quick_win: false,
        estimated_minutes: 90,
        order_index: 8
      },
      {
        title: "Set up Calendly for 30-min discovery calls",
        description: "Create booking page → Buffer time → Confirmation email → Reminder sequence → Prep questions sent before call",
        priority: "high",
        is_quick_win: true,
        estimated_minutes: 20,
        order_index: 9
      },

      // === PHASE 3: APPLICATIONS OPEN (Week 3-4) === //
      {
        title: "Email waitlist: 'Applications now open (2 Founding Member spots)'",
        description: "Send to all waitlist signups → Explain beta pricing ($4,997 setup + $497/mo locked) → Link to Typeform → Scarcity: Only 2 spots",
        priority: "high",
        is_quick_win: true,
        estimated_minutes: 30,
        order_index: 10
      },
      {
        title: "Review applications as they come in",
        description: "Check daily → Qualify based on: Revenue $100k+, Spending $1,500+/mo on content, Ready to invest → Send Calendly to qualified leads",
        priority: "high",
        is_quick_win: false,
        estimated_minutes: 15,
        order_index: 11
      },
      {
        title: "Conduct discovery calls with qualified applicants",
        description: "Follow script → Understand their pain → Present solution → Show workflow examples → Answer objections → Close if good fit",
        priority: "high",
        is_quick_win: false,
        estimated_minutes: 180,
        order_index: 12
      },
      {
        title: "Close first Founding Member ($4,997 beta)",
        description: "Send proposal → Answer final questions → Get 50% deposit ($2,498.50) → Send contract → Schedule kickoff call → Collect onboarding info",
        priority: "high",
        is_quick_win: false,
        estimated_minutes: 60,
        order_index: 13
      },
      {
        title: "Close second Founding Member ($4,997 beta)",
        description: "Send proposal → Answer final questions → Get 50% deposit ($2,498.50) → Send contract → Schedule kickoff call → Collect onboarding info",
        priority: "high",
        is_quick_win: false,
        estimated_minutes: 60,
        order_index: 14
      },

      // === PHASE 4: DELIVERY FOR CLIENT #1 (Week 1-2) === //
      {
        title: "Client #1: Kickoff call (90 min) - Foundation",
        description: "Deep dive: Business, offers, goals, voice → Review content examples → Define content pillars → Set success metrics → Assign homework (10-20 selfies, 20+ content pieces, Brand Profile form, social access)",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 90,
        order_index: 15
      },
      {
        title: "Client #1: Train custom AI Content Twin",
        description: "Use SSELFIE process to train custom Lora model on their selfies → Takes ~10min on Replicate → Test outputs → Refine until authentic",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 30,
        order_index: 16
      },
      {
        title: "Client #1: Create Brand Voice Blueprint (15-20 pages)",
        description: "Analyze their 20+ best content pieces → Extract voice patterns, frameworks, phrases → Document content pillars → Write positioning statements → Create comprehensive guide",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 180,
        order_index: 17
      },
      {
        title: "Client #1: Build custom GPT + Claude Project with their voice",
        description: "Upload Brand Voice Blueprint → Train custom GPT on frameworks → Configure Claude Project with brand guidelines → Test outputs against real content → Refine prompts",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 90,
        order_index: 18
      },
      {
        title: "Client #1: Week 2 check-in call (60 min)",
        description: "Review Brand Voice Blueprint → Show AI-generated samples → Get feedback → Make refinements → Collect 25% payment ($1,249.25)",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 60,
        order_index: 19
      },

      // === PHASE 5: DELIVERY FOR CLIENT #1 (Week 3-4) === //
      {
        title: "Client #1: Build 6-8 Gumloop automation workflows",
        description: "1) Daily Content Generator 2) Social Media Auto-Poster 3) Lead Nurture Automation 4) Content Repurposing 5) Onboarding Sequence 6) Performance Reporter 7-8) Custom workflows based on needs",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 360,
        order_index: 20
      },
      {
        title: "Client #1: Set up Zapier/Make distribution integrations",
        description: "Connect Instagram, LinkedIn, Twitter, email → Build cross-posting workflows → Configure optimal timing per platform → Set up hashtag automation → Test end-to-end",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 120,
        order_index: 21
      },
      {
        title: "Client #1: Connect social accounts and scheduling tools",
        description: "Get access to Buffer/Later/Hootsuite → Connect all social accounts → Test posting permissions → Set up monitoring dashboards → Configure alerts for failures",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 60,
        order_index: 22
      },
      {
        title: "Client #1: Test all workflows end-to-end",
        description: "Run test content through each workflow → Fix broken connections → Optimize for speed and reliability → Document any edge cases → Set up error monitoring",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 90,
        order_index: 23
      },

      // === PHASE 6: DELIVERY FOR CLIENT #1 (Week 5-6) === //
      {
        title: "Client #1: Generate 90 days of content (150+ pieces)",
        description: "Use AI + workflows to create content calendar → Instagram posts, LinkedIn posts, Twitter threads, emails → Schedule everything → Create master calendar spreadsheet",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 240,
        order_index: 24
      },
      {
        title: "Client #1: Build custom system playbook (20-30 pages)",
        description: "Document: How system works, How to add content ideas, How to monitor performance, Troubleshooting guide, Workflow diagrams, API details, Emergency contacts",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 180,
        order_index: 25
      },
      {
        title: "Client #1: Week 5 check-in call (60 min)",
        description: "Walk through content calendar → Show system dashboard → Get approval on scheduled content → Make final adjustments → Answer questions",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 60,
        order_index: 26
      },
      {
        title: "Client #1: Training Session 1 (60 min)",
        description: "How the system works → How to monitor performance → How to add new content ideas → How to troubleshoot issues → Q&A",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 60,
        order_index: 27
      },
      {
        title: "Client #1: Training Session 2 (60 min)",
        description: "Advanced features → Customizing workflows → Understanding the playbook → Best practices → Emergency procedures → Q&A",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 60,
        order_index: 28
      },
      {
        title: "Client #1: Launch system live and monitor",
        description: "Turn on all automation → Monitor for first 48 hours continuously → Fix any issues immediately → Collect final 25% payment ($1,249.25) → Move to monthly management",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 120,
        order_index: 29
      },

      // === PHASE 7: DELIVERY FOR CLIENT #2 (Parallel to Client #1 Week 5-6) === //
      {
        title: "Client #2: Complete full 6-week delivery (all phases)",
        description: "Repeat entire process: Kickoff → Voice capture → AI training → Automation build → Content generation → Training → Launch. Document improvements and efficiency gains.",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 1200,
        order_index: 30
      },

      // === PHASE 8: TESTIMONIALS & CASE STUDIES (Month 2-3) === //
      {
        title: "Collect detailed testimonials from both Founding Members",
        description: "Request written testimonials → Record video testimonials (2-3 min each) → Document results: Time saved per week, content pieces created, engagement metrics, revenue impact",
        priority: "medium",
        is_quick_win: true,
        estimated_minutes: 60,
        order_index: 31
      },
      {
        title: "Create case study for Founding Member #1",
        description: "Write: Before state → Delivery process → System built → Results achieved → Client quote → Use for all future marketing → Publish on website",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 90,
        order_index: 32
      },
      {
        title: "Create case study for Founding Member #2",
        description: "Write: Before state → Delivery process → System built → Results achieved → Client quote → Compare to Client #1 → Show repeatability → Publish on website",
        priority: "medium",
        is_quick_win: false,
        estimated_minutes: 90,
        order_index: 33
      },
      {
        title: "Edit and publish video testimonials",
        description: "Edit both testimonials → Add captions → Add SSELFIE branding → Publish to Instagram, LinkedIn, YouTube → Use in sales process",
        priority: "low",
        is_quick_win: false,
        estimated_minutes: 120,
        order_index: 34
      },

      // === PHASE 9: SCALE TO STANDARD PRICING (Month 3+) === //
      {
        title: "Update all marketing to standard pricing ($7,500 + $697/mo)",
        description: "Update waitlist page → Update proposal template → Update all social bios → Announce price increase → Emphasize value with case studies",
        priority: "low",
        is_quick_win: true,
        estimated_minutes: 45,
        order_index: 35
      },
      {
        title: "Launch case study marketing campaign",
        description: "Email sequence featuring Client #1 and #2 results → Instagram carousel posts → LinkedIn articles → Twitter threads → Drive to application form",
        priority: "low",
        is_quick_win: false,
        estimated_minutes: 90,
        order_index: 36
      },
      {
        title: "Open 3 spots per month at standard pricing",
        description: "Update messaging: '3 spots per month for white-glove service' → Continue application process → Close 3 clients in Month 3 at $7,500 each",
        priority: "low",
        is_quick_win: false,
        estimated_minutes: 30,
        order_index: 37
      },
      {
        title: "Build waitlist system for overflow demand",
        description: "When 3 monthly spots filled, direct to waitlist → Automated nurture emails → Priority access for next month → Keep them warm",
        priority: "low",
        is_quick_win: false,
        estimated_minutes: 60,
        order_index: 38
      },
      {
        title: "Create premium upsell pages",
        description: "VIP Implementation Day ($2,997) → Distribution Automation add-on ($1,497) → Maintenance package ($297/mo) → Add to sales process after main offer",
        priority: "low",
        is_quick_win: false,
        estimated_minutes: 120,
        order_index: 39
      },
      {
        title: "Evaluate premium pricing tier ($9,997-$12,000)",
        description: "After 5-6 successful clients with strong case studies → Consider premium positioning → Test messaging → Position as THE premium solution",
        priority: "low",
        is_quick_win: false,
        estimated_minutes: 30,
        order_index: 40
      },

      // === ONGOING: MONTHLY MANAGEMENT === //
      {
        title: "Monthly management for all active clients",
        description: "Week 1: Performance review → Week 2: 60-min strategy call → Week 3: Content calendar refresh → Week 4: Workflow optimization → Ongoing: Technical support via Slack",
        priority: "low",
        is_quick_win: false,
        estimated_minutes: 240,
        order_index: 41
      }
    ]

    console.log(`Creating ${tasks.length} FINAL tasks for AI Brand OS™...`)

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
      message: `✅ AI Brand OS™ tasks REFRESHED with locked-in infrastructure strategy: ${insertedCount} tasks created`,
      details: {
        projectId,
        tasksCreated: insertedCount,
        phases: [
          "Phase 1: Waitlist Launch (5 tasks) - THIS WEEK",
          "Phase 2: Application Setup (4 tasks)",
          "Phase 3: Applications Open (5 tasks)",
          "Phase 4-6: Client #1 Delivery (15 tasks)",
          "Phase 7: Client #2 Delivery (1 task)",
          "Phase 8: Testimonials & Case Studies (4 tasks)",
          "Phase 9: Scale to Standard Pricing (6 tasks)",
          "Ongoing: Monthly Management (1 task)"
        ]
      }
    })

  } catch (error) {
    console.error("[Refresh High-Ticket Tasks] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}
