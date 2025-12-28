import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

export async function POST(req: Request) {
  try {
    // Admin auth check
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const today = new Date().toISOString().split('T')[0]
    
    // Check if we already ran checks today
    const existing = await sql`
      SELECT COUNT(*)::int as count 
      FROM mission_control_tasks 
      WHERE check_date = ${today}
    `
    
    if (existing[0]?.count > 0) {
      // Return existing checks
      const tasks = await sql`
        SELECT * FROM mission_control_tasks 
        WHERE check_date = ${today}
        ORDER BY 
          CASE priority 
            WHEN 'high' THEN 1 
            WHEN 'medium' THEN 2 
            WHEN 'low' THEN 3 
          END,
          created_at
      `
      
      return NextResponse.json({
        success: true,
        alreadyRan: true,
        timestamp: new Date().toISOString(),
        tasks: tasks || []
      })
    }
    
    // Run fresh checks
    console.log('[Mission Control] Running daily checks...')
    
    const allTasks = []
    
    // 1. Revenue Health Check
    const revenueTasks = await checkRevenueHealth(today)
    allTasks.push(...revenueTasks)
    
    // 2. Customer Success Check
    const customerTasks = await checkCustomerSuccess(today)
    allTasks.push(...customerTasks)
    
    // 3. Email Strategy Check
    const emailTasks = await checkEmailStrategy(today)
    allTasks.push(...emailTasks)
    
    // 4. User Journey Check
    const userTasks = await checkUserJourney(today)
    allTasks.push(...userTasks)
    
    // Save all tasks to database
    for (const task of allTasks) {
      await sql`
        INSERT INTO mission_control_tasks 
        (check_date, agent_name, priority, title, description, cursor_prompt, action_type)
        VALUES (
          ${today},
          ${task.agent},
          ${task.priority},
          ${task.title},
          ${task.description},
          ${task.cursorPrompt || null},
          ${task.actionType}
        )
      `
    }
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      tasksCreated: allTasks.length,
      tasks: allTasks
    })
    
  } catch (error: any) {
    console.error('[Mission Control] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function checkRevenueHealth(today: string) {
  const tasks = []
  
  try {
    // Check for cancellations (last 24h)
    const cancellations = await sql`
      SELECT COUNT(*)::int as count
      FROM subscriptions
      WHERE status = 'canceled'
        AND updated_at > NOW() - INTERVAL '24 hours'
        AND (is_test_mode = FALSE OR is_test_mode IS NULL)
    `
    
    const cancelCount = cancellations[0]?.count || 0
    
    if (cancelCount > 0) {
      tasks.push({
        agent: 'Revenue Monitor',
        priority: 'medium',
        title: `${cancelCount} subscription cancellation(s) in last 24h`,
        description: 'Review cancellation reasons and consider re-engagement',
        actionType: 'alex'
      })
    }
    
    // Note: stripe_events table may not exist, so we skip failed payments check
    // This can be added later when stripe_events table is created
  } catch (error: any) {
    console.error('[Mission Control] Error in revenue health check:', error.message)
  }
  
  return tasks
}

async function checkCustomerSuccess(today: string) {
  const tasks = []
  
  try {
    // Check for new testimonials
    const newTestimonials = await sql`
      SELECT COUNT(*)::int as count
      FROM admin_testimonials
      WHERE created_at > NOW() - INTERVAL '7 days'
        AND (is_featured = FALSE OR is_featured IS NULL)
    `
    
    const testimonialCount = newTestimonials[0]?.count || 0
    
    if (testimonialCount > 0) {
      tasks.push({
        agent: 'Customer Success',
        priority: 'high',
        title: `${testimonialCount} new testimonial(s) to feature`,
        description: 'Add new testimonials to landing page for social proof',
        cursorPrompt: 'Query new testimonials and add to homepage testimonial carousel component',
        actionType: 'cursor'
      })
    }
    
    // Check for inactive paying customers
    const inactiveUsers = await sql`
      SELECT COUNT(*)::int as count
      FROM users
      WHERE (last_login_at < NOW() - INTERVAL '7 days' OR last_login_at IS NULL)
        AND plan != 'free'
        AND email IS NOT NULL
    `
    
    const inactiveCount = inactiveUsers[0]?.count || 0
    
    if (inactiveCount > 3) {
      tasks.push({
        agent: 'Customer Success',
        priority: 'medium',
        title: `${inactiveCount} paying users inactive 7+ days`,
        description: 'Send re-engagement email to inactive customers',
        actionType: 'alex'
      })
    }
  } catch (error: any) {
    console.error('[Mission Control] Error in customer success check:', error.message)
  }
  
  return tasks
}

async function checkEmailStrategy(today: string) {
  const tasks = []
  
  try {
    // Check one-time buyers not on subscription
    const oneTimeBuyers = await sql`
      SELECT COUNT(DISTINCT user_id)::int as count
      FROM credit_transactions
      WHERE product_type = 'one_time_session'
        AND user_id NOT IN (
          SELECT user_id FROM subscriptions WHERE status = 'active'
        )
    `
    
    const buyerCount = oneTimeBuyers[0]?.count || 0
    
    if (buyerCount > 10) {
      tasks.push({
        agent: 'Email Strategy',
        priority: 'high',
        title: `${buyerCount} one-time buyers not on subscription`,
        description: 'Create email sequence to convert one-time buyers to monthly subscribers',
        actionType: 'alex'
      })
    }
  } catch (error: any) {
    console.error('[Mission Control] Error in email strategy check:', error.message)
  }
  
  return tasks
}

async function checkUserJourney(today: string) {
  const tasks = []
  
  try {
    // Check conversion rate
    const conversionData = await sql`
      SELECT 
        COUNT(*)::int as total_users,
        COUNT(CASE WHEN plan != 'free' THEN 1 END)::int as paid_users
      FROM users
      WHERE created_at > NOW() - INTERVAL '30 days'
    `
    
    const totalUsers = conversionData[0]?.total_users || 0
    const paidUsers = conversionData[0]?.paid_users || 0
    const conversionRate = totalUsers > 0 ? (paidUsers / totalUsers * 100) : 0
    
    if (conversionRate < 20 && totalUsers > 10) {
      tasks.push({
        agent: 'User Journey',
        priority: 'medium',
        title: `Conversion rate at ${conversionRate.toFixed(1)}%`,
        description: 'Free to paid conversion below target (20%)',
        cursorPrompt: 'Improve onboarding flow with conversion prompts and clearer value proposition',
        actionType: 'cursor'
      })
    }
  } catch (error: any) {
    console.error('[Mission Control] Error in user journey check:', error.message)
  }
  
  return tasks
}

