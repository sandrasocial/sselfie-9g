import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

async function checkAdminAccess() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return false
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user) {
      return false
    }

    if (user.email !== ADMIN_EMAIL) {
      return false
    }

    return true
  } catch {
    return false
  }
}

// GET: List all email drafts (current versions only by default)
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAccess()
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const includeVersions = searchParams.get("includeVersions") === "true"
    const draftId = searchParams.get("draftId")
    const checkDuplicate = searchParams.get("checkDuplicate") === "true"

    // Get specific draft with version history
    if (draftId) {
      const draft = await sql`
        SELECT * FROM admin_email_drafts
        WHERE id = ${parseInt(draftId)}
        ORDER BY version_number DESC
      `

      if (includeVersions && draft.length > 0) {
        // Get all versions of this draft
        const parentId = draft[0].parent_draft_id || draft[0].id
        const allVersions = await sql`
          SELECT * FROM admin_email_drafts
          WHERE id = ${parentId} OR parent_draft_id = ${parentId}
          ORDER BY version_number ASC
        `
        return NextResponse.json({ draft: draft[0], versions: allVersions })
      }

      return NextResponse.json({ draft: draft[0] || null })
    }

    // List all current versions (filter by status if provided)
    const statusFilter = searchParams.get("status")
    let drafts
    
    if (statusFilter && statusFilter !== "all") {
      drafts = await sql`
        SELECT * FROM admin_email_drafts
        WHERE is_current_version = true AND status = ${statusFilter}
        ORDER BY created_at DESC
        LIMIT 100
      `
    } else {
      // Default: show all except archived
      drafts = await sql`
        SELECT * FROM admin_email_drafts
        WHERE is_current_version = true AND status != 'archived'
        ORDER BY created_at DESC
        LIMIT 100
      `
    }

    return NextResponse.json({ drafts: drafts || [] })
  } catch (error: any) {
    console.error("[EmailDrafts] Error fetching drafts:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch drafts" }, { status: 500 })
  }
}

