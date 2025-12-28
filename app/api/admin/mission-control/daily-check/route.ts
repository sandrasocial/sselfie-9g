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
      
      // Transform tasks into checks structure for dashboard
      const tasksByAgent = (tasks || []).reduce((acc: Record<string, any[]>, task: any) => {
        if (!acc[task.agent_name]) {
          acc[task.agent_name] = []
        }
        acc[task.agent_name].push({
          id: task.id,
          priority: task.priority,
          title: task.title,
          description: task.description,
          cursor_prompt: task.cursor_prompt,
          action_type: task.action_type,
          completed: task.completed,
          completed_at: task.completed_at,
          created_at: task.created_at
        })
        return acc
      }, {})
      
      // Build checks array with metrics
      const checks = Object.entries(tasksByAgent).map(([agent, agentTasks]) => {
        const incompleteTasks = agentTasks.filter((t: any) => !t.completed)
        const highPriorityCount = incompleteTasks.filter((t: any) => t.priority === 'high').length
        
        let status: 'healthy' | 'warning' | 'critical' = 'healthy'
        if (highPriorityCount > 0) {
          status = 'critical'
        } else if (incompleteTasks.length > 0) {
          status = 'warning'
        }
        
        return {
          agent,
          status,
          issues: agentTasks.map((t: any) => ({
            id: t.id,
            priority: t.priority,
            title: t.title,
            description: t.description,
            cursorPrompt: t.cursor_prompt,
            actionType: t.action_type,
            completed: t.completed,
            completed_at: t.completed_at
          })),
          metrics: {} // Metrics not stored, would need to recalculate
        }
      })
      
      return NextResponse.json({
        success: true,
        alreadyRan: true,
        timestamp: new Date().toISOString(),
        tasks: tasks || [],
        checks: checks
      })
    }
    
    // Run fresh checks
    console.log('[Mission Control] Running daily checks...')
    
    const allTasks = []
    const checks = []
    
    // 1. Code Health Check
    const codeHealth = await checkCodeHealth(today)
    checks.push(codeHealth)
    allTasks.push(...codeHealth.issues.map((issue: any) => ({
      agent: codeHealth.agent,
      priority: issue.priority,
      title: issue.title,
      description: issue.description,
      cursorPrompt: issue.cursorPrompt,
      actionType: issue.actionType
    })))
    
    // 2. Revenue Health Check
    const revenueHealth = await checkRevenueHealth(today)
    checks.push(revenueHealth)
    allTasks.push(...revenueHealth.issues.map((issue: any) => ({
      agent: revenueHealth.agent,
      priority: issue.priority,
      title: issue.title,
      description: issue.description,
      cursorPrompt: issue.cursorPrompt,
      actionType: issue.actionType
    })))
    
    // 3. Customer Success Check
    const customerSuccess = await checkCustomerSuccess(today)
    checks.push(customerSuccess)
    allTasks.push(...customerSuccess.issues.map((issue: any) => ({
      agent: customerSuccess.agent,
      priority: issue.priority,
      title: issue.title,
      description: issue.description,
      cursorPrompt: issue.cursorPrompt,
      actionType: issue.actionType
    })))
    
    // 4. Email Strategy Check
    const emailStrategy = await checkEmailStrategy(today)
    checks.push(emailStrategy)
    allTasks.push(...emailStrategy.issues.map((issue: any) => ({
      agent: emailStrategy.agent,
      priority: issue.priority,
      title: issue.title,
      description: issue.description,
      cursorPrompt: issue.cursorPrompt,
      actionType: issue.actionType
    })))
    
    // 5. Landing Page Health Check
    const landingPage = await checkLandingPage(today)
    checks.push(landingPage)
    allTasks.push(...landingPage.issues.map((issue: any) => ({
      agent: landingPage.agent,
      priority: issue.priority,
      title: issue.title,
      description: issue.description,
      cursorPrompt: issue.cursorPrompt,
      actionType: issue.actionType
    })))
    
    // 6. User Journey Check
    const userJourney = await checkUserJourney(today)
    checks.push(userJourney)
    allTasks.push(...userJourney.issues.map((issue: any) => ({
      agent: userJourney.agent,
      priority: issue.priority,
      title: issue.title,
      description: issue.description,
      cursorPrompt: issue.cursorPrompt,
      actionType: issue.actionType
    })))
    
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
      tasks: allTasks,
      checks: checks
    })
    
  } catch (error: any) {
    console.error('[Mission Control] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function checkCodeHealth(today: string) {
  const issues = []
  const metrics: Record<string, any> = {}
  
  try {
    // Check database connection
    try {
      await sql`SELECT 1`
      metrics['Database'] = '✅ Connected'
    } catch (error) {
      issues.push({
        priority: 'high' as const,
        title: 'Database connection failed',
        description: 'Unable to connect to Neon PostgreSQL',
        cursorPrompt: 'Debug database connection, check DATABASE_URL environment variable',
        actionType: 'cursor' as const,
        completed: false
      })
      metrics['Database'] = '❌ Failed'
    }
    
    // Check environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'ANTHROPIC_API_KEY',
      'STRIPE_SECRET_KEY',
      'RESEND_API_KEY'
    ]
    
    const missing = requiredEnvVars.filter(v => !process.env[v])
    if (missing.length > 0) {
      issues.push({
        priority: 'high' as const,
        title: `Missing environment variables: ${missing.join(', ')}`,
        description: 'Required environment variables are not set',
        cursorPrompt: `Add missing environment variables: ${missing.join(', ')}`,
        actionType: 'manual' as const,
        completed: false
      })
    }
    
    metrics['Env Vars'] = `${requiredEnvVars.length - missing.length}/${requiredEnvVars.length}`
    
    return {
      agent: 'Code Health',
      status: issues.length === 0 ? 'healthy' as const : 'warning' as const,
      issues,
      metrics
    }
  } catch (error: any) {
    console.error('[Mission Control] Error in code health check:', error.message)
    return {
      agent: 'Code Health',
      status: 'warning' as const,
      issues: [{
        priority: 'high' as const,
        title: 'Code health check failed',
        description: error.message,
        actionType: 'manual' as const,
        completed: false
      }],
      metrics: {}
    }
  }
}

