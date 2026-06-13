import "server-only"

import { sql } from "@/lib/db/client"
import {
  summarizeStudioMemberHealth,
  type StudioMemberHealthReport,
  type StudioMemberHealthRow,
} from "@/lib/admin/studio-member-health-summary"

const MEMBERSHIP_PRODUCT_TYPE = "sselfie_studio_membership"
const ACTIVE_MEMBER_STATUSES = ["active", "trialing"]
const COMPLETED_STATUS = "completed"
const QUICK_PHOTO_SOURCES = [
  "openai",
  "maya_chat",
  "maya-chat",
  "maya",
  "maya_photoshoot",
  "carousel",
  "feed_planner",
  "feed_designer",
]
const PRO_SOURCES = ["maya_pro", "studio_pro"]

export async function getStudioMemberHealthReport(): Promise<StudioMemberHealthReport> {
  const rows = (await sql`
    WITH active_members AS (
      SELECT DISTINCT
        u.id,
        u.email,
        s.created_at AS member_since
      FROM users u
      JOIN subscriptions s ON s.user_id = u.id
      WHERE s.product_type = ${MEMBERSHIP_PRODUCT_TYPE}
        AND s.status = ANY(${ACTIVE_MEMBER_STATUSES})
        AND COALESCE(s.is_test_mode, false) = false
    ),
    model_summary AS (
      SELECT
        user_id,
        BOOL_OR(training_status IS NOT NULL) FILTER (WHERE COALESCE(is_test, false) = false) AS training_started,
        BOOL_OR(training_status = ${COMPLETED_STATUS}) FILTER (WHERE COALESCE(is_test, false) = false) AS training_completed,
        MAX(completed_at) FILTER (
          WHERE training_status = ${COMPLETED_STATUS}
            AND COALESCE(is_test, false) = false
        ) AS training_completed_at
      FROM user_models
      GROUP BY user_id
    ),
    classic_summary AS (
      SELECT
        user_id,
        COUNT(*)::int AS classic_generations,
        MAX(created_at) AS last_classic_at
      FROM generated_images
      GROUP BY user_id
    ),
    ai_summary AS (
      SELECT
        user_id,
        COUNT(*) FILTER (
          WHERE generation_status = ${COMPLETED_STATUS}
            AND source = ANY(${QUICK_PHOTO_SOURCES})
        )::int AS quick_generations,
        COUNT(*) FILTER (
          WHERE generation_status = ${COMPLETED_STATUS}
            AND source = ANY(${PRO_SOURCES})
        )::int AS pro_generations,
        COUNT(*) FILTER (WHERE generation_status = ${COMPLETED_STATUS})::int AS ai_generations,
        MAX(created_at) FILTER (WHERE generation_status = ${COMPLETED_STATUS}) AS last_ai_at
      FROM ai_images
      GROUP BY user_id
    )
    SELECT
      am.id,
      am.email,
      am.member_since,
      COALESCE(ms.training_started, false) AS training_started,
      COALESCE(ms.training_completed, false) AS training_completed,
      ms.training_completed_at,
      COALESCE(cs.classic_generations, 0) AS classic_generations,
      COALESCE(ai.quick_generations, 0) AS quick_generations,
      COALESCE(ai.pro_generations, 0) AS pro_generations,
      COALESCE(ai.ai_generations, 0) AS ai_generations,
      GREATEST(cs.last_classic_at, ai.last_ai_at) AS last_generated_at
    FROM active_members am
    LEFT JOIN model_summary ms ON ms.user_id = am.id
    LEFT JOIN classic_summary cs ON cs.user_id = am.id
    LEFT JOIN ai_summary ai ON ai.user_id = am.id
    ORDER BY am.member_since DESC
  `) as StudioMemberHealthRow[]

  return summarizeStudioMemberHealth(rows)
}