// POST: Create new email draft
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAccess()
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const {
      chatId,
      draftName,
      subjectLine,
      previewText,
      bodyHtml,
      bodyText,
      emailType = "newsletter",
      campaignName,
      targetSegment,
      imageUrls = [],
      metadata = {},
      parentDraftId, // If editing existing draft, link to previous version
    } = body

    if (!subjectLine || !bodyHtml) {
      return NextResponse.json({ error: "Subject line and HTML body are required" }, { status: 400 })
    }

    // If checkDuplicate is requested, just check and return
    if (checkDuplicate) {
      const duplicate = await sql`
        SELECT id FROM admin_email_drafts
        WHERE subject_line = ${subjectLine}
          AND (
            body_html = ${bodyHtml}
            OR body_html LIKE ${bodyHtml.substring(0, 500) + '%'}
          )
          AND created_at > NOW() - INTERVAL '10 minutes'
          AND is_current_version = true
        LIMIT 1
      `
      
      return NextResponse.json({
        isDuplicate: duplicate.length > 0,
        existingDraftId: duplicate.length > 0 ? duplicate[0].id : null
      })
    }

    // Check for duplicates before saving (unless this is an edit)
    if (!parentDraftId) {
      const duplicate = await sql`
        SELECT id FROM admin_email_drafts
        WHERE subject_line = ${subjectLine}
          AND (
            body_html = ${bodyHtml}
            OR body_html LIKE ${bodyHtml.substring(0, 500) + '%'}
          )
          AND created_at > NOW() - INTERVAL '10 minutes'
          AND is_current_version = true
        LIMIT 1
      `
      
      if (duplicate.length > 0) {
        console.log('[EmailDrafts] ⚠️ Duplicate draft detected, returning existing:', duplicate[0].id)
        const existingDraft = await sql`
          SELECT * FROM admin_email_drafts WHERE id = ${duplicate[0].id}
        `
        return NextResponse.json({ draft: existingDraft[0], isEdit: false, isDuplicate: true })
      }
    }

    // If this is an edit (has parentDraftId), mark previous version as not current
    if (parentDraftId) {
      await sql`
        UPDATE admin_email_drafts
        SET is_current_version = false
        WHERE id = ${parentDraftId}
      `

      // Get version number from parent
      const [parent] = await sql`
        SELECT version_number FROM admin_email_drafts
        WHERE id = ${parentDraftId}
      `
      const newVersionNumber = parent ? (parent.version_number || 1) + 1 : 1

      // Create new version
      const [newVersion] = await sql`
        INSERT INTO admin_email_drafts (
          chat_id,
          draft_name,
          subject_line,
          preview_text,
          body_html,
          body_text,
          email_type,
          campaign_name,
          target_segment,
          image_urls,
          metadata,
          version_number,
          parent_draft_id,
          is_current_version,
          created_by
        )
        VALUES (
          ${chatId || null},
          ${draftName || subjectLine.substring(0, 100)},
          ${subjectLine},
          ${previewText || null},
          ${bodyHtml},
          ${bodyText || null},
          ${emailType},
          ${campaignName || null},
          ${targetSegment || null},
          ${imageUrls.length > 0 ? imageUrls : null},
          ${JSON.stringify(metadata)},
          ${newVersionNumber},
          ${parentDraftId},
          true,
          ${ADMIN_EMAIL}
        )
        RETURNING *
      `

      return NextResponse.json({ draft: newVersion, isEdit: true })
    }

    // New draft (no parent)
    const [newDraft] = await sql`
      INSERT INTO admin_email_drafts (
        chat_id,
        draft_name,
        subject_line,
        preview_text,
        body_html,
        body_text,
        email_type,
        campaign_name,
        target_segment,
        image_urls,
        metadata,
        version_number,
        is_current_version,
        created_by
      )
      VALUES (
        ${chatId || null},
        ${draftName || subjectLine.substring(0, 100)},
        ${subjectLine},
        ${previewText || null},
        ${bodyHtml},
        ${bodyText || null},
        ${emailType},
        ${campaignName || null},
        ${targetSegment || null},
        ${imageUrls.length > 0 ? imageUrls : null},
        ${JSON.stringify(metadata)},
        1,
        true,
        ${ADMIN_EMAIL}
      )
      RETURNING *
    `

    return NextResponse.json({ draft: newDraft, isEdit: false })
  } catch (error: any) {
    console.error("[EmailDrafts] Error creating draft:", error)
    return NextResponse.json({ error: error.message || "Failed to create draft" }, { status: 500 })
  }
}

// DELETE: Delete a draft (soft delete by setting status to 'archived')
export async function DELETE(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAccess()
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const draftId = searchParams.get("draftId")

    if (!draftId) {
      return NextResponse.json({ error: "Draft ID is required" }, { status: 400 })
    }

    await sql`
      UPDATE admin_email_drafts
      SET status = 'archived', is_current_version = false
      WHERE id = ${parseInt(draftId)}
    `

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[EmailDrafts] Error deleting draft:", error)
    return NextResponse.json({ error: error.message || "Failed to delete draft" }, { status: 500 })
  }
}

// PATCH: Update draft status (approve, reject, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const isAdmin = await checkAdminAccess()
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { draftId, status } = body

    if (!draftId) {
      return NextResponse.json({ error: "Draft ID is required" }, { status: 400 })
    }

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 })
    }

    const validStatuses = ['draft', 'approved', 'sent', 'archived']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 })
    }

    const [updated] = await sql`
      UPDATE admin_email_drafts
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${parseInt(draftId)}
      RETURNING *
    `

    if (!updated) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 })
    }

    return NextResponse.json({ draft: updated, success: true })
  } catch (error: any) {
    console.error("[EmailDrafts] Error updating draft:", error)
    return NextResponse.json({ error: error.message || "Failed to update draft" }, { status: 500 })
  }
}

