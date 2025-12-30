/**
 * Advanced Email Segmentation System
 * 
 * Automatically creates and maintains segments based on engagement, purchase history, and behavior
 */

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface SegmentCriteria {
  // Engagement criteria
  last_opened_days?: number
  min_opens?: number
  max_opens?: number
  min_clicks?: number
  max_clicks?: number

  // Purchase history
  has_purchased?: boolean
  purchase_count?: number | { $gte?: number; $lte?: number }

  // Behavior
  completed_blueprint?: boolean
  converted?: boolean
  last_activity_days?: number
}

/**
 * Refresh a segment based on its criteria
 */
export async function refreshSegment(segmentId: number) {
  const segment = await sql`SELECT * FROM email_segments WHERE id = ${segmentId}`
  if (!segment || segment.length === 0) {
    throw new Error("Segment not found")
  }

  const seg = segment[0]
  const criteria: SegmentCriteria = seg.criteria

  let members: string[] = []

  // Engagement-based segmentation
  if (criteria.last_opened_days !== undefined || criteria.min_opens !== undefined || criteria.max_opens !== undefined) {
    const daysAgo = criteria.last_opened_days
      ? new Date(Date.now() - criteria.last_opened_days * 24 * 60 * 60 * 1000)
      : new Date(0)

    let engagementQuery = sql`
      SELECT user_email, COUNT(*) as open_count
      FROM email_logs
      WHERE opened = TRUE
      AND opened_at >= ${daysAgo.toISOString()}
      GROUP BY user_email
    `

    const havingConditions: any[] = []
    if (criteria.min_opens !== undefined) {
      havingConditions.push(sql`COUNT(*) >= ${criteria.min_opens}`)
    }
    if (criteria.max_opens !== undefined) {
      havingConditions.push(sql`COUNT(*) <= ${criteria.max_opens}`)
    }

    if (havingConditions.length > 0) {
      engagementQuery = sql`${engagementQuery} HAVING ${sql.join(havingConditions, sql` AND `)}`
    }

    const engagementMembers = await engagementQuery
    members = engagementMembers.map((m: any) => m.user_email)
  }

  // Purchase history-based segmentation
  if (criteria.has_purchased !== undefined || criteria.purchase_count !== undefined) {
    let purchaseEmails: string[] = []

    if (criteria.has_purchased === false) {
      // Users with no active subscriptions and no purchases
      const nonPurchasers = await sql`
        SELECT DISTINCT u.email as user_email
        FROM users u
        WHERE NOT EXISTS (
          SELECT 1 FROM subscriptions WHERE user_id = u.id AND status = 'active'
        )
        AND NOT EXISTS (
          SELECT 1 FROM credit_transactions WHERE user_id = u.id AND transaction_type = 'purchase'
        )
      `
      purchaseEmails = nonPurchasers.map((m: any) => m.user_email)
    } else if (criteria.has_purchased === true) {
      // Users with active subscriptions or purchases
      const purchasers = await sql`
        SELECT DISTINCT u.email as user_email
        FROM users u
        WHERE EXISTS (
          SELECT 1 FROM subscriptions WHERE user_id = u.id AND status = 'active'
        )
        OR EXISTS (
          SELECT 1 FROM credit_transactions WHERE user_id = u.id AND transaction_type = 'purchase'
        )
      `
      purchaseEmails = purchasers.map((m: any) => m.user_email)
    }

    // Filter by purchase count if specified
    if (criteria.purchase_count !== undefined && purchaseEmails.length > 0) {
      if (typeof criteria.purchase_count === "number") {
        const exactCount = await sql`
          SELECT u.email as user_email
          FROM users u
          WHERE u.email = ANY(${purchaseEmails})
          AND (
            SELECT COUNT(*) FROM credit_transactions
            WHERE user_id = u.id AND transaction_type = 'purchase'
          ) = ${criteria.purchase_count}
        `
        purchaseEmails = exactCount.map((m: any) => m.user_email)
      } else if (criteria.purchase_count.$gte !== undefined) {
        const minCount = await sql`
          SELECT u.email as user_email
          FROM users u
          WHERE u.email = ANY(${purchaseEmails})
          AND (
            SELECT COUNT(*) FROM credit_transactions
            WHERE user_id = u.id AND transaction_type = 'purchase'
          ) >= ${criteria.purchase_count.$gte}
        `
        purchaseEmails = minCount.map((m: any) => m.user_email)
      }
    }

    // If we have both engagement and purchase criteria, intersect
    if (members.length > 0) {
      members = members.filter((email) => purchaseEmails.includes(email))
    } else if (purchaseEmails.length > 0) {
      members = purchaseEmails
    }
  }

  // Behavior-based segmentation
  if (criteria.completed_blueprint !== undefined) {
    const blueprintMembers = await sql`
      SELECT email as user_email
      FROM blueprint_subscribers
      WHERE blueprint_completed = ${criteria.completed_blueprint}
    `
    const blueprintEmails = blueprintMembers.map((m: any) => m.user_email)

    if (members.length > 0) {
      members = members.filter((email) => blueprintEmails.includes(email))
    } else {
      members = blueprintEmails
    }
  }

  if (criteria.converted !== undefined) {
    const convertedMembers = await sql`
      SELECT email as user_email
      FROM blueprint_subscribers
      WHERE converted_to_user = ${criteria.converted}
    `
    const convertedEmails = convertedMembers.map((m: any) => m.user_email)

    if (members.length > 0) {
      members = members.filter((email) => convertedEmails.includes(email))
    } else {
      members = convertedEmails
    }
  }

  // If no criteria specified, get all emails from email_logs
  if (members.length === 0 && Object.keys(criteria).length === 0) {
    const allMembers = await sql`SELECT DISTINCT user_email FROM email_logs`
    members = allMembers.map((m: any) => m.user_email)
  }

  // Ensure members is an array of email strings
  const memberEmails = Array.isArray(members) 
    ? members.filter((m): m is string => typeof m === "string")
    : []

  // Clear existing members
  await sql`DELETE FROM email_segment_members WHERE segment_id = ${segmentId}`

  // Add new members
  if (memberEmails.length > 0) {
    for (const email of memberEmails) {
      await sql`
        INSERT INTO email_segment_members (segment_id, user_email)
        VALUES (${segmentId}, ${email})
        ON CONFLICT (segment_id, user_email) DO NOTHING
      `
    }
  }

  // Update segment
  await sql`
    UPDATE email_segments
    SET 
      member_count = ${memberEmails.length},
      last_refreshed_at = NOW(),
      updated_at = NOW()
    WHERE id = ${segmentId}
  `

  return {
    segmentId,
    memberCount: memberEmails.length,
    members: memberEmails,
  }
}

