#!/usr/bin/env node

/**
 * Populate High-Ticket Offer tasks
 * Adds all 16 tasks to the High-Ticket Offer project
 *
 * Usage: node scripts/populate-high-ticket-tasks.js
 */

require('dotenv').config({ path: '.env.local' })
const { neon } = require('@neondatabase/serverless')

async function populateTasks() {
  console.log('🚀 Populating High-Ticket Offer tasks...\n')

  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL not found')
    process.exit(1)
  }

  const sql = neon(process.env.DATABASE_URL)

  try {
    // Get project ID
    const projects = await sql`
      SELECT id FROM projects
      WHERE title = 'High-Ticket Offer Launch'
      LIMIT 1
    `

    if (projects.length === 0) {
      console.error('❌ High-Ticket Offer project not found')
      console.error('   Run: node scripts/setup-project-tracker.js first')
      process.exit(1)
    }

    const projectId = projects[0].id
    console.log(`✅ Found project ID: ${projectId}`)

    // Check if tasks already exist
    const existingTasks = await sql`
      SELECT COUNT(*) as count
      FROM project_tasks
      WHERE project_id = ${projectId}
    `

    if (parseInt(existingTasks[0].count) > 0) {
      console.log(`\n⚠️  Project already has ${existingTasks[0].count} tasks`)
      console.log('   Skipping to avoid duplicates\n')
      process.exit(0)
    }

    const today = new Date().toISOString().split('T')[0]

    // Define all tasks
    const tasks = [
      // PHASE 1: STRATEGY (3 urgent tasks for today)
      { title: "Define offer details and transformation", description: "Decide: VIP 1:1 coaching vs done-for-you service vs group program. Define the transformation you're selling and ideal client profile.", priority: "urgent", is_quick_win: false, estimated_minutes: 30, scheduled_for: today, order_index: 1 },
      { title: "Research competitor pricing and set price point", description: "Analyze 3-5 competitor offers in your niche. Decide price range: $2k-$5k, $5k-$10k, or $10k+", priority: "urgent", is_quick_win: false, estimated_minutes: 30, scheduled_for: today, order_index: 2 },
      { title: "Choose delivery model", description: "Decide: Weekly calls, intensive workshop, ongoing access + calls, or done-for-you service", priority: "urgent", is_quick_win: true, estimated_minutes: 15, scheduled_for: today, order_index: 3 },

      // PHASE 2: LANDING PAGE (4 high priority tasks)
      { title: "Design hero section for landing page", description: "Create compelling headline, subheadline, and hero image. Match homepage design system.", priority: "high", is_quick_win: false, estimated_minutes: 60, order_index: 4 },
      { title: "Write landing page copy (problem/solution)", description: "Write sections: Problem your client faces → Solution you provide → Transformation they get", priority: "high", is_quick_win: false, estimated_minutes: 60, order_index: 5 },
      { title: "Add testimonials and social proof", description: "Gather and format 3-5 client testimonials, case studies, or results. Add trust badges.", priority: "high", is_quick_win: false, estimated_minutes: 30, order_index: 6 },
      { title: "Create CTA section with Apply Now button", description: "Design compelling call-to-action section that leads to application form", priority: "high", is_quick_win: false, estimated_minutes: 30, order_index: 7 },

      // PHASE 3: APPLICATION SYSTEM (3 high priority tasks)
      { title: "Build multi-step application form", description: "Create form with steps: Contact info → Current situation → Goals → Budget confirmation → Why good fit", priority: "high", is_quick_win: false, estimated_minutes: 60, order_index: 8 },
      { title: "Add qualification logic to application", description: "Set up automatic filtering based on budget, timeline, and fit criteria", priority: "high", is_quick_win: false, estimated_minutes: 30, order_index: 9 },
      { title: "Set up application email notifications", description: "Configure emails: Application received (to you) + Confirmation (to applicant)", priority: "high", is_quick_win: false, estimated_minutes: 30, order_index: 10 },

      // PHASE 4: BOOKING & CHECKOUT (3 medium priority tasks)
      { title: "Integrate Calendly or Cal.com booking", description: "Embed booking calendar. Configure availability and meeting types.", priority: "medium", is_quick_win: false, estimated_minutes: 30, order_index: 11 },
      { title: "Build checkout flow with Stripe", description: "Create checkout page with payment processing. Set up payment confirmation emails.", priority: "medium", is_quick_win: false, estimated_minutes: 60, order_index: 12 },
      { title: "Configure payment plans (if offering)", description: "Set up full payment vs deposit options. Configure installment plans if needed.", priority: "medium", is_quick_win: false, estimated_minutes: 30, order_index: 13 },

      // PHASE 5: LAUNCH (3 medium/low priority tasks)
      { title: "Add high-ticket offer to /bio page", description: "Create beautiful card/section on bio page linking to offer landing page", priority: "medium", is_quick_win: false, estimated_minutes: 30, order_index: 14 },
      { title: "Test complete user flow end-to-end", description: "Test: Landing page → Application → Approval → Booking → Checkout → Confirmation", priority: "medium", is_quick_win: false, estimated_minutes: 30, order_index: 15 },
      { title: "Launch and announce offer!", description: "Go live! Announce to email list, social media, and existing clients.", priority: "low", is_quick_win: true, estimated_minutes: 15, order_index: 16 }
    ]

    console.log(`\n📋 Creating ${tasks.length} tasks...\n`)

    for (const task of tasks) {
      await sql`
        INSERT INTO project_tasks (
          project_id, title, description, priority, is_quick_win,
          estimated_minutes, scheduled_for, order_index
        )
        VALUES (
          ${projectId}, ${task.title}, ${task.description}, ${task.priority},
          ${task.is_quick_win}, ${task.estimated_minutes},
          ${task.scheduled_for || null}, ${task.order_index}
        )
      `
      console.log(`✅ ${task.title}`)
    }

    console.log(`\n🎉 Successfully created ${tasks.length} tasks!`)
    console.log('\n📍 Next step:')
    console.log('   Visit: https://sselfie.ai/admin/project-tracker')
    console.log('   Your top 3 tasks for today are ready! 💪\n')

  } catch (error) {
    console.error('\n❌ Failed:', error.message)
    console.error('\nFull error:', error)
    process.exit(1)
  }
}

populateTasks()