async function checkRevenueHealth(today: string) {
  const issues = []
  const metrics: Record<string, any> = {}
  
  try {
    // Get current MRR and active subscriptions
    const mrrData = await sql`
      SELECT 
        COUNT(CASE WHEN status = 'active' THEN 1 END)::int as active_subs
      FROM subscriptions
      WHERE (is_test_mode = FALSE OR is_test_mode IS NULL)
    `
    
    const activeSubs = mrrData[0]?.active_subs || 0
    const mrr = activeSubs * 29 // Assuming $29/month subscription
    
    metrics['MRR'] = `$${mrr}`
    metrics['Active Subs'] = activeSubs
    
    // Check for recent cancellations (last 24h)
    const cancellations = await sql`
      SELECT COUNT(*)::int as count
      FROM subscriptions
      WHERE status = 'canceled'
        AND updated_at > NOW() - INTERVAL '24 hours'
        AND (is_test_mode = FALSE OR is_test_mode IS NULL)
    `
    
    const cancelCount = cancellations[0]?.count || 0
    metrics['Cancellations (24h)'] = cancelCount
    
    if (cancelCount > 0) {
      issues.push({
        priority: 'medium' as const,
        title: `${cancelCount} subscription(s) canceled in last 24h`,
        description: 'Recent cancellations detected - review cancellation reasons',
        actionType: 'alex' as const,
        completed: false
      })
    }
    
    // Note: stripe_events table may not exist, so we skip failed payments check
    // This can be added later when stripe_events table is created
    
    return {
      agent: 'Revenue Monitor',
      status: issues.length === 0 ? 'healthy' as const : 'warning' as const,
      issues,
      metrics
    }
  } catch (error: any) {
    console.error('[Mission Control] Error in revenue health check:', error.message)
    return {
      agent: 'Revenue Monitor',
      status: 'warning' as const,
      issues: [],
      metrics: {}
    }
  }
}