/**
 * Refresh all auto-refresh segments
 */
export async function refreshAllSegments() {
  const segments = await sql`
    SELECT id FROM email_segments WHERE is_auto_refreshed = TRUE
  `

  const results = []
  for (const segment of segments) {
    try {
      const result = await refreshSegment(segment.id)
      results.push(result)
      console.log(`[Segmentation] Refreshed segment ${segment.id}: ${result.memberCount} members`)
    } catch (error) {
      console.error(`[Segmentation] Failed to refresh segment ${segment.id}:`, error)
      results.push({ segmentId: segment.id, error: String(error) })
    }
  }

  return results
}

/**
 * Get segment members
 */
export async function getSegmentMembers(segmentId: number): Promise<string[]> {
  const members = await sql`
    SELECT user_email FROM email_segment_members WHERE segment_id = ${segmentId}
  `

  return members.map((m: any) => m.user_email)
}

/**
 * Create a custom segment
 */
export async function createSegment(
  segmentName: string,
  segmentType: string,
  criteria: SegmentCriteria,
  description?: string,
  autoRefresh: boolean = true,
) {
  const segment = await sql`
    INSERT INTO email_segments (
      segment_name,
      segment_type,
      criteria,
      description,
      is_auto_refreshed
    )
    VALUES (
      ${segmentName},
      ${segmentType},
      ${JSON.stringify(criteria)}::jsonb,
      ${description || null},
      ${autoRefresh}
    )
    RETURNING *
  `

  // Immediately refresh the segment
  if (autoRefresh) {
    await refreshSegment(segment[0].id)
  }

  return segment[0]
}