async function checkCustomerSuccess(today: string) {
  const issues = []
  const metrics: Record<string, any> = {}
  
  try {
    // Check for new testimonials
    const newTestimonials = await sql`
      SELECT COUNT(*)::int as count
      FROM admin_testimonials
      WHERE created_at > NOW() - INTERVAL '7 days'
        AND (is_featured = FALSE OR is_featured IS NULL)
    `
    
    const testimonialCount = newTestimonials[0]?.count || 0
    metrics['New Testimonials'] = testimonialCount
    
    if (testimonialCount > 0) {
      issues.push({
        priority: 'high' as const,
        title: `${testimonialCount} new testimonial(s) to feature`,
        description: 'Add new testimonials to landing page for social proof',
        cursorPrompt: 'Query new testimonials and add to homepage testimonial carousel component',
        actionType: 'cursor' as const,
        completed: false
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
    metrics['Inactive Users'] = inactiveCount
    
    if (inactiveCount > 5) {
      issues.push({
        priority: 'medium' as const,
        title: `${inactiveCount} paying users inactive for 7+ days`,
        description: 'Send re-engagement email to inactive customers',
        actionType: 'alex' as const,
        completed: false
      })
    }
    
    return {
      agent: 'Customer Success',
      status: issues.length === 0 ? 'healthy' as const : 'warning' as const,
      issues,
      metrics
    }
  } catch (error: any) {
    console.error('[Mission Control] Error in customer success check:', error.message)
    return {
      agent: 'Customer Success',
      status: 'warning' as const,
      issues: [],
      metrics: {}
    }
  }
}

async function checkEmailStrategy(today: string) {
  const issues = []
  const metrics: Record<string, any> = {}
  
  try {
    // Check for email drafts (check admin_agent_messages with email_preview_data)
    let draftCount = 0
    try {
      const pendingEmails = await sql`
        SELECT COUNT(*)::int as count
        FROM admin_agent_messages
        WHERE email_preview_data IS NOT NULL
          AND email_preview_data->>'status' = 'draft'
          AND created_at > NOW() - INTERVAL '7 days'
      `
      draftCount = pendingEmails[0]?.count || 0
    } catch (error) {
      // Table or column might not exist, skip this check
      console.log('[Mission Control] Email drafts check skipped:', error)
    }
    
    metrics['Pending Drafts'] = draftCount
    
    if (draftCount > 0) {
      issues.push({
        priority: 'medium' as const,
        title: `${draftCount} email draft(s) pending`,
        description: 'Review and send drafted emails',
        actionType: 'manual' as const,
        completed: false
      })
    }
    
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
    metrics['Upsell Opportunity'] = buyerCount
    
    if (buyerCount > 10) {
      issues.push({
        priority: 'high' as const,
        title: `${buyerCount} one-time buyers not on subscription`,
        description: 'Create upsell email sequence to convert one-time buyers to monthly subscribers',
        actionType: 'alex' as const,
        completed: false
      })
    }
    
    return {
      agent: 'Email Strategy',
      status: issues.length === 0 ? 'healthy' as const : 'warning' as const,
      issues,
      metrics
    }
  } catch (error: any) {
    console.error('[Mission Control] Error in email strategy check:', error.message)
    return {
      agent: 'Email Strategy',
      status: 'warning' as const,
      issues: [],
      metrics: {}
    }
  }
}

async function checkLandingPage(today: string) {
  const issues = []
  const metrics: Record<string, any> = {}
  
  try {
    // Calculate signups (last 7 days)
    const conversions = await sql`
      SELECT COUNT(*)::int as signups
      FROM users
      WHERE created_at > NOW() - INTERVAL '7 days'
    `
    
    const signupCount = conversions[0]?.signups || 0
    metrics['Signups (7d)'] = signupCount
    
    // Basic check - if conversion rate very low, flag it
    if (signupCount < 5) {
      issues.push({
        priority: 'medium' as const,
        title: 'Low signup rate this week',
        description: `Only ${signupCount} signups in last 7 days - consider optimizing landing page`,
        actionType: 'alex' as const,
        completed: false
      })
    }
    
    return {
      agent: 'Landing Page',
      status: issues.length === 0 ? 'healthy' as const : 'warning' as const,
      issues,
      metrics
    }
  } catch (error: any) {
    console.error('[Mission Control] Error in landing page check:', error.message)
    return {
      agent: 'Landing Page',
      status: 'warning' as const,
      issues: [],
      metrics: {}
    }
  }
}

async function checkUserJourney(today: string) {
  const issues = []
  const metrics: Record<string, any> = {}
  
  try {
    // Check free to paid conversion
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
    
    metrics['New Users (30d)'] = totalUsers
    metrics['Paid Users (30d)'] = paidUsers
    metrics['Conversion Rate'] = `${conversionRate.toFixed(1)}%`
    
    if (conversionRate < 20 && totalUsers > 10) {
      issues.push({
        priority: 'medium' as const,
        title: `Conversion rate at ${conversionRate.toFixed(1)}%`,
        description: 'Free to paid conversion below target (20%) - improve onboarding flow',
        cursorPrompt: 'Improve onboarding flow with conversion prompts and clearer value proposition',
        actionType: 'cursor' as const,
        completed: false
      })
    }
    
    return {
      agent: 'User Journey',
      status: issues.length === 0 ? 'healthy' as const : 'warning' as const,
      issues,
      metrics
    }
  } catch (error: any) {
    console.error('[Mission Control] Error in user journey check:', error.message)
    return {
      agent: 'User Journey',
      status: 'warning' as const,
      issues: [],
      metrics: {}
    }
  }
}

